import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, me } from './auth.controller.js';
import { loginSchema } from './auth.schema.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { ApiError } from '../../utils/ApiError.js';

const router = Router();

// Section 11: 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(429, 'RATE_LIMITED', 'Too many login attempts. Please try again later.'));
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, validate({ body: loginSchema }), login);

// GET /api/auth/me
router.get('/me', authenticate, me);

export default router;
