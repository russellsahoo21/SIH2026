import { z } from 'zod';
import { CATEGORIES } from '../../config/constants.js';

export const updateSlaConfigSchema = z.object({
  days: z.number({ required_error: 'Days is required' })
    .int('Days must be an integer')
    .min(1, 'Days must be at least 1')
    .max(365, 'Days cannot exceed 365')
});

export const slaCategoryParamsSchema = z.object({
  category: z.string().trim().toUpperCase().refine(
    (val) => CATEGORIES.includes(val),
    { message: `Invalid category. Must be one of: ${CATEGORIES.join(', ')}` }
  )
});
