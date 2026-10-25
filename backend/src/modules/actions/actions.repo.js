import { query } from '../../db/connection.js';

export async function insertAction(db, {
  caseId,
  actorId,
  actorBureau,
  actionType,
  fromStatus = null,
  toStatus = null,
  remark = null,
  visibility = 'SHARED'
}) {
  const runner = db.query ? db : { query };
  const sql = `
    INSERT INTO actions (
      case_id, actor_id, actor_bureau, action_type,
      from_status, to_status, remark, visibility, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
    RETURNING id, case_id AS "caseId", actor_id AS "actorId", actor_bureau AS "actorBureau",
              action_type AS "actionType", from_status AS "fromStatus", to_status AS "toStatus",
              remark, visibility, created_at AS "createdAt"
  `;
  const result = await runner.query(sql, [
    caseId,
    actorId,
    actorBureau,
    actionType,
    fromStatus,
    toStatus,
    remark,
    visibility
  ]);
  return result.rows[0];
}

export async function findActionsForViewer(caseId, viewer, { offset = 0, limit = 25 }) {
  // Check if viewer has internal visibility for this case
  // ADMIN and MANAGEMENT always see internal; or if viewer is in the same bureau as the case
  const isElevated = viewer.role === 'ADMIN' || viewer.role === 'MANAGEMENT';
  
  let filterClause;
  const params = [caseId];

  if (isElevated) {
    // Sees everything
    filterClause = '';
  } else {
    // Only sees INTERNAL if user's bureau matches the case bureau; otherwise only SHARED
    params.push(viewer.bureau);
    filterClause = `AND (a.visibility = 'SHARED' OR (a.visibility = 'INTERNAL' AND c.bureau_code = $${params.length}))`;
  }

  const countSql = `
    SELECT COUNT(*) AS total
    FROM actions a
    JOIN cases c ON a.case_id = c.id
    WHERE a.case_id = $1
    ${filterClause}
  `;
  const countRes = await query(countSql, params);
  const total = parseInt(countRes.rows[0].total, 10);

  const dataParams = [...params, limit, offset];
  const dataSql = `
    SELECT 
      a.id,
      a.case_id AS "caseId",
      a.action_type AS "actionType",
      a.from_status AS "fromStatus",
      a.to_status AS "toStatus",
      a.remark,
      a.visibility,
      a.created_at AS "createdAt",
      u.id AS "actorId",
      u.username AS "actorUsername",
      u.full_name AS "actorFullName",
      u.role AS "actorRole",
      a.actor_bureau AS "actorBureau"
    FROM actions a
    JOIN cases c ON a.case_id = c.id
    JOIN users u ON a.actor_id = u.id
    WHERE a.case_id = $1
    ${filterClause}
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `;
  const dataRes = await query(dataSql, dataParams);

  return { actions: dataRes.rows, total };
}
