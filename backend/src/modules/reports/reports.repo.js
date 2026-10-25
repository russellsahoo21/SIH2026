import { query } from '../../db/connection.js';

export async function getInstitutionWiseReport(filters = {}) {
  const { bureau, region, from, to } = filters;
  const conditions = [];
  const params = [];

  if (bureau) {
    params.push(bureau);
    conditions.push(`c.bureau_code = $${params.length}`);
  }
  if (region) {
    params.push(region);
    conditions.push(`i.region = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`c.received_on >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`c.received_on <= $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      i.permanent_id AS "institutionPermanentId",
      i.name AS "institutionName",
      i.region,
      count(c.id)::int AS "totalCases",
      count(c.id) FILTER (WHERE c.status != 'DISPOSED')::int AS "openCases",
      count(c.id) FILTER (WHERE c.status = 'DISPOSED')::int AS "disposedCases",
      count(c.id) FILTER (WHERE c.status != 'DISPOSED' AND c.due_on < CURRENT_DATE)::int AS "overdueCases"
    FROM institutions i
    LEFT JOIN cases c ON i.id = c.institution_id
    ${whereClause}
    GROUP BY i.id, i.permanent_id, i.name, i.region
    ORDER BY "totalCases" DESC, i.name ASC
  `;
  const res = await query(sql, params);
  return res.rows;
}

export async function getRegionWiseReport(filters = {}) {
  const { bureau, from, to } = filters;
  const conditions = [];
  const params = [];

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

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      i.region,
      count(c.id)::int AS "totalRegistered",
      count(c.id) FILTER (WHERE c.status != 'DISPOSED')::int AS "openCases",
      count(c.id) FILTER (WHERE c.status = 'DISPOSED')::int AS "disposedCases",
      count(c.id) FILTER (WHERE c.status != 'DISPOSED' AND c.due_on < CURRENT_DATE)::int AS "overdueCases"
    FROM institutions i
    LEFT JOIN cases c ON i.id = c.institution_id
    ${whereClause}
    GROUP BY i.region
    ORDER BY i.region ASC
  `;
  const res = await query(sql, params);
  return res.rows;
}

export async function getBureauWiseReport(filters = {}) {
  const { from, to } = filters;
  const conditions = [];
  const params = [];

  if (from) {
    params.push(from);
    conditions.push(`c.received_on >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`c.received_on <= $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      b.code AS "bureauCode",
      b.name AS "bureauName",
      count(c.id)::int AS "totalRegistered",
      count(c.id) FILTER (WHERE c.status = 'UNDER_PROCESS')::int AS "underProcess",
      count(c.id) FILTER (WHERE c.status = 'ESCALATED')::int AS "escalated",
      count(c.id) FILTER (WHERE c.status = 'DISPOSED')::int AS "disposed",
      ROUND(AVG(c.disposed_on - c.received_on) FILTER (WHERE c.status = 'DISPOSED'), 1) AS "avgResolutionDays"
    FROM bureaus b
    LEFT JOIN cases c ON b.code = c.bureau_code
    ${whereClause}
    GROUP BY b.code, b.name
    ORDER BY b.code ASC
  `;
  const res = await query(sql, params);
  return res.rows;
}

export async function getAgeingReport(filters = {}) {
  const { bureau, region, from, to } = filters;
  const conditions = [`c.status != 'DISPOSED'`];
  const params = [];

  if (bureau) {
    params.push(bureau);
    conditions.push(`c.bureau_code = $${params.length}`);
  }
  if (region) {
    params.push(region);
    conditions.push(`i.region = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`c.received_on >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`c.received_on <= $${params.length}`);
  }

  const sql = `
    SELECT
      c.id AS "caseId",
      i.name AS "institutionName",
      c.bureau_code AS bureau,
      c.category,
      c.received_on AS "receivedOn",
      c.due_on AS "dueOn",
      (CURRENT_DATE - c.received_on)::int AS "daysElapsed",
      CASE
        WHEN (CURRENT_DATE - c.received_on) <= 7 THEN '0-7 days'
        WHEN (CURRENT_DATE - c.received_on) BETWEEN 8 AND 14 THEN '8-14 days'
        WHEN (CURRENT_DATE - c.received_on) BETWEEN 15 AND 21 THEN '15-21 days'
        ELSE '22+ days'
      END AS "ageBand",
      c.status,
      COALESCE(u.full_name, 'Unassigned') AS "assignedOfficer"
    FROM cases c
    JOIN institutions i ON c.institution_id = i.id
    LEFT JOIN users u ON c.assigned_officer_id = u.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY "daysElapsed" DESC
  `;
  const res = await query(sql, params);
  return res.rows;
}

export async function getOverlapsReport() {
  const sql = `
    SELECT
      o.id AS "overlapId",
      i.name AS "institutionName",
      i.permanent_id AS "permanentId",
      o.severity,
      o.status,
      COALESCE(o.lead_bureau, 'None Assigned') AS "leadBureau",
      STRING_AGG(om.case_id, ', ') AS "memberCases",
      o.created_at AS "createdAt"
    FROM "overlaps" o
    JOIN institutions i ON o.institution_id = i.id
    LEFT JOIN overlap_members om ON o.id = om.overlap_id
    GROUP BY o.id, i.name, i.permanent_id, o.severity, o.status, o.lead_bureau, o.created_at
    ORDER BY o.id DESC
  `;
  const res = await query(sql);
  return res.rows;
}
