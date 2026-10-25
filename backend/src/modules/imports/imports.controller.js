import * as importsService from './imports.service.js';
import { sendSuccess } from '../../utils/response.js';
import { ApiError } from '../../utils/ApiError.js';

export async function getTemplate(req, res, next) {
  try {
    const buffer = importsService.generateTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="aicte-cases-import-template.xlsx"'
    );
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function importCases(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      throw new ApiError(400, 'VALIDATION_FAILED', 'Excel file must be provided under field "file"');
    }

    const dryRun = req.query.dryRun === 'true' || req.query.dryRun === '1';
    const result = await importsService.importCasesFromBuffer(req.file.buffer, req.user, dryRun);

    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: `Validation failed on ${result.errorCount} row(s)`,
          details: result.errors
        },
        meta: {
          totalRows: result.totalRows,
          validRows: result.validRows
        }
      });
    }

    const statusCode = dryRun ? 200 : 201;
    return sendSuccess(res, result, undefined, statusCode);
  } catch (err) {
    next(err);
  }
}
