import { z } from 'zod';
import { CATEGORIES, SOURCE_CHANNELS, CASE_STATUSES, BUREAUS } from '../../config/constants.js';

export const registerCaseSchema = z.object({
  institutionId: z.coerce.number().int().positive('Institution ID is required'),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Invalid category' }) }),
  sourceChannel: z.enum(SOURCE_CHANNELS, { errorMap: () => ({ message: 'Invalid source channel' }) }),
  receivedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'receivedOn must be YYYY-MM-DD'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  bureau: z.enum(BUREAUS).optional() // Required only if admin registers on behalf of a bureau
});

export const updateCaseSchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  description: z.string().min(5).optional(),
  version: z.coerce.number().int().positive('version is required for optimistic locking')
});

export const statusChangeSchema = z.object({
  toStatus: z.enum(CASE_STATUSES),
  remark: z.string().optional(),
  version: z.coerce.number().int().positive('version is required for optimistic locking')
});

export const transferCaseSchema = z.object({
  toBureau: z.enum(BUREAUS),
  remark: z.string().optional(),
  version: z.coerce.number().int().positive('version is required for optimistic locking')
});

export const acceptTransferSchema = z.object({
  version: z.coerce.number().int().positive('version is required for optimistic locking')
});

export const assignOfficerSchema = z.object({
  officerId: z.coerce.number().int().positive('Officer ID is required'),
  version: z.coerce.number().int().positive('version is required for optimistic locking')
});

export const escalateCaseSchema = z.object({
  remark: z.string().optional(),
  version: z.coerce.number().int().positive('version is required for optimistic locking')
});

export const disposeCaseSchema = z.object({
  remark: z.string().optional(),
  version: z.coerce.number().int().positive('version is required for optimistic locking')
});

export const reopenCaseSchema = z.object({
  remark: z.string().optional(),
  version: z.coerce.number().int().positive('version is required for optimistic locking')
});

export const listCasesQuerySchema = z.object({
  bureau: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  institutionId: z.coerce.number().int().positive().optional(),
  q: z.string().optional(),
  overdue: z.enum(['true', 'false']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sort: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25)
});
