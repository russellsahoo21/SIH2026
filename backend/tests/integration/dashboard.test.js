import request from 'supertest';
import { createApp } from '../../src/app.js';
import { makeTestToken } from '../helpers/auth.js';

describe('Dashboard Analytics API', () => {
  const app = createApp();
  const managementToken = makeTestToken({ id: 10, username: 'management', role: 'MANAGEMENT' });
  const headToken = makeTestToken({ id: 4, username: 'head.rb', role: 'HEAD', bureau: 'RB' });
  const officerToken = makeTestToken({ id: 3, username: 'officer.rb1', role: 'OFFICER', bureau: 'RB' });

  test('GET /api/dashboard/summary returns total and status dictionary', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${managementToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.total).toBe('number');
    expect(res.body.data.byStatus).toBeDefined();
    expect(typeof res.body.data.byStatus.UNDER_PROCESS).toBe('number');
    expect(typeof res.body.data.overdue).toBe('number');
    expect(typeof res.body.data.openOverlapGroups).toBe('number');
  });

  test('GET /api/dashboard/summary requires authentication', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .expect(401);

    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('GET /api/dashboard/workload allows HEAD and returns officer breakdown', async () => {
    const res = await request(app)
      .get('/api/dashboard/workload')
      .set('Authorization', `Bearer ${headToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.byBureau)).toBe(true);
    expect(Array.isArray(res.body.data.byOfficer)).toBe(true);
    expect(Array.isArray(res.body.data.unassigned)).toBe(true);
  });

  test('GET /api/dashboard/workload forbids OFFICER', async () => {
    const res = await request(app)
      .get('/api/dashboard/workload')
      .set('Authorization', `Bearer ${officerToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('GET /api/dashboard/ageing returns bucketed age bands', async () => {
    const res = await request(app)
      .get('/api/dashboard/ageing')
      .set('Authorization', `Bearer ${managementToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.data.bands).toBeDefined();
    expect(typeof res.body.data.bands['0_to_7_days']).toBe('number');
    expect(typeof res.body.data.bands['8_to_14_days']).toBe('number');
    expect(typeof res.body.data.bands['15_to_21_days']).toBe('number');
    expect(typeof res.body.data.bands['22_plus_days']).toBe('number');
    expect(typeof res.body.data.totalOpen).toBe('number');
  });

  test('GET /api/dashboard/top-overdue returns top overdue cases list', async () => {
    const res = await request(app)
      .get('/api/dashboard/top-overdue?limit=5')
      .set('Authorization', `Bearer ${managementToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });

  test('GET /api/dashboard/monthly-disposal returns monthly counts', async () => {
    const res = await request(app)
      .get('/api/dashboard/monthly-disposal?year=2026')
      .set('Authorization', `Bearer ${managementToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.data.year).toBe(2026);
    expect(Array.isArray(res.body.data.monthly)).toBe(true);
    expect(res.body.data.monthly.length).toBe(12);
  });

  test('GET /api/dashboard/region-summary returns geographic metrics', async () => {
    const res = await request(app)
      .get('/api/dashboard/region-summary')
      .set('Authorization', `Bearer ${managementToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
