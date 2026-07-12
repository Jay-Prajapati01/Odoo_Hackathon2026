import { Request } from 'express';

export interface OrganizationScope {
  roleName: string;
  employeeId?: string;
  departmentId?: string;
}

export interface CallerContext {
  employeeId?: string;
  departmentId?: string;
}

export interface ListQuery extends Record<string, unknown> {
  page?: string;
  limit?: string;
  search?: string;
  sort?: string;
}

export type DepartmentInput = {
  name: string;
  code: string;
  description?: string;
  departmentHead?: string;
  parentDepartment?: string;
  status?: 'active' | 'inactive';
};

export type AssetCategoryInput = {
  name: string;
  code: string;
  description?: string;
  categoryType?: string;
  status?: 'active' | 'inactive';
  customFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'boolean' | 'select';
    required?: boolean;
    options?: string[];
  }>;
};

export type EmployeeInput = {
  userId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  designation: string;
  role?: string;
  reportingManager?: string;
  joiningDate?: string;
  employmentStatus?: EmploymentStatus;
  profilePhoto?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  notes?: string;
};

export type EmploymentStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';

export interface ActivityMeta {
  req?: Request;
  actorId: string;
}
