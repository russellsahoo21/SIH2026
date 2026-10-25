import { query } from '../../db/connection.js';

/**
 * Overlaps Repository
 * Owned by Dev B. All database operations for overlap groups and members.
 */

export async function findOverlapById(id, client = null) {
  const runner = client ? client.query.bind(client) : query;
  const sql = `
    SELECT 
      o.id,
      o.institution_id AS "institutionId",
      i.name AS "institutionName",
      i.permanent_id AS "institutionPermanentId",
      i.region AS "institutionRegion",
      o.status,
      o.severity,
      o.lead_bureau AS "leadBureau",
      o.notes,
      o.reviewed_by AS "reviewedBy",
      u.full_name AS "reviewerName",
      o.created_at AS "createdAt",
      o.updated_at AS "updatedAt"
    FROM "overlaps" o
    JOIN institutions i ON o.institution_id = i.id
    LEFT JOIN users u ON o.reviewed_by = u.id
    WHERE o.id = $1
  `;
  const res = await runner(sql, [id]);
  return res.rows[0] || null;
}

export async function findOverlapMembers(overlapId, client = null) {
  const runner = client ? client.query.bind(client) : query;
  const sql = `
    SELECT 
      om.overlap_id AS "overlapId",
      om.case_id AS "caseId",
      om.similarity,
      om.member_state AS "memberState",
      c.bureau_code AS "bureau",
      c.category,
      c.source_channel AS "sourceChannel",
      c.description,
      c.status,
      c.received_on AS "receivedOn",
      c.sla_days AS "slaDays",
      c.due_on AS "dueOn",
      c.assigned_officer_id AS "assignedOfficerId",
      u.full_name AS "officerName",
      c.version
    FROM overlap_members om
    JOIN cases c ON om.case_id = c.id
    LEFT JOIN users u ON c.assigned_officer_id = u.id
    WHERE om.overlap_id = $1
    ORDER BY om.similarity DESC, c.received_on ASC
  `;
  const res = await runner(sql, [overlapId]);
  return res.rows;
}

