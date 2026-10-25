/**
 * Date utility functions for complaint management system.
 * Handles ISO-8601 YYYY-MM-DD calculations in UTC to prevent timezone skew.
 */

/**
 * Returns today's date in YYYY-MM-DD format (UTC).
 * @returns {string}
 */
export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns current timestamp in ISO format.
 * @returns {string}
 */
export function nowIso() {
  return new Date().toISOString();
}

/**
 * Formats a Date object or date-like string to YYYY-MM-DD.
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '';
  if (date instanceof Date) {
    return date.toISOString().slice(0, 10);
  }
  const str = String(date).trim();
  if (str.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return str;
  return parsed.toISOString().slice(0, 10);
}

/**
 * Validates if string is a valid YYYY-MM-DD date.
 * @param {string} str
 * @returns {boolean}
 */
export function isValidIsoDate(str) {
  if (typeof str !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

/**
 * Returns YYYY-MM-DD date for N days in the past.
 * @param {number} days
 * @param {string} [fromIso=todayIso()]
 * @returns {string}
 */
export function daysAgo(days, fromIso = todayIso()) {
  const d = new Date(fromIso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - Number(days));
  return d.toISOString().slice(0, 10);
}

/**
 * Returns first day of month in YYYY-MM-DD (1-based month).
 * @param {number} year
 * @param {number} month 1 to 12
 * @returns {string}
 */
export function startOfMonthIso(year, month) {
  const m = String(month).padStart(2, '0');
  return `${year}-${m}-01`;
}

/**
 * Returns last day of month in YYYY-MM-DD (1-based month).
 * @param {number} year
 * @param {number} month 1 to 12
 * @returns {string}
 */
export function endOfMonthIso(year, month) {
  const d = new Date(Date.UTC(year, month, 0));
  return d.toISOString().slice(0, 10);
}
