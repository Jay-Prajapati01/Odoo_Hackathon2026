import request from 'supertest';
import { Application } from 'express';
import { UserRepository } from '../../src/modules/auth/repositories/user.repository';
import { RoleRepository } from '../../src/modules/rbac/repositories/role.repository';
import { seedRolesAndPermissions } from './seed';

export const BASE = '/api/v1';

export interface AdminContext {
  token: string;
  userId: string;
}

/**
 * Signs up a user, promotes it to the Admin role, and logs in to obtain a
 * bearer token with full permissions. Used by integration tests.
 */
export const createAdmin = async (app: Application): Promise<AdminContext> => {
  await seedRolesAndPermissions();
  const users = new UserRepository();
  const roles = new RoleRepository();
  const email = `admin+${Date.now()}@assetflow.test`;
  const password = 'Admin@123456';

  await request(app)
    .post(`${BASE}/auth/signup`)
    .send({ firstName: 'Admin', lastName: 'User', email, password });

  const adminRole = await roles.findByRoleName('Admin');
  const user = await users.findByEmail(email);
  if (user && adminRole) {
    await users.update(user.id, { role: adminRole._id as never, status: 'active' });
  }

  const login = await request(app).post(`${BASE}/auth/login`).send({ email, password });
  return {
    token: login.body.data.accessToken as string,
    userId: login.body.data.user.id as string,
  };
};
