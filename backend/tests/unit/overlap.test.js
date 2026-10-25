import { computeSeverity } from '../../src/modules/overlaps/overlap.service.js';
import { tokenJaccard } from '../../src/utils/similarity.js';

describe('Overlap Detection and Severity Rules (Dev B)', () => {
  describe('Overlap Detection Formula', () => {
    // Formula: issue = 0.6 * tokenJaccard(descA, descB) + 0.4 * (catA === catB ? 1 : 0)
    // Threshold: issue >= 0.2 OR catA === catB

    test('identical category and identical description gives score 1.0', () => {
      const descA = 'college charging excess fees for exams';
      const descB = 'college charging excess fees for exams';
      const jacc = tokenJaccard(descA, descB);
      const catMatch = 1;
      const issue = 0.6 * jacc + 0.4 * catMatch;

      expect(jacc).toBe(1.0);
      expect(issue).toBe(1.0);
      expect(issue >= 0.2 || catMatch === 1).toBe(true);
    });

    test('identical category with completely disjoint description qualifies (catMatch = 1, issue = 0.4)', () => {
      const descA = 'unapproved student fee structure';
      const descB = 'capitation charges for hostel admission';
      const jacc = tokenJaccard(descA, descB);
      const catMatch = 1;
      const issue = 0.6 * jacc + 0.4 * catMatch;

      expect(jacc).toBe(0.0);
      expect(issue).toBeCloseTo(0.4, 4);
      expect(issue >= 0.2 || catMatch === 1).toBe(true);
    });

    test('different category with high description overlap qualifies when issue >= 0.2', () => {
      // 2 overlapping words out of 4 total words -> Jaccard = 0.5
      // issue = 0.6 * 0.5 + 0.4 * 0 = 0.3
      const descA = 'unapproved development fees';
      const descB = 'unapproved development labs';
      const jacc = tokenJaccard(descA, descB); // 'unapproved', 'development' in common
      const catMatch = 0;
      const issue = 0.6 * jacc + 0.4 * catMatch;

      expect(jacc).toBe(2 / 4); // 0.5
      expect(issue).toBeCloseTo(0.3, 4);
      expect(issue >= 0.2 || catMatch === 1).toBe(true);
    });

    test('different category with minimal overlap does not qualify when issue < 0.2', () => {
      // 1 overlapping word out of 10 total words -> Jaccard = 0.1
      // issue = 0.6 * 0.1 + 0.4 * 0 = 0.06 < 0.2
      const descA = 'college library books damaged and outdated';
      const descB = 'college hostel ragging complaint by first year student';
      const jacc = tokenJaccard(descA, descB); // only 'college' in common -> 1 / 10 = 0.1
      const catMatch = 0;
      const issue = 0.6 * jacc + 0.4 * catMatch;

      expect(jacc).toBeLessThan(0.15);
      expect(issue).toBeLessThan(0.2);
      expect(issue >= 0.2 || catMatch === 1).toBe(false);
    });
  });

  describe('computeSeverity', () => {
    test('returns HIGH if any pair has the same category', () => {
      const members = [
        { caseId: 'PGRC/2026/00001', category: 'FEES', similarity: 0.3 },
        { caseId: 'RB/2026/00002', category: 'FEES', similarity: 0.3 }
      ];
      expect(computeSeverity(members)).toBe('HIGH');
    });

    test('returns HIGH if similarity is at least 0.5 even with different categories', () => {
      const members = [
        { caseId: 'PGRC/2026/00001', category: 'FEES', similarity: 1.0 },
        { caseId: 'RB/2026/00002', category: 'INFRASTRUCTURE', similarity: 0.65 }
      ];
      expect(computeSeverity(members)).toBe('HIGH');
    });

    test('returns MEDIUM if categories differ and similarity is below 0.5', () => {
      const members = [
        { caseId: 'PGRC/2026/00001', category: 'FEES', similarity: 1.0 },
        { caseId: 'RB/2026/00002', category: 'INFRASTRUCTURE', similarity: 0.35 }
      ];
      expect(computeSeverity(members)).toBe('MEDIUM');
    });

    test('returns MEDIUM when fewer than 2 members are provided', () => {
      expect(computeSeverity([])).toBe('MEDIUM');
      expect(computeSeverity([{ caseId: 'RB/2026/00001', category: 'FEES', similarity: 1.0 }])).toBe('MEDIUM');
      expect(computeSeverity(null)).toBe('MEDIUM');
    });
  });
});
