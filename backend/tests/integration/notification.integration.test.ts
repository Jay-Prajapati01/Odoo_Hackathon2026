import request from 'supertest';
import { createApp } from '../../src/app';
import { startTestDb, stopTestDb, clearTestDb } from '../helpers/db';
import { seedRolesAndPermissions } from '../helpers/seed';
import { NotificationService } from '../../src/modules/notification/services/notification.service';
import { NotificationRepository } from '../../src/modules/notification/repositories/notification.repository';
import { NotificationPreferenceRepository } from '../../src/modules/notification/repositories/notification-preference.repository';

const app = createApp();
const base = '/api/v1';

describe('Notification API integration', () => {
  let token: string;
  let userId: string;
  const notify = new NotificationService(new NotificationRepository(), new NotificationPreferenceRepository());

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
      firstName: 'Note',
      lastName: 'User',
      email: 'note@example.com',
      password: 'Str0ng@Pass',
    });
    const login = await request(app).post(`${base}/auth/login`).send({ email: 'note@example.com', password: 'Str0ng@Pass' });
    token = login.body.data.accessToken;
    userId = login.body.data.user.id;
  });

  it('requires authentication', async () => {
    const res = await request(app).get(`${base}/notifications`);
    expect(res.status).toBe(401);
  });

  it('lists own notifications and reports unread count', async () => {
    await notify.notify({ receiver: userId, type: 'info', title: 'T1', message: 'M1', module: 'asset' });
    const list = await request(app).get(`${base}/notifications`).set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);

    const count = await request(app).get(`${base}/notifications/unread-count`).set('Authorization', `Bearer ${token}`);
    expect(count.body.data.unread).toBe(1);
  });

  it('marks a notification read and updates unread count', async () => {
    const doc = await notify.notify({ receiver: userId, type: 'info', title: 'T1', message: 'M1', module: 'asset' });
    const mark = await request(app)
      .patch(`${base}/notifications/${doc._id}/read`)
      .set('Authorization', `Bearer ${token}`);
    expect(mark.status).toBe(200);
    expect(mark.body.data.status).toBe('read');

    const count = await request(app).get(`${base}/notifications/unread-count`).set('Authorization', `Bearer ${token}`);
    expect(count.body.data.unread).toBe(0);
  });

  it('archives and deletes a notification', async () => {
    const doc = await notify.notify({ receiver: userId, type: 'info', title: 'T1', message: 'M1', module: 'asset' });
    const archive = await request(app)
      .patch(`${base}/notifications/${doc._id}/archive`)
      .set('Authorization', `Bearer ${token}`);
    expect(archive.status).toBe(200);
    expect(archive.body.data.status).toBe('archived');

    const del = await request(app)
      .delete(`${base}/notifications/${doc._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    expect(del.body.data.status).toBe('deleted');
  });

  it('returns and updates own notification preferences', async () => {
    const get = await request(app).get(`${base}/notifications/preferences`).set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body.data.inApp).toBe(true);

    const update = await request(app)
      .patch(`${base}/notifications/preferences`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: false });
    expect(update.status).toBe(200);
    expect(update.body.data.email).toBe(false);

    const after = await request(app).get(`${base}/notifications/preferences`).set('Authorization', `Bearer ${token}`);
    expect(after.body.data.email).toBe(false);
  });
});
