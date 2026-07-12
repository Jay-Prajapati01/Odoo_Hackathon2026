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

  const demoUsers = [
    { email: 'manager@assetflow.com', firstName: 'Jane', lastName: 'Doe', roleName: 'Asset Manager', designation: 'Asset Manager' },
    { email: 'head@assetflow.com', firstName: 'Priya', lastName: 'Shah', roleName: 'Department Head', designation: 'Operations Head' },
    { email: 'employee@assetflow.com', firstName: 'Sarah', lastName: 'Jenkins', roleName: 'Employee', designation: 'Analyst' },
  ];

  for (const demo of demoUsers) {
    const existingUser = await userRepo.findByEmail(demo.email);
    if (existingUser) continue;

    const role = await roleRepo.findByRoleName(demo.roleName);
    if (!role) {
      logger.warn(`Role ${demo.roleName} not found; skipping demo user ${demo.email}`);
      continue;
    }

    const demoPassword = await hashPassword(password);
    const demoUser = await userRepo.create({
      firstName: demo.firstName,
      lastName: demo.lastName,
      email: demo.email,
      password: demoPassword,
      role: role.id as never,
      status: 'active',
      isEmailVerified: true,
      createdBy: undefined,
    });

    await employeeRepo.create({
      userId: demoUser.id,
      employeeCode: generateReferenceId(demo.designation.slice(0, 3).toUpperCase()).slice(0, 12),
      firstName: demoUser.firstName,
      lastName: demoUser.lastName,
      email: demoUser.email,
      designation: demo.designation,
      employmentStatus: 'active',
    });

    logger.info(`Demo user created: ${demo.email} (${demo.roleName})`);
  }
};
