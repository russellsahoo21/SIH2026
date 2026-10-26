import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return next(new ApiError(401, 'UNAUTHENTICATED', 'Login required'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload; // { sub (userId), id, role, bureau, region, username }
    // Ensure req.user.id is accessible
    if (!req.user.id && req.user.sub) {
      req.user.id = Number(req.user.sub);
    }
    if (['STUDENT', 'COLLEGE'].includes(payload.role) && !['/api/student', '/api/auth'].includes(req.baseUrl)) {
      return next(new ApiError(403, 'FORBIDDEN', 'Public accounts can only access their own complaint portal'));
    }
    next();
  } catch (err) {
    return next(new ApiError(401, 'UNAUTHENTICATED', 'Session expired, please log in again'));
  }
}
