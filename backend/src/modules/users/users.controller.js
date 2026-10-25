import * as usersService from './users.service.js';
import { sendSuccess } from '../../utils/response.js';

export async function getUsers(req, res, next) {
  try {
    const { users, meta } = await usersService.listUsers(req.query, req.user);
    return sendSuccess(res, users, meta);
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const newUser = await usersService.createUser(req.body);
    return sendSuccess(res, newUser, undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const updated = await usersService.updateUser(Number(req.params.id), req.body);
    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const result = await usersService.resetPassword(Number(req.params.id), req.body.password);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
