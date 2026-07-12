import request from 'supertest';
import { createApp } from '../../src/app';
import { startTestDb, stopTestDb, clearTestDb } from '../helpers/db';
import { seedRolesAndPermissions } from '../helpers/seed';

const app = createApp();
const base = '/api/v1';

describe('Authentication integration', () => {
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
  });

  it('signup creates an Employee only (no role selection)', async () => {
    const res = await request(app).post(`${base}/auth/signup`).send({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'Str0ng@Pass',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roleName).toBe('Employee');
    expect(res.body.data.permissions).toContain('read');
    expect(res.body.data.permissions).not.toContain('user.promote');
  });

  it('rejects duplicate signup', async () => {
    const payload = { firstName: 'Jane', lastName: 'Doe', email: 'dup@example.com', password: 'Str0ng@Pass' };
    await request(app).post(`${base}/auth/signup`).send(payload);
    const res = await request(app).post(`${base}/auth/signup`).send(payload);
    expect(res.status).toBe(409);
  });

  it('login returns tokens, user, permissions and roles', async () => {
    await request(app).post(`${base}/auth/signup`).send({
      firstName: 'Joe',
      lastName: 'User',
      email: 'joe@example.com',
      password: 'Str0ng@Pass',
    });
    const res = await request(app).post(`${base}/auth/login`).send({ email: 'joe@example.com', password: 'Str0ng@Pass' });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.role).toBe('Employee');
  });

  it('rejects login with wrong password', async () => {
    await request(app).post(`${base}/auth/signup`).send({
      firstName: 'Joe',
      lastName: 'User',
      email: 'bad@example.com',
      password: 'Str0ng@Pass',
    });
    const res = await request(app).post(`${base}/auth/login`).send({ email: 'bad@example.com', password: 'Wrong@123' });
    expect(res.status).toBe(401);
  });

  it('GET /me requires authentication', async () => {
    const res = await request(app).get(`${base}/auth/me`);
    expect(res.status).toBe(401);
  });

  it('full flow: signup -> login -> me -> refresh', async () => {
    await request(app).post(`${base}/auth/signup`).send({
      firstName: 'Flow',
      lastName: 'User',
      email: 'flow@example.com',
      password: 'Str0ng@Pass',
    });
    const login = await request(app).post(`${base}/auth/login`).send({ email: 'flow@example.com', password: 'Str0ng@Pass' });
    const { accessToken, refreshToken } = login.body.data;

    const me = await request(app).get(`${base}/auth/me`).set('Authorization', `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('flow@example.com');

    const refresh = await request(app).post(`${base}/auth/refresh`).send({ refreshToken });
    expect(refresh.status).toBe(200);
    expect(refresh.body.data.accessToken).toBeDefined();
  });

  it('change password requires correct current password', async () => {
    await request(app).post(`${base}/auth/signup`).send({
      firstName: 'Chg',
      lastName: 'User',
      email: 'chg@example.com',
      password: 'Str0ng@Pass',
    });
    const login = await request(app).post(`${base}/auth/login`).send({ email: 'chg@example.com', password: 'Str0ng@Pass' });
    const { accessToken } = login.body.data;

    const wrong = await request(app)
      .post(`${base}/auth/change-password`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'Wrong@123', newPassword: 'New@5678', confirmPassword: 'New@5678' });
    expect(wrong.status).toBe(400);

    const ok = await request(app)
      .post(`${base}/auth/change-password`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'Str0ng@Pass', newPassword: 'New@5678', confirmPassword: 'New@5678' });
    expect(ok.status).toBe(200);
  });
});

describe('RBAC enforcement integration', () => {
  beforeAll(async () => {
    await startTestDb();
  });
  afterAll(async () => {
    await stopTestDb();
  });
  beforeEach(async () => {
    await clearTestDb();
    await seedRolesAndPermissions();
  });

  const signupLogin = async (email: string) => {
    await request(app).post(`${base}/auth/signup`).send({ firstName: 'R', lastName: 'B', email, password: 'Str0ng@Pass' });
    const login = await request(app).post(`${base}/auth/login`).send({ email, password: 'Str0ng@Pass' });
    return login.body.data.accessToken as string;
  };

  it('blocks unauthenticated access to protected routes', async () => {
    const res = await request(app).get(`${base}/roles`);
    expect(res.status).toBe(401);
  });

  it('blocks Employee from creating roles (settings.manage required)', async () => {
    const token = await signupLogin('emp@example.com');
    const res = await request(app)
      .post(`${base}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({ roleName: 'Temp', permissions: ['read'] });
    expect(res.status).toBe(403);
  });

  it('blocks Employee from promoting users (user.promote required)', async () => {
    const token = await signupLogin('emp2@example.com');
    const res = await request(app)
      .patch(`${base}/auth/users/000000000000000000000000/role`)
      .set('Authorization', `Bearer ${token}`)
      .send({ roleId: '000000000000000000000000' });
    expect(res.status).toBe(403);
  });

  it('allows Employee to read roles (read permission)', async () => {
    const token = await signupLogin('emp3@example.com');
    const res = await request(app).get(`${base}/roles`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
