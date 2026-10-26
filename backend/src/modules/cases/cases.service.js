import { query } from '../../db/connection.js';
import { withTransaction } from '../../db/transaction.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateCaseId } from '../../utils/caseId.js';
import { addDays, slaState } from '../../utils/sla.js';
import { canEdit, viewLevel } from '../../utils/access.js';
import { TRANSITIONS, HEAD_ONLY_TRANSITIONS } from '../../config/constants.js';
import * as casesRepo from './cases.repo.js';
import * as actionsRepo from '../actions/actions.repo.js';
import * as documentsRepo from '../documents/documents.repo.js';
import * as overlapService from '../overlaps/overlap.service.js';

const toIsoDate = (d) => {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};

export async function registerCase(input, actor) {
  // Determine bureau
  const bureauCode = actor.bureau || input.bureau;
  if (!bureauCode) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Bureau code is required');
  }

  // Validate institution exists
  const instRes = await query('SELECT id, name FROM institutions WHERE id = $1', [input.institutionId]);
  if (instRes.rows.length === 0) {
    throw new ApiError(404, 'NOT_FOUND', 'Institution not found');
  }
  const institution = instRes.rows[0];

  const slaDays = await casesRepo.getSlaDaysForCategory(input.category);
  const dueOn = addDays(input.receivedOn, slaDays);

  let newCase;

  await withTransaction(async (client) => {
    const year = parseInt(input.receivedOn.slice(0, 4), 10) || new Date().getUTCFullYear();
    const caseId = await generateCaseId(client, bureauCode, year);

    newCase = await casesRepo.insertCase(client, {
      id: caseId,
      institutionId: input.institutionId,
      bureauCode,
      category: input.category,
      categorySource: 'MANUAL',
      sourceChannel: input.sourceChannel,
      description: input.description,
      status: 'NEW',
      receivedOn: input.receivedOn,
      slaDays,
      dueOn,
      createdBy: actor.id
    });

    await actionsRepo.insertAction(client, {
      caseId,
      actorId: actor.id,
      actorBureau: bureauCode,
      actionType: 'REGISTERED',
      toStatus: 'NEW',
      remark: 'Case registered',
      visibility: 'SHARED'
    });
  });

  // Post-commit: check overlaps via Dev B service
  let overlapResult = { found: false, overlapId: null, severity: null, otherCases: 0 };
  try {
    overlapResult = (await overlapService.checkForCase(newCase.id)) || overlapResult;
  } catch (err) {
    // Non-blocking for registration
  }

  return {
    case: {
      id: newCase.id,
      institution: {
        id: institution.id,
        name: institution.name
      },
      bureau: newCase.bureau_code,
      category: newCase.category,
      status: newCase.status,
      dueOn: toIsoDate(newCase.due_on),
      slaState: slaState(newCase),
      version: newCase.version
    },
    overlap: overlapResult
  };
}

export async function listCases(filters, viewer) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const offset = (page - 1) * pageSize;

  const { cases, total } = await casesRepo.findCases({
    ...filters,
    offset,
    limit: pageSize
  });

  // Apply visibility redaction
  const mapped = cases.map((c) => {
    const level = viewLevel(c, viewer);
    const isLimited = level === 'LIMITED';

    return {
      id: c.id,
      institutionId: c.institutionId,
      institutionName: c.institutionName,
      institutionPermanentId: c.institutionPermanentId,
      bureau: c.bureau,
      category: c.category,
      sourceChannel: isLimited ? null : c.sourceChannel,
      description: isLimited ? null : c.description,
      status: c.status,
      officer: isLimited ? null : (c.officerName ? { id: c.assignedOfficerId, name: c.officerName } : null),
      receivedOn: toIsoDate(c.receivedOn),
      dueOn: toIsoDate(c.dueOn),
      disposedOn: toIsoDate(c.disposedOn),
      slaState: slaState(c),
      accessLevel: level,
      version: c.version
    };
  });

  return {
    cases: mapped,
    meta: {
      page,
      pageSize,
      total
    }
  };
}

