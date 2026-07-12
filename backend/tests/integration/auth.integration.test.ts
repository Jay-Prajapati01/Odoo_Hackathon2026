import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../src/app';
import { startTestDb, stopTestDb, clearTestDb } from '../helpers/db';
import { seedRolesAndPermissions } from '../helpers/seed';
import { UserRepository } from '../../src/modules/auth/repositories/user.repository';
import { RoleRepository } from '../../src/modules/rbac/repositories/role.repository';

const BASE = '/api/v1';

describe('Auth API integration', () => {
  const app: Application = createApp();
  const email = 'auth.test@assetflow.io';
  const password = 'Admin@123456';
  let accessToken: string;
  let refreshToken: string;
  let authHeader: Record<string, string>;

  beforeAll(async () => {
    await startTestDb();
  });
  afterAll(async () => {
    await stopTestDb();
  });
  beforeEach(async () => {
    await clearTestDb();
    await seedRolesAndPermissions();
    await request(app)
      .post(`${BASE}/auth/signup`)
      .send({ firstName: 'Auth', lastName: 'Tester', email, password });
    const roles = new RoleRepository();
    const users = new UserRepository();
    const adminRole = await roles.findByRoleName('Admin');
    const user = await users.findByEmail(email);
    if (user && adminRole) {
      await users.update(user.id, { role: adminRole._id as never, status: 'active' });
    }
    const login = await request(app).post(`${BASE}/auth/login`).send({ email, password });
    accessToken = login.body.data.accessToken as string;
    refreshToken = login.body.data.refreshToken as string;
    authHeader = { Authorization: `Bearer ${accessToken}` };
  });

  it('returns the current user on /auth/me', async () => {
    const res = await request(app).get(`${BASE}/auth/me`).set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email);
  });

  it('rejects login with a bad password (401)', async () => {
    const res = await request(app).post(`${BASE}/auth/login`).send({ email, password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rotates the refresh token via /auth/refresh', async () => {
    const res = await request(app).post(`${BASE}/auth/refresh`).send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('revokes all refresh tokens after logout-all', async () => {
    const logout = await request(app).post(`${BASE}/auth/logout-all`).send({}).set(authHeader);
    expect(logout.status).toBe(200);
    const refresh = await request(app).post(`${BASE}/auth/refresh`).send({ refreshToken });
    expect(refresh.status).toBe(401);
  });
});
