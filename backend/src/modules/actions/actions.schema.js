import { z } from 'zod';

export const addRemarkSchema = z.object({
  remark: z.string().min(1, 'Remark cannot be empty'),
  visibility: z.enum(['SHARED', 'INTERNAL']).default('SHARED')
});

export const listActionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25)
});
