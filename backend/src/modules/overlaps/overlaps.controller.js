import { sendSuccess } from '../../utils/response.js';
import * as overlapService from './overlap.service.js';

export async function listOverlaps(req, res, next) {
  try {
    const { overlaps, meta } = await overlapService.listOverlaps(req.query, req.user);
    return sendSuccess(res, overlaps, meta);
  } catch (err) {
    next(err);
  }
}

export async function getOverlapById(req, res, next) {
  try {
    const overlap = await overlapService.getOverlapDetail(Number(req.params.id), req.user);
    return sendSuccess(res, overlap);
  } catch (err) {
    next(err);
  }
}

export async function linkCases(req, res, next) {
  try {
    const { caseIds, leadBureau, notes } = req.body;
    const result = await overlapService.linkCases(
      Number(req.params.id),
      caseIds,
      leadBureau,
      notes,
      req.user
    );
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function markNotRelated(req, res, next) {
  try {
    const { caseIds, notes } = req.body;
    const result = await overlapService.markNotRelated(
      Number(req.params.id),
      caseIds,
      notes,
      req.user
    );
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function reviewOverlap(req, res, next) {
  try {
    const { notes } = req.body;
    const result = await overlapService.reviewOverlap(Number(req.params.id), notes, req.user);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function unlinkCase(req, res, next) {
  try {
    const result = await overlapService.unlinkCase(
      Number(req.params.id),
      req.params.caseId,
      req.body?.notes,
      req.user
    );
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
