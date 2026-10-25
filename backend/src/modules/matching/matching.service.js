import { normalizeName, tokenize } from '../../utils/text.js';
import { similarity, tokenJaccard } from '../../utils/similarity.js';
import * as matchingRepo from './matching.repo.js';

export const CATEGORY_KEYWORDS = {
  FEES: [
    'fee', 'fees', 'tuition', 'money', 'refund', 'capitation', 'charge', 'charges',
    'charging', 'cost', 'payment', 'receipt', 'penalty', 'dues', 'overcharge',
    'overcharging', 'deposit', 'caution', 'fined', 'fine', 'extortion'
  ],
  INTAKE: [
    'intake', 'seat', 'seats', 'admission', 'admissions', 'quota', 'capacity',
    'excess', 'merit', 'counseling', 'admitted', 'enrollment', 'unapproved',
    'management', 'nri', 'lateral', 'supernumerary', 'vacancy', 'allotment'
  ],
  FACULTY: [
    'faculty', 'teacher', 'teachers', 'professor', 'professors', 'salary',
    'salaries', 'qualification', 'qualifications', 'staff', 'shortage',
    'attendance', 'phd', 'lecturer', 'lecturers', 'unqualified', 'biometric',
    'pay', 'scale', 'underpaid', 'recruitment', 'guide'
  ],
  INFRASTRUCTURE: [
    'infrastructure', 'lab', 'labs', 'laboratory', 'laboratories', 'building',
    'equipment', 'computer', 'computers', 'library', 'campus', 'classroom',
    'classrooms', 'facility', 'facilities', 'workshop', 'internet', 'wifi',
    'canteen', 'fire', 'safety', 'auditorium', 'playground'
  ],
  RAGGING: [
    'ragging', 'harass', 'harassment', 'bully', 'bullying', 'assault', 'mental',
    'abuse', 'hostel', 'threat', 'antiragging', 'senior', 'juniors', 'intimidation',
    'torture', 'violence', 'humiliation'
  ],
  NORM_VIOLATION: [
    'norm', 'norms', 'violation', 'violations', 'approval', 'aicte', 'compliance',
    'unauthorized', 'affiliation', 'illegal', 'regulation', 'regulations', 'land',
    'area', 'fake', 'fraud', 'noc', 'unapproved', 'eoan', 'de-affiliation', 'inspection'
  ],
  OTHER: [
    'other', 'general', 'miscellaneous', 'issue', 'complaint', 'grievance',
    'dispute', 'delay', 'certificate', 'degree', 'marksheet', 'transfer', 'transcripts'
  ]
};

/**
 * Returns all categories with description hints and keywords.
 */
export function getCategoriesWithKeywords() {
  return [
    { code: 'FEES', name: 'Fees & Overcharging', keywords: CATEGORY_KEYWORDS.FEES },
    { code: 'INTAKE', name: 'Intake & Admissions', keywords: CATEGORY_KEYWORDS.INTAKE },
    { code: 'FACULTY', name: 'Faculty & Staff', keywords: CATEGORY_KEYWORDS.FACULTY },
    { code: 'INFRASTRUCTURE', name: 'Infrastructure & Labs', keywords: CATEGORY_KEYWORDS.INFRASTRUCTURE },
    { code: 'RAGGING', name: 'Ragging & Harassment', keywords: CATEGORY_KEYWORDS.RAGGING },
    { code: 'NORM_VIOLATION', name: 'Norm Violation & AICTE Approvals', keywords: CATEGORY_KEYWORDS.NORM_VIOLATION },
    { code: 'OTHER', name: 'Other Complaints', keywords: CATEGORY_KEYWORDS.OTHER }
  ];
}

/**
 * Compares normalized typed name against all active institutions.
 * Returns candidates with score, ordered descending.
 *
 * @param {string} name
 * @param {number} [limit=3]
 * @returns {Promise<Array<{ id: number, name: string, permanentId: string, score: number }>>}
 */
export async function findInstitutionCandidates(name, limit = 3) {
  if (!name || typeof name !== 'string') {
    return [];
  }

  const normalizedInput = normalizeName(name);
  const cleanInput = name.trim().toLowerCase();

  const institutions = await matchingRepo.getActiveInstitutions();
  const scored = [];

  for (const inst of institutions) {
    // 1. Direct Permanent ID match
    if (inst.permanentId && inst.permanentId.toLowerCase() === cleanInput) {
      scored.push({
        id: inst.id,
        name: inst.name,
        permanentId: inst.permanentId,
        score: 1.0
      });
      continue;
    }

    const instNorm = inst.normalizedName || normalizeName(inst.name);

    if (normalizedInput === instNorm) {
      scored.push({
        id: inst.id,
        name: inst.name,
        permanentId: inst.permanentId,
        score: 1.0
      });
      continue;
    }

    // Levenshtein similarity ratio
    const sim = similarity(normalizedInput, instNorm);
    // Token Jaccard overlap
    const jacc = tokenJaccard(normalizedInput, instNorm);

    // Composite score weighted towards Levenshtein with token overlap boost
    let finalScore = 0.7 * sim + 0.3 * jacc;

    // Substring containment boost
    if (instNorm.includes(normalizedInput) || normalizedInput.includes(instNorm)) {
      finalScore = Math.max(finalScore, 0.85);
    }

    // Only include meaningful candidates
    if (finalScore >= 0.3) {
      scored.push({
        id: inst.id,
        name: inst.name,
        permanentId: inst.permanentId,
        score: Math.round(finalScore * 100) / 100
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Scores each category by keyword hits in the description.
 * Returns best category, confidence (hits share, capped 0 to 1) and alternatives.
 *
 * @param {string} description
 * @returns {{ suggested: string, confidence: number, alternatives: string[] }}
 */
export function suggestCategory(description) {
  if (!description || typeof description !== 'string') {
    return {
      suggested: 'OTHER',
      confidence: 0.2,
      alternatives: ['FEES', 'INTAKE']
    };
  }

  const tokens = tokenize(description);
  const lowerDesc = description.toLowerCase();

  const categoryScores = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let hits = 0;
    for (const kw of keywords) {
      // Check for exact token match
      if (tokens.includes(kw)) {
        hits += 1;
      } else if (lowerDesc.includes(kw)) {
        hits += 0.5;
      }
    }
    categoryScores.push({ category, hits });
  }

  categoryScores.sort((a, b) => b.hits - a.hits);

  const totalHits = categoryScores.reduce((sum, item) => sum + item.hits, 0);

  if (totalHits === 0) {
    return {
      suggested: 'OTHER',
      confidence: 0.2,
      alternatives: ['FEES', 'INTAKE']
    };
  }

  const best = categoryScores[0];
  // Calculate confidence as share of hits, capped between 0.2 and 1.0
  const confidence = Math.min(1.0, Math.max(0.2, Math.round((best.hits / totalHits) * 100) / 100));

  // Determine alternatives
  const alternatives = categoryScores
    .slice(1)
    .filter((c) => c.category !== best.category)
    .slice(0, 2)
    .map((c) => c.category);

  // If alternatives don't have 2 items, fill from other categories
  const allCategories = Object.keys(CATEGORY_KEYWORDS);
  for (const cat of allCategories) {
    if (alternatives.length >= 2) break;
    if (cat !== best.category && !alternatives.includes(cat)) {
      alternatives.push(cat);
    }
  }

  return {
    suggested: best.category,
    confidence,
    alternatives
  };
}
