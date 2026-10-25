import { z } from 'zod';
import { CATEGORIES, SOURCE_CHANNELS, BUREAUS } from '../../config/constants.js';

export const importRowSchema = z.object({
  institution_permanent_id: z.string({ required_error: 'institution_permanent_id is required' })
    .trim()
    .min(1, 'institution_permanent_id cannot be empty'),
  category: z.string({ required_error: 'category is required' })
    .trim()
    .toUpperCase()
    .refine((val) => CATEGORIES.includes(val), {
      message: `category must be one of: ${CATEGORIES.join(', ')}`
    }),
  source_channel: z.string({ required_error: 'source_channel is required' })
    .trim()
    .toUpperCase()
    .refine((val) => SOURCE_CHANNELS.includes(val), {
      message: `source_channel must be one of: ${SOURCE_CHANNELS.join(', ')}`
    }),
  received_on: z.string({ required_error: 'received_on is required' })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'received_on must be in YYYY-MM-DD format'),
  description: z.string({ required_error: 'description is required' })
    .trim()
    .min(5, 'description must be at least 5 characters'),
  bureau: z.string({ required_error: 'bureau is required' })
    .trim()
    .toUpperCase()
    .refine((val) => BUREAUS.includes(val), {
      message: `bureau must be one of: ${BUREAUS.join(', ')}`
    })
});