export async function findActiveOverlapForInstitution(institutionId, client = null) {
  const runner = client ? client.query.bind(client) : query;
  const sql = `
    SELECT * 
    FROM "overlaps"
    WHERE institution_id = $1 AND status IN ('OPEN', 'COORDINATING', 'LINKED')
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const res = await runner(sql, [institutionId]);
  return res.rows[0] || null;
}

export async function findOverlapGroupsContainingCase(caseId, client = null) {
  const runner = client ? client.query.bind(client) : query;
  const sql = `
    SELECT o.*
    FROM "overlaps" o
    JOIN overlap_members om ON o.id = om.overlap_id
    WHERE om.case_id = $1 AND o.status IN ('OPEN', 'COORDINATING', 'LINKED')
  `;
  const res = await runner(sql, [caseId]);
  return res.rows;
}

export async function findOpenCasesForInstitutionExcludingBureau(institutionId, bureauCode, excludeCaseId) {
  const sql = `
    SELECT 
      id,
      institution_id AS "institutionId",
      bureau_code AS "bureauCode",
      category,
      description,
      status,
      received_on AS "receivedOn",
      created_by AS "createdBy"
    FROM cases
    WHERE institution_id = $1 
      AND bureau_code != $2 
      AND id != $3
      AND status != 'DISPOSED'
  `;
  const res = await query(sql, [institutionId, bureauCode, excludeCaseId]);
  return res.rows;
}

export async function createOverlap(client, { institutionId, status = 'OPEN', severity = 'MEDIUM', leadBureau = null, notes = null }) {
  const sql = `
    INSERT INTO "overlaps" (institution_id, status, severity, lead_bureau, notes, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  const res = await client.query(sql, [institutionId, status, severity, leadBureau, notes]);
  return res.rows[0];
}

export async function insertOrUpdateMember(client, { overlapId, caseId, similarity, memberState = 'DETECTED' }) {
  const sql = `
    INSERT INTO overlap_members (overlap_id, case_id, similarity, member_state)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (overlap_id, case_id) 
    DO UPDATE SET 
      similarity = $3,
      member_state = CASE 
        WHEN overlap_members.member_state = 'LINKED' THEN 'LINKED' 
        ELSE $4 
      END
    RETURNING *
  `;
  const res = await client.query(sql, [overlapId, caseId, similarity, memberState]);
  return res.rows[0];
}

export async function updateOverlapSeverity(client, overlapId, severity) {
  const sql = `
    UPDATE "overlaps"
    SET severity = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const res = await client.query(sql, [overlapId, severity]);
  return res.rows[0];
}

export async function updateOverlapMetadata(client, overlapId, { status, leadBureau, notes, reviewedBy }) {
  const fields = ['updated_at = CURRENT_TIMESTAMP'];
  const params = [overlapId];

  if (status !== undefined) {
    params.push(status);
    fields.push(`status = $${params.length}`);
  }
  if (leadBureau !== undefined) {
    params.push(leadBureau);
    fields.push(`lead_bureau = $${params.length}`);
  }
  if (notes !== undefined) {
    params.push(notes);
    fields.push(`notes = $${params.length}`);
  }
  if (reviewedBy !== undefined) {
    params.push(reviewedBy);
    fields.push(`reviewed_by = $${params.length}`);
  }

  const sql = `
    UPDATE "overlaps"
    SET ${fields.join(', ')}
    WHERE id = $1
    RETURNING *
  `;
  const res = await client.query(sql, params);
  return res.rows[0];
}

export async function updateMemberStates(client, overlapId, caseIds, memberState) {
  const sql = `
    UPDATE overlap_members
    SET member_state = $3
    WHERE overlap_id = $1 AND case_id = ANY($2::varchar[])
    RETURNING *
  `;
  const res = await client.query(sql, [overlapId, caseIds, memberState]);
  return res.rows;
}

export async function removeMember(client, overlapId, caseId) {
  const sql = `
    DELETE FROM overlap_members
    WHERE overlap_id = $1 AND case_id = $2
  `;
  await client.query(sql, [overlapId, caseId]);
}

export async function listOverlaps({
  status,
  severity,
  bureau,
  officerBureau,
  offset = 0,
  limit = 25
}) {
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`o.status = $${params.length}`);
  }

  if (severity) {
    params.push(severity);
    conditions.push(`o.severity = $${params.length}`);
  }

  // Filter by bureau query or officer/head own bureau restriction
  if (bureau) {
    params.push(bureau);
    conditions.push(`EXISTS (
      SELECT 1 FROM overlap_members om2 
      JOIN cases c2 ON om2.case_id = c2.id 
      WHERE om2.overlap_id = o.id AND c2.bureau_code = $${params.length}
    )`);
  }

  if (officerBureau) {
    params.push(officerBureau);
    conditions.push(`EXISTS (
      SELECT 1 FROM overlap_members om3 
      JOIN cases c3 ON om3.case_id = c3.id 
      WHERE om3.overlap_id = o.id AND c3.bureau_code = $${params.length}
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*) AS total
    FROM "overlaps" o
    ${whereClause}
  `;
  const countRes = await query(countSql, params);
  const total = parseInt(countRes.rows[0].total, 10);

  const dataParams = [...params, limit, offset];
  const dataSql = `
    SELECT 
      o.id,
      o.institution_id AS "institutionId",
      i.name AS "institutionName",
      i.permanent_id AS "institutionPermanentId",
      o.status,
      o.severity,
      o.lead_bureau AS "leadBureau",
      o.notes,
      o.created_at AS "createdAt",
      o.updated_at AS "updatedAt",
      COUNT(DISTINCT om.case_id) AS "caseCount",
      COALESCE(
        ARRAY_AGG(DISTINCT c.bureau_code) FILTER (WHERE c.bureau_code IS NOT NULL), 
        '{}'
      ) AS bureaus
    FROM "overlaps" o
    JOIN institutions i ON o.institution_id = i.id
    LEFT JOIN overlap_members om ON o.id = om.overlap_id
    LEFT JOIN cases c ON om.case_id = c.id
    ${whereClause}
    GROUP BY o.id, i.name, i.permanent_id
    ORDER BY o.updated_at DESC, o.id DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `;
  const dataRes = await query(dataSql, dataParams);

  const mapped = dataRes.rows.map((row) => ({
    id: row.id,
    institutionId: row.institutionId,
    institutionName: row.institutionName,
    institutionPermanentId: row.institutionPermanentId,
    status: row.status,
    severity: row.severity,
    leadBureau: row.leadBureau,
    notes: row.notes,
    caseCount: parseInt(row.caseCount, 10) || 0,
    bureaus: row.bureaus || [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));

  return { overlaps: mapped, total };
}
