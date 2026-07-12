import { DepartmentRepository } from '../../src/modules/organization/repositories/department.repository';
import { AssetCategoryRepository } from '../../src/modules/organization/repositories/asset-category.repository';
import { EmployeeRepository } from '../../src/modules/organization/repositories/employee.repository';
import { AssetRepository } from '../../src/modules/asset/asset.repository';
import { IDepartment } from '../../src/modules/organization/models/department.model';
import { IAssetCategory } from '../../src/modules/organization/models/asset-category.model';
import { IEmployee } from '../../src/modules/organization/models/employee.model';
import { IAsset } from '../../src/modules/asset/asset.model';

export interface Fixtures {
  dept: IDepartment;
  cat: IAssetCategory;
  employee: IEmployee;
  asset: IAsset;
  actorId: string;
}

/**
 * Creates the prerequisite reference data (department, category, employee, asset)
 * required by the domain service tests. Uses repositories directly for speed.
 */
export const createFixtures = async (): Promise<Fixtures> => {
  const departments = new DepartmentRepository();
  const categories = new AssetCategoryRepository();
  const employees = new EmployeeRepository();
  const assets = new AssetRepository();

  const dept = await departments.create({ name: 'IT', code: 'IT', status: 'active' });
  const cat = await categories.create({ name: 'Laptop', code: 'LAPTOP', status: 'active' });
  const employee = await employees.create({
    userId: 'actor-1',
    employeeCode: 'EMP-001',
    firstName: 'Test',
    lastName: 'User',
    email: 'test.user@assetflow.test',
    designation: 'Engineer',
    departmentId: dept.id,
    employmentStatus: 'active',
  });
  const asset = await assets.create({
    assetTag: 'AST-TEST-001',
    name: 'Test Laptop',
    category: cat.id,
    categoryName: cat.name,
    department: dept.id,
    departmentName: dept.name,
    condition: 'good',
    status: 'available',
    purchaseCost: 1000,
    currentValue: 900,
    sharedResource: false,
    createdBy: 'actor-1',
  } as Partial<IAsset>);

  return { dept, cat, employee, asset, actorId: 'actor-1' };
};
