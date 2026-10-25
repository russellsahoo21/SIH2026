import { Router } from 'express';
import { handleGetCategories } from './matching.controller.js';

const router = Router();

// GET /api/categories
router.get('/', handleGetCategories);

export default router;
