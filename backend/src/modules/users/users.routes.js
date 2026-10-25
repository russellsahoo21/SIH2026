import { Router } from 'express';
import { getUsers, createUser, updateUser, resetPassword } from './users.controller.js';
import { listUsersQuerySchema, createUserSchema, updateUserSchema, resetPasswordSchema } from './users.schema.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';

const router = Router();

router.use(authenticate);

// GET /api/users
router.get(
  '/',
  requireRole('ADMIN', 'HEAD'),
  validate({ query: listUsersQuerySchema }),
  getUsers
);

// POST /api/users
router.post(
  '/',
  requireRole('ADMIN'),
  validate({ body: createUserSchema }),
  createUser
);

// PATCH /api/users/:id
router.patch(
  '/:id',
  requireRole('ADMIN'),
  validate({ body: updateUserSchema }),
  updateUser
);

// POST /api/users/:id/reset-password
router.post(
  '/:id/reset-password',
  requireRole('ADMIN'),
  validate({ body: resetPasswordSchema }),
  resetPassword
);

export default router;
