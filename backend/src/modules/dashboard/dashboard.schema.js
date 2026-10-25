import { z } from 'zod';
import { BUREAUS } from '../../config/constants.js';

export const summaryQuerySchema = z.object({
  bureau: z.string().toUpperCase().refine((val) => BUREAUS.includes(val), {
    message: `bureau must be one of: ${BUREAUS.join(', ')}`
  }).optional(),
  region: z.string().trim().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD').optional()
});

export const topOverdueQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  bureau: z.string().toUpperCase().refine((val) => BUREAUS.includes(val)).optional()
});

export const monthlyDisposalQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()).optional(),
  bureau: z.string().toUpperCase().refine((val) => BUREAUS.includes(val)).optional()
});
