import { createApp } from './app';
import { connectDatabase } from './database/connection';
import { env } from './config/env';
import { validateEnv } from './config/env.validation';
import { logger } from './utils/logger';
import { RoleService } from './modules/rbac/services/role.service';
import { RoleRepository } from './modules/rbac/repositories/role.repository';
import { PermissionService } from './modules/rbac/services/permission.service';
import { PermissionRepository } from './modules/rbac/repositories/permission.repository';
import { DepartmentService } from './modules/organization/services/department.service';
import { DepartmentRepository } from './modules/organization/repositories/department.repository';
import { EmployeeRepository } from './modules/organization/repositories/employee.repository';
import { seedAdminUser } from './modules/auth/seed/auth.seed';
import { runSeed } from './seed';

const bootstrap = async (): Promise<void> => {
  validateEnv();
  await connectDatabase();

  // Seed default roles (Admin, Asset Manager, Department Head, Employee)
  const roleService = new RoleService(new RoleRepository(), new PermissionService(new PermissionRepository()));
  await roleService.seedDefaults();

  // Seed default department
  const departmentService = new DepartmentService(new DepartmentRepository(), new EmployeeRepository());
  await departmentService.seedDefaults();

  // Seed initial admin user (if configured)
  await seedAdminUser();

  // Seed reference + sample data (departments, categories, employees, assets, transactions)
  await runSeed();

  const app = createApp();
  app.listen(env.port, () => {
    logger.info(`AssetFlow API listening on port ${env.port}`);
    logger.info(`Swagger UI: http://localhost:${env.port}/api-docs`);
  });
};

bootstrap().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
