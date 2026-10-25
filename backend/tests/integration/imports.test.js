import request from 'supertest';
import XLSX from 'xlsx';
import { createApp } from '../../src/app.js';
import { makeTestToken } from '../helpers/auth.js';

describe('Bulk Imports API', () => {
  const app = createApp();
  const officerToken = makeTestToken({ id: 3, username: 'officer.rb1', role: 'OFFICER', bureau: 'RB' });
  const managementToken = makeTestToken({ id: 10, username: 'management', role: 'MANAGEMENT' });

  test('GET /api/imports/template returns downloadable Excel template', async () => {
    const res = await request(app)
      .get('/api/imports/template')
      .set('Authorization', `Bearer ${officerToken}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('attachment; filename="aicte-cases-import-template.xlsx"');
  });

  test('POST /api/imports/cases validates rows with dryRun=true', async () => {
    // Build small valid test workbook
    const testRows = [
      {
        institution_permanent_id: 'AICTE-PID-0001',
        category: 'FEES',
        source_channel: 'CPGRAMS',
        received_on: '2026-10-20',
        description: 'Test imported complaint regarding unauthorized charges.',
        bureau: 'RB'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(testRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cases');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const res = await request(app)
      .post('/api/imports/cases?dryRun=true')
      .set('Authorization', `Bearer ${officerToken}`)
      .attach('file', buffer, 'cases-test.xlsx')
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.data.dryRun).toBe(true);
    expect(res.body.data.validRows).toBe(1);
    expect(res.body.data.errors).toHaveLength(0);
  });

  test('POST /api/imports/cases reports row-level errors for invalid rows', async () => {
    const invalidRows = [
      {
        institution_permanent_id: 'NON_EXISTENT_PID_9999',
        category: 'INVALID_CATEGORY',
        source_channel: 'TELEGRAM',
        received_on: 'invalid-date',
        description: '',
        bureau: 'RB'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(invalidRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cases');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const res = await request(app)
      .post('/api/imports/cases?dryRun=true')
      .set('Authorization', `Bearer ${officerToken}`)
      .attach('file', buffer, 'invalid-cases.xlsx')
      .expect(400);

    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  test('POST /api/imports/cases returns 400 when no file is uploaded', async () => {
    const res = await request(app)
      .post('/api/imports/cases')
      .set('Authorization', `Bearer ${officerToken}`)
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  test('POST /api/imports/cases forbids unauthorized roles (e.g. MANAGEMENT)', async () => {
    const res = await request(app)
      .post('/api/imports/cases')
      .set('Authorization', `Bearer ${managementToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
