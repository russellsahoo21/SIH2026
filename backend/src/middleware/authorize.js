import { ApiError } from '../utils/ApiError.js';

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'FORBIDDEN', 'Your role cannot do this'));
  }
  next();
};

export const requireSameBureauOrHead = (getBureau) => (req, res, next) => {
  const targetBureau = typeof getBureau === 'function' ? getBureau(req) : req.params.bureau;
  const sameBureau = req.user.bureau === targetBureau;
  const isHeadOrAdmin = req.user.role === 'HEAD' || req.user.role === 'ADMIN';

  if (!sameBureau && !isHeadOrAdmin) {
    return next(new ApiError(403, 'FORBIDDEN', 'This case belongs to another bureau'));
  }
  next();
};
