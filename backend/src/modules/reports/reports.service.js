import * as reportsRepo from './reports.repo.js';
import XLSX from 'xlsx';
import { ApiError } from '../../utils/ApiError.js';
import { runEscalations } from '../sla/escalation.service.js';

export async function generateReport(type, filters, user) {
  await runEscalations();

  const scopedFilters = { ...filters };
  if (user && user.role === 'HEAD') {
    scopedFilters.bureau = user.bureau;
  }

  switch (type) {
    case 'institution-wise':
      return await reportsRepo.getInstitutionWiseReport(scopedFilters);
    case 'region-wise':
      return await reportsRepo.getRegionWiseReport(scopedFilters);
    case 'bureau-wise':
      return await reportsRepo.getBureauWiseReport(scopedFilters);
    case 'ageing':
      return await reportsRepo.getAgeingReport(scopedFilters);
    case 'overlaps':
      return await reportsRepo.getOverlapsReport();
    default:
      throw new ApiError(400, 'VALIDATION_FAILED', `Unknown report type: ${type}`);
  }
}

/**
 * Converts array of flat JSON objects into an Excel binary buffer.
 * @param {Array<Object>} rows
 * @param {string} [sheetName='Report']
 * @returns {Buffer}
 */
export function toXlsx(rows, sheetName = 'Report') {
  const worksheet = XLSX.utils.json_to_sheet(rows || []);

  // Auto-fit column widths based on contents
  if (rows && rows.length > 0) {
    const colWidths = Object.keys(rows[0]).map((key) => {
      const maxLen = Math.max(
        key.length,
        ...rows.map((r) => (r[key] ? String(r[key]).length : 0))
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
    });
    worksheet['!cols'] = colWidths;
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
