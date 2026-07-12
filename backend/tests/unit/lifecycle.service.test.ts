import { AllocationService } from '../../src/modules/allocation/allocation.service';
import { TransferService } from '../../src/modules/transfer/transfer.service';
import { ReturnService } from '../../src/modules/return/return.service';
import { BookingService } from '../../src/modules/booking/services/booking.service';
import { MaintenanceService } from '../../src/modules/maintenance/maintenance.service';
import { AllocationRepository } from '../../src/modules/allocation/allocation.repository';
import { AllocationHistoryRepository } from '../../src/modules/allocation/models/allocation-history.repository';
import { TransferRepository } from '../../src/modules/transfer/transfer.repository';
import { ReturnRepository } from '../../src/modules/return/return.repository';
import { BookingRepository } from '../../src/modules/booking/repositories/booking.repository';
import { MaintenanceRepository } from '../../src/modules/maintenance/maintenance.repository';
import { MaintenanceHistoryRepository } from '../../src/modules/maintenance/models/maintenance-history.repository';
import { AssetRepository } from '../../src/modules/asset/asset.repository';
import { EmployeeRepository } from '../../src/modules/organization/repositories/employee.repository';
import { DepartmentRepository } from '../../src/modules/organization/repositories/department.repository';
import { ConflictError, BusinessRuleError, ForbiddenError } from '../../src/common/errors';
import { createFixtures } from '../helpers/fixtures';
import { startTestDb, stopTestDb, clearTestDb } from '../helpers/db';
import { IAsset } from '../../src/modules/asset/asset.model';

