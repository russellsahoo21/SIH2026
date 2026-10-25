import { ApiError } from '../../utils/ApiError.js';
import { tokenJaccard } from '../../utils/similarity.js';
import { viewLevel } from '../../utils/access.js';
import { slaState } from '../../utils/sla.js';
import { withTransaction } from '../../db/transaction.js';
import { query } from '../../db/connection.js';
import * as overlapRepo from './overlap.repo.js';
import * as casesRepo from '../cases/cases.repo.js';
import * as actionsRepo from '../actions/actions.repo.js';

const toIsoDate = (d) => {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};

/**
 * Computes overlap severity:
 * HIGH if any pair has the same category or similarity >= 0.5. MEDIUM otherwise.
 *
 * @param {Array<{ category?: string, similarity?: number }>} members
 * @returns {'HIGH' | 'MEDIUM'}
 */
export function computeSeverity(members) {
  if (!members || members.length < 2) {
    return 'MEDIUM';
  }

  // Check if any member has similarity >= 0.5
  for (const m of members) {
    if (typeof m.similarity === 'number' && m.similarity >= 0.5 && m.similarity < 1.0) {
      return 'HIGH';
    }
  }

  // Check if any pair has the same category
  const categoriesSeen = new Set();
  for (const m of members) {
    if (m.category) {
      if (categoriesSeen.has(m.category)) {
        return 'HIGH';
      }
      categoriesSeen.add(m.category);
    }
  }

  return 'MEDIUM';
}

/**
 * Called after a case is registered.
 * Finds other open cases for the same institution in other bureaus.
 * If any, creates or updates an overlap group and writes OVERLAP_DETECTED on the new case.
 *
 * @param {string} caseId
 * @returns {Promise<{ found: boolean, overlapId: number | null, severity: string | null, otherCases: number }>}
 */
export async function checkForCase(caseId) {
  const newCase = await casesRepo.findCaseRawById(caseId);
  if (!newCase || newCase.status === 'DISPOSED') {
    return { found: false, overlapId: null, severity: null, otherCases: 0 };
  }

  // Find candidate cases: open cases for the same institution in other bureaus
  const candidates = await overlapRepo.findOpenCasesForInstitutionExcludingBureau(
    newCase.institution_id,
    newCase.bureau_code,
    newCase.id
  );

  if (candidates.length === 0) {
    return { found: false, overlapId: null, severity: null, otherCases: 0 };
  }

  const qualifiedCandidates = [];

  for (const cand of candidates) {
    const jacc = tokenJaccard(newCase.description, cand.description);
    const catMatch = newCase.category === cand.category ? 1 : 0;
    // Overlap formula: issue = 0.6 * tokenJaccard + 0.4 * (catMatch)
    const issue = 0.6 * jacc + 0.4 * catMatch;

    if (issue >= 0.2 || catMatch === 1) {
      qualifiedCandidates.push({
        candidate: cand,
        similarity: Math.round(issue * 100) / 100
      });
    }
  }

  if (qualifiedCandidates.length === 0) {
    return { found: false, overlapId: null, severity: null, otherCases: 0 };
  }

  let overlapGroup;

  await withTransaction(async (client) => {
    // Look for existing active group for this institution
    overlapGroup = await overlapRepo.findActiveOverlapForInstitution(newCase.institution_id, client);

    if (!overlapGroup) {
      overlapGroup = await overlapRepo.createOverlap(client, {
        institutionId: newCase.institution_id,
        status: 'OPEN',
        severity: 'MEDIUM'
      });
    }

    // Add newCase as member
    await overlapRepo.insertOrUpdateMember(client, {
      overlapId: overlapGroup.id,
      caseId: newCase.id,
      similarity: 1.0,
      memberState: 'DETECTED'
    });

    // Add each qualified candidate
    for (const q of qualifiedCandidates) {
      await overlapRepo.insertOrUpdateMember(client, {
        overlapId: overlapGroup.id,
        caseId: q.candidate.id,
        similarity: q.similarity,
        memberState: 'DETECTED'
      });
    }

    // Fetch all members in this group to calculate severity
    const allMembers = await overlapRepo.findOverlapMembers(overlapGroup.id, client);
    const newSeverity = computeSeverity(allMembers);

    overlapGroup = await overlapRepo.updateOverlapSeverity(client, overlapGroup.id, newSeverity);

    // Record OVERLAP_DETECTED action on the new case
    const bureausInvolved = [...new Set(qualifiedCandidates.map((q) => q.candidate.bureauCode))];
    await actionsRepo.insertAction(client, {
      caseId: newCase.id,
      actorId: newCase.created_by,
      actorBureau: newCase.bureau_code,
      actionType: 'OVERLAP_DETECTED',
      remark: `Potential overlap detected with ${bureausInvolved.join(', ')} (Group #${overlapGroup.id})`,
      visibility: 'SHARED'
    });
  });

  return {
    found: true,
    overlapId: overlapGroup.id,
    severity: overlapGroup.severity,
    otherCases: qualifiedCandidates.length
  };
}

