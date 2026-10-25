import { normalizeName, tokenize, ABBREVIATIONS } from '../../src/utils/text.js';

describe('utils/text.js', () => {
  describe('normalizeName', () => {
    test('normalizes Hillcrest Inst. of Tech. to hillcrest institute of technology', () => {
      const input = 'Hillcrest Inst. of Tech.';
      const output = normalizeName(input);
      expect(output).toBe('hillcrest institute of technology');
    });

    test('expands & to and', () => {
      expect(normalizeName('ABC Engg. & Tech.')).toBe('abc engineering and technology');
    });

    test('expands all standard abbreviations from table', () => {
      expect(normalizeName('inst')).toBe('institute');
      expect(normalizeName('instt')).toBe('institute');
      expect(normalizeName('tech')).toBe('technology');
      expect(normalizeName('engg')).toBe('engineering');
      expect(normalizeName('eng')).toBe('engineering');
      expect(normalizeName('clg')).toBe('college');
      expect(normalizeName('univ')).toBe('university');
      expect(normalizeName('govt')).toBe('government');
      expect(normalizeName('sci')).toBe('science');
      expect(normalizeName('mgmt')).toBe('management');
      expect(normalizeName('mgt')).toBe('management');
    });

    test('collapses multiple whitespace characters and trims', () => {
      expect(normalizeName('   Apex    Govt   Clg   ')).toBe('apex government college');
    });

    test('removes special characters and punctuation', () => {
      expect(normalizeName('St. Xavier\'s (Autonomous) College #10!')).toBe('st xavier s autonomous college 10');
    });

    test('handles empty or non-string inputs gracefully', () => {
      expect(normalizeName('')).toBe('');
      expect(normalizeName(null)).toBe('');
      expect(normalizeName(undefined)).toBe('');
      expect(normalizeName(123)).toBe('');
    });
  });

  describe('tokenize', () => {
    test('tokenizes sentence into lowercase words without punctuation', () => {
      const input = 'College is charging unapproved development fees!';
      expect(tokenize(input)).toEqual([
        'college',
        'is',
        'charging',
        'unapproved',
        'development',
        'fees'
      ]);
    });

    test('returns empty array for empty or falsy inputs', () => {
      expect(tokenize('')).toEqual([]);
      expect(tokenize(null)).toEqual([]);
      expect(tokenize(undefined)).toEqual([]);
    });
  });
});
