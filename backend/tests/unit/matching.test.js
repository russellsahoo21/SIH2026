import { suggestCategory, getCategoriesWithKeywords } from '../../src/modules/matching/matching.service.js';

describe('Matching & Category Suggestion Service (Dev B)', () => {
  describe('getCategoriesWithKeywords', () => {
    test('returns all 7 categories with keywords', () => {
      const categories = getCategoriesWithKeywords();
      expect(categories).toHaveLength(7);
      const codes = categories.map((c) => c.code);
      expect(codes).toEqual(
        expect.arrayContaining([
          'FEES',
          'INTAKE',
          'FACULTY',
          'INFRASTRUCTURE',
          'RAGGING',
          'NORM_VIOLATION',
          'OTHER'
        ])
      );
      categories.forEach((cat) => {
        expect(cat.name).toBeDefined();
        expect(Array.isArray(cat.keywords)).toBe(true);
        expect(cat.keywords.length).toBeGreaterThan(0);
      });
    });
  });

  describe('suggestCategory', () => {
    test('suggests FEES for fee overcharging complaint', () => {
      const desc = 'College is charging unapproved tuition fees and refusing refund';
      const result = suggestCategory(desc);
      expect(result.suggested).toBe('FEES');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives).not.toContain('FEES');
    });

    test('suggests INTAKE for excess admission complaint', () => {
      const desc = 'Institution admitted excess students beyond approved seat intake quota';
      const result = suggestCategory(desc);
      expect(result.suggested).toBe('INTAKE');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('suggests FACULTY for teacher salary and shortage complaint', () => {
      const desc = 'Unqualified faculty members appointed and professors not paid salaries for 6 months';
      const result = suggestCategory(desc);
      expect(result.suggested).toBe('FACULTY');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('suggests INFRASTRUCTURE for missing lab and building issues', () => {
      const desc = 'Computer lab equipment is broken and campus building lacks fire safety facilities';
      const result = suggestCategory(desc);
      expect(result.suggested).toBe('INFRASTRUCTURE');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('suggests RAGGING for harassment in hostel', () => {
      const desc = 'Seniors involved in brutal ragging and harassment of juniors in hostel';
      const result = suggestCategory(desc);
      expect(result.suggested).toBe('RAGGING');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('suggests NORM_VIOLATION for approval and affiliation fraud', () => {
      const desc = 'Running unauthorized technical courses without AICTE approval or university affiliation';
      const result = suggestCategory(desc);
      expect(result.suggested).toBe('NORM_VIOLATION');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('defaults to OTHER with low confidence when description has no matched keywords', () => {
      const desc = 'xyz random incomprehensible words 12345';
      const result = suggestCategory(desc);
      expect(result.suggested).toBe('OTHER');
      expect(result.confidence).toBe(0.2);
      expect(result.alternatives.length).toBeGreaterThan(0);
    });

    test('handles empty or null description safely', () => {
      expect(suggestCategory('')).toEqual({
        suggested: 'OTHER',
        confidence: 0.2,
        alternatives: ['FEES', 'INTAKE']
      });
      expect(suggestCategory(null)).toEqual({
        suggested: 'OTHER',
        confidence: 0.2,
        alternatives: ['FEES', 'INTAKE']
      });
    });
  });
});
