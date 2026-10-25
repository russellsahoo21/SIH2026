import { Router } from 'express';
import { addRemark, getActions } from './actions.controller.js';
import { addRemarkSchema, listActionsQuerySchema } from './actions.schema.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

router.use(authenticate);

// POST /api/cases/:id/remarks
router.post(
  '/:id/remarks',
  validate({ body: addRemarkSchema }),
  addRemark
);

// GET /api/cases/:id/actions
router.get(
  '/:id/actions',
  validate({ query: listActionsQuerySchema }),
  getActions
);

export default router;
