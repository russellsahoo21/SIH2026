import { Router } from 'express';
import multer from 'multer';
import { uploadDocument, downloadDocument } from './documents.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { ApiError } from '../../utils/ApiError.js';

const router = Router();

// Store temporarily in memory to check magic bytes before writing with UUID
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit
  }
});

router.use(authenticate);

// POST /api/cases/:id/documents
router.post(
  '/:id/documents',
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
  uploadDocument
);

// GET /api/cases/:id/documents/:docId
router.get(
  '/:id/documents/:docId',
  downloadDocument
);

export default router;
