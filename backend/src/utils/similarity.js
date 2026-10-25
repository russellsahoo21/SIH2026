import { distance } from 'fastest-levenshtein';
import { tokenize } from './text.js';

/**
 * Calculates string similarity ratio (0.0 to 1.0) using Levenshtein distance:
 * score = 1 - (distance / max(len(a), len(b)))
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} 0.0 to 1.0
 */
export function similarity(a, b) {
  const strA = typeof a === 'string' ? a : String(a || '');
  const strB = typeof b === 'string' ? b : String(b || '');

  if (strA === strB) {
    return 1.0;
  }

  const maxLen = Math.max(strA.length, strB.length);
  if (maxLen === 0) {
    return 1.0;
  }

  const dist = distance(strA, strB);
  const ratio = 1 - dist / maxLen;
  return Math.max(0, Math.min(1, ratio));
}

/**
 * Calculates Jaccard similarity between word sets of two texts:
 * J(A, B) = |A ∩ B| / |A ∪ B|
 *
 * @param {string|string[]} a
 * @param {string|string[]} b
 * @returns {number} 0.0 to 1.0
 */
export function tokenJaccard(a, b) {
  const tokensA = Array.isArray(a) ? a : tokenize(a);
  const tokensB = Array.isArray(b) ? b : tokenize(b);

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  if (setA.size === 0 && setB.size === 0) {
    return 0.0;
  }

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionCount++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionCount;
  if (unionSize === 0) {
    return 0.0;
  }

  return intersectionCount / unionSize;
}
