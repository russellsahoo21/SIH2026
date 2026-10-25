import { similarity, tokenJaccard } from '../../src/utils/similarity.js';

describe('utils/similarity.js', () => {
  describe('similarity (Levenshtein ratio)', () => {
    test('returns 1.0 for identical strings', () => {
      expect(similarity('hillcrest', 'hillcrest')).toBe(1.0);
    });

    test('returns 1.0 for two empty strings', () => {
      expect(similarity('', '')).toBe(1.0);
    });

    test('returns 0.0 when one string is empty and other is not', () => {
      expect(similarity('test', '')).toBe(0.0);
      expect(similarity('', 'test')).toBe(0.0);
    });

    test('computes correct 1 - dist / maxLen ratio', () => {
      // 'kitten' vs 'sitting': maxLen = 7, dist = 3 -> 1 - 3/7 ≈ 0.5714
      const score = similarity('kitten', 'sitting');
      expect(score).toBeCloseTo(1 - 3 / 7, 4);
    });

    test('gives high score for close typos', () => {
      // 'hillcrest' (9) vs 'hilcrest' (8): dist = 1, maxLen = 9 -> 8/9 ≈ 0.8889
      const score = similarity('hillcrest', 'hilcrest');
      expect(score).toBeGreaterThan(0.85);
    });
  });

  describe('tokenJaccard', () => {
    test('returns 1.0 for identical word sets', () => {
      expect(tokenJaccard('fee payment refund', 'refund fee payment')).toBe(1.0);
    });

    test('returns 0.0 for completely disjoint word sets', () => {
      expect(tokenJaccard('college admission', 'hostel harassment')).toBe(0.0);
    });

    test('returns 0.0 when both inputs are empty', () => {
      expect(tokenJaccard('', '')).toBe(0.0);
    });

    test('calculates correct intersection over union', () => {
      // A: ['charging', 'excess', 'fees'] (3)
      // B: ['charging', 'tuition', 'fees'] (3)
      // Intersection: ['charging', 'fees'] (2)
      // Union: ['charging', 'excess', 'fees', 'tuition'] (4)
      // Jaccard: 2 / 4 = 0.5
      const score = tokenJaccard('charging excess fees', 'charging tuition fees');
      expect(score).toBe(0.5);
    });

    test('works with array of tokens as well as string', () => {
      const tokensA = ['a', 'b', 'c'];
      const tokensB = ['b', 'c', 'd'];
      expect(tokenJaccard(tokensA, tokensB)).toBe(2 / 4);
    });
  });
});
