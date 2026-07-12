import request from 'supertest';
import { createApp } from '../../src/app';
import { startTestDb, stopTestDb, clearTestDb } from '../helpers/db';
import { seedRolesAndPermissions } from '../helpers/seed';
import { AuditTrailService } from '../../src/modules/audit-trail/services/audit-trail.service';
import { AuditTrailRepository } from '../../src/modules/audit-trail/repositories/audit-trail.repository';

const app = createApp();
const base = '/api/v1';

describe('Audit Trail API integration', () => {
  let token: string;
  let userId: string;
  const audit = new AuditTrailService(new AuditTrailRepository());

  beforeAll(async () => {
    await startTestDb();
    await seedRolesAndPermissions();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    await seedRolesAndPermissions();
    await request(app).post(`${base}/auth/signup`).send({
      firstName: 'Aud',
      lastName: 'User',
      email: 'aud@example.com',
      password: 'Str0ng@Pass',
    });
    const login = await request(app).post(`${base}/auth/login`).send({ email: 'aud@example.com', password: 'Str0ng@Pass' });
    token = login.body.data.accessToken;
    userId = login.body.data.user.id;
  });

  it('requires authentication', async () => {
    const res = await request(app).get(`${base}/audit-trail`);
    expect(res.status).toBe(401);
  });

  it('lists audit trail entries and retrieves a single entry', async () => {
    const entry = await audit.record({
      entity: 'Asset',
      entityId: 'asset-1',
      operation: 'update',
      performedBy: userId,
      oldSnapshot: { status: 'active' },
      newSnapshot: { status: 'maintenance' },
      module: 'asset',
    });
    const list = await request(app).get(`${base}/audit-trail`).set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThanOrEqual(1);

    const single = await request(app)
      .get(`${base}/audit-trail/${entry._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(single.status).toBe(200);
    expect(single.body.data.entity).toBe('Asset');
  });

  it('filters by operation', async () => {
    await audit.record({ entity: 'Asset', entityId: 'a1', operation: 'create', performedBy: userId, module: 'asset' });
    await audit.record({ entity: 'Asset', entityId: 'a2', operation: 'delete', performedBy: userId, module: 'asset' });
    const res = await request(app)
      .get(`${base}/audit-trail?operation=delete`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((e: { operation: string }) => e.operation === 'delete')).toBe(true);
  });
});
