import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import { query } from '../../src/db/connection.js';

let userCache = null;

export async function getUserToken(username) {
  if (!userCache) {
    const res = await query('SELECT id, username, role, bureau_code AS bureau, region FROM users');
    userCache = new Map(res.rows.map((u) => [u.username, u]));
  }
  const u = userCache.get(username);
  if (!u) {
    return makeTestToken({ username, role: 'ADMIN' });
  }
  return jwt.sign(
    {
      sub: u.id,
      id: u.id,
      username: u.username,
      role: u.role,
      bureau: u.bureau,
      region: u.region
    },
    env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

export function makeTestToken(user = {}) {
  const payload = {
    sub: user.id || 16,
    id: user.id || 16,
    username: user.username || 'admin',
    role: user.role || 'ADMIN',
    bureau: user.bureau || null,
    region: user.region || null
  };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '8h' });
}

export function generateToken(user = {}) {
  const defaults = {
    sub: 1,
    id: 1,
    username: 'test.user',
    fullName: 'Test User',
    role: 'OFFICER',
    bureau: 'RB',
    region: 'North'
  };

  const payload = { ...defaults, ...user };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });
}
