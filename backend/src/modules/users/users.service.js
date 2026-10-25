import bcrypt from 'bcryptjs';
import * as usersRepo from './users.repo.js';
import { ApiError } from '../../utils/ApiError.js';

export async function listUsers(filters, actor) {
  // If actor is HEAD, enforce own bureau filter
  let bureau = filters.bureau;
  if (actor.role === 'HEAD') {
    bureau = actor.bureau;
  }

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const offset = (page - 1) * pageSize;

  const { users, total } = await usersRepo.findUsers({
    bureau,
    role: filters.role,
    offset,
    limit: pageSize
  });

  return {
    users,
    meta: {
      page,
      pageSize,
      total
    }
  };
}

export async function createUser(data) {
  const existing = await usersRepo.findUserByUsername(data.username);
  if (existing) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Username already exists', [
      { path: 'username', message: 'Username is taken' }
    ]);
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  return await usersRepo.createUser({
    username: data.username,
    fullName: data.fullName,
    passwordHash,
    role: data.role,
    bureauCode: data.bureauCode,
    region: data.region
  });
}

export async function updateUser(id, patch) {
  const user = await usersRepo.findUserById(id);
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }

  return await usersRepo.updateUser(id, patch);
}

export async function resetPassword(id, newPassword) {
  const user = await usersRepo.findUserById(id);
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await usersRepo.updatePassword(id, passwordHash);
  return { message: 'Password reset successfully' };
}
