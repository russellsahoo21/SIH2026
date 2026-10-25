import { query } from '../../db/connection.js';

export async function findUserByUsername(username) {
  const result = await query(
    `SELECT id, username, full_name, password_hash, role, bureau_code, region, active
     FROM users
     WHERE username = $1`,
    [username]
  );
  return result.rows[0] || null;
}

export async function findUserById(id) {
  const result = await query(
    `SELECT id, username, full_name, role, bureau_code, region, active
     FROM users
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}
