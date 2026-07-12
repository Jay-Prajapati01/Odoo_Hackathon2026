import { Types } from 'mongoose';
import { logger } from '../utils/logger';
import { DepartmentRepository } from '../modules/organization/repositories/department.repository';
import { AssetCategoryRepository } from '../modules/organization/repositories/asset-category.repository';
import { EmployeeRepository } from '../modules/organization/repositories/employee.repository';
import { AssetRepository } from '../modules/asset/asset.repository';
import { BookingRepository } from '../modules/booking/repositories/booking.repository';
import { MaintenanceRepository } from '../modules/maintenance/maintenance.repository';
import { AuditRepository } from '../modules/audit/audit.repository';
import { RoleRepository } from '../modules/rbac/repositories/role.repository';
import { IDepartment } from '../modules/organization/models/department.model';
import { IAssetCategory } from '../modules/organization/models/asset-category.model';
import { IEmployee } from '../modules/organization/models/employee.model';
import { IAsset } from '../modules/asset/asset.model';
import { IBooking } from '../modules/booking/models/booking.model';
import { IMaintenance } from '../modules/maintenance/maintenance.model';
import { IAudit } from '../modules/audit/audit.model';

const SEED_ACTOR = 'SEED';

/**
 * Wraps a creation so that a duplicate-key error (re-running the seed) is
 * treated as a no-op rather than a failure. Other errors are logged and the
 * seed continues so one bad record does not abort the whole run.
 */
async function safeCreate<T>(label: string, create: () => Promise<T>): Promise<T | null> {
  try {
    return await create();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err && (err as { code?: number }).code === 11000 || /duplicate|E11000/i.test(message)) {
      logger.warn(`Seed skipped (already exists): ${label}`);
      return null;
    }
    logger.error(`Seed failed: ${label}`, { error: message });
    return null;
  }
}

