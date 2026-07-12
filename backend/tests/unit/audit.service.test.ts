import { AuditService } from '../../src/modules/audit/audit.service';
import { AuditRepository } from '../../src/modules/audit/audit.repository';
import { AuditAssignmentRepository } from '../../src/modules/audit/audit-assignment.repository';
import { AuditItemRepository } from '../../src/modules/audit/audit-item.repository';
import { AuditDiscrepancyRepository } from '../../src/modules/audit/audit-discrepancy.repository';
import { AuditHistoryRepository } from '../../src/modules/audit/audit-history.repository';
import { AssetRepository } from '../../src/modules/asset/asset.repository';
import { UserRepository } from '../../src/modules/auth/repositories/user.repository';
import { RoleRepository } from '../../src/modules/rbac/repositories/role.repository';
import { EmployeeRepository } from '../../src/modules/organization/repositories/employee.repository';
import { DepartmentRepository } from '../../src/modules/organization/repositories/department.repository';
import { BusinessRuleError } from '../../src/common/errors';
import { createFixtures } from '../helpers/fixtures';
import { startTestDb, stopTestDb, clearTestDb } from '../helpers/db';
import { seedRolesAndPermissions } from '../helpers/seed';

const newAuditService = () =>
  new AuditService(
    new AuditRepository(),
    new AuditAssignmentRepository(),
    new AuditItemRepository(),
    new AuditDiscrepancyRepository(),
    new AuditHistoryRepository(),
    new AssetRepository(),
    new UserRepository(),
    new EmployeeRepository(),
    new DepartmentRepository()
  );

describe('AuditService', () => {
  let fx: Awaited<ReturnType<typeof createFixtures>>;

  beforeAll(async () => {
    await startTestDb();
  });
  afterAll(async () => {
    await stopTestDb();
  });
  beforeEach(async () => {
    await clearTestDb();
    await seedRolesAndPermissions();
    fx = await createFixtures();
  });

  it('creates an audit cycle for a department that has eligible assets', async () => {
    const audit = await newAuditService().createCycle(
      {
        title: 'Q3 Audit',
        scope: { type: 'department', departmentId: fx.dept.id },
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 86400000),
      },
      fx.actorId
    );
    expect(audit.auditNumber).toMatch(/^AUD-/);
    expect(audit.status).toBe('scheduled');
  });

  it('rejects a cycle when no eligible assets exist for the scope', async () => {
    const departments = new DepartmentRepository();
    const emptyDept = await departments.create({ name: 'Empty', code: 'EMPTY', status: 'active' });
    await expect(
      newAuditService().createCycle(
        {
          title: 'Empty Audit',
          scope: { type: 'department', departmentId: emptyDept.id },
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        },
        fx.actorId
      )
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('assigns an auditor to the cycle', async () => {
    const svc = newAuditService();
    const audit = await svc.createCycle(
      {
        title: 'Assign Audit',
        scope: { type: 'department', departmentId: fx.dept.id },
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
      },
      fx.actorId
    );
    const users = new UserRepository();
    const roles = new RoleRepository();
    const employeeRole = await roles.findByRoleName('Employee');
    const auditorUser = await users.create({
      firstName: 'Aud',
      lastName: 'Itor',
      email: 'auditor@assetflow.test',
      password: 'hashed',
      role: employeeRole?._id as never,
      status: 'active',
    });
    const assignment = await svc.assignAuditor(audit.id, auditorUser.id, fx.actorId);
    expect(assignment.auditCycle).toBe(audit.id);
    expect(assignment.auditor).toBe(auditorUser.id);
  });
});
