import { query } from '../../db/connection.js';

export async function getSummaryCounts(filters = {}) {
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

  // 1. Counts grouped by status
  const statusSql = `
    SELECT c.status, count(*)::int AS count
    FROM cases c
    JOIN institutions i ON c.institution_id = i.id
    ${whereClause}
    GROUP BY c.status
  `;
  const statusRes = await query(statusSql, params);

  // 2. Overdue count (open cases where due_on < CURRENT_DATE)
  const overdueConditions = [...conditions, `c.status != 'DISPOSED'`, `c.due_on < CURRENT_DATE`];
  const overdueSql = `
    SELECT count(*)::int AS count
    FROM cases c
    JOIN institutions i ON c.institution_id = i.id
    WHERE ${overdueConditions.join(' AND ')}
  `;
  const overdueRes = await query(overdueSql, params);

  // 3. Open overlaps count
  const overlapsRes = await query(
    `SELECT count(*)::int AS count FROM "overlaps" WHERE status IN ('OPEN', 'COORDINATING')`
  );

  return {
    statusRows: statusRes.rows,
    overdueCount: overdueRes.rows[0]?.count || 0,
    openOverlaps: overlapsRes.rows[0]?.count || 0
  };
}

export async function getWorkload(bureau = null) {
  const params = bureau ? [bureau] : [];
  const bureauCondition = bureau ? 'AND c.bureau_code = $1' : '';

  const byBureauSql = `
    SELECT c.bureau_code, count(*)::int AS count
    FROM cases c
    WHERE c.status != 'DISPOSED' ${bureauCondition}
    GROUP BY c.bureau_code
    ORDER BY c.bureau_code ASC
  `;
  const byBureauRes = await query(byBureauSql, params);

  const byOfficerSql = `
    SELECT c.bureau_code, c.assigned_officer_id AS officer_id, u.full_name AS officer_name, count(*)::int AS open_cases
    FROM cases c
    JOIN users u ON c.assigned_officer_id = u.id
    WHERE c.status != 'DISPOSED' ${bureauCondition}
    GROUP BY c.bureau_code, c.assigned_officer_id, u.full_name
    ORDER BY open_cases DESC
  `;
  const byOfficerRes = await query(byOfficerSql, params);

  const unassignedSql = `
    SELECT c.bureau_code, count(*)::int AS open_cases
    FROM cases c
    WHERE c.status != 'DISPOSED' AND c.assigned_officer_id IS NULL ${bureauCondition}
    GROUP BY c.bureau_code
  `;
  const unassignedRes = await query(unassignedSql, params);

  return {
    byBureau: byBureauRes.rows,
    byOfficer: byOfficerRes.rows,
    unassigned: unassignedRes.rows
  };
}

export async function getAgeingBands(bureau = null) {
  const params = bureau ? [bureau] : [];
  const bureauCondition = bureau ? 'AND bureau_code = $1' : '';

  const sql = `
    SELECT
      count(*) FILTER (WHERE (CURRENT_DATE - received_on) <= 7)::int AS "0_to_7_days",
      count(*) FILTER (WHERE (CURRENT_DATE - received_on) BETWEEN 8 AND 14)::int AS "8_to_14_days",
      count(*) FILTER (WHERE (CURRENT_DATE - received_on) BETWEEN 15 AND 21)::int AS "15_to_21_days",
      count(*) FILTER (WHERE (CURRENT_DATE - received_on) >= 22)::int AS "22_plus_days",
      count(*)::int AS total_open
    FROM cases
    WHERE status != 'DISPOSED' ${bureauCondition}
  `;
  const res = await query(sql, params);
  return res.rows[0] || {
    "0_to_7_days": 0,
    "8_to_14_days": 0,
    "15_to_21_days": 0,
    "22_plus_days": 0,
    total_open: 0
  };
}

export async function getTopOverdue(limit = 10, bureau = null) {
  const params = [limit];
  let bureauClause = '';
  if (bureau) {
    params.push(bureau);
    bureauClause = 'AND c.bureau_code = $2';
  }

  const sql = `
    SELECT
      c.id,
      i.name AS "institutionName",
      c.bureau_code AS bureau,
      c.category,
      c.status,
      c.received_on AS "receivedOn",
      c.due_on AS "dueOn",
      (CURRENT_DATE - c.due_on)::int AS "daysOverdue",
      u.full_name AS "assignedOfficerName"
    FROM cases c
    JOIN institutions i ON c.institution_id = i.id
    LEFT JOIN users u ON c.assigned_officer_id = u.id
    WHERE c.status != 'DISPOSED'
      AND c.due_on < CURRENT_DATE
      ${bureauClause}
    ORDER BY "daysOverdue" DESC
    LIMIT $1
  `;
  const res = await query(sql, params);
  return res.rows;
}

export async function getMonthlyDisposal(year = new Date().getFullYear(), bureau = null) {
  const params = [year];
  let bureauClause = '';
  if (bureau) {
    params.push(bureau);
    bureauClause = 'AND bureau_code = $2';
  }

  const sql = `
    SELECT
      EXTRACT(MONTH FROM disposed_on)::int AS month,
      count(*)::int AS count
    FROM cases
    WHERE status = 'DISPOSED'
      AND disposed_on IS NOT NULL
      AND EXTRACT(YEAR FROM disposed_on) = $1
      ${bureauClause}
    GROUP BY EXTRACT(MONTH FROM disposed_on)
    ORDER BY month ASC
  `;
  const res = await query(sql, params);
  return res.rows;
}

export async function getRegionSummary() {
  const sql = `
    SELECT
      i.region,
      count(*)::int AS total,
      count(*) FILTER (WHERE c.status != 'DISPOSED')::int AS open,
      count(*) FILTER (WHERE c.status = 'DISPOSED')::int AS disposed,
      count(*) FILTER (WHERE c.status != 'DISPOSED' AND c.due_on < CURRENT_DATE)::int AS overdue
    FROM cases c
    JOIN institutions i ON c.institution_id = i.id
    GROUP BY i.region
    ORDER BY i.region ASC
  `;
  const res = await query(sql);
  return res.rows;
}
