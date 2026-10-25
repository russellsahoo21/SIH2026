import { Router } from 'express';
import {
  listOverlaps,
  getOverlapById,
  linkCases,
  markNotRelated,
  reviewOverlap,
  unlinkCase
} from './overlaps.controller.js';
import {
  listOverlapsQuerySchema,
  linkOverlapSchema,
  notRelatedSchema,
  reviewOverlapSchema,
  overlapIdParamSchema,
  unlinkParamsSchema
} from './overlaps.schema.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

router.use(authenticate);

// GET /api/overlaps
router.get(
  '/',
  requireRole('COORDINATOR', 'MANAGEMENT', 'ADMIN', 'HEAD', 'OFFICER'),
  validate({ query: listOverlapsQuerySchema }),
  listOverlaps
);

// GET /api/overlaps/:id
router.get(
  '/:id',
  requireRole('COORDINATOR', 'MANAGEMENT', 'ADMIN', 'HEAD', 'OFFICER'),
  validate({ params: overlapIdParamSchema }),
  getOverlapById
);

// POST /api/overlaps/:id/link
router.post(
  '/:id/link',
  requireRole('COORDINATOR', 'ADMIN'),
  validate({ params: overlapIdParamSchema, body: linkOverlapSchema }),
  linkCases
);

// POST /api/overlaps/:id/not-related
router.post(
  '/:id/not-related',
  requireRole('COORDINATOR', 'ADMIN'),
  validate({ params: overlapIdParamSchema, body: notRelatedSchema }),
  markNotRelated
);

// POST /api/overlaps/:id/review
router.post(
  '/:id/review',
  requireRole('COORDINATOR', 'ADMIN'),
  validate({ params: overlapIdParamSchema, body: reviewOverlapSchema }),
  reviewOverlap
);

// POST /api/overlaps/:id/unlink/:caseId
router.post(
  '/:id/unlink/:caseId',
  requireRole('COORDINATOR', 'ADMIN'),
  validate({ params: unlinkParamsSchema }),
  unlinkCase
);

export default router;
