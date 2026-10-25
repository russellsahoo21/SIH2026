export function addDays(isoDate, days) {
  const dateStr = isoDate instanceof Date ? isoDate.toISOString().slice(0, 10) : String(isoDate);
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso, toIso) {
  const fromStr = fromIso instanceof Date ? fromIso.toISOString().slice(0, 10) : String(fromIso);
  const toStr = toIso instanceof Date ? toIso.toISOString().slice(0, 10) : String(toIso);
  const from = new Date(fromStr + (fromStr.includes('T') ? '' : 'T00:00:00Z'));
  const to = new Date(toStr + (toStr.includes('T') ? '' : 'T00:00:00Z'));
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export function slaState(caseRow, todayIso = new Date().toISOString().slice(0, 10)) {
  if (!caseRow) return 'ON_TRACK';
  if (caseRow.status === 'DISPOSED') return 'DISPOSED';
  const total = Number(caseRow.sla_days) || 21;
  const elapsed = daysBetween(caseRow.received_on, todayIso);
  if (elapsed > total) return 'OVERDUE';
  if (elapsed >= Math.ceil(total * 0.8)) return 'DUE_SOON';
  return 'ON_TRACK';
}

export const REMINDER_POINTS = [0.5, 0.8];
