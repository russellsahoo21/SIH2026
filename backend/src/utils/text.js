/**
 * Text processing utilities for institution normalization and keyword matching.
 * Owned by Dev B.
 */

export const ABBREVIATIONS = {
  inst: 'institute',
  instt: 'institute',
  tech: 'technology',
  engg: 'engineering',
  eng: 'engineering',
  clg: 'college',
  univ: 'university',
  govt: 'government',
  sci: 'science',
  mgmt: 'management',
  mgt: 'management',
  '&': 'and'
};

/**
 * Normalizes an institution name:
 * 1. Lowercases text
 * 2. Replaces '&' with 'and'
 * 3. Removes punctuation
 * 4. Expands standard abbreviations
 * 5. Collapses multiple spaces
 *
 * @param {string} raw
 * @returns {string}
 */
export function normalizeName(raw) {
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  // Replace '&' with 'and' with spacing
  let text = raw.replace(/&/g, ' and ');

  // Lowercase
  text = text.toLowerCase();

  // Remove punctuation (keep alphanumeric and whitespace)
  text = text.replace(/[^a-z0-9\s]/g, ' ');

  // Tokenize and expand abbreviations
  const tokens = text
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => ABBREVIATIONS[token] || token);

  return tokens.join(' ').trim();
}

/**
 * Tokenizes text into an array of clean lowercase words.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}
