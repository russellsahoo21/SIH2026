import { z } from 'zod';

export const suggestSchema = z.object({
  institutionName: z.string({
    required_error: 'Institution name is required'
  }).min(1, 'Institution name cannot be empty'),
  description: z.string({
    required_error: 'Description is required'
  }).min(1, 'Description cannot be empty')
});
