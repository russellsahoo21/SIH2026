import * as slaRepo from './sla.repo.js';
import { ApiError } from '../../utils/ApiError.js';
import { CATEGORIES } from '../../config/constants.js';
import { query } from '../../db/connection.js';

export async function listSlaConfigs() {
  const configs = await slaRepo.findAllSlaConfigs();
  const configMap = new Map(configs.map((c) => [c.category, c.days]));
  
  return CATEGORIES.map((cat) => ({
    category: cat,
    days: configMap.has(cat) ? configMap.get(cat) : (cat === 'RAGGING' ? 7 : (cat === 'FACULTY' || cat === 'INFRASTRUCTURE' ? 30 : 21))
  }));
}

export async function updateCategorySla(category, days, actor) {
  if (!CATEGORIES.includes(category)) {
    throw new ApiError(400, 'VALIDATION_FAILED', `Invalid category: ${category}`);
  }

  let userId = actor?.id ? Number(actor.id) : null;
  if (userId) {
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      userId = null;
    }
  }

  const updated = await slaRepo.upsertSlaConfig(category, days, userId);
  return updated;
}

export async function getDaysForCategory(category) {
  const config = await slaRepo.findSlaConfigByCategory(category);
  if (config) return config.days;
  if (category === 'RAGGING') return 7;
  if (category === 'FACULTY' || category === 'INFRASTRUCTURE') return 30;
  return 21;
}
