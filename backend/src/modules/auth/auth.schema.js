import { z } from 'zod';


export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  fullName: z.string().min(1, 'Full name is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  role: z.enum(['STUDENT', 'COLLEGE']).default('STUDENT'),
  bureauCode: z.null().optional(),
  region: z.string().max(100).nullable().optional()
});

