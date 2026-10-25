import XLSX from 'xlsx';
import { query } from '../../db/connection.js';
import { ApiError } from '../../utils/ApiError.js';
import { importRowSchema } from './imports.schema.js';
import { registerCase } from '../cases/cases.service.js';

/**
 * Generates an empty Excel template for importing cases.
 * @returns {Buffer}
 */
export function generateTemplate() {
  const headers = [
    {
      institution_permanent_id: 'AICTE-PID-0012',
      category: 'FEES',
      source_channel: 'CPGRAMS',
      received_on: '2026-10-20',
      description: 'College is charging excess unapproved fees for the current academic session.',
      bureau: 'PGRC'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(headers);
  worksheet['!cols'] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 60 },
    { wch: 12 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cases_Import_Template');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Parses and validates an uploaded Excel file of complaints.
 * @param {Buffer} buffer
 * @param {Object} actor
 * @param {boolean} dryRun
 * @returns {Promise<Object>}
 */
export async function importCasesFromBuffer(buffer, actor, dryRun = true) {
  if (!buffer || buffer.length === 0) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'No file uploaded or file is empty');
  }

  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch (err) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Invalid Excel file format');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Excel file contains no sheets');
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'The Excel sheet contains no data rows');
  }

  if (rawRows.length > 2000) {
    throw new ApiError(400, 'FILE_TOO_LARGE', `File contains ${rawRows.length} rows; maximum allowed is 2,000 rows`);
  }

  // Pre-fetch institution map by permanent_id for fast lookup
  const instRes = await query('SELECT id, permanent_id, name FROM institutions WHERE active = 1');
  const institutionMap = new Map();
  instRes.rows.forEach((inst) => {
    institutionMap.set(inst.permanent_id.trim().toUpperCase(), inst);
  });

  const rowErrors = [];
  const validRecords = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = i + 2; // Row 1 is header, so data starts at row 2
    const raw = rawRows[i];

    // Format received_on if parsed as Excel serial date or object
    let receivedOnStr = String(raw.received_on || '').trim();
    if (typeof raw.received_on === 'number') {
      const parsedDate = XLSX.SSF.parse_date_code(raw.received_on);
      if (parsedDate) {
        receivedOnStr = `${parsedDate.y}-${String(parsedDate.m).padStart(2, '0')}-${String(parsedDate.d).padStart(2, '0')}`;
      }
    }

    const rowObj = {
      institution_permanent_id: String(raw.institution_permanent_id || '').trim(),
      category: String(raw.category || '').trim().toUpperCase(),
      source_channel: String(raw.source_channel || '').trim().toUpperCase(),
      received_on: receivedOnStr,
      description: String(raw.description || '').trim(),
      bureau: String(raw.bureau || '').trim().toUpperCase()
    };

    const parseResult = importRowSchema.safeParse(rowObj);
    if (!parseResult.success) {
      parseResult.error.issues.forEach((issue) => {
        rowErrors.push({
          row: rowNum,
          field: issue.path.join('.'),
          message: issue.message
        });
      });
      continue;
    }

    const validated = parseResult.data;

    // Check institution existence
    const inst = institutionMap.get(validated.institution_permanent_id.toUpperCase());
    if (!inst) {
      rowErrors.push({
        row: rowNum,
        field: 'institution_permanent_id',
        message: `Institution Permanent ID '${validated.institution_permanent_id}' not found`
      });
      continue;
    }

    // Role check: non-admin officers/heads can only register for their own bureau
    if (actor.role !== 'ADMIN' && actor.bureau && actor.bureau !== validated.bureau) {
      rowErrors.push({
        row: rowNum,
        field: 'bureau',
        message: `You cannot register complaints for bureau '${validated.bureau}' (assigned to '${actor.bureau}')`
      });
      continue;
    }

    validRecords.push({
      rowNum,
      institutionId: inst.id,
      category: validated.category,
      sourceChannel: validated.source_channel,
      receivedOn: validated.received_on,
      description: validated.description,
      bureau: validated.bureau
    });
  }

  // If there are validation failures, return diagnostics
  if (rowErrors.length > 0) {
    return {
      success: false,
      dryRun,
      totalRows: rawRows.length,
      validRows: validRecords.length,
      errorCount: rowErrors.length,
      errors: rowErrors
    };
  }

  // If dryRun, return success verification without modifying database
  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      totalRows: rawRows.length,
      validRows: validRecords.length,
      errors: []
    };
  }

  // Commit valid records
  const registeredCases = [];
  for (const record of validRecords) {
    const regResult = await registerCase(
      {
        institutionId: record.institutionId,
        category: record.category,
        sourceChannel: record.sourceChannel,
        receivedOn: record.receivedOn,
        description: record.description,
        bureau: record.bureau
      },
      actor
    );
    registeredCases.push(regResult.case.id);
  }

  return {
    success: true,
    dryRun: false,
    totalRows: rawRows.length,
    importedCount: registeredCases.length,
    caseIds: registeredCases
  };
}
