import { addDays, daysBetween, slaState } from '../../src/utils/sla.js';

describe('SLA Utility Functions', () => {
  describe('addDays', () => {
    test('adds days within the same month', () => {
      expect(addDays('2026-10-01', 10)).toBe('2026-10-11');
    });

    test('adds days across month boundaries', () => {
      expect(addDays('2026-10-20', 21)).toBe('2026-11-10');
    });

    test('adds days across leap and non-leap years', () => {
      expect(addDays('2026-12-25', 10)).toBe('2027-01-04');
    });

    test('handles 0 days addition', () => {
      expect(addDays('2026-05-15', 0)).toBe('2026-05-15');
    });
  });

  describe('daysBetween', () => {
    test('computes exact days between two dates', () => {
      expect(daysBetween('2026-10-01', '2026-10-15')).toBe(14);
    });

    test('returns 0 for the same date', () => {
      expect(daysBetween('2026-10-15', '2026-10-15')).toBe(0);
    });

    test('returns negative when toIso is in past', () => {
      expect(daysBetween('2026-10-20', '2026-10-10')).toBe(-10);
    });
  });

  describe('slaState', () => {
    test('returns DISPOSED when case status is DISPOSED', () => {
      const caseRow = { status: 'DISPOSED', received_on: '2026-09-01', sla_days: 21 };
      expect(slaState(caseRow, '2026-10-25')).toBe('DISPOSED');
    });

    test('returns ON_TRACK when well within deadline', () => {
      const caseRow = { status: 'UNDER_PROCESS', received_on: '2026-10-20', sla_days: 21 };
      expect(slaState(caseRow, '2026-10-25')).toBe('ON_TRACK'); // 5 days elapsed out of 21
    });

    test('returns DUE_SOON when elapsed >= 80% of total days', () => {
      // 80% of 21 is ceil(16.8) = 17 days
      const caseRow = { status: 'UNDER_PROCESS', received_on: '2026-10-01', sla_days: 21 };
      expect(slaState(caseRow, '2026-10-18')).toBe('DUE_SOON'); // 17 days elapsed
    });

    test('returns OVERDUE when elapsed > total days', () => {
      const caseRow = { status: 'UNDER_PROCESS', received_on: '2026-10-01', sla_days: 21 };
      expect(slaState(caseRow, '2026-10-23')).toBe('OVERDUE'); // 22 days elapsed
    });
  });
});
