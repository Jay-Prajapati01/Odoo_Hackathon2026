import { DepartmentService } from '../../src/modules/organization/services/department.service';
import { EmployeeService } from '../../src/modules/organization/services/employee.service';
import { AssetCategoryService } from '../../src/modules/organization/services/asset-category.service';
import { DepartmentRepository } from '../../src/modules/organization/repositories/department.repository';
import { EmployeeRepository } from '../../src/modules/organization/repositories/employee.repository';
import { AssetCategoryRepository } from '../../src/modules/organization/repositories/asset-category.repository';
import { UserRepository } from '../../src/modules/auth/repositories/user.repository';
import { RoleRepository } from '../../src/modules/rbac/repositories/role.repository';
import { ConflictError } from '../../src/common/errors';
import { createFixtures } from '../helpers/fixtures';
import { startTestDb, stopTestDb, clearTestDb } from '../helpers/db';

describe('Organization services', () => {
  let fx: Awaited<ReturnType<typeof createFixtures>>;

  beforeAll(async () => {
    await startTestDb();
  });
  afterAll(async () => {
    await stopTestDb();
  });
  beforeEach(async () => {
    await clearTestDb();
    fx = await createFixtures();
  });

  it('creates a department and rejects a duplicate code', async () => {
    const svc = new DepartmentService(new DepartmentRepository(), new EmployeeRepository());
    const dept = await svc.create({ name: 'HR', code: 'HR' }, fx.actorId);
    expect(dept.code).toBe('HR');

    await expect(svc.create({ name: 'HR Dup', code: 'HR' }, fx.actorId)).rejects.toBeInstanceOf(ConflictError);
  });

  it('creates an asset category', async () => {
    const svc = new AssetCategoryService(new AssetCategoryRepository());
    const cat = await svc.create({ name: 'Chair', code: 'CHAIR', categoryType: 'Furniture' }, fx.actorId);
    expect(cat.code).toBe('CHAIR');
  });

  it('creates an employee and rejects a duplicate employee code', async () => {
    const svc = new EmployeeService(
      new EmployeeRepository(),
      new DepartmentRepository(),
      new UserRepository(),
      new RoleRepository()
    );
    const emp = await svc.create(
      {
        userId: 'u-2',
        employeeCode: 'EMP-002',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@assetflow.test',
        designation: 'Analyst',
        departmentId: fx.dept.id,
        employmentStatus: 'active',
      },
      fx.actorId
    );
    expect(emp.employeeCode).toBe('EMP-002');

    await expect(
      svc.create(
        {
          userId: 'u-3',
          employeeCode: 'EMP-002',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@assetflow.test',
          designation: 'Analyst',
          departmentId: fx.dept.id,
          employmentStatus: 'active',
        },
        fx.actorId
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
