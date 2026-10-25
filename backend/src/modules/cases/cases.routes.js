import { Router } from 'express';
import {
  getCases,
  registerCase,
  getCaseById,
  updateCase,
  changeStatus,
  transferCase,
  acceptTransfer,
  assignOfficer,
  escalateCase,
  disposeCase,
  reopenCase
} from './cases.controller.js';
import {
  listCasesQuerySchema,
  registerCaseSchema,
  updateCaseSchema,
  statusChangeSchema,
  transferCaseSchema,
  acceptTransferSchema,
  assignOfficerSchema,
  escalateCaseSchema,
  disposeCaseSchema,
  reopenCaseSchema
} from './cases.schema.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import actionsRouter from '../actions/actions.routes.js';
import documentsRouter from '../documents/documents.routes.js';

const router = Router();

router.use(authenticate);

// Mount actions and documents subroutes (e.g. /:id/remarks, /:id/actions, /:id/documents)
router.use('/', actionsRouter);
router.use('/', documentsRouter);

// GET /api/cases
router.get(
  '/',
  validate({ query: listCasesQuerySchema }),
  getCases
);

// POST /api/cases
router.post(
  '/',
  requireRole('OFFICER', 'HEAD', 'ADMIN'),
  validate({ body: registerCaseSchema }),
  registerCase
);

// GET /api/cases/:id
router.get(
  '/:id',
  getCaseById
);

// PATCH /api/cases/:id
router.patch(
  '/:id',
  requireRole('OFFICER', 'HEAD', 'ADMIN'),
  validate({ body: updateCaseSchema }),
  updateCase
);

// POST /api/cases/:id/status
router.post(
  '/:id/status',
  requireRole('OFFICER', 'HEAD', 'ADMIN'),
  validate({ body: statusChangeSchema }),
  changeStatus
);

// POST /api/cases/:id/transfer
router.post(
  '/:id/transfer',
  requireRole('OFFICER', 'HEAD', 'ADMIN'),
  validate({ body: transferCaseSchema }),
  transferCase
);

// POST /api/cases/:id/accept-transfer
router.post(
  '/:id/accept-transfer',
  requireRole('OFFICER', 'HEAD', 'ADMIN'),
  validate({ body: acceptTransferSchema }),
  acceptTransfer
);

// POST /api/cases/:id/assign
router.post(
  '/:id/assign',
  requireRole('HEAD', 'ADMIN'),
  validate({ body: assignOfficerSchema }),
  assignOfficer
);

// POST /api/cases/:id/escalate
router.post(
  '/:id/escalate',
  requireRole('OFFICER', 'HEAD', 'ADMIN'),
  validate({ body: escalateCaseSchema }),
  escalateCase
);

// POST /api/cases/:id/dispose
router.post(
  '/:id/dispose',
  requireRole('HEAD', 'ADMIN'),
  validate({ body: disposeCaseSchema }),
  disposeCase
);

// POST /api/cases/:id/reopen
router.post(
  '/:id/reopen',
  requireRole('HEAD', 'ADMIN'),
  validate({ body: reopenCaseSchema }),
  reopenCase
);

export default router;
