import { Router } from 'express';
import { getBureaus } from './bureaus.controller.js';

const router = Router();

// GET /api/bureaus
router.get('/', getBureaus);

export default router;
