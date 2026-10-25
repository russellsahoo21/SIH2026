import { sendSuccess } from '../../utils/response.js';
import * as matchingService from './matching.service.js';

export async function handleSuggest(req, res, next) {
  try {
    const { institutionName, description } = req.body;

    const [institutionCandidates, category] = await Promise.all([
      matchingService.findInstitutionCandidates(institutionName),
      Promise.resolve(matchingService.suggestCategory(description))
    ]);

    return sendSuccess(res, {
      institutionCandidates,
      category
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetCategories(req, res, next) {
  try {
    const categories = matchingService.getCategoriesWithKeywords();
    return sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
}
