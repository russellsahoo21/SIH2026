import { Router } from 'express';
import {
  getInstitutions,
  getInstitutionById,
  getInstitutionCases,
  getInstitutionOverlaps,
  createInstitution,
  updateInstitution
} from './institutions.controller.js';
import {
  listInstitutionsQuerySchema,
  institutionCasesQuerySchema,
  createInstitutionSchema,
  updateInstitutionSchema,
  institutionIdParamSchema
} from './institutions.schema.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

router.use(authenticate);

// GET /api/institutions
router.get('/', validate({ query: listInstitutionsQuerySchema }), getInstitutions);

// POST /api/institutions (ADMIN only)
router.post(
  '/',
  requireRole('ADMIN'),
  validate({ body: createInstitutionSchema }),
  createInstitution
);

// GET /api/institutions/:id
router.get('/:id', validate({ params: institutionIdParamSchema }), getInstitutionById);

// PATCH /api/institutions/:id (ADMIN only)
router.patch(
  '/:id',
  requireRole('ADMIN'),
  validate({ params: institutionIdParamSchema, body: updateInstitutionSchema }),
  updateInstitution
);

// GET /api/institutions/:id/cases
router.get(
  '/:id/cases',
  validate({ params: institutionIdParamSchema, query: institutionCasesQuerySchema }),
  getInstitutionCases
);

// GET /api/institutions/:id/overlaps
router.get(
  '/:id/overlaps',
  validate({ params: institutionIdParamSchema }),
  getInstitutionOverlaps
);

export default router;