async function runSeed(): Promise<void> {
  logger.info('Starting production seed (reference + sample data)');

  const departments = new DepartmentRepository();
  const categories = new AssetCategoryRepository();
  const employees = new EmployeeRepository();
  const assets = new AssetRepository();
  const bookings = new BookingRepository();
  const maintenance = new MaintenanceRepository();
  const audits = new AuditRepository();
  const roles = new RoleRepository();

  const roleByName = async (name: string): Promise<Types.ObjectId | null> => {
    const role = await roles.findByRoleName(name);
    return role ? (role._id as Types.ObjectId) : null;
  };

  const adminRole = await roleByName('Admin');
  const managerRole = await roleByName('Asset Manager');
  const headRole = await roleByName('Department Head');
  const employeeRole = await roleByName('Employee');

  // --- Departments -------------------------------------------------------
  const itDept = await safeCreate<IDepartment>('Department:IT', () =>
    departments.create({ name: 'Information Technology', code: 'IT', description: 'IT operations and infrastructure', status: 'active' })
  );
  const finDept = await safeCreate<IDepartment>('Department:Finance', () =>
    departments.create({ name: 'Finance', code: 'FIN', description: 'Finance and accounting', status: 'active' })
  );
  const opsDept = await safeCreate<IDepartment>('Department:Operations', () =>
    departments.create({ name: 'Operations', code: 'OPS', description: 'Field operations', status: 'active' })
  );

  // --- Asset categories --------------------------------------------------
  await safeCreate<IAssetCategory>('Category:Laptop', () =>
    categories.create({ name: 'Laptop', code: 'LAPTOP', description: 'Portable computers', categoryType: 'Hardware', status: 'active' })
  );
  await safeCreate<IAssetCategory>('Category:Monitor', () =>
    categories.create({ name: 'Monitor', code: 'MON', description: 'Display monitors', categoryType: 'Hardware', status: 'active' })
  );
  await safeCreate<IAssetCategory>('Category:Vehicle', () =>
    categories.create({ name: 'Vehicle', code: 'VEH', description: 'Company vehicles', categoryType: 'Fleet', status: 'active' })
  );
  await safeCreate<IAssetCategory>('Category:Furniture', () =>
    categories.create({ name: 'Furniture', code: 'FURN', description: 'Office furniture', categoryType: 'Facilities', status: 'active' })
  );

  // --- Employees ---------------------------------------------------------
  const manager = await safeCreate<IEmployee>('Employee:AssetManager', () =>
    employees.create({
      userId: 'seed-asset-manager',
      employeeCode: 'EMP-MGR-001',
      firstName: 'Asset',
      lastName: 'Manager',
      email: 'asset.manager@assetflow.local',
      designation: 'Asset Manager',
      role: managerRole,
      departmentId: itDept?.id,
      employmentStatus: 'active',
      createdBy: SEED_ACTOR,
    })
  );
  const head = await safeCreate<IEmployee>('Employee:DeptHead', () =>
    employees.create({
      userId: 'seed-dept-head',
      employeeCode: 'EMP-HD-001',
      firstName: 'Department',
      lastName: 'Head',
      email: 'dept.head@assetflow.local',
      designation: 'Operations Head',
      role: headRole,
      departmentId: opsDept?.id,
      employmentStatus: 'active',
      createdBy: SEED_ACTOR,
    })
  );
  const staff1 = await safeCreate<IEmployee>('Employee:Staff1', () =>
    employees.create({
      userId: 'seed-employee-1',
      employeeCode: 'EMP-001',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@assetflow.local',
      designation: 'Analyst',
      role: employeeRole,
      departmentId: finDept?.id,
      employmentStatus: 'active',
      createdBy: SEED_ACTOR,
    })
  );
  const staff2 = await safeCreate<IEmployee>('Employee:Staff2', () =>
    employees.create({
      userId: 'seed-employee-2',
      employeeCode: 'EMP-002',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@assetflow.local',
      designation: 'Engineer',
      role: employeeRole,
      departmentId: opsDept?.id,
      employmentStatus: 'active',
      createdBy: SEED_ACTOR,
    })
  );
  if (adminRole && itDept) {
    await safeCreate<IEmployee>('Employee:Admin', () =>
      employees.create({
        userId: 'seed-admin',
        employeeCode: 'EMP-ADM-001',
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@assetflow.local',
        designation: 'Administrator',
        role: adminRole,
        departmentId: itDept.id,
        employmentStatus: 'active',
        createdBy: SEED_ACTOR,
      })
    );
  }

  // --- Assets ------------------------------------------------------------
  const laptop = await safeCreate<IAsset>('Asset:Laptop', () =>
    assets.create({
      assetTag: 'AST-SEED-LAP-001',
      name: 'MacBook Pro 16"',
      description: 'Development laptop',
      category: 'Laptop',
      categoryName: 'Laptop',
      department: itDept?.id,
      departmentName: itDept?.name,
      condition: 'good',
      status: 'available',
      purchaseCost: 2500,
      currentValue: 2200,
      manufacturer: 'Apple',
      assetModel: 'MacBook Pro 16',
      serialNumber: 'SEED-LAP-001',
      sharedResource: false,
      createdBy: SEED_ACTOR,
    })
  );
  const monitor = await safeCreate<IAsset>('Asset:Monitor', () =>
    assets.create({
      assetTag: 'AST-SEED-MON-001',
      name: 'Dell UltraSharp 27"',
      description: 'External monitor',
      category: 'Monitor',
      categoryName: 'Monitor',
      department: itDept?.id,
      departmentName: itDept?.name,
      condition: 'excellent',
      status: 'available',
      purchaseCost: 450,
      currentValue: 400,
      manufacturer: 'Dell',
      assetModel: 'U2723QE',
      serialNumber: 'SEED-MON-001',
      sharedResource: true,
      createdBy: SEED_ACTOR,
    })
  );
  const vehicle = await safeCreate<IAsset>('Asset:Vehicle', () =>
    assets.create({
      assetTag: 'AST-SEED-VEH-001',
      name: 'Toyota HiAce',
      description: 'Operations van',
      category: 'Vehicle',
      categoryName: 'Vehicle',
      department: opsDept?.id,
      departmentName: opsDept?.name,
      condition: 'fair',
      status: 'available',
      purchaseCost: 38000,
      currentValue: 31000,
      manufacturer: 'Toyota',
      assetModel: 'HiAce',
      serialNumber: 'SEED-VEH-001',
      sharedResource: true,
      createdBy: SEED_ACTOR,
    })
  );

  // --- Booking -----------------------------------------------------------
  if (laptop && staff1) {
    await safeCreate<IBooking>('Booking:Sample', () =>
      bookings.create({
        bookingNumber: 'BK-SEED-0001',
        asset: laptop._id as Types.ObjectId,
        employee: staff1._id as Types.ObjectId,
        department: (staff1.departmentId ? new Types.ObjectId(staff1.departmentId) : null) as Types.ObjectId | null,
        title: 'Laptop for quarterly reporting',
        purpose: 'Finance close activities',
        bookingDate: new Date(),
        startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endDateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'Upcoming' as IBooking['status'],
        priority: 'Medium' as IBooking['priority'],
        createdBy: SEED_ACTOR,
        assetName: laptop.name,
        assetTag: laptop.assetTag,
        employeeName: `${staff1.firstName} ${staff1.lastName}`,
        departmentName: staff1.departmentId ? 'Finance' : '',
      })
    );
  }

  // --- Maintenance -------------------------------------------------------
  if (vehicle) {
    const deptId = vehicle.department ?? opsDept?.id ?? '';
    await safeCreate<IMaintenance>('Maintenance:Sample', () =>
      maintenance.create({
        requestNumber: 'MNT-SEED-0001',
        assetId: vehicle._id.toString(),
        requestedById: staff2?.id ?? SEED_ACTOR,
        departmentId: String(deptId),
        issueTitle: 'Scheduled service due',
        issueDescription: 'Vehicle is due for 40,000 km service and brake inspection.',
        priority: 'medium',
        status: 'pending',
        requestedDate: new Date(),
        createdBy: SEED_ACTOR,
      })
    );
  }

  // --- Audit -------------------------------------------------------------
  if (opsDept) {
    await safeCreate<IAudit>('Audit:Sample', () =>
      audits.create({
        auditNumber: 'AUD-SEED-0001',
        title: 'Operations Asset Audit - Q3',
        description: 'Physical verification of operations department assets.',
        scope: { type: 'department', departmentId: opsDept.id },
        department: opsDept.id,
        location: 'HQ',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'scheduled',
        createdBy: SEED_ACTOR,
      })
    );
  }

  logger.info('Production seed completed');
}

export { runSeed };
