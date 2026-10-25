import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  logger.error('Error encountered:', {
    message: err.message,
    code: err.code,
    status: err.status,
    path: req.originalUrl
  });

  if (err instanceof ApiError) {
    const body = {
      error: {
        code: err.code,
        message: err.message
      }
    };
    if (err.details !== undefined) {
      body.error.details = err.details;
    }
    return res.status(err.status).json(body);
  }

  // JSON syntax error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid JSON body syntax'
      }
    });
  }

  // Fallback 500
  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message
    }
  });
}