/**
 * Called after a category change or reopening.
 * Updates similarity scores and severity across affected overlap groups.
 *
 * @param {string} caseId
 */
export async function recheckForCase(caseId) {
  const currentCase = await casesRepo.findCaseRawById(caseId);
  if (!currentCase) return;

  const activeGroups = await overlapRepo.findOverlapGroupsContainingCase(caseId);

  if (activeGroups.length === 0) {
    // If not in a group, check if it now creates one
    await checkForCase(caseId);
    return;
  }

  for (const group of activeGroups) {
    await withTransaction(async (client) => {
      const members = await overlapRepo.findOverlapMembers(group.id, client);
      const otherMembers = members.filter((m) => m.caseId !== caseId);

      for (const other of otherMembers) {
        const jacc = tokenJaccard(currentCase.description, other.description);
        const catMatch = currentCase.category === other.category ? 1 : 0;
        const issue = 0.6 * jacc + 0.4 * catMatch;
        const newSim = Math.round(issue * 100) / 100;

        await overlapRepo.insertOrUpdateMember(client, {
          overlapId: group.id,
          caseId: other.caseId,
          similarity: newSim,
          memberState: other.memberState
        });
      }

      // Re-fetch with updated similarities
      const updatedMembers = await overlapRepo.findOverlapMembers(group.id, client);
      const newSeverity = computeSeverity(updatedMembers);
      await overlapRepo.updateOverlapSeverity(client, group.id, newSeverity);
    });
  }
}

/**
 * Lists overlap groups with counts and bureaus involved.
 */
export async function listOverlaps(filters, viewer) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const offset = (page - 1) * pageSize;

  let officerBureau = null;
  // Role scope: OFFICER and HEAD see only overlaps involving their own bureau
  if (viewer.role === 'OFFICER' || viewer.role === 'HEAD') {
    officerBureau = viewer.bureau;
  }

  const { overlaps, total } = await overlapRepo.listOverlaps({
    status: filters.status,
    severity: filters.severity,
    bureau: filters.bureau,
    officerBureau,
    offset,
    limit: pageSize
  });

  return {
    overlaps,
    meta: {
      page,
      pageSize,
      total
    }
  };
}

/**
 * Retrieves overlap group detail with members (visibility applied).
 */
export async function getOverlapDetail(id, viewer) {
  const overlap = await overlapRepo.findOverlapById(id);
  if (!overlap) {
    throw new ApiError(404, 'NOT_FOUND', 'Overlap group not found');
  }

  const members = await overlapRepo.findOverlapMembers(id);

  // If OFFICER or HEAD, ensure user's bureau is part of the overlap
  if (viewer.role === 'OFFICER' || viewer.role === 'HEAD') {
    const hasOwnBureau = members.some((m) => m.bureau === viewer.bureau);
    if (!hasOwnBureau) {
      throw new ApiError(403, 'FORBIDDEN', 'This overlap group does not involve your bureau');
    }
  }

  // Calculate suggested lead bureau: bureau with earliest received case or most cases
  const bureauCounts = {};
  let earliestDate = '9999-99-99';
  let earliestBureau = null;

  for (const m of members) {
    bureauCounts[m.bureau] = (bureauCounts[m.bureau] || 0) + 1;
    const rDate = toIsoDate(m.receivedOn);
    if (rDate && rDate < earliestDate) {
      earliestDate = rDate;
      earliestBureau = m.bureau;
    }
  }

  let suggestedLeadBureau = earliestBureau;
  let maxCount = 0;
  for (const [bCode, count] of Object.entries(bureauCounts)) {
    if (count > maxCount) {
      maxCount = count;
      suggestedLeadBureau = bCode;
    }
  }

  // Format members applying visibility
  const formattedMembers = members.map((m) => {
    const level = viewLevel(m, viewer);
    const isLimited = level === 'LIMITED';

    return {
      caseId: m.caseId,
      similarity: m.similarity,
      memberState: m.memberState,
      bureau: m.bureau,
      category: m.category,
      sourceChannel: isLimited ? null : m.sourceChannel,
      description: isLimited ? null : m.description,
      status: m.status,
      officer: isLimited ? null : (m.officerName ? { id: m.assignedOfficerId, name: m.officerName } : null),
      receivedOn: toIsoDate(m.receivedOn),
      slaDays: m.slaDays,
      dueOn: toIsoDate(m.dueOn),
      slaState: slaState(m),
      accessLevel: level,
      version: m.version
    };
  });

  return {
    id: overlap.id,
    institutionId: overlap.institutionId,
    institutionName: overlap.institutionName,
    institutionPermanentId: overlap.institutionPermanentId,
    institutionRegion: overlap.institutionRegion,
    status: overlap.status,
    severity: overlap.severity,
    leadBureau: overlap.leadBureau,
    suggestedLeadBureau,
    notes: overlap.notes,
    reviewedBy: overlap.reviewerName ? { id: overlap.reviewedBy, name: overlap.reviewerName } : null,
    createdAt: overlap.createdAt,
    updatedAt: overlap.updatedAt,
    members: formattedMembers
  };
}

