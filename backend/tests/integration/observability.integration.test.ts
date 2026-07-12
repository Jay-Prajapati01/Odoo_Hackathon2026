import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../src/app';
import { startTestDb, stopTestDb, clearTestDb } from '../helpers/db';
import { createAdmin, BASE } from '../helpers/auth';

describe('Observability, RBAC, reports & settings integration', () => {
  const app: Application = createApp();
  let token: string;

  beforeAll(async () => {
    await startTestDb();
  });
  afterAll(async () => {
    await stopTestDb();
  });
  beforeEach(async () => {
    await clearTestDb();
    const admin = await createAdmin(app);
    token = admin.token;
  });

  it('records an activity log entry when a department is created', async () => {
    await request(app)
      .post(`${BASE}/departments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ops', code: 'OPS' });
    const res = await request(app).get(`${BASE}/activity-logs`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('lists the audit trail', async () => {
    const res = await request(app).get(`${BASE}/audit-trail`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns a dashboard summary', async () => {
    const res = await request(app).get(`${BASE}/dashboard/summary`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it('generates asset and maintenance reports', async () => {
    const assets = await request(app).get(`${BASE}/reports/assets`).set('Authorization', `Bearer ${token}`);
    expect(assets.status).toBe(200);
    const transfers = await request(app).get(`${BASE}/reports/transfers`).set('Authorization', `Bearer ${token}`);
    expect(transfers.status).toBe(200);
  });

  it('reads system settings and lists roles', async () => {
    const settings = await request(app).get(`${BASE}/settings`).set('Authorization', `Bearer ${token}`);
    expect(settings.status).toBe(200);
    const roles = await request(app).get(`${BASE}/roles`).set('Authorization', `Bearer ${token}`);
    expect(roles.status).toBe(200);
    expect(roles.body.data.some((r: { roleName: string }) => r.roleName === 'Admin')).toBe(true);
  });
});
