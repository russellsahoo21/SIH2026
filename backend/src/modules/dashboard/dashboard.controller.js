import * as dashboardService from './dashboard.service.js';
import { sendSuccess } from '../../utils/response.js';

export async function getSummary(req, res, next) {
  try {
    const summary = await dashboardService.getDashboardSummary(req.query, req.user);
    return sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
}

export async function getWorkload(req, res, next) {
  try {
    const workload = await dashboardService.getDashboardWorkload(req.user);
    return sendSuccess(res, workload);
  } catch (err) {
    next(err);
  }
}

export async function getAgeing(req, res, next) {
  try {
    const ageing = await dashboardService.getDashboardAgeing(req.user);
    return sendSuccess(res, ageing);
  } catch (err) {
    next(err);
  }
}

export async function getTopOverdue(req, res, next) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const topOverdue = await dashboardService.getDashboardTopOverdue(limit, req.user);
    return sendSuccess(res, topOverdue);
  } catch (err) {
    next(err);
  }
}

export async function getMonthlyDisposal(req, res, next) {
  try {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const data = await dashboardService.getDashboardMonthlyDisposal(year, req.user);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getRegionSummary(req, res, next) {
  try {
    const data = await dashboardService.getDashboardRegionSummary();
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
