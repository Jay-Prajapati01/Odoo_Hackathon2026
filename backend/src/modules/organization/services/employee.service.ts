import { EmployeeRepository } from '../repositories/employee.repository';
import { DepartmentRepository } from '../repositories/department.repository';
import { UserRepository } from '../../auth/repositories/user.repository';
import { RoleRepository } from '../../rbac/repositories/role.repository';
import { IEmployee } from '../models/employee.model';
import { ConflictError, NotFoundError, BusinessRuleError, ForbiddenError } from '../../../common/errors';
import { parsePagination, parseSearch } from '../../../utils/pagination';
import { recordActivity, dispatchNotification } from '../../../shared/events';
import { Request } from 'express';
import { EmployeeInput, OrganizationScope, CallerContext } from '../types/organization.types';
import { toEmployeeDetailDTO } from '../dto/organization.dto';

export class EmployeeService {
  constructor(
    private readonly repo: EmployeeRepository,
    private readonly departments: DepartmentRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository
  ) {}

  async getCallerContext(userId: string): Promise<CallerContext> {
    const employee = await this.repo.findByUserId(userId);
    if (!employee) return {};
    return { employeeId: employee.id, departmentId: employee.departmentId };
  }

  private async assertActiveDepartment(departmentId: string): Promise<void> {
    const department = await this.departments.findById(departmentId);
    if (!department) throw new NotFoundError('Department not found');
    if (department.status !== 'active') throw new BusinessRuleError('Cannot assign employee to an inactive department');
  }

  private async assertReferences(data: Partial<EmployeeInput>, excludeId?: string): Promise<void> {
    if (data.employeeCode) {
      const byCode = await this.repo.findByCode(data.employeeCode);
      if (byCode && byCode.id !== excludeId) throw new ConflictError('Employee code already exists');
    }
    if (data.email) {
      const byEmail = await this.repo.findByEmail(data.email);
      if (byEmail && byEmail.id !== excludeId) throw new ConflictError('Employee email already exists');
    }
    if (data.departmentId) {
      await this.assertActiveDepartment(data.departmentId);
    }
    if (data.role) {
      const role = await this.roles.findById(data.role);
      if (!role) throw new NotFoundError('Assigned role not found');
    }
    if (data.reportingManager) {
      const manager = await this.repo.findById(data.reportingManager);
      if (!manager) throw new NotFoundError('Reporting manager not found');
      if (excludeId && manager.id === excludeId) throw new BusinessRuleError('An employee cannot report to themselves');
    }
  }

  async create(data: EmployeeInput, actorId: string, req?: Request): Promise<IEmployee> {
    await this.assertReferences(data);
    const employee = await this.repo.create({
      userId: data.userId,
      employeeCode: data.employeeCode.toUpperCase(),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      phone: data.phone,
      departmentId: data.departmentId,
      designation: data.designation,
      role: data.role ? (data.role as never) : null,
      reportingManager: data.reportingManager,
      joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
      employmentStatus: data.employmentStatus ?? 'active',
      profilePhoto: data.profilePhoto,
      address: data.address,
      emergencyContact: data.emergencyContact,
      notes: data.notes,
      createdBy: actorId,
    });
    recordActivity({
      req,
      userId: actorId,
      action: 'employee.created',
      entity: 'Employee',
      entityId: employee.id,
      newValue: employee.toObject(),
    });
    return employee;
  }

  async getById(id: string, scope?: OrganizationScope): Promise<IEmployee> {
    const employee = await this.repo.findById(id);
    if (!employee) throw new NotFoundError('Employee not found');
    this.assertReadScope(employee, scope);
    return employee;
  }

  async getByUserId(userId: string): Promise<IEmployee | null> {
    return this.repo.findByUserId(userId);
  }

  async me(userId: string): Promise<IEmployee> {
    const employee = await this.repo.findByUserId(userId);
    if (!employee) throw new NotFoundError('Employee profile not found');
    return employee;
  }

  async list(
    query: Record<string, unknown>,
    scope?: OrganizationScope
  ): Promise<{ data: IEmployee[]; page: number; limit: number; total: number }> {
    const { page, limit, skip } = parsePagination(query);
    const search = parseSearch(query);
    const departmentId = query.departmentId as string | undefined;
    const employmentStatus = query.employmentStatus as string | undefined;
    const filter = {
      page,
      limit,
      skip,
      search,
      departmentId,
      employmentStatus,
      scope: this.buildReadScope(scope),
    };
    const [rows, total] = await Promise.all([this.repo.findAll(filter), this.repo.count(filter)]);
    return { data: rows, page, limit, total };
  }

