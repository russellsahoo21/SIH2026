import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { generateToken } from '../helpers/auth.js';
import { pool } from '../../src/db/connection.js';

describe('Integration: Overlaps Module (/api/overlaps)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/overlaps', () => {
    test('returns 401 when token is missing', async () => {
      const res = await request(app).get('/api/overlaps');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    test('returns 200 with paginated overlap groups when called by COORDINATOR', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (text) => {
        if (text.includes('COUNT(*)')) {
          return { rows: [{ total: '1' }], rowCount: 1 };
        }
        return {
          rows: [
            {
              id: 7,
              institutionId: 12,
              institutionName: 'Hillcrest Institute of Technology',
              institutionPermanentId: 'AICTE-PID-0012',
              status: 'OPEN',
              severity: 'HIGH',
              leadBureau: null,
              notes: null,
              caseCount: '2',
              bureaus: ['PGRC', 'RB'],
              createdAt: '2026-10-25T10:00:00Z',
              updatedAt: '2026-10-25T10:00:00Z'
            }
          ],
          rowCount: 1
        };
      });

      const token = generateToken({ role: 'COORDINATOR' });
      const res = await request(app)
        .get('/api/overlaps?status=OPEN')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data[0].id).toBe(7);
      expect(res.body.data[0].severity).toBe('HIGH');
      expect(res.body.data[0].caseCount).toBe(2);
      expect(res.body.data[0].bureaus).toEqual(['PGRC', 'RB']);
      expect(res.body.meta).toEqual({ page: 1, pageSize: 25, total: 1 });
    });
  });

  describe('GET /api/overlaps/:id', () => {
    test('returns 404 when overlap group does not exist', async () => {
      jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const token = generateToken({ role: 'COORDINATOR' });
      const res = await request(app)
        .get('/api/overlaps/999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('returns 403 when OFFICER bureau is not involved in this overlap group', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (text) => {
        if (text.includes('FROM "overlaps" o')) {
          return {
            rows: [
              {
                id: 7,
                institutionId: 12,
                institutionName: 'Hillcrest Institute of Technology',
                institutionPermanentId: 'AICTE-PID-0012',
                status: 'OPEN',
                severity: 'HIGH'
              }
            ],
            rowCount: 1
          };
        }
        // Members belong to RB and PGRC, but user is from RO
        return {
          rows: [
            { caseId: 'RB/2026/00001', bureau: 'RB' },
            { caseId: 'PGRC/2026/00002', bureau: 'PGRC' }
          ],
          rowCount: 2
        };
      });

      const token = generateToken({ role: 'OFFICER', bureau: 'RO' });
      const res = await request(app)
        .get('/api/overlaps/7')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('returns 200 with members and suggested lead bureau for COORDINATOR', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (text) => {
        if (text.includes('FROM "overlaps" o')) {
          return {
            rows: [
              {
                id: 7,
                institutionId: 12,
                institutionName: 'Hillcrest Institute of Technology',
                institutionPermanentId: 'AICTE-PID-0012',
                status: 'OPEN',
                severity: 'HIGH',
                leadBureau: null,
                notes: null,
                reviewedBy: null,
                reviewerName: null,
                createdAt: '2026-10-25T10:00:00Z',
                updatedAt: '2026-10-25T10:00:00Z'
              }
            ],
            rowCount: 1
          };
        }
        return {
          rows: [
            {
              overlapId: 7,
              caseId: 'PGRC/2026/00064',
              similarity: 0.91,
              memberState: 'DETECTED',
              bureau: 'PGRC',
              category: 'FEES',
              sourceChannel: 'CPGRAMS',
              description: 'Charging excess fees',
              status: 'NEW',
              receivedOn: '2026-10-20',
              slaDays: 21,
              dueOn: '2026-11-10',
              assignedOfficerId: null,
              officerName: null,
              version: 1
            },
            {
              overlapId: 7,
              caseId: 'RB/2026/00376',
              similarity: 0.84,
              memberState: 'DETECTED',
              bureau: 'RB',
              category: 'FEES',
              sourceChannel: 'LETTER',
              description: 'Tuition fees violation',
              status: 'UNDER_PROCESS',
              receivedOn: '2026-10-22',
              slaDays: 21,
              dueOn: '2026-11-12',
              assignedOfficerId: null,
              officerName: null,
              version: 1
            }
          ],
          rowCount: 2
        };
      });

      const token = generateToken({ role: 'COORDINATOR' });
      const res = await request(app)
        .get('/api/overlaps/7')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(7);
      expect(res.body.data.suggestedLeadBureau).toBe('PGRC'); // earliest received case (Oct 20)
      expect(res.body.data.members).toHaveLength(2);
      expect(res.body.data.members[0].caseId).toBe('PGRC/2026/00064');
      expect(res.body.data.members[0].accessLevel).toBe('FULL');
    });
  });

  describe('POST /api/overlaps/:id/link (COORDINATOR only)', () => {
    test('returns 403 when called by non-coordinator', async () => {
      const token = generateToken({ role: 'OFFICER' });
      const res = await request(app)
        .post('/api/overlaps/7/link')
        .set('Authorization', `Bearer ${token}`)
        .send({
          caseIds: ['PGRC/2026/00064', 'RB/2026/00376'],
          leadBureau: 'PGRC'
        });

      expect(res.status).toBe(403);
    });

    test('returns 400 when missing required fields', async () => {
      const token = generateToken({ role: 'COORDINATOR' });
      const res = await request(app)
        .post('/api/overlaps/7/link')
        .set('Authorization', `Bearer ${token}`)
        .send({
          caseIds: [],
          leadBureau: ''
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    test('links cases, sets lead bureau, and writes action logs', async () => {
      const mockClient = {
        query: jest.fn().mockImplementation(async (text) => {
          if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
            return { rows: [] };
          }
          if (text.includes('UPDATE "overlaps"')) {
            return {
              rows: [{ id: 7, status: 'LINKED', lead_bureau: 'PGRC', notes: 'Joint action' }]
            };
          }
          if (text.includes('UPDATE overlap_members')) {
            return {
              rows: [
                { case_id: 'PGRC/2026/00064', member_state: 'LINKED' },
                { case_id: 'RB/2026/00376', member_state: 'LINKED' }
              ]
            };
          }
          if (text.includes('INSERT INTO actions')) {
            return { rows: [{ id: 1 }], rowCount: 1 };
          }
          return { rows: [] };
        }),
        release: jest.fn()
      };

      jest.spyOn(pool, 'connect').mockResolvedValue(mockClient);
      jest.spyOn(pool, 'query').mockImplementation(async (text) => {
        if (text.includes('FROM "overlaps" o')) {
          return {
            rows: [
              {
                id: 7,
                institutionId: 12,
                institutionName: 'Hillcrest Institute of Technology',
                institutionPermanentId: 'AICTE-PID-0012',
                status: 'LINKED',
                severity: 'HIGH',
                leadBureau: 'PGRC',
                notes: 'Both cases concern fee practices. PGRC to lead.'
              }
            ],
            rowCount: 1
          };
        }
        return {
          rows: [
            {
              caseId: 'PGRC/2026/00064',
              similarity: 0.91,
              memberState: 'LINKED',
              bureau: 'PGRC',
              category: 'FEES'
            },
            {
              caseId: 'RB/2026/00376',
              similarity: 0.84,
              memberState: 'LINKED',
              bureau: 'RB',
              category: 'FEES'
            }
          ],
          rowCount: 2
        };
      });

      const token = generateToken({ role: 'COORDINATOR' });
      const res = await request(app)
        .post('/api/overlaps/7/link')
        .set('Authorization', `Bearer ${token}`)
        .send({
          caseIds: ['PGRC/2026/00064', 'RB/2026/00376'],
          leadBureau: 'PGRC',
          notes: 'Both cases concern fee practices. PGRC to lead.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(7);
      expect(res.body.data.status).toBe('LINKED');
      expect(res.body.data.leadBureau).toBe('PGRC');
      expect(res.body.data.members).toHaveLength(2);
      expect(res.body.data.members[0].memberState).toBe('LINKED');
    });
  });

  describe('POST /api/overlaps/:id/not-related (COORDINATOR only)', () => {
    test('marks cases NOT_RELATED and dismisses group when no related cases remain', async () => {
      const mockClient = {
        query: jest.fn().mockImplementation(async (text) => {
          if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
            return { rows: [] };
          }
          if (text.includes('UPDATE overlap_members')) {
            return {
              rows: [{ case_id: 'RB/2026/00376', member_state: 'NOT_RELATED' }]
            };
          }
          if (text.includes('INSERT INTO actions')) {
            return { rows: [{ id: 1 }], rowCount: 1 };
          }
          if (text.includes('WHERE om.overlap_id = $1')) {
            // Only 1 related case left, so will dismiss group
            return {
              rows: [
                { caseId: 'PGRC/2026/00064', memberState: 'DETECTED', bureau: 'PGRC' },
                { caseId: 'RB/2026/00376', memberState: 'NOT_RELATED', bureau: 'RB' }
              ],
              rowCount: 2
            };
          }
          if (text.includes('UPDATE "overlaps"')) {
            return { rows: [{ id: 7, status: 'DISMISSED' }], rowCount: 1 };
          }
          return { rows: [] };
        }),
        release: jest.fn()
      };

      jest.spyOn(pool, 'connect').mockResolvedValue(mockClient);
      jest.spyOn(pool, 'query').mockImplementation(async (text) => {
        if (text.includes('FROM "overlaps" o')) {
          return {
            rows: [
              {
                id: 7,
                institutionId: 12,
                institutionName: 'Hillcrest Institute of Technology',
                status: 'DISMISSED',
                severity: 'MEDIUM'
              }
            ],
            rowCount: 1
          };
        }
        return {
          rows: [
            { caseId: 'PGRC/2026/00064', memberState: 'DETECTED', bureau: 'PGRC' },
            { caseId: 'RB/2026/00376', memberState: 'NOT_RELATED', bureau: 'RB' }
          ],
          rowCount: 2
        };
      });

      const token = generateToken({ role: 'COORDINATOR' });
      const res = await request(app)
        .post('/api/overlaps/7/not-related')
        .set('Authorization', `Bearer ${token}`)
        .send({
          caseIds: ['RB/2026/00376'],
          notes: 'RB case is about laboratory maintenance, not fees.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.status).toBe('DISMISSED');
    });
  });

  describe('POST /api/overlaps/:id/review', () => {
    test('updates status to REVIEWED with coordinator notes', async () => {
      const mockClient = {
        query: jest.fn().mockImplementation(async (text) => {
          if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
            return { rows: [] };
          }
          if (text.includes('UPDATE "overlaps"')) {
            return { rows: [{ id: 7, status: 'REVIEWED' }], rowCount: 1 };
          }
          return { rows: [] };
        }),
        release: jest.fn()
      };

      jest.spyOn(pool, 'connect').mockResolvedValue(mockClient);
      jest.spyOn(pool, 'query').mockImplementation(async (text) => {
        if (text.includes('FROM "overlaps" o')) {
          return {
            rows: [
              {
                id: 7,
                institutionId: 12,
                status: 'REVIEWED',
                severity: 'HIGH',
                notes: 'Reviewed by coordinator. Awaiting RB response.'
              }
            ],
            rowCount: 1
          };
        }
        return { rows: [], rowCount: 0 };
      });

      const token = generateToken({ role: 'COORDINATOR' });
      const res = await request(app)
        .post('/api/overlaps/7/review')
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: 'Reviewed by coordinator. Awaiting RB response.' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('REVIEWED');
    });
  });

  describe('POST /api/overlaps/:id/unlink/:caseId', () => {
    test('unlinks a case and reverts status to OPEN if linked members fall below 2', async () => {
      const mockClient = {
        query: jest.fn().mockImplementation(async (text) => {
          if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
            return { rows: [] };
          }
          if (text.includes('UPDATE overlap_members')) {
            return { rows: [{ case_id: 'RB/2026/00376', member_state: 'DETECTED' }] };
          }
          if (text.includes('INSERT INTO actions')) {
            return { rows: [{ id: 1 }], rowCount: 1 };
          }
          if (text.includes('WHERE om.overlap_id = $1')) {
            return {
              rows: [{ caseId: 'PGRC/2026/00064', memberState: 'LINKED' }],
              rowCount: 1
            };
          }
          if (text.includes('UPDATE "overlaps"')) {
            return { rows: [{ id: 7, status: 'OPEN' }], rowCount: 1 };
          }
          return { rows: [] };
        }),
        release: jest.fn()
      };

      jest.spyOn(pool, 'connect').mockResolvedValue(mockClient);
      jest.spyOn(pool, 'query').mockImplementation(async (text) => {
        if (text.includes('FROM "overlaps" o')) {
          return {
            rows: [
              {
                id: 7,
                institutionId: 12,
                status: 'OPEN',
                severity: 'HIGH',
                leadBureau: null
              }
            ],
            rowCount: 1
          };
        }
        return {
          rows: [
            { caseId: 'PGRC/2026/00064', memberState: 'LINKED', bureau: 'PGRC' },
            { caseId: 'RB/2026/00376', memberState: 'DETECTED', bureau: 'RB' }
          ],
          rowCount: 2
        };
      });

      const token = generateToken({ role: 'COORDINATOR' });
      const res = await request(app)
        .post('/api/overlaps/7/unlink/RB%2F2026%2F00376')
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: 'Unlinked for independent processing' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('OPEN');
    });
  });
});
