import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { generateToken } from '../helpers/auth.js';
import { pool } from '../../src/db/connection.js';

describe('Integration: Institutions Module (/api/institutions)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/institutions', () => {
    test('returns 401 when token is missing', async () => {
      const res = await request(app).get('/api/institutions');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    test('returns 200 with paginated list of institutions', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (text) => {
        if (text.includes('COUNT(*)')) {
          return { rows: [{ total: '1' }], rowCount: 1 };
        }
        return {
          rows: [
            {
              id: 1,
              permanentId: 'AICTE-PID-0001',
              name: 'Alpha College of Engineering',
              normalizedName: 'alpha college of engineering',
              address: 'City Center',
              region: 'North',
              active: 1
            }
          ],
          rowCount: 1
        };
      });

      const token = generateToken({ role: 'OFFICER' });
      const res = await request(app)
        .get('/api/institutions?page=1&pageSize=10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.meta).toEqual({ page: 1, pageSize: 10, total: 1 });
      expect(res.body.data[0].permanentId).toBe('AICTE-PID-0001');
    });

    test('returns 200 with ranked search results when q is provided', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async () => {
        return {
          rows: [
            {
              id: 12,
              permanentId: 'AICTE-PID-0012',
              name: 'Hillcrest Institute of Technology',
              normalizedName: 'hillcrest institute of technology',
              address: 'Sector 5',
              region: 'North',
              active: 1
            },
            {
              id: 19,
              permanentId: 'AICTE-PID-0019',
              name: 'Apex Institute of Management',
              normalizedName: 'apex institute of management',
              address: 'South Campus',
              region: 'South',
              active: 1
            }
          ],
          rowCount: 2
        };
      });

      const token = generateToken({ role: 'OFFICER' });
      const res = await request(app)
        .get('/api/institutions?q=Hillcrest%20Inst')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].name).toBe('Hillcrest Institute of Technology');
      expect(res.body.data[0].score).toBeGreaterThan(0.8);
    });
  });

  describe('GET /api/institutions/:id', () => {
    test('returns 404 when institution does not exist', async () => {
      jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const token = generateToken({ role: 'OFFICER' });
      const res = await request(app)
        .get('/api/institutions/9999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('returns 200 with institution profile and aggregated caseCounts', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (text) => {
        if (text.includes('FROM institutions')) {
          return {
            rows: [
              {
                id: 12,
                permanentId: 'AICTE-PID-0012',
                name: 'Hillcrest Institute of Technology',
                normalizedName: 'hillcrest institute of technology',
                address: 'Tech Park',
                region: 'North',
                active: 1
              }
            ],
            rowCount: 1
          };
        }
        // case counts query
        return {
          rows: [
            {
              total: '3',
              countNew: '1',
              countUnderProcess: '2',
              countPending: '0',
              countTransferred: '0',
              countEscalated: '0',
              countDisposed: '0',
              countOverdue: '0',
              bureauCode: 'RB',
              bureauCount: '3'
            }
          ],
          rowCount: 1
        };
      });

      const token = generateToken({ role: 'OFFICER' });
      const res = await request(app)
        .get('/api/institutions/12')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(12);
      expect(res.body.data.caseCounts).toBeDefined();
      expect(res.body.data.caseCounts.total).toBe(3);
      expect(res.body.data.caseCounts.byBureau.RB).toBe(3);
    });
  });

  describe('GET /api/institutions/:id/cases', () => {
    test('returns 200 with institution cases and applies visibility redaction', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (text) => {
        if (text.includes('FROM institutions')) {
          return {
            rows: [
              {
                id: 12,
                permanentId: 'AICTE-PID-0012',
                name: 'Hillcrest Institute of Technology'
              }
            ],
            rowCount: 1
          };
        }
        if (text.includes('COUNT(*)')) {
          return { rows: [{ total: '1' }], rowCount: 1 };
        }
        // Cases query - owned by PGRC, viewer is RB officer (so LIMITED view)
        return {
          rows: [
            {
              id: 'PGRC/2026/00001',
              institutionId: 12,
              bureau: 'PGRC',
              category: 'FEES',
              sourceChannel: 'CPGRAMS',
              description: 'Secret confidential grievance text',
              status: 'NEW',
              assignedOfficerId: null,
              officerName: null,
              receivedOn: '2026-10-20',
              slaDays: 21,
              dueOn: '2026-11-10',
              disposedOn: null,
              version: 1
            }
          ],
          rowCount: 1
        };
      });

      const token = generateToken({ role: 'OFFICER', bureau: 'RB' });
      const res = await request(app)
        .get('/api/institutions/12/cases')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data[0].id).toBe('PGRC/2026/00001');
      expect(res.body.data[0].accessLevel).toBe('LIMITED');
      // Description is hidden for other bureau officer
      expect(res.body.data[0].description).toBeNull();
      expect(res.body.data[0].sourceChannel).toBeNull();
    });
  });

  describe('POST /api/institutions (ADMIN only)', () => {
    test('returns 403 when called by non-admin', async () => {
      const token = generateToken({ role: 'OFFICER' });
      const res = await request(app)
        .post('/api/institutions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          permanentId: 'AICTE-PID-9999',
          name: 'New College',
          region: 'North'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('returns 400 when required fields are missing', async () => {
      const token = generateToken({ role: 'ADMIN' });
      const res = await request(app)
        .post('/api/institutions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          permanentId: '',
          name: ''
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    test('returns 201 and creates institution with normalized_name when called by ADMIN', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (text, params) => {
        if (text.includes('WHERE permanent_id = $1')) {
          return { rows: [], rowCount: 0 }; // Not existing
        }
        if (text.includes('INSERT INTO institutions')) {
          return {
            rows: [
              {
                id: 100,
                permanentId: params[0],
                name: params[1],
                normalizedName: params[2],
                address: params[3],
                region: params[4],
                active: 1
              }
            ],
            rowCount: 1
          };
        }
        return { rows: [], rowCount: 0 };
      });

      const token = generateToken({ role: 'ADMIN' });
      const res = await request(app)
        .post('/api/institutions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          permanentId: 'AICTE-PID-0100',
          name: 'Apex Inst. of Engg. & Tech.',
          address: 'Main Highway',
          region: 'West'
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(100);
      expect(res.body.data.normalizedName).toBe('apex institute of engineering and technology');
    });
  });

  describe('PATCH /api/institutions/:id (ADMIN only)', () => {
    test('returns 403 when called by non-admin', async () => {
      const token = generateToken({ role: 'OFFICER' });
      const res = await request(app)
        .patch('/api/institutions/12')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(403);
    });

    test('returns 200 and recomputes normalized_name upon name change', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (text, params) => {
        if (text.includes('SELECT') && text.includes('WHERE id = $1')) {
          return {
            rows: [
              {
                id: 12,
                permanentId: 'AICTE-PID-0012',
                name: 'Old Name',
                normalizedName: 'old name',
                address: 'Old Address',
                region: 'North',
                active: 1
              }
            ],
            rowCount: 1
          };
        }
        if (text.includes('UPDATE institutions')) {
          return {
            rows: [
              {
                id: 12,
                permanentId: 'AICTE-PID-0012',
                name: 'Modern Inst. of Tech.',
                normalizedName: 'modern institute of technology',
                address: 'Old Address',
                region: 'North',
                active: 1
              }
            ],
            rowCount: 1
          };
        }
        return { rows: [], rowCount: 0 };
      });

      const token = generateToken({ role: 'ADMIN' });
      const res = await request(app)
        .patch('/api/institutions/12')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Modern Inst. of Tech.' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Modern Inst. of Tech.');
      expect(res.body.data.normalizedName).toBe('modern institute of technology');
    });
  });
});
