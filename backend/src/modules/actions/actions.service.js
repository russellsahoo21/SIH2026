import * as actionsRepo from './actions.repo.js';
import { query } from '../../db/connection.js';
import { ApiError } from '../../utils/ApiError.js';

export async function addRemark(caseId, text, visibility, actor) {
  // MANAGEMENT cannot add remarks
  if (actor.role === 'MANAGEMENT') {
    throw new ApiError(403, 'FORBIDDEN', 'Management cannot add remarks');
  }

  // Find case to verify existence and bureau ownership
  const caseRes = await query('SELECT id, bureau_code, status FROM cases WHERE id = $1', [caseId]);
  const caseRow = caseRes.rows[0];

  if (!caseRow) {
    throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  }

  // Check ownership: must be owning bureau or ADMIN
  const isOwnBureau = actor.bureau === caseRow.bureau_code;
  const isAdmin = actor.role === 'ADMIN';

  if (!isOwnBureau && !isAdmin) {
    throw new ApiError(403, 'FORBIDDEN', 'Cannot add remarks to a case owned by another bureau');
  }

  const action = await actionsRepo.insertAction(query, {
    caseId,
    actorId: actor.id,
    actorBureau: actor.bureau,
    actionType: 'REMARK_ADDED',
    remark: text,
    visibility
  });

  return action;
}

export async function getActions(caseId, viewer, pagination = {}) {
  // Verify case exists
  const caseRes = await query('SELECT id, bureau_code FROM cases WHERE id = $1', [caseId]);
  if (caseRes.rows.length === 0) {
    throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  }

  const page = pagination.page || 1;
  const pageSize = pagination.pageSize || 25;
  const offset = (page - 1) * pageSize;

  const { actions, total } = await actionsRepo.findActionsForViewer(caseId, viewer, {
    offset,
    limit: pageSize
  });

  return {
    actions,
    meta: {
      page,
      pageSize,
      total
    }
  };
}
