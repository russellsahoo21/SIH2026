import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import * as authRepo from './auth.repo.js';

export async function login(username, password) {
  const user = await authRepo.findUserByUsername(username);

  if (!user) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Invalid username or password');
  }

  // Security rule: system account cannot log in
  if (user.username === 'system') {
    throw new ApiError(403, 'FORBIDDEN', 'System account cannot log in');
  }

  if (Number(user.active) !== 1) {
    throw new ApiError(403, 'FORBIDDEN', 'User account is deactivated');
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Invalid username or password');
  }

  const tokenPayload = {
    sub: user.id,
    id: user.id,
    username: user.username,
    role: user.role,
    bureau: user.bureau_code,
    region: user.region
  };

  const token = jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      bureau: user.bureau_code,
      region: user.region
    }
  };
}

export async function getMe(userId) {
  const user = await authRepo.findUserById(userId);
  if (!user || Number(user.active) !== 1) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'User no longer active or found');
  }

  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
    bureau: user.bureau_code,
    region: user.region
  };
}
