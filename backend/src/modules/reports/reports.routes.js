import { Router } from 'express';
import { getReport } from './reports.controller.js';
import { reportParamsSchema, reportQuerySchema } from './reports.schema.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

router.use(authenticate);

// GET /api/reports/:type (all staff roles)
router.get(
  '/:type',
  requireRole('OFFICER', 'COORDINATOR', 'MANAGEMENT', 'HEAD', 'ADMIN'),
  validate({ params: reportParamsSchema, query: reportQuerySchema }),
  getReport
);

export default router;
