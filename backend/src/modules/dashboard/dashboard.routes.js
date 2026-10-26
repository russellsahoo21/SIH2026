import { Router } from 'express';
import {
  getSummary,
  getWorkload,
  getAgeing,
  getTopOverdue,
  getMonthlyDisposal,
  getRegionSummary
} from './dashboard.controller.js';
import {
  summaryQuerySchema,
  topOverdueQuerySchema,
  monthlyDisposalQuerySchema
} from './dashboard.schema.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

// All dashboard endpoints require authentication
router.use(authenticate);

// GET /api/dashboard/summary
router.get(
  '/summary',
  validate({ query: summaryQuerySchema }),
  getSummary
);

// GET /api/dashboard/workload (HEAD, MANAGEMENT, ADMIN)
router.get(
  '/workload',
  requireRole('OFFICER', 'HEAD', 'COORDINATOR', 'MANAGEMENT', 'ADMIN'),
  getWorkload
);

// GET /api/dashboard/ageing (MANAGEMENT, HEAD, COORDINATOR)
router.get(
  '/ageing',
  requireRole('OFFICER', 'HEAD', 'COORDINATOR', 'MANAGEMENT', 'ADMIN'),
  getAgeing
);

// GET /api/dashboard/top-overdue (MANAGEMENT, HEAD, COORDINATOR)
router.get(
  '/top-overdue',
  requireRole('OFFICER', 'HEAD', 'COORDINATOR', 'MANAGEMENT', 'ADMIN'),
  validate({ query: topOverdueQuerySchema }),
  getTopOverdue
);

// GET /api/dashboard/monthly-disposal (MANAGEMENT, ADMIN)
router.get(
  '/monthly-disposal',
  requireRole('OFFICER', 'HEAD', 'COORDINATOR', 'MANAGEMENT', 'ADMIN'),
  validate({ query: monthlyDisposalQuerySchema }),
  getMonthlyDisposal
);

// GET /api/dashboard/region-summary (MANAGEMENT, ADMIN)
router.get(
  '/region-summary',
  requireRole('MANAGEMENT', 'ADMIN'),
  getRegionSummary
);

export default router;
