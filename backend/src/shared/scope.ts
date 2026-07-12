import { Request } from 'express';
import { EmployeeService } from '../modules/organization/services/employee.service';
import { EmployeeRepository } from '../modules/organization/repositories/employee.repository';
import { DepartmentRepository } from '../modules/organization/repositories/department.repository';
import { UserRepository } from '../modules/auth/repositories/user.repository';
import { RoleRepository } from '../modules/rbac/repositories/role.repository';

const employeeService = new EmployeeService(
  new EmployeeRepository(),
  new DepartmentRepository(),
  new UserRepository(),
  new RoleRepository()
);

export interface BaseScope {
  roleName: string;
  userId: string;
  departmentId?: string;
}

export const buildScope = async (req: Request): Promise<BaseScope> => {
  const userId = req.user!.userId;
  const ctx = await employeeService.getCallerContext(userId);
  return { roleName: req.user!.roleName, userId, departmentId: ctx.departmentId };
};
