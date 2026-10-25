import request from 'supertest';
import { createApp } from '../../src/app.js';
import { makeTestToken } from '../helpers/auth.js';

describe('Reports API', () => {
  const app = createApp();
  const managementToken = makeTestToken({ id: 10, username: 'management', role: 'MANAGEMENT' });
  const officerToken = makeTestToken({ id: 3, username: 'officer.rb1', role: 'OFFICER', bureau: 'RB' });

  test('GET /api/reports/institution-wise returns JSON format by default', async () => {
    const res = await request(app)
      .get('/api/reports/institution-wise')
      .set('Authorization', `Bearer ${managementToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/reports/institution-wise?format=xlsx returns binary Excel spreadsheet', async () => {
    const res = await request(app)
      .get('/api/reports/institution-wise?format=xlsx')
      .set('Authorization', `Bearer ${managementToken}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('attachment; filename="aicte-report-institution-wise');
    expect(res.body).toBeDefined();
  });

  test('GET /api/reports/region-wise returns regional aggregation', async () => {
    const res = await request(app)
      .get('/api/reports/region-wise')
      .set('Authorization', `Bearer ${managementToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/reports/bureau-wise returns bureau intake and disposal statistics', async () => {
    const res = await request(app)
      .get('/api/reports/bureau-wise')
      .set('Authorization', `Bearer ${managementToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/reports/ageing returns open cases detailed report', async () => {
    const res = await request(app)
      .get('/api/reports/ageing')
      .set('Authorization', `Bearer ${managementToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/reports/overlaps returns overlaps report', async () => {
    const res = await request(app)
      .get('/api/reports/overlaps')
      .set('Authorization', `Bearer ${managementToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('Returns 403 when role is OFFICER', async () => {
    const res = await request(app)
      .get('/api/reports/bureau-wise')
      .set('Authorization', `Bearer ${officerToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('Returns 400 for unknown report type', async () => {
    const res = await request(app)
      .get('/api/reports/unknown-report')
      .set('Authorization', `Bearer ${managementToken}`)
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