/**
 * Links selected cases, sets leadBureau and notes.
 * Status becomes LINKED.
 */
export async function linkCases(overlapId, caseIds, leadBureau, notes, actor) {
  const overlap = await overlapRepo.findOverlapById(overlapId);
  if (!overlap) {
    throw new ApiError(404, 'NOT_FOUND', 'Overlap group not found');
  }

  await withTransaction(async (client) => {
    // 1. Update overlap metadata
    await overlapRepo.updateOverlapMetadata(client, overlapId, {
      status: 'LINKED',
      leadBureau,
      notes: notes || overlap.notes,
      reviewedBy: actor.id
    });

    // 2. Set specified cases to LINKED
    await overlapRepo.updateMemberStates(client, overlapId, caseIds, 'LINKED');

    // 3. Write OVERLAP_LINKED and LEAD_BUREAU_SET actions on each linked case
    for (const cId of caseIds) {
      await actionsRepo.insertAction(client, {
        caseId: cId,
        actorId: actor.id,
        actorBureau: actor.bureau || 'COORDINATOR',
        actionType: 'OVERLAP_LINKED',
        remark: notes || `Case linked to overlap group #${overlapId} with lead bureau ${leadBureau}`,
        visibility: 'SHARED'
      });

      await actionsRepo.insertAction(client, {
        caseId: cId,
        actorId: actor.id,
        actorBureau: actor.bureau || 'COORDINATOR',
        actionType: 'LEAD_BUREAU_SET',
        remark: `Lead bureau set to ${leadBureau}`,
        visibility: 'SHARED'
      });
    }
  });

  return await getOverlapDetail(overlapId, actor);
}

/**
 * Marks selected cases as NOT_RELATED.
 * If none remain related, status becomes DISMISSED.
 */
export async function markNotRelated(overlapId, caseIds, notes, actor) {
  const overlap = await overlapRepo.findOverlapById(overlapId);
  if (!overlap) {
    throw new ApiError(404, 'NOT_FOUND', 'Overlap group not found');
  }

  await withTransaction(async (client) => {
    // Set member states to NOT_RELATED
    await overlapRepo.updateMemberStates(client, overlapId, caseIds, 'NOT_RELATED');

    // Write action on each case
    for (const cId of caseIds) {
      await actionsRepo.insertAction(client, {
        caseId: cId,
        actorId: actor.id,
        actorBureau: actor.bureau || 'COORDINATOR',
        actionType: 'OVERLAP_NOT_RELATED',
        remark: notes || `Marked as not related to overlap group #${overlapId}`,
        visibility: 'SHARED'
      });
    }

    // Check how many related members remain
    const members = await overlapRepo.findOverlapMembers(overlapId, client);
    const relatedCount = members.filter((m) => m.memberState !== 'NOT_RELATED').length;

    if (relatedCount < 2) {
      await overlapRepo.updateOverlapMetadata(client, overlapId, {
        status: 'DISMISSED',
        notes: notes || 'Dismissed as insufficient related cases remain',
        reviewedBy: actor.id
      });
    }
  });

  return await getOverlapDetail(overlapId, actor);
}

/**
 * Marks the group as REVIEWED with notes.
 */
export async function reviewOverlap(overlapId, notes, actor) {
  const overlap = await overlapRepo.findOverlapById(overlapId);
  if (!overlap) {
    throw new ApiError(404, 'NOT_FOUND', 'Overlap group not found');
  }

  await withTransaction(async (client) => {
    await overlapRepo.updateOverlapMetadata(client, overlapId, {
      status: 'REVIEWED',
      notes: notes || overlap.notes,
      reviewedBy: actor.id
    });
  });

  return await getOverlapDetail(overlapId, actor);
}

/**
 * Removes one case from a linked group.
 */
export async function unlinkCase(overlapId, caseId, notes, actor) {
  const overlap = await overlapRepo.findOverlapById(overlapId);
  if (!overlap) {
    throw new ApiError(404, 'NOT_FOUND', 'Overlap group not found');
  }

  await withTransaction(async (client) => {
    // Set member state back to DETECTED
    await overlapRepo.updateMemberStates(client, overlapId, [caseId], 'DETECTED');

    await actionsRepo.insertAction(client, {
      caseId,
      actorId: actor.id,
      actorBureau: actor.bureau || 'COORDINATOR',
      actionType: 'STATUS_CHANGED',
      remark: notes || `Unlinked from overlap group #${overlapId}`,
      visibility: 'SHARED'
    });

    // Check remaining linked members
    const members = await overlapRepo.findOverlapMembers(overlapId, client);
    const linkedCount = members.filter((m) => m.memberState === 'LINKED').length;

    if (linkedCount < 2 && overlap.status === 'LINKED') {
      await overlapRepo.updateOverlapMetadata(client, overlapId, {
        status: 'OPEN',
        leadBureau: null
      });
    }
  });

  return await getOverlapDetail(overlapId, actor);
}
