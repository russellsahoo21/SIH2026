import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { generateToken } from '../helpers/auth.js';
import { pool } from '../../src/db/connection.js';

describe('Integration: Matching Routes (/api/suggest, /api/categories)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/categories', () => {
    test('returns 200 and list of categories with keywords', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(7);

      const feeCategory = res.body.data.find((c) => c.code === 'FEES');
      expect(feeCategory).toBeDefined();
      expect(feeCategory.name).toContain('Fees');
      expect(feeCategory.keywords).toContain('fees');
    });
  });

  describe('POST /api/suggest', () => {
    test('returns 401 UNAUTHENTICATED when token is missing', async () => {
      const res = await request(app)
        .post('/api/suggest')
        .send({ institutionName: 'Hillcrest Inst', description: 'Excess fees' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    test('returns 403 FORBIDDEN when user has unauthorized role (e.g. MANAGEMENT)', async () => {
      const token = generateToken({ role: 'MANAGEMENT' });
      const res = await request(app)
        .post('/api/suggest')
        .set('Authorization', `Bearer ${token}`)
        .send({ institutionName: 'Hillcrest Inst', description: 'Excess fees' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('returns 400 VALIDATION_FAILED when institutionName or description is empty', async () => {
      const token = generateToken({ role: 'OFFICER' });
      const res = await request(app)
        .post('/api/suggest')
        .set('Authorization', `Bearer ${token}`)
        .send({ institutionName: '', description: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    test('returns 200 and suggestions when called by OFFICER', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async () => ({
        rows: [
          {
            id: 12,
            name: 'Hillcrest Institute of Technology',
            normalizedName: 'hillcrest institute of technology',
            permanentId: 'AICTE-PID-0012',
            region: 'North'
          },
          {
            id: 19,
            name: 'Hillcrest Institute of Management',
            normalizedName: 'hillcrest institute of management',
            permanentId: 'AICTE-PID-0019',
            region: 'North'
          }
        ],
        rowCount: 2
      }));

      const token = generateToken({ role: 'OFFICER' });
      const res = await request(app)
        .post('/api/suggest')
        .set('Authorization', `Bearer ${token}`)
        .send({
          institutionName: 'Hillcrest Inst. of Tech.',
          description: 'Charging unapproved development fees'
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();

      const { institutionCandidates, category } = res.body.data;
      expect(Array.isArray(institutionCandidates)).toBe(true);
      expect(institutionCandidates.length).toBeGreaterThan(0);
      expect(institutionCandidates[0].name).toBe('Hillcrest Institute of Technology');
      expect(institutionCandidates[0].score).toBe(1.0);

      expect(category).toBeDefined();
      expect(category.suggested).toBe('FEES');
      expect(category.confidence).toBeGreaterThan(0.5);
      expect(Array.isArray(category.alternatives)).toBe(true);
    });
  });
});
