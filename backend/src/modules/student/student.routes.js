import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { query } from '../../db/connection.js';
import { registerCase } from '../cases/cases.service.js';
import { BUREAUS, CATEGORIES } from '../../config/constants.js';
import { ApiError } from '../../utils/ApiError.js';
import { sendSuccess } from '../../utils/response.js';
const router = Router();
router.use(authenticate, requireRole('STUDENT', 'COLLEGE'));
const route = fn => (req,res,next) => Promise.resolve(fn(req,res)).catch(next);
router.get('/institutions', route(async (req,res) => {
  const q = String(req.query.q || '').trim().slice(0, 100);
  const result = await query(
    'SELECT id, name, permanent_id AS "permanentId" FROM institutions WHERE active = 1 AND (name ILIKE $1 OR permanent_id ILIKE $1) ORDER BY name LIMIT 200',
    ['%' + q + '%']
  );
  return sendSuccess(res, result.rows);
}));
router.get('/cases', route(async (req,res) => {
  const result = await query('SELECT c.id, c.status, c.category, c.bureau_code AS bureau, c.due_on AS "dueOn", c.updated_at AS "updatedAt", i.name AS "institutionName" FROM cases c JOIN institutions i ON i.id=c.institution_id WHERE c.created_by=$1 ORDER BY c.created_at DESC LIMIT 100', [req.user.id]);
  return sendSuccess(res,result.rows);
}));
router.post('/cases', validate({body:z.object({institutionId:z.coerce.number().int().positive(),category:z.enum(CATEGORIES),bureau:z.enum(BUREAUS),description:z.string().trim().min(10).max(10000)})}), route(async(req,res)=> {
  const result = await registerCase({...req.body, sourceChannel:'OTHER', receivedOn:new Date().toISOString().slice(0,10)}, req.user);
  return sendSuccess(res,{case:result.case},undefined,201);
}));
router.get('/cases/:id', route(async(req,res)=> {
  const result = await query('SELECT c.id, c.description, c.category, c.status, c.bureau_code AS bureau, c.due_on AS "dueOn", c.disposed_on AS "disposedOn", i.name AS "institutionName" FROM cases c JOIN institutions i ON i.id=c.institution_id WHERE c.id=$1 AND c.created_by=$2', [req.params.id,req.user.id]);
  if (!result.rows[0]) throw new ApiError(404,'NOT_FOUND','Case not found');
  // Shared means inter-bureau, not public: expose status history only, never staff remarks.
  const history = await query('SELECT id, to_status AS status, created_at AS "createdAt" FROM actions WHERE case_id=$1 AND to_status IS NOT NULL ORDER BY created_at, id', [req.params.id]);
  return sendSuccess(res,{...result.rows[0],history:history.rows});
}));
export default router;
