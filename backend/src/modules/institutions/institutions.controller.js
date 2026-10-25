import { sendSuccess } from '../../utils/response.js';
import * as institutionsService from './institutions.service.js';

export async function getInstitutions(req, res, next) {
  try {
    const { institutions, meta } = await institutionsService.searchAndListInstitutions(req.query);
    return sendSuccess(res, institutions, meta);
  } catch (err) {
    next(err);
  }
}

export async function getInstitutionById(req, res, next) {
  try {
    const institution = await institutionsService.getInstitutionProfile(Number(req.params.id));
    return sendSuccess(res, institution);
  } catch (err) {
    next(err);
  }
}

export async function getInstitutionCases(req, res, next) {
  try {
    const { cases, meta } = await institutionsService.getInstitutionCases(
      Number(req.params.id),
      req.query,
      req.user
    );
    return sendSuccess(res, cases, meta);
  } catch (err) {
    next(err);
  }
}

export async function getInstitutionOverlaps(req, res, next) {
  try {
    const overlaps = await institutionsService.getInstitutionOverlaps(Number(req.params.id));
    return sendSuccess(res, overlaps);
  } catch (err) {
    next(err);
  }
}

export async function createInstitution(req, res, next) {
  try {
    const institution = await institutionsService.createInstitution(req.body);
    return sendSuccess(res, institution, undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateInstitution(req, res, next) {
  try {
    const updated = await institutionsService.updateInstitution(Number(req.params.id), req.body);
    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}
