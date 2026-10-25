import { Router } from 'express';
import { handleSuggest, handleGetCategories } from './matching.controller.js';
import { suggestSchema } from './matching.schema.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';

const router = Router();

// POST /api/suggest
router.post(
  '/',
  authenticate,
  requireRole('OFFICER', 'HEAD', 'ADMIN'),
  validate({ body: suggestSchema }),
  handleSuggest
);

export default router;
