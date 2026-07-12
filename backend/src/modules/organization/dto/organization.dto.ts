import { IDepartment } from '../models/department.model';
import { IAssetCategory } from '../models/asset-category.model';
import { IEmployee } from '../models/employee.model';
import { DepartmentListItem, AssetCategoryListItem, EmployeeListItem } from '../interfaces/organization.interface';

export const toDepartmentDTO = (dept: IDepartment): DepartmentListItem => ({
  id: dept.id,
  name: dept.name,
  code: dept.code,
  description: dept.description,
  departmentHead: dept.departmentHead?.toString() ?? null,
  parentDepartment: dept.parentDepartment?.toString() ?? null,
  status: dept.status,
  employeeCount: 0,
});

export const toAssetCategoryDTO = (category: IAssetCategory): AssetCategoryListItem => ({
  id: category.id,
  name: category.name,
  code: category.code,
  description: category.description,
  categoryType: category.categoryType,
  status: category.status,
  customFields: category.customFields,
});

export const toEmployeeDTO = (employee: IEmployee): EmployeeListItem => ({
  id: employee.id,
  employeeCode: employee.employeeCode,
  firstName: employee.firstName,
  lastName: employee.lastName,
  fullName: `${employee.firstName} ${employee.lastName}`.trim(),
  email: employee.email,
  phone: employee.phone,
  departmentId: employee.departmentId,
  designation: employee.designation,
  role: employee.role?.toString() ?? null,
  reportingManager: employee.reportingManager,
  employmentStatus: employee.employmentStatus,
  joiningDate: employee.joiningDate,
});

export const toEmployeeDetailDTO = (employee: IEmployee) => ({
  ...toEmployeeDTO(employee),
  userId: employee.userId,
  profilePhoto: employee.profilePhoto,
  address: employee.address,
  emergencyContact: employee.emergencyContact,
  notes: employee.notes,
  createdAt: employee.createdAt,
  updatedAt: employee.updatedAt,
});
