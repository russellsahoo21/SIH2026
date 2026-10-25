import { Router } from 'express';
import multer from 'multer';
import { getTemplate, importCases } from './imports.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { ApiError } from '../../utils/ApiError.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

router.use(authenticate);

// GET /api/imports/template
router.get(
  '/template',
  requireRole('OFFICER', 'HEAD', 'ADMIN'),
  getTemplate
);

// POST /api/imports/cases
router.post(
  '/cases',
  requireRole('OFFICER', 'HEAD', 'ADMIN'),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(413, 'FILE_TOO_LARGE', 'Upload exceeds 10 MB limit'));
      } else if (err) {
        return next(new ApiError(400, 'VALIDATION_FAILED', err.message));
      }
      next();
    });
  },
  importCases
);

export default router;