export async function getCaseForViewer(caseId, viewer) {
  const caseRow = await casesRepo.findCaseById(caseId);
  if (!caseRow) {
    throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  }

  const level = viewLevel(caseRow, viewer);
  const linkedOverlap = await casesRepo.getLinkedOverlapSummary(caseId);

  if (level === 'LIMITED') {
    return {
      id: caseRow.id,
      bureau: caseRow.bureau,
      category: caseRow.category,
      status: caseRow.status,
      officer: null,
      description: null,
      accessLevel: 'LIMITED',
      linkedOverlap
    };
  }

  // Full view
  const documents = await documentsRepo.findDocumentsByCaseId(caseId);
  const { actions } = await actionsRepo.findActionsForViewer(caseId, viewer, { offset: 0, limit: 10 });

  return {
    id: caseRow.id,
    institution: {
      id: caseRow.institutionId,
      name: caseRow.institutionName,
      permanentId: caseRow.institutionPermanentId,
      region: caseRow.institutionRegion
    },
    bureau: caseRow.bureau,
    category: caseRow.category,
    categorySource: caseRow.categorySource,
    sourceChannel: caseRow.sourceChannel,
    description: caseRow.description,
    status: caseRow.status,
    officer: caseRow.officerName ? { id: caseRow.assignedOfficerId, name: caseRow.officerName, username: caseRow.officerUsername } : null,
    receivedOn: toIsoDate(caseRow.receivedOn),
    slaDays: caseRow.slaDays,
    dueOn: toIsoDate(caseRow.dueOn),
    disposedOn: toIsoDate(caseRow.disposedOn),
    slaState: slaState(caseRow),
    accessLevel: 'FULL',
    linkedOverlap,
    documents,
    recentActions: actions,
    version: caseRow.version,
    createdAt: caseRow.createdAt,
    updatedAt: caseRow.updatedAt
  };
}

export async function updateCase(caseId, patch, actor) {
  const current = await casesRepo.findCaseRawById(caseId);
  if (!current) {
    throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  }

  if (current.status === 'DISPOSED') {
    throw new ApiError(409, 'INVALID_TRANSITION', 'Cannot edit a disposed case');
  }

  if (!canEdit(current, actor)) {
    throw new ApiError(403, 'FORBIDDEN', 'Only officers or head of owning bureau can edit this case');
  }

  const updates = {};
  if (patch.category && patch.category !== current.category) {
    updates.category = patch.category;
    updates.category_source = 'SUGGESTED_CONFIRMED';
  }
  if (patch.description !== undefined) {
    updates.description = patch.description;
  }

  if (Object.keys(updates).length === 0) {
    return current;
  }

  let updated;
  await withTransaction(async (client) => {
    updated = await casesRepo.updateCaseWithVersion(client, caseId, updates, patch.version);
    if (!updated) {
      throw new ApiError(409, 'VERSION_CONFLICT', 'Case was updated by someone else', {
        currentVersion: current.version
      });
    }

    if (updates.category) {
      await actionsRepo.insertAction(client, {
        caseId,
        actorId: actor.id,
        actorBureau: actor.bureau,
        actionType: 'CATEGORY_CONFIRMED',
        remark: `Category updated to ${updates.category}`,
        visibility: 'SHARED'
      });
    }
  });

  if (updates.category) {
    try {
      await overlapService.recheckForCase(caseId);
    } catch (err) {}
  }

  return updated;
}

export async function changeStatus(caseId, toStatus, remark, actor, version) {
  const current = await casesRepo.findCaseRawById(caseId);
  if (!current) {
    throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  }

  if (!canEdit(current, actor)) {
    throw new ApiError(403, 'FORBIDDEN', 'Only officers or head of owning bureau can change case status');
  }

  if (current.status === 'DISPOSED' && !['HEAD','ADMIN'].includes(actor.role)) {
    throw new ApiError(403, 'FORBIDDEN', 'Only Bureau Head or Admin can reopen a case');
  }
  const allowed = TRANSITIONS[current.status] || [];
  if (!allowed.includes(toStatus)) {
    throw new ApiError(409, 'INVALID_TRANSITION', `Cannot move status from ${current.status} to ${toStatus}`);
  }

  if (HEAD_ONLY_TRANSITIONS.includes(toStatus) && actor.role !== 'HEAD' && actor.role !== 'ADMIN') {
    throw new ApiError(403, 'FORBIDDEN', `Transition to ${toStatus} requires HEAD role`);
  }

  if (current.status === 'DISPOSED') {
    return reopenCase(caseId, remark, actor, version);
  }
  if (current.status === 'TRANSFERRED') {
    throw new ApiError(409, 'INVALID_TRANSITION', 'Use the accept-transfer action');
  }
  const updates = { status: toStatus };
  if (toStatus === 'DISPOSED') {
    updates.disposed_on = new Date().toISOString().slice(0, 10);
  }

  let updated;
  await withTransaction(async (client) => {
    updated = await casesRepo.updateCaseWithVersion(client, caseId, updates, version);
    if (!updated) {
      throw new ApiError(409, 'VERSION_CONFLICT', 'Case was updated by someone else', {
        currentVersion: current.version
      });
    }

    await actionsRepo.insertAction(client, {
      caseId,
      actorId: actor.id,
      actorBureau: actor.bureau,
      actionType: 'STATUS_CHANGED',
      fromStatus: current.status,
      toStatus,
      remark: remark || `Status changed from ${current.status} to ${toStatus}`,
      visibility: 'SHARED'
    });
  });

  return updated;
}

