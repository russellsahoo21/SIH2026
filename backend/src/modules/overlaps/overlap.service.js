import { logger } from '../../config/logger.js';

/**
 * Dev B Overlap Service Stub
 * Provides non-blocking fallbacks until Dev B implements the complete similarity matching logic.
 */
export async function checkForCase(caseId) {
  logger.info(`[Overlap Stub] checkForCase triggered for case: ${caseId}`);
  return {
    found: false,
    overlapId: null,
    severity: null,
    otherCases: 0
  };
}

export async function recheckForCase(caseId) {
  logger.info(`[Overlap Stub] recheckForCase triggered for case: ${caseId}`);
  return null;
}
