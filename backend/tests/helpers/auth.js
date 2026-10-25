import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';

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
