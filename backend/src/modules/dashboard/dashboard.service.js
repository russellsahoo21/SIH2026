import * as dashboardRepo from './dashboard.repo.js';
import { runEscalations } from '../sla/escalation.service.js';
import { CASE_STATUSES } from '../../config/constants.js';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function getDashboardSummary(filters, user) {
  // 1. Run on-demand idempotent escalation check
  await runEscalations();

  // 2. Enforce bureau isolation for officers/heads if not coordinator/management/admin
  const scopedFilters = { ...filters };
  if (user && (user.role === 'OFFICER' || user.role === 'HEAD') && user.bureau) {
    scopedFilters.bureau = user.bureau;
  }

  const { statusRows, overdueCount, openOverlaps } = await dashboardRepo.getSummaryCounts(scopedFilters);

  // Build standard dictionary with 0 default for all known statuses
  const byStatus = {};
  CASE_STATUSES.forEach((st) => {
    byStatus[st] = 0;
  });

  let total = 0;
  for (const row of statusRows) {
    byStatus[row.status] = row.count;
    total += row.count;
  }

  return {
    total,
    byStatus,
    overdue: overdueCount,
    openOverlapGroups: openOverlaps
  };
}

export async function getDashboardWorkload(user) {
  await runEscalations();

  // If HEAD, scope to own bureau
  const bureauScope = ['OFFICER','HEAD'].includes(user.role) ? user.bureau : null;
  return await dashboardRepo.getWorkload(bureauScope);
}

export async function getDashboardAgeing(user) {
  await runEscalations();

  const bureauScope = (user.role === 'HEAD' || user.role === 'OFFICER') ? user.bureau : null;
  const raw = await dashboardRepo.getAgeingBands(bureauScope);

  return {
    bands: {
      "0_to_7_days": raw["0_to_7_days"] || 0,
      "8_to_14_days": raw["8_to_14_days"] || 0,
      "15_to_21_days": raw["15_to_21_days"] || 0,
      "22_plus_days": raw["22_plus_days"] || 0
    },
    totalOpen: raw.total_open || 0
  };
}

export async function getDashboardTopOverdue(limit = 10, user) {
  await runEscalations();

  const bureauScope = (user.role === 'HEAD' || user.role === 'OFFICER') ? user.bureau : null;
  return await dashboardRepo.getTopOverdue(limit, bureauScope);
}

export async function getDashboardMonthlyDisposal(year = new Date().getFullYear(), user) {
  const bureauScope = (user.role === 'HEAD' || user.role === 'OFFICER') ? user.bureau : null;
  const rows = await dashboardRepo.getMonthlyDisposal(year, bureauScope);

  const monthMap = new Map(rows.map((r) => [r.month, r.count]));
  let totalDisposed = 0;

  const monthly = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const count = monthMap.get(monthNum) || 0;
    totalDisposed += count;
    return {
      month: monthNum,
      monthName: MONTH_NAMES[i],
      count
    };
  });

  return {
    year,
    monthly,
    totalDisposed
  };
}

export async function getDashboardRegionSummary() {
  await runEscalations();
  return await dashboardRepo.getRegionSummary();
}
