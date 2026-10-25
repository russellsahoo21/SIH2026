import { query } from '../../db/connection.js';

export async function findUsers({ bureau, role, offset = 0, limit = 25 }) {
  const conditions = [];
  const params = [];

  if (bureau) {
    params.push(bureau);
    conditions.push(`bureau_code = $${params.length}`);
  }

  if (role) {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(`SELECT COUNT(*) AS total FROM users ${whereClause}`, params);
  const total = parseInt(countRes.rows[0].total, 10);

  const dataParams = [...params, limit, offset];
  const dataRes = await query(
    `SELECT id, username, full_name AS "fullName", role, bureau_code AS "bureau", region, active, created_at AS "createdAt"
     FROM users
     ${whereClause}
     ORDER BY id ASC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { users: dataRes.rows, total };
}

export async function findUserById(id) {
  const result = await query(
    `SELECT id, username, full_name AS "fullName", role, bureau_code AS "bureau", region, active, created_at AS "createdAt"
     FROM users
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function findUserByUsername(username) {
  const result = await query(
    `SELECT id, username FROM users WHERE username = $1`,
    [username]
  );
  return result.rows[0] || null;
}

export async function createUser({ username, fullName, passwordHash, role, bureauCode, region }) {
  const result = await query(
    `INSERT INTO users (username, full_name, password_hash, role, bureau_code, region, active)
     VALUES ($1, $2, $3, $4, $5, $6, 1)
     RETURNING id, username, full_name AS "fullName", role, bureau_code AS "bureau", region, active, created_at AS "createdAt"`,
    [username, fullName, passwordHash, role, bureauCode || null, region || null]
  );
  return result.rows[0];
}

export async function updateUser(id, { fullName, role, bureauCode, region, active }) {
  const fields = [];
  const params = [id];

  if (fullName !== undefined) {
    params.push(fullName);
    fields.push(`full_name = $${params.length}`);
  }
  if (role !== undefined) {
    params.push(role);
    fields.push(`role = $${params.length}`);
  }
  if (bureauCode !== undefined) {
    params.push(bureauCode);
    fields.push(`bureau_code = $${params.length}`);
  }
  if (region !== undefined) {
    params.push(region);
    fields.push(`region = $${params.length}`);
  }
  if (active !== undefined) {
    params.push(active);
    fields.push(`active = $${params.length}`);
  }

  if (fields.length === 0) {
    return findUserById(id);
  }

  const result = await query(
    `UPDATE users
     SET ${fields.join(', ')}
     WHERE id = $1
     RETURNING id, username, full_name AS "fullName", role, bureau_code AS "bureau", region, active, created_at AS "createdAt"`,
    params
  );
  return result.rows[0] || null;
}

export async function updatePassword(id, passwordHash) {
  await query(
    `UPDATE users SET password_hash = $2 WHERE id = $1`,
    [id, passwordHash]
  );
}