describe('Lifecycle services (allocation / transfer / return / booking / maintenance)', () => {
  let fx: Awaited<ReturnType<typeof createFixtures>>;
  let assets: AssetRepository;
  let employees: EmployeeRepository;
  let departments: DepartmentRepository;

  const newAsset = (tag: string): Promise<IAsset> =>
    assets.create({
      assetTag: tag,
      name: 'Asset',
      category: fx.cat.id,
      categoryName: fx.cat.name,
      department: fx.dept.id,
      departmentName: fx.dept.name,
      condition: 'good',
      status: 'available',
      purchaseCost: 100,
      currentValue: 90,
      sharedResource: false,
      createdBy: fx.actorId,
    } as Partial<IAsset>);

  beforeAll(async () => {
    await startTestDb();
  });
  afterAll(async () => {
    await stopTestDb();
  });
  beforeEach(async () => {
    await clearTestDb();
    fx = await createFixtures();
    assets = new AssetRepository();
    employees = new EmployeeRepository();
    departments = new DepartmentRepository();
  });

  it('allocates an asset and blocks a second active allocation', async () => {
    const svc = new AllocationService(
      new AllocationRepository(),
      new AllocationHistoryRepository(),
      assets,
      employees,
      departments
    );
    const alloc = await svc.allocate(
      { assetId: fx.asset.id, employeeId: fx.employee.id, departmentId: fx.dept.id },
      fx.actorId
    );
    expect(alloc.status).toBe('allocated');

    await expect(
      svc.allocate({ assetId: fx.asset.id, employeeId: fx.employee.id, departmentId: fx.dept.id }, fx.actorId)
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('requests a transfer to another employee and rejects transfer to self', async () => {
    const allocSvc = new AllocationService(
      new AllocationRepository(),
      new AllocationHistoryRepository(),
      assets,
      employees,
      departments
    );
    const alloc = await allocSvc.allocate(
      { assetId: fx.asset.id, employeeId: fx.employee.id, departmentId: fx.dept.id },
      fx.actorId
    );

    const emp2 = await employees.create({
      userId: 'u-2',
      employeeCode: 'EMP-002',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane2@assetflow.test',
      designation: 'Analyst',
      departmentId: fx.dept.id,
      employmentStatus: 'active',
    });

    const transferSvc = new TransferService(
      new TransferRepository(),
      new AllocationRepository(),
      new AllocationHistoryRepository(),
      assets,
      employees
    );
    const transfer = await transferSvc.request(
      { allocationId: alloc.id, requestedHolderId: emp2.id, requestReason: 'rebalance' },
      fx.actorId
    );
    expect(transfer.allocationId.toString()).toBe(alloc.id);

    await expect(
      transferSvc.request(
        { allocationId: alloc.id, requestedHolderId: fx.employee.id, requestReason: 'self' },
        fx.actorId
      )
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('requests a return for an active allocation', async () => {
    const allocSvc = new AllocationService(
      new AllocationRepository(),
      new AllocationHistoryRepository(),
      assets,
      employees,
      departments
    );
    const alloc = await allocSvc.allocate(
      { assetId: fx.asset.id, employeeId: fx.employee.id, departmentId: fx.dept.id },
      fx.actorId
    );
    const returnSvc = new ReturnService(
      new ReturnRepository(),
      new AllocationRepository(),
      new AllocationHistoryRepository(),
      assets,
      employees
    );
    const ret = await returnSvc.requestReturn({ allocationId: alloc.id, condition: 'good' }, fx.actorId);
    expect(ret.returnedById).toBe(fx.actorId);
  });

  it('creates a booking and enforces employee-only scope', async () => {
    const asset = await assets.create({
      assetTag: 'AST-BK-001',
      name: 'Conference Room',
      category: fx.cat.id,
      categoryName: fx.cat.name,
      department: fx.dept.id,
      departmentName: fx.dept.name,
      condition: 'good',
      status: 'available',
      purchaseCost: 100,
      currentValue: 90,
      sharedResource: true,
      createdBy: fx.actorId,
    } as Partial<IAsset>);
    const svc = new BookingService(new BookingRepository(), assets, employees, departments);

    const ok = await svc.create(
      {
        asset: asset.id,
        employee: fx.employee.id,
        title: 'Quarter review',
        purpose: 'Reporting',
        startDateTime: new Date(Date.now() + 86400000).toISOString(),
        endDateTime: new Date(Date.now() + 2 * 86400000).toISOString(),
        priority: 'Medium',
      },
      { roleName: 'Admin' },
      fx.actorId
    );
    expect(ok.status).toBe('Upcoming');

    const own = await svc.create(
      {
        asset: asset.id,
        employee: fx.employee.id,
        title: 'Own booking',
        purpose: 'Work',
        startDateTime: new Date(Date.now() + 3 * 86400000).toISOString(),
        endDateTime: new Date(Date.now() + 4 * 86400000).toISOString(),
      },
      { roleName: 'Employee', employeeId: fx.employee.id },
      fx.actorId
    );
    expect(own.status).toBe('Upcoming');

    await expect(
      svc.create(
        {
          asset: asset.id,
          employee: fx.employee.id,
          title: 'Other booking',
          purpose: 'Work',
          startDateTime: new Date(Date.now() + 86400000).toISOString(),
          endDateTime: new Date(Date.now() + 2 * 86400000).toISOString(),
        },
        { roleName: 'Employee', employeeId: 'OTHER' },
        fx.actorId
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('creates a maintenance request, approves it, and blocks assets already in maintenance', async () => {
    const svc = new MaintenanceService(
      new MaintenanceRepository(),
      new MaintenanceHistoryRepository(),
      assets,
      employees,
      departments
    );
    const req = await svc.create(
      { assetId: fx.asset.id, departmentId: fx.dept.id, issueTitle: 'Broken', issueDescription: 'Fix' },
      fx.actorId
    );
    expect(req.status).toBe('pending');

    const approved = await svc.approve(req.id, fx.actorId, { estimatedCost: 50 });
    expect(approved.status).toBe('approved');

    await assets.update(fx.asset.id, { status: 'maintenance' } as Partial<IAsset>);
    await expect(
      svc.create(
        { assetId: fx.asset.id, departmentId: fx.dept.id, issueTitle: 'Again', issueDescription: 'No' },
        fx.actorId
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
