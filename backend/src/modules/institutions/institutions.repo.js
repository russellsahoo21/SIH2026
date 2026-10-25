import { query } from '../../db/connection.js';

/**
 * Institutions Repository
 * Owned by Dev B. All database operations for institutions.
 */

export async function findInstitutionById(id) {
  const sql = `
    SELECT 
      id,
      permanent_id AS "permanentId",
      name,
      normalized_name AS "normalizedName",
      address,
      region,
      active
    FROM institutions
    WHERE id = $1
  `;
  const res = await query(sql, [id]);
  return res.rows[0] || null;
}

export async function findInstitutionByPermanentId(permanentId) {
  const sql = `
    SELECT 
      id,
      permanent_id AS "permanentId",
      name,
      normalized_name AS "normalizedName",
      address,
      region,
      active
    FROM institutions
    WHERE permanent_id = $1
  `;
  const res = await query(sql, [permanentId]);
  return res.rows[0] || null;
}

export async function getAllActiveInstitutions() {
  const sql = `
    SELECT 
      id,
      permanent_id AS "permanentId",
      name,
      normalized_name AS "normalizedName",
      address,
      region,
      active
    FROM institutions
    WHERE active = 1
  `;
  const res = await query(sql);
  return res.rows;
}

export async function listInstitutions({ region, offset = 0, limit = 25 }) {
  const conditions = [];
  const params = [];

  if (region) {
    params.push(region);
    conditions.push(`region = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) AS total FROM institutions ${whereClause}`;
  const countRes = await query(countSql, params);
  const total = parseInt(countRes.rows[0].total, 10);

  const dataParams = [...params, limit, offset];
  const dataSql = `
    SELECT 
      id,
      permanent_id AS "permanentId",
      name,
      normalized_name AS "normalizedName",
      address,
      region,
      active
    FROM institutions
    ${whereClause}
    ORDER BY name ASC, id ASC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `;
  const dataRes = await query(dataSql, dataParams);

  return { institutions: dataRes.rows, total };
}

export async function getCaseCountsForInstitution(institutionId) {
  const sql = `
    SELECT 
      COUNT(*) AS total,
      COUNT(CASE WHEN status = 'NEW' THEN 1 END) AS "countNew",
      COUNT(CASE WHEN status = 'UNDER_PROCESS' THEN 1 END) AS "countUnderProcess",
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS "countPending",
      COUNT(CASE WHEN status = 'TRANSFERRED' THEN 1 END) AS "countTransferred",
      COUNT(CASE WHEN status = 'ESCALATED' THEN 1 END) AS "countEscalated",
      COUNT(CASE WHEN status = 'DISPOSED' THEN 1 END) AS "countDisposed",
      COUNT(CASE WHEN status != 'DISPOSED' AND due_on < CURRENT_DATE THEN 1 END) AS "countOverdue",
      bureau_code AS "bureauCode",
      COUNT(*) AS "bureauCount"
    FROM cases
    WHERE institution_id = $1
    GROUP BY bureau_code
  `;
  const res = await query(sql, [institutionId]);

  let total = 0;
  let overdue = 0;
  const byStatus = {
    NEW: 0,
    UNDER_PROCESS: 0,
    PENDING: 0,
    TRANSFERRED: 0,
    ESCALATED: 0,
    DISPOSED: 0
  };
  const byBureau = {
    RB: 0,
    PGRC: 0,
    RO: 0,
    CELL: 0
  };

  for (const row of res.rows) {
    const bTotal = parseInt(row.bureauCount, 10) || 0;
    total += bTotal;
    overdue += parseInt(row.countOverdue, 10) || 0;
    byStatus.NEW += parseInt(row.countNew, 10) || 0;
    byStatus.UNDER_PROCESS += parseInt(row.countUnderProcess, 10) || 0;
    byStatus.PENDING += parseInt(row.countPending, 10) || 0;
    byStatus.TRANSFERRED += parseInt(row.countTransferred, 10) || 0;
    byStatus.ESCALATED += parseInt(row.countEscalated, 10) || 0;
    byStatus.DISPOSED += parseInt(row.countDisposed, 10) || 0;

    if (row.bureauCode) {
      byBureau[row.bureauCode] = (byBureau[row.bureauCode] || 0) + bTotal;
    }
  }

  return {
    total,
    byStatus,
    byBureau,
    overdue
  };
}

export async function findCasesByInstitution(institutionId, {
  status,
  bureau,
  from,
  to,
  offset = 0,
  limit = 25
}) {
  const conditions = ['c.institution_id = $1'];
  const params = [institutionId];

  if (status) {
    params.push(status);
    conditions.push(`c.status = $${params.length}`);
  }

  if (bureau) {
    params.push(bureau);
    conditions.push(`c.bureau_code = $${params.length}`);
  }

  if (from) {
    params.push(from);
    conditions.push(`c.received_on >= $${params.length}`);
  }

  if (to) {
    params.push(to);
    conditions.push(`c.received_on <= $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countSql = `SELECT COUNT(*) AS total FROM cases c ${whereClause}`;
  const countRes = await query(countSql, params);
  const total = parseInt(countRes.rows[0].total, 10);

  const dataParams = [...params, limit, offset];
  const dataSql = `
    SELECT 
      c.id,
      c.institution_id AS "institutionId",
      c.bureau_code AS "bureau",
      c.category,
      c.source_channel AS "sourceChannel",
      c.description,
      c.status,
      c.assigned_officer_id AS "assignedOfficerId",
      u.full_name AS "officerName",
      c.received_on AS "receivedOn",
      c.sla_days AS "slaDays",
      c.due_on AS "dueOn",
      c.disposed_on AS "disposedOn",
      c.last_action_at AS "lastActionAt",
      c.created_at AS "createdAt",
      c.version
    FROM cases c
    LEFT JOIN users u ON c.assigned_officer_id = u.id
    ${whereClause}
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `;
  const dataRes = await query(dataSql, dataParams);

  return { cases: dataRes.rows, total };
}

export async function findOverlapsByInstitution(institutionId) {
  const sql = `
    SELECT 
      o.id,
      o.institution_id AS "institutionId",
      o.status,
      o.severity,
      o.lead_bureau AS "leadBureau",
      o.notes,
      o.reviewed_by AS "reviewedBy",
      o.created_at AS "createdAt",
      o.updated_at AS "updatedAt",
      COUNT(om.case_id) AS "memberCount"
    FROM "overlaps" o
    LEFT JOIN overlap_members om ON o.id = om.overlap_id
    WHERE o.institution_id = $1 AND o.status IN ('OPEN', 'COORDINATING', 'LINKED')
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;
  const res = await query(sql, [institutionId]);

  return res.rows.map((row) => ({
    ...row,
    memberCount: parseInt(row.memberCount, 10) || 0
  }));
}

export async function insertInstitution({ permanentId, name, normalizedName, address, region }) {
  const sql = `
    INSERT INTO institutions (permanent_id, name, normalized_name, address, region, active)
    VALUES ($1, $2, $3, $4, $5, 1)
    RETURNING 
      id,
      permanent_id AS "permanentId",
      name,
      normalized_name AS "normalizedName",
      address,
      region,
      active
  `;
  const res = await query(sql, [permanentId, name, normalizedName, address || '', region]);
  return res.rows[0];
}

export async function updateInstitution(id, patch) {
  const fields = [];
  const params = [id];

  for (const [key, val] of Object.entries(patch)) {
    params.push(val);
    fields.push(`${key} = $${params.length}`);
  }

  const sql = `
    UPDATE institutions
    SET ${fields.join(', ')}
    WHERE id = $1
    RETURNING 
      id,
      permanent_id AS "permanentId",
      name,
      normalized_name AS "normalizedName",
      address,
      region,
      active
  `;
  const res = await query(sql, params);
  return res.rows[0] || null;
}
