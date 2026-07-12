import request from 'supertest';
import { createApp } from '../../src/app';
import { startTestDb, stopTestDb, clearTestDb } from '../helpers/db';
import { seedRolesAndPermissions } from '../helpers/seed';
import { ActivityLogService } from '../../src/modules/activity-log/services/activity-log.service';
import { ActivityLogRepository } from '../../src/modules/activity-log/repositories/activity-log.repository';

const app = createApp();
const base = '/api/v1';

describe('Activity Log API integration', () => {
  let token: string;
  let userId: string;
  const activity = new ActivityLogService(new ActivityLogRepository());

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
      firstName: 'Act',
      lastName: 'User',
      email: 'act@example.com',
      password: 'Str0ng@Pass',
    });
    const login = await request(app).post(`${base}/auth/login`).send({ email: 'act@example.com', password: 'Str0ng@Pass' });
    token = login.body.data.accessToken;
    userId = login.body.data.user.id;
  });

  it('requires authentication', async () => {
    const res = await request(app).get(`${base}/activity-logs`);
    expect(res.status).toBe(401);
  });

  it('lists activity logs and retrieves a single entry', async () => {
    const entry = await activity.log({
      user: userId,
      module: 'asset',
      entityType: 'Asset',
      entityId: 'asset-1',
      action: 'asset.created',
      description: 'Asset registered',
    });
    const list = await request(app).get(`${base}/activity-logs`).set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThanOrEqual(1);

    const single = await request(app)
      .get(`${base}/activity-logs/${entry._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(single.status).toBe(200);
    expect(single.body.data.entityType).toBe('Asset');
  });

  it('filters by module', async () => {
    await activity.log({ user: userId, module: 'asset', entityType: 'Asset', entityId: 'a1', action: 'asset.created' });
    await activity.log({ user: userId, module: 'booking', entityType: 'Booking', entityId: 'b1', action: 'booking.created' });
    const res = await request(app)
      .get(`${base}/activity-logs?module=booking`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((log: { module: string }) => log.module === 'booking')).toBe(true);
  });
});
