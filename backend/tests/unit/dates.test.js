import {
  todayIso,
  nowIso,
  formatDate,
  isValidIsoDate,
  daysAgo,
  startOfMonthIso,
  endOfMonthIso
} from '../../src/utils/dates.js';

describe('Dates Utility Functions', () => {
  test('todayIso returns YYYY-MM-DD pattern', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('nowIso returns valid ISO timestamp', () => {
    const now = nowIso();
    expect(new Date(now).toISOString()).toBe(now);
  });

  test('formatDate formats Date instances and strings', () => {
    const d = new Date('2026-10-15T12:00:00Z');
    expect(formatDate(d)).toBe('2026-10-15');
    expect(formatDate('2026-10-15T09:30:00.000Z')).toBe('2026-10-15');
    expect(formatDate('2026-10-15')).toBe('2026-10-15');
  });

  test('isValidIsoDate validates proper dates', () => {
    expect(isValidIsoDate('2026-10-25')).toBe(true);
    expect(isValidIsoDate('2026-02-28')).toBe(true);
    expect(isValidIsoDate('2026-02-31')).toBe(false); // Invalid day
    expect(isValidIsoDate('not-a-date')).toBe(false);
    expect(isValidIsoDate(null)).toBe(false);
  });

  test('daysAgo subtracts days accurately', () => {
    expect(daysAgo(5, '2026-10-10')).toBe('2026-10-05');
    expect(daysAgo(10, '2026-10-05')).toBe('2026-09-25');
  });

  test('startOfMonthIso and endOfMonthIso return correct boundary dates', () => {
    expect(startOfMonthIso(2026, 1)).toBe('2026-01-01');
    expect(endOfMonthIso(2026, 1)).toBe('2026-01-31');
    expect(endOfMonthIso(2026, 2)).toBe('2026-02-28');
    expect(endOfMonthIso(2026, 4)).toBe('2026-04-30');
  });
});
