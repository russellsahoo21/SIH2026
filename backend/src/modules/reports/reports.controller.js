import * as reportsService from './reports.service.js';
import { sendSuccess } from '../../utils/response.js';

export async function getReport(req, res, next) {
  try {
    const { type } = req.params;
    const { format = 'json', ...filters } = req.query;

    const rows = await reportsService.generateReport(type, filters, req.user);

    if (format === 'xlsx') {
      const buffer = reportsService.toXlsx(rows, type);
      const filename = `aicte-report-${type}-${new Date().toISOString().slice(0, 10)}.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    }

    return sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
}