  async update(id: string, data: Partial<EmployeeInput>, actorId: string, req?: Request): Promise<IEmployee> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Employee not found');
    await this.assertReferences(data, id);
    const updated = await this.repo.update(id, {
      ...data,
      employeeCode: data.employeeCode ? data.employeeCode.toUpperCase() : undefined,
      email: data.email ? data.email.toLowerCase() : undefined,
      joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
      updatedBy: actorId,
    } as Partial<IEmployee>);
    recordActivity({
      req,
      userId: actorId,
      action: 'employee.updated',
      entity: 'Employee',
      entityId: id,
      oldValue: existing.toObject(),
      newValue: updated?.toObject(),
    });
    return updated!;
  }

  async assignRole(id: string, roleId: string, actorId: string, req?: Request): Promise<IEmployee> {
    const employee = await this.repo.findById(id);
    if (!employee) throw new NotFoundError('Employee not found');
    const role = await this.roles.findById(roleId);
    if (!role) throw new NotFoundError('Role not found');
    const oldRole = employee.role?.toString();
    const updated = await this.repo.update(id, { role: roleId as never, updatedBy: actorId });
    if (employee.userId) {
      await this.users.update(employee.userId, { role: roleId as never, updatedBy: actorId });
    }
    recordActivity({
      req,
      userId: actorId,
      action: 'employee.role_assigned',
      entity: 'Employee',
      entityId: id,
      oldValue: { role: oldRole },
      newValue: { role: roleId },
    });
    if (employee.userId) {
      dispatchNotification({
        recipientId: employee.userId,
        type: 'general',
        title: 'Role Updated',
        message: `Your role has been updated to ${role.roleName}.`,
        reference: { entity: 'Employee', entityId: id },
      });
    }
    return updated!;
  }

  async changeDepartment(id: string, departmentId: string, actorId: string, req?: Request): Promise<IEmployee> {
    const employee = await this.repo.findById(id);
    if (!employee) throw new NotFoundError('Employee not found');
    await this.assertActiveDepartment(departmentId);
    const oldDepartment = employee.departmentId;
    const updated = await this.repo.update(id, { departmentId, updatedBy: actorId });
    recordActivity({
      req,
      userId: actorId,
      action: 'employee.department_changed',
      entity: 'Employee',
      entityId: id,
      oldValue: { departmentId: oldDepartment },
      newValue: { departmentId },
    });
    if (employee.userId) {
      dispatchNotification({
        recipientId: employee.userId,
        type: 'general',
        title: 'Department Updated',
        message: 'You have been moved to a different department.',
        reference: { entity: 'Employee', entityId: id },
      });
    }
    return updated!;
  }

  async deactivate(id: string, actorId: string, req?: Request): Promise<IEmployee> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Employee not found');
    const updated = await this.repo.update(id, { employmentStatus: 'inactive', updatedBy: actorId });
    recordActivity({ req, userId: actorId, action: 'employee.deactivated', entity: 'Employee', entityId: id, oldValue: { employmentStatus: existing.employmentStatus }, newValue: { employmentStatus: 'inactive' } });
    return updated!;
  }

  async remove(id: string, actorId: string, req?: Request): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Employee not found');
    await this.repo.softDelete(id);
    if (existing.userId) {
      await this.users.update(existing.userId, { status: 'inactive', isDeleted: true, updatedBy: actorId });
    }
    recordActivity({ req, userId: actorId, action: 'employee.deleted', entity: 'Employee', entityId: id, oldValue: existing.toObject() });
  }

  private buildReadScope(scope?: OrganizationScope): Record<string, unknown> | undefined {
    if (!scope) return undefined;
    if (scope.roleName === 'Employee') {
      return { _id: scope.employeeId ?? 'none' };
    }
    if (scope.roleName === 'Department Head') {
      return { departmentId: scope.departmentId ?? 'none' };
    }
    return undefined;
  }

  private assertReadScope(employee: IEmployee, scope?: OrganizationScope): void {
    if (!scope) return;
    if (scope.roleName === 'Employee') {
      if (scope.employeeId !== employee.id) throw new ForbiddenError('You can only view your own profile');
    } else if (scope.roleName === 'Department Head') {
      if (scope.departmentId && employee.departmentId !== scope.departmentId) {
        throw new ForbiddenError('You can only view employees in your department');
      }
    }
  }
}
