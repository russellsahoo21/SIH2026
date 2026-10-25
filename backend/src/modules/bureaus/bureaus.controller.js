import * as bureausService from './bureaus.service.js';
import { sendSuccess } from '../../utils/response.js';

export async function getBureaus(req, res, next) {
  try {
    const bureaus = await bureausService.listBureaus();
    return sendSuccess(res, bureaus);
  } catch (err) {
    next(err);
  }
}
