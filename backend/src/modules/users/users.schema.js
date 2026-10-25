import { z } from 'zod';
import { ROLES, BUREAUS } from '../../config/constants.js';

export const listUsersQuerySchema = z.object({
  bureau: z.string().optional(),
  role: z.enum(ROLES).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25)
});

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  fullName: z.string().min(1).max(255),
  password: z.string().min(6),
  role: z.enum(ROLES),
  bureauCode: z.enum(BUREAUS).nullable().optional(),
  region: z.string().max(100).nullable().optional()
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  role: z.enum(ROLES).optional(),
  bureauCode: z.enum(BUREAUS).nullable().optional(),
  region: z.string().max(100).nullable().optional(),
  active: z.coerce.number().int().min(0).max(1).optional()
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6)
});
