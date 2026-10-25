import { Router } from 'express';
import { getSlaConfig, patchSlaConfig } from './sla.controller.js';
import { updateSlaConfigSchema, slaCategoryParamsSchema } from './sla.schema.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';

const router = Router();

// GET /api/sla-config (public / any)
router.get('/', getSlaConfig);

// PATCH /api/sla-config/:category (ADMIN only)
router.patch(
  '/:category',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: updateSlaConfigSchema, params: slaCategoryParamsSchema }),
  patchSlaConfig
);

export default router;
