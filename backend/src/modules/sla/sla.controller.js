import * as slaService from './sla.service.js';
import { sendSuccess } from '../../utils/response.js';

export async function getSlaConfig(req, res, next) {
  try {
    const list = await slaService.listSlaConfigs();
    return sendSuccess(res, list);
  } catch (err) {
    next(err);
  }
}

export async function patchSlaConfig(req, res, next) {
  try {
    const category = req.params.category.toUpperCase();
    const { days } = req.body;
    const updated = await slaService.updateCategorySla(category, days, req.user);
    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}
