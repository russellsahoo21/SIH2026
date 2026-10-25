import { z } from 'zod';
import { CASE_STATUSES } from '../../config/constants.js';

export const listInstitutionsQuerySchema = z.object({
  q: z.string().optional(),
  region: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

export const institutionCasesQuerySchema = z.object({
  status: z.enum(CASE_STATUSES).optional(),
  bureau: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be YYYY-MM-DD').optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

export const createInstitutionSchema = z.object({
  permanentId: z.string({ required_error: 'Permanent ID is required' }).min(1),
  name: z.string({ required_error: 'Institution name is required' }).min(1),
  address: z.string().optional().default(''),
  region: z.string({ required_error: 'Region is required' }).min(1)
});

export const updateInstitutionSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  region: z.string().min(1).optional(),
  active: z.coerce.number().int().min(0).max(1).optional()
});

export const institutionIdParamSchema = z.object({
  id: z.coerce.number().int().min(1, 'Institution ID must be a positive integer')
});
