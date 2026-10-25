import { ApiError } from '../../utils/ApiError.js';
import { normalizeName } from '../../utils/text.js';
import { similarity, tokenJaccard } from '../../utils/similarity.js';
import { viewLevel } from '../../utils/access.js';
import { slaState } from '../../utils/sla.js';
import * as institutionsRepo from './institutions.repo.js';

const toIsoDate = (d) => {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};

export async function searchAndListInstitutions(filters) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const offset = (page - 1) * pageSize;

  if (filters.q) {
    const rawQ = filters.q.trim();
    const cleanQ = rawQ.toLowerCase();
    const normalizedQ = normalizeName(rawQ);

    const all = await institutionsRepo.getAllActiveInstitutions();

    // Filter by region if requested
    let filtered = all;
    if (filters.region) {
      filtered = filtered.filter((i) => i.region.toLowerCase() === filters.region.toLowerCase());
    }

    // Score all institutions against search query
    const scored = [];
    for (const inst of filtered) {
      // 1. Direct match on permanentId
      if (inst.permanentId && inst.permanentId.toLowerCase().includes(cleanQ)) {
        scored.push({
          ...inst,
          score: inst.permanentId.toLowerCase() === cleanQ ? 1.0 : 0.95
        });
        continue;
      }

      const instNorm = inst.normalizedName || normalizeName(inst.name);

      if (normalizedQ && instNorm === normalizedQ) {
        scored.push({ ...inst, score: 1.0 });
        continue;
      }

      const sim = similarity(normalizedQ, instNorm);
      const jacc = tokenJaccard(normalizedQ, instNorm);

      let finalScore = 0.7 * sim + 0.3 * jacc;
      if (instNorm.includes(normalizedQ) || (normalizedQ && normalizedQ.includes(instNorm))) {
        finalScore = Math.max(finalScore, 0.85);
      }

      if (finalScore >= 0.25) {
        scored.push({
          ...inst,
          score: Math.round(finalScore * 100) / 100
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    const total = scored.length;
    const paginated = scored.slice(offset, offset + pageSize);

    return {
      institutions: paginated,
      meta: {
        page,
        pageSize,
        total
      }
    };
  }

  // Without q: standard database pagination
  const { institutions, total } = await institutionsRepo.listInstitutions({
    region: filters.region,
    offset,
    limit: pageSize
  });

  return {
    institutions,
    meta: {
      page,
      pageSize,
      total
    }
  };
}

export async function getInstitutionProfile(id) {
  const institution = await institutionsRepo.findInstitutionById(id);
  if (!institution) {
    throw new ApiError(404, 'NOT_FOUND', 'Institution not found');
  }

  const caseCounts = await institutionsRepo.getCaseCountsForInstitution(id);

  return {
    ...institution,
    caseCounts
  };
}

export async function getInstitutionCases(id, filters, viewer) {
  const institution = await institutionsRepo.findInstitutionById(id);
  if (!institution) {
    throw new ApiError(404, 'NOT_FOUND', 'Institution not found');
  }

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const offset = (page - 1) * pageSize;

  const { cases, total } = await institutionsRepo.findCasesByInstitution(id, {
    ...filters,
    offset,
    limit: pageSize
  });

  const mapped = cases.map((c) => {
    const level = viewLevel(c, viewer);
    const isLimited = level === 'LIMITED';

    return {
      id: c.id,
      institutionId: c.institutionId,
      institutionName: institution.name,
      institutionPermanentId: institution.permanentId,
      bureau: c.bureau,
      category: c.category,
      sourceChannel: isLimited ? null : c.sourceChannel,
      description: isLimited ? null : c.description,
      status: c.status,
      officer: isLimited ? null : (c.officerName ? { id: c.assignedOfficerId, name: c.officerName } : null),
      receivedOn: toIsoDate(c.receivedOn),
      slaDays: c.slaDays,
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

export async function getInstitutionOverlaps(id) {
  const institution = await institutionsRepo.findInstitutionById(id);
  if (!institution) {
    throw new ApiError(404, 'NOT_FOUND', 'Institution not found');
  }

  return await institutionsRepo.findOverlapsByInstitution(id);
}

export async function createInstitution(input) {
  const existing = await institutionsRepo.findInstitutionByPermanentId(input.permanentId);
  if (existing) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Institution with this Permanent ID already exists');
  }

  const normalizedName = normalizeName(input.name);

  return await institutionsRepo.insertInstitution({
    permanentId: input.permanentId,
    name: input.name,
    normalizedName,
    address: input.address,
    region: input.region
  });
}

export async function updateInstitution(id, patch) {
  const existing = await institutionsRepo.findInstitutionById(id);
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Institution not found');
  }

  const updates = {};
  if (patch.name) {
    updates.name = patch.name;
    updates.normalized_name = normalizeName(patch.name);
  }
  if (patch.address !== undefined) {
    updates.address = patch.address;
  }
  if (patch.region) {
    updates.region = patch.region;
  }
  if (patch.active !== undefined) {
    updates.active = patch.active;
  }

  if (Object.keys(updates).length === 0) {
    return existing;
  }

  return await institutionsRepo.updateInstitution(id, updates);
}
