import { z } from 'zod';
import { BUREAUS } from '../../config/constants.js';

export const REPORT_TYPES = [
  'institution-wise',
  'region-wise',
  'bureau-wise',
  'ageing',
  'overlaps'
];

export const reportParamsSchema = z.object({
  type: z.string().refine((val) => REPORT_TYPES.includes(val), {
    message: `Report type must be one of: ${REPORT_TYPES.join(', ')}`
  })
});

export const reportQuerySchema = z.object({
  format: z.enum(['json', 'xlsx']).default('json').optional(),
  bureau: z.string().toUpperCase().refine((val) => BUREAUS.includes(val)).optional(),
  region: z.string().trim().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD').optional()
});
