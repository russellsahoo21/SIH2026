import { ApiError } from '../utils/ApiError.js';

export const validate = ({ body, query, params }) => (req, res, next) => {
  try {
    if (body) req.body = body.parse(req.body);
    if (query) req.query = query.parse(req.query);
    if (params) req.params = params.parse(req.params);
    next();
  } catch (err) {
    if (err.issues) {
      const details = err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message
      }));
      return next(new ApiError(400, 'VALIDATION_FAILED', details[0]?.message || 'Validation failed', details));
    }
    return next(new ApiError(400, 'VALIDATION_FAILED', err.message));
  }
};
