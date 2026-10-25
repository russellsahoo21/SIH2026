import { query } from '../../db/connection.js';

export async function getSlaDaysForCategory(category) {
  const res = await query('SELECT days FROM sla_config WHERE category = $1', [category]);
  if (res.rows.length > 0) {
    return Number(res.rows[0].days);
  }
  return 21; // Default SLA days
}

export async function findCaseRawById(id) {
  const res = await query('SELECT * FROM cases WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function findCaseById(id) {
  const sql = `
    SELECT 
      c.id,
      c.institution_id AS "institutionId",
      i.name AS "institutionName",
      i.permanent_id AS "institutionPermanentId",
      i.region AS "institutionRegion",
      c.bureau_code AS "bureau",
      c.category,
      c.category_source AS "categorySource",
      c.source_channel AS "sourceChannel",
      c.description,
      c.status,
      c.assigned_officer_id AS "assignedOfficerId",
      u.full_name AS "officerName",
      u.username AS "officerUsername",
      c.received_on AS "receivedOn",
      c.sla_days AS "slaDays",
      c.due_on AS "dueOn",
      c.disposed_on AS "disposedOn",
      c.last_action_at AS "lastActionAt",
      c.created_by AS "createdBy",
      c.created_at AS "createdAt",
      c.updated_at AS "updatedAt",
      c.version
    FROM cases c
    JOIN institutions i ON c.institution_id = i.id
    LEFT JOIN users u ON c.assigned_officer_id = u.id
    WHERE c.id = $1
  `;
  const res = await query(sql, [id]);
  return res.rows[0] || null;
}

export async function getLinkedOverlapSummary(caseId) {
  const sql = `
    SELECT 
      o.id,
      o.status,
      o.severity,
      o.lead_bureau AS "leadBureau",
      om.member_state AS "memberState"
    FROM overlap_members om
    JOIN "overlaps" o ON om.overlap_id = o.id
    WHERE om.case_id = $1 AND o.status IN ('OPEN', 'COORDINATING', 'LINKED')
    LIMIT 1
  `;
  const res = await query(sql, [caseId]);
  return res.rows[0] || null;
}

export async function findCases({
  bureau,
  status,
  category,
  institutionId,
  q,
  overdue,
  from,
  to,
  sort,
  offset = 0,
  limit = 25
}) {
  const conditions = [];
  const params = [];

  if (bureau) {
    params.push(bureau);
    conditions.push(`c.bureau_code = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`c.status = $${params.length}`);
  }

  if (category) {
    params.push(category);
    conditions.push(`c.category = $${params.length}`);
  }

  if (institutionId) {
    params.push(institutionId);
    conditions.push(`c.institution_id = $${params.length}`);
  }

  if (from) {
    params.push(from);
    conditions.push(`c.received_on >= $${params.length}`);
  }

  if (to) {
    params.push(to);
    conditions.push(`c.received_on <= $${params.length}`);
  }

  if (overdue === 'true') {
    conditions.push(`c.status != 'DISPOSED' AND c.due_on < CURRENT_DATE`);
  } else if (overdue === 'false') {
    conditions.push(`(c.status = 'DISPOSED' OR c.due_on >= CURRENT_DATE)`);
  }

  if (q) {
    params.push(`%${q}%`);
    conditions.push(`(c.id ILIKE $${params.length} OR c.description ILIKE $${params.length} OR i.name ILIKE $${params.length})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total matching
  const countSql = `
    SELECT COUNT(*) AS total
    FROM cases c
    JOIN institutions i ON c.institution_id = i.id
    ${whereClause}
  `;
  const countRes = await query(countSql, params);
  const total = parseInt(countRes.rows[0].total, 10);

  // Sorting
  let orderBy = 'c.created_at DESC, c.id DESC';
  if (sort) {
    const [field, dir] = sort.split(':');
    const direction = dir && dir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const allowedSortFields = {
      receivedOn: 'c.received_on',
      dueOn: 'c.due_on',
      createdAt: 'c.created_at',
      status: 'c.status',
      id: 'c.id'
    };
    if (allowedSortFields[field]) {
      orderBy = `${allowedSortFields[field]} ${direction}`;
    }
  }

  const dataParams = [...params, limit, offset];
  const dataSql = `
    SELECT 
      c.id,
      c.institution_id AS "institutionId",
      i.name AS "institutionName",
      i.permanent_id AS "institutionPermanentId",
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
    JOIN institutions i ON c.institution_id = i.id
    LEFT JOIN users u ON c.assigned_officer_id = u.id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `;
  const dataRes = await query(dataSql, dataParams);

  return { cases: dataRes.rows, total };
}

export async function insertCase(client, {
  id,
  institutionId,
  bureauCode,
  category,
  categorySource = 'MANUAL',
  sourceChannel,
  description,
  status = 'NEW',
  receivedOn,
  slaDays,
  dueOn,
  createdBy
}) {
  const sql = `
    INSERT INTO cases (
      id, institution_id, bureau_code, category, category_source,
      source_channel, description, status, received_on, sla_days,
      due_on, created_by, created_at, updated_at, last_action_at, version
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1
    )
    RETURNING *
  `;
  const res = await client.query(sql, [
    id,
    institutionId,
    bureauCode,
    category,
    categorySource,
    sourceChannel,
    description,
    status,
    receivedOn,
    slaDays,
    dueOn,
    createdBy
  ]);
  return res.rows[0];
}

export async function updateCaseWithVersion(client, id, patch, expectedVersion) {
  const fields = ['version = version + 1', 'last_action_at = CURRENT_TIMESTAMP', 'updated_at = CURRENT_TIMESTAMP'];
  const params = [id, expectedVersion];

  for (const [key, val] of Object.entries(patch)) {
    params.push(val);
    fields.push(`${key} = $${params.length}`);
  }

  const sql = `
    UPDATE cases
    SET ${fields.join(', ')}
    WHERE id = $1 AND version = $2
    RETURNING *
  `;
  const res = await client.query(sql, params);
  return res.rows[0] || null;
}
