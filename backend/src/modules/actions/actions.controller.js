import * as actionsService from './actions.service.js';
import { sendSuccess } from '../../utils/response.js';

export async function addRemark(req, res, next) {
  try {
    const caseId = decodeURIComponent(req.params.id);
    const { remark, visibility } = req.body;
    const result = await actionsService.addRemark(caseId, remark, visibility, req.user);
    return sendSuccess(res, result, undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function getActions(req, res, next) {
  try {
    const caseId = decodeURIComponent(req.params.id);
    const { actions, meta } = await actionsService.getActions(caseId, req.user, req.query);
    return sendSuccess(res, actions, meta);
  } catch (err) {
    next(err);
  }
}
