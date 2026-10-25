import { query } from '../../db/connection.js';

export async function findAllSlaConfigs() {
  const result = await query(
    'SELECT category, days, updated_by, updated_at FROM sla_config ORDER BY category ASC'
  );
  return result.rows;
}

export async function findSlaConfigByCategory(category) {
  const result = await query(
    'SELECT category, days, updated_by, updated_at FROM sla_config WHERE category = $1',
    [category]
  );
  return result.rows[0] || null;
}

export async function upsertSlaConfig(category, days, userId) {
  const result = await query(
    `INSERT INTO sla_config (category, days, updated_by, updated_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (category)
     DO UPDATE SET days = EXCLUDED.days, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP
     RETURNING category, days, updated_by, updated_at`,
    [category, days, userId]
  );
  return result.rows[0];
}
