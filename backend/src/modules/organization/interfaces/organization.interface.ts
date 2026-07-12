import { IDepartment } from '../models/department.model';
import { IAssetCategory } from '../models/asset-category.model';
import { IEmployee } from '../models/employee.model';

export interface DepartmentFilter {
  page: number;
  limit: number;
  skip: number;
  status?: 'active' | 'inactive';
  search?: string;
  parentDepartment?: string;
  departmentHead?: string;
  includeDeleted?: boolean;
  scope?: Record<string, unknown>;
}

export interface AssetCategoryFilter {
  page: number;
  limit: number;
  skip: number;
  status?: 'active' | 'inactive';
  search?: string;
  includeDeleted?: boolean;
  scope?: Record<string, unknown>;
}

export interface EmployeeFilter {
  page: number;
  limit: number;
  skip: number;
  departmentId?: string;
  employmentStatus?: string;
  search?: string;
  includeDeleted?: boolean;
  scope?: Record<string, unknown>;
}

export interface DepartmentListItem {
  id: string;
  name: string;
  code: string;
  description: string;
  departmentHead?: string | null;
  parentDepartment?: string | null;
  status: string;
  employeeCount: number;
}

export interface AssetCategoryListItem {
  id: string;
  name: string;
  code: string;
  description: string;
  categoryType: string;
  status: string;
  customFields: unknown[];
}

export interface EmployeeListItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  designation: string;
  role?: string | null;
  reportingManager?: string;
  employmentStatus: string;
  joiningDate: Date;
}
