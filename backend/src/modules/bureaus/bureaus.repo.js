import { query } from '../../db/connection.js';

export async function findActiveBureaus() {
  const result = await query(
    'SELECT code, name, active FROM bureaus WHERE active = 1 ORDER BY code ASC'
  );
  return result.rows;
}

export async function findBureauByCode(code) {
  const result = await query(
    'SELECT code, name, active FROM bureaus WHERE code = $1',
    [code]
  );
  return result.rows[0] || null;
}
