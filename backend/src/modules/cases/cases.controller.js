import * as casesService from './cases.service.js';
import { sendSuccess } from '../../utils/response.js';

export async function getCases(req, res, next) {
  try {
    const { cases, meta } = await casesService.listCases(req.query, req.user);
    return sendSuccess(res, cases, meta);
  } catch (err) {
    next(err);
  }
}

export async function registerCase(req, res, next) {
  try {
    const result = await casesService.registerCase(req.body, req.user);
    return sendSuccess(res, result, undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function getCaseById(req, res, next) {
  try {
    const caseId = decodeURIComponent(req.params.id);
    const data = await casesService.getCaseForViewer(caseId, req.user);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function updateCase(req, res, next) {
  try {
    const caseId = decodeURIComponent(req.params.id);
    const updated = await casesService.updateCase(caseId, req.body, req.user);
    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function changeStatus(req, res, next) {
  try {
    const caseId = decodeURIComponent(req.params.id);
    const { toStatus, remark, version } = req.body;
    const updated = await casesService.changeStatus(caseId, toStatus, remark, req.user, version);
    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function transferCase(req, res, next) {
  try {
    const caseId = decodeURIComponent(req.params.id);
    const { toBureau, remark, version } = req.body;
    const updated = await casesService.transferCase(caseId, toBureau, remark, req.user, version);
    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function acceptTransfer(req, res, next) {
  try {
    const caseId = decodeURIComponent(req.params.id);
    const { version } = req.body;
    const updated = await casesService.acceptTransfer(caseId, req.user, version);
    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function assignOfficer(req, res, next) {
  try {
    const caseId = decodeURIComponent(req.params.id);
    const { officerId, version } = req.body;
    const updated = await casesService.assignOfficer(caseId, officerId, req.user, version);
    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function escalateCase(req, res, next) {
  try {
    const caseId = decodeURIComponent(req.params.id);
    const { remark, version } = req.body;
    const updated = await casesService.escalateCase(caseId, remark, req.user, version);
    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function disposeCase(req, res, next) {
  try {
    const caseId = decodeURIComponent(req.params.id);
    const { remark, version } = req.body;
    const updated = await casesService.disposeCase(caseId, remark, req.user, version);
    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function reopenCase(req, res, next) {
  try {
    const caseId = decodeURIComponent(req.params.id);
    const { remark, version } = req.body;
    const updated = await casesService.reopenCase(caseId, remark, req.user, version);
    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}