export async function transferCase(caseId, toBureau, remark, actor, version) {
  const current = await casesRepo.findCaseRawById(caseId);
  if (!current) {
    throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  }

  if (!canEdit(current, actor)) {
    throw new ApiError(403, 'FORBIDDEN', 'Only officers or head of owning bureau can transfer this case');
  }

  if (current.bureau_code === toBureau) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Cannot transfer to the same bureau');
  }

  const allowed = TRANSITIONS[current.status] || [];
  if (!allowed.includes('TRANSFERRED')) {
    throw new ApiError(409, 'INVALID_TRANSITION', `Cannot transfer a case in ${current.status} status`);
  }

  let updated;
  await withTransaction(async (client) => {
    updated = await casesRepo.updateCaseWithVersion(client, caseId, { status: 'TRANSFERRED' }, version);
    if (!updated) {
      throw new ApiError(409, 'VERSION_CONFLICT', 'Case was updated by someone else', {
        currentVersion: current.version
      });
    }

    await actionsRepo.insertAction(client, {
      caseId,
      actorId: actor.id,
      actorBureau: actor.bureau,
      actionType: 'TRANSFERRED',
      fromStatus: current.status,
      toStatus: 'TRANSFERRED',
      remark: remark || `Transfer requested to ${toBureau}`,
      visibility: 'SHARED'
    });
  });

  return updated;
}

export async function acceptTransfer(caseId, actor, version) {
  const current = await casesRepo.findCaseRawById(caseId);
  if (!current) {
    throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  }

  if (current.status !== 'TRANSFERRED') {
    throw new ApiError(409, 'INVALID_TRANSITION', 'Case is not in TRANSFERRED status');
  }

  if (!actor.bureau && actor.role !== 'ADMIN') {
    throw new ApiError(403, 'FORBIDDEN', 'Receiving officer must belong to a bureau');
  }

  const newBureau = actor.bureau || current.bureau_code;

  let updated;
  await withTransaction(async (client) => {
    updated = await casesRepo.updateCaseWithVersion(
      client,
      caseId,
      {
        bureau_code: newBureau,
        status: 'UNDER_PROCESS',
        assigned_officer_id: null
      },
      version
    );

    if (!updated) {
      throw new ApiError(409, 'VERSION_CONFLICT', 'Case was updated by someone else', {
        currentVersion: current.version
      });
    }

    await actionsRepo.insertAction(client, {
      caseId,
      actorId: actor.id,
      actorBureau: newBureau,
      actionType: 'STATUS_CHANGED',
      fromStatus: 'TRANSFERRED',
      toStatus: 'UNDER_PROCESS',
      remark: `Transfer accepted by ${newBureau}. Status set to UNDER_PROCESS`,
      visibility: 'SHARED'
    });
  });

  return updated;
}

export async function assignOfficer(caseId, officerId, actor, version) {
  const current = await casesRepo.findCaseRawById(caseId);
  if (!current) {
    throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  }

  if (actor.role !== 'HEAD' && actor.role !== 'ADMIN') {
    throw new ApiError(403, 'FORBIDDEN', 'Only bureau head or admin can assign officers');
  }

  if (actor.role === 'HEAD' && actor.bureau !== current.bureau_code) {
    throw new ApiError(403, 'FORBIDDEN', 'Head can only assign officers for own bureau');
  }

  // Verify officer belongs to the same bureau
  const officerRes = await query(
    'SELECT id, username, full_name, bureau_code, active FROM users WHERE id = $1',
    [officerId]
  );
  const officer = officerRes.rows[0];

  if (!officer || Number(officer.active) !== 1) {
    throw new ApiError(404, 'NOT_FOUND', 'Officer not found or inactive');
  }

  if (officer.bureau_code !== current.bureau_code) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Officer does not belong to the case bureau');
  }

  let updated;
  await withTransaction(async (client) => {
    updated = await casesRepo.updateCaseWithVersion(client, caseId, { assigned_officer_id: officerId }, version);
    if (!updated) {
      throw new ApiError(409, 'VERSION_CONFLICT', 'Case was updated by someone else', {
        currentVersion: current.version
      });
    }

    await actionsRepo.insertAction(client, {
      caseId,
      actorId: actor.id,
      actorBureau: actor.bureau,
      actionType: 'ASSIGNED',
      remark: `Assigned to ${officer.full_name} (${officer.username})`,
      visibility: 'SHARED'
    });
  });

  return updated;
}

