import { UserRepository } from '../repositories/user.repository';
import { RoleRepository } from '../../rbac/repositories/role.repository';
import { EmployeeRepository } from '../../organization/repositories/employee.repository';
import { hashPassword } from '../../../utils/password';
import { generateReferenceId } from '../../../utils/helpers';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';

export interface SeedAdminConfig {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const seedAdminUser = async (config?: SeedAdminConfig): Promise<void> => {
  const email = config?.email || env.initialAdminEmail;
  const password = config?.password || env.initialAdminPassword;
  if (!email || !password) {
    logger.warn('INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD not set; skipping admin seed');
    return;
  }

  const userRepo = new UserRepository();
  const roleRepo = new RoleRepository();
  const employeeRepo = new EmployeeRepository();

  const existing = await userRepo.findByEmail(email);
  if (existing) return;

  const adminRole = await roleRepo.findByRoleName('Admin');
  if (!adminRole) {
    logger.warn('Admin role not found; run role seed first');
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await userRepo.create({
    firstName: config?.firstName || 'System',
    lastName: config?.lastName || 'Admin',
    email,
    password: passwordHash,
    role: adminRole.id as never,
    status: 'active',
    isEmailVerified: true,
    createdBy: undefined,
  });

  await employeeRepo.create({
    userId: user.id,
    employeeCode: generateReferenceId('ADM').slice(0, 12),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    designation: 'Administrator',
    employmentStatus: 'active',
  });

  logger.info(`Initial admin user created: ${email}`);
};
