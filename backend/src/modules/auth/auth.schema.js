import { z } from 'zod';
import { ROLES, BUREAUS } from '../../config/constants.js';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  fullName: z.string().min(1, 'Full name is required').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(ROLES).default('OFFICER'),
  bureauCode: z.enum(BUREAUS).nullable().optional(),
  region: z.string().max(100).nullable().optional()
});

