import request from 'supertest';
import { createApp } from '../../src/app.js';
import { makeTestToken } from '../helpers/auth.js';

describe('SLA Config API', () => {
  const app = createApp();
  const adminToken = makeTestToken({ id: 1, username: 'admin', role: 'ADMIN' });
  const officerToken = makeTestToken({ id: 2, username: 'officer.rb1', role: 'OFFICER', bureau: 'RB' });

  test('GET /api/sla-config returns category days list', async () => {
    const res = await request(app)
      .get('/api/sla-config')
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    const fees = res.body.data.find((c) => c.category === 'FEES');
    expect(fees).toBeDefined();
    expect(fees.days).toBeGreaterThan(0);
  });

  test('PATCH /api/sla-config/:category updates days when role is ADMIN', async () => {
    const res = await request(app)
      .patch('/api/sla-config/FEES')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ days: 25 })
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.data.category).toBe('FEES');
    expect(res.body.data.days).toBe(25);
  });

  test('PATCH /api/sla-config/:category returns 403 when role is OFFICER', async () => {
    const res = await request(app)
      .patch('/api/sla-config/FEES')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ days: 30 })
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('PATCH /api/sla-config/:category validates input schema', async () => {
    const res = await request(app)
      .patch('/api/sla-config/FEES')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ days: -5 })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