export async function escalateCase(caseId, remark, actor, version) {
  const current = await casesRepo.findCaseRawById(caseId);
  if (!current) {
    throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  }

  if (!canEdit(current, actor)) {
    throw new ApiError(403, 'FORBIDDEN', 'Only officers or head of owning bureau can escalate');
  }

  const allowed = TRANSITIONS[current.status] || [];
  if (!allowed.includes('ESCALATED')) {
    throw new ApiError(409, 'INVALID_TRANSITION', `Cannot escalate case in status ${current.status}`);
  }

  let updated;
  await withTransaction(async (client) => {
    updated = await casesRepo.updateCaseWithVersion(client, caseId, { status: 'ESCALATED' }, version);
    if (!updated) {
      throw new ApiError(409, 'VERSION_CONFLICT', 'Case was updated by someone else', {
        currentVersion: current.version
      });
    }

    await actionsRepo.insertAction(client, {
      caseId,
      actorId: actor.id,
      actorBureau: actor.bureau,
      actionType: 'ESCALATED',
      fromStatus: current.status,
      toStatus: 'ESCALATED',
      remark: remark || 'Case escalated to Bureau Head',
      visibility: 'SHARED'
    });
  });

  return updated;
}

export async function disposeCase(caseId, remark, actor, version) {
  const current = await casesRepo.findCaseRawById(caseId);
  if (!current) {
    throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  }

  if (actor.role !== 'HEAD' && actor.role !== 'ADMIN') {
    throw new ApiError(403, 'FORBIDDEN', 'Only Bureau Head or Admin can dispose a case');
  }

  if (actor.role === 'HEAD' && actor.bureau !== current.bureau_code) {
    throw new ApiError(403, 'FORBIDDEN', 'Head can only dispose cases of own bureau');
  }

  const allowed = TRANSITIONS[current.status] || [];
  if (!allowed.includes('DISPOSED')) {
    throw new ApiError(409, 'INVALID_TRANSITION', `Cannot dispose case in status ${current.status}`);
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  let updated;
  await withTransaction(async (client) => {
    updated = await casesRepo.updateCaseWithVersion(
      client,
      caseId,
      { status: 'DISPOSED', disposed_on: todayIso },
      version
    );

    if (!updated) {
      throw new ApiError(409, 'VERSION_CONFLICT', 'Case was updated by someone else', {
        currentVersion: current.version
      });
    }

    await actionsRepo.insertAction(client, {
      caseId,
      actorId: actor.id,
      actorBureau: actor.bureau,
      actionType: 'DISPOSED',
      fromStatus: current.status,
      toStatus: 'DISPOSED',
      remark: remark || 'Case disposed',
      visibility: 'SHARED'
    });
  });

  return updated;
}

export async function reopenCase(caseId, remark, actor, version) {
  const current = await casesRepo.findCaseRawById(caseId);
  if (!current) {
    throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  }

  if (actor.role !== 'HEAD' && actor.role !== 'ADMIN') {
    throw new ApiError(403, 'FORBIDDEN', 'Only Bureau Head or Admin can reopen a case');
  }

  if (actor.role === 'HEAD' && actor.bureau !== current.bureau_code) {
    throw new ApiError(403, 'FORBIDDEN', 'Head can only reopen cases of own bureau');
  }

  if (current.status !== 'DISPOSED') {
    throw new ApiError(409, 'INVALID_TRANSITION', 'Only DISPOSED cases can be reopened');
  }

  let updated;
  await withTransaction(async (client) => {
    updated = await casesRepo.updateCaseWithVersion(
      client,
      caseId,
      { status: 'UNDER_PROCESS', disposed_on: null },
      version
    );

    if (!updated) {
      throw new ApiError(409, 'VERSION_CONFLICT', 'Case was updated by someone else', {
        currentVersion: current.version
      });
    }

    await actionsRepo.insertAction(client, {
      caseId,
      actorId: actor.id,
      actorBureau: actor.bureau,
      actionType: 'REOPENED',
      fromStatus: 'DISPOSED',
      toStatus: 'UNDER_PROCESS',
      remark: remark || 'Case reopened',
      visibility: 'SHARED'
    });
  });

  try {
    await overlapService.recheckForCase(caseId);
  } catch (err) {}

  return updated;
}
