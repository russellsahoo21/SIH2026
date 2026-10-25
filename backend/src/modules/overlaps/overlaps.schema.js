import { z } from 'zod';

export const listOverlapsQuerySchema = z.object({
  status: z.enum(['OPEN', 'COORDINATING', 'LINKED', 'DISMISSED', 'REVIEWED']).optional(),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  bureau: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

export const linkOverlapSchema = z.object({
  caseIds: z.array(z.string().min(1), {
    required_error: 'caseIds array is required'
  }).min(1, 'At least one caseId must be provided'),
  leadBureau: z.string({
    required_error: 'leadBureau is required'
  }).min(1, 'leadBureau cannot be empty'),
  notes: z.string().optional()
});

export const notRelatedSchema = z.object({
  caseIds: z.array(z.string().min(1), {
    required_error: 'caseIds array is required'
  }).min(1, 'At least one caseId must be provided'),
  notes: z.string().optional()
});

export const reviewOverlapSchema = z.object({
  notes: z.string().optional()
});

export const overlapIdParamSchema = z.object({
  id: z.coerce.number().int().min(1, 'Overlap ID must be a positive integer')
});

export const unlinkParamsSchema = z.object({
  id: z.coerce.number().int().min(1, 'Overlap ID must be a positive integer'),
  caseId: z.string().min(1, 'caseId is required')
});
