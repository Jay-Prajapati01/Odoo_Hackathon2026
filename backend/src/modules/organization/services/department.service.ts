import { DepartmentRepository } from '../repositories/department.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { DepartmentFilter } from '../interfaces/organization.interface';
import { IDepartment } from '../models/department.model';
import { ConflictError, NotFoundError, BusinessRuleError } from '../../../common/errors';
import { parsePagination, parseSearch } from '../../../utils/pagination';
import { recordActivity } from '../../../shared/events';
import { Request } from 'express';
import { DepartmentInput, OrganizationScope } from '../types/organization.types';
import { toDepartmentDTO } from '../dto/organization.dto';

export class DepartmentService {
  constructor(
    private readonly repo: DepartmentRepository,
    private readonly employees: EmployeeRepository
  ) {}

  private async validateReferentialIntegrity(data: Partial<DepartmentInput>, excludeId?: string): Promise<void> {
    if (data.name) {
      const byName = await this.repo.findByName(data.name);
      if (byName && byName.id !== excludeId) throw new ConflictError('Department name already exists');
    }
    if (data.code) {
      const byCode = await this.repo.findByCode(data.code);
      if (byCode && byCode.id !== excludeId) throw new ConflictError('Department code already exists');
    }
    if (data.departmentHead) {
      const head = await this.employees.findById(data.departmentHead);
      if (!head) throw new NotFoundError('Department head must be an existing employee');
    }
    if (data.parentDepartment) {
      if (data.parentDepartment === excludeId) throw new BusinessRuleError('A department cannot be its own parent');
      const parent = await this.repo.findById(data.parentDepartment);
      if (!parent) throw new NotFoundError('Parent department not found');
    }
  }

  async create(data: DepartmentInput, actorId: string, req?: Request): Promise<IDepartment> {
    await this.validateReferentialIntegrity(data);
    const department = await this.repo.create({
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description ?? '',
      departmentHead: data.departmentHead ? (data.departmentHead as never) : null,
      parentDepartment: data.parentDepartment ? (data.parentDepartment as never) : null,
      status: data.status ?? 'active',
      createdBy: actorId,
    });
    recordActivity({
      req,
      userId: actorId,
      action: 'department.created',
      entity: 'Department',
      entityId: department.id,
      newValue: department.toObject(),
    });
    return department;
  }

  async getById(id: string, scope?: OrganizationScope): Promise<IDepartment> {
    const department = await this.repo.findById(id);
    if (!department) throw new NotFoundError('Department not found');
    this.assertReadScope(department, scope);
    return department;
  }

  async list(
    query: Record<string, unknown>,
    scope?: OrganizationScope
  ): Promise<{ data: IDepartment[]; page: number; limit: number; total: number }> {
    const { page, limit, skip } = parsePagination(query);
    const search = parseSearch(query);
    const status = query.status as 'active' | 'inactive' | undefined;
    const parentDepartment = query.parentDepartment as string | undefined;

    const filter: DepartmentFilter = { page, limit, skip, search, status, parentDepartment, scope: this.buildReadScope(scope) };

    const [rows, total] = await Promise.all([this.repo.findAll(filter), this.repo.count(filter)]);
    return { data: rows, page, limit, total };
  }

  async update(id: string, data: DepartmentInput, actorId: string, req?: Request): Promise<IDepartment> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Department not found');
    await this.validateReferentialIntegrity(data, id);
    const updated = await this.repo.update(
      id,
      { ...data, code: data.code ? data.code.toUpperCase() : undefined, updatedBy: actorId } as Partial<IDepartment>
    );
    recordActivity({
      req,
      userId: actorId,
      action: 'department.updated',
      entity: 'Department',
      entityId: id,
      oldValue: existing.toObject(),
      newValue: updated?.toObject(),
    });
    return updated!;
  }

  async deactivate(id: string, actorId: string, req?: Request): Promise<IDepartment> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Department not found');
    const updated = await this.repo.update(id, { status: 'inactive', updatedBy: actorId });
    recordActivity({
      req,
      userId: actorId,
      action: 'department.deactivated',
      entity: 'Department',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: 'inactive' },
    });
    return updated!;
  }

  async activate(id: string, actorId: string, req?: Request): Promise<IDepartment> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Department not found');
    const updated = await this.repo.update(id, { status: 'active', updatedBy: actorId });
    recordActivity({
      req,
      userId: actorId,
      action: 'department.activated',
      entity: 'Department',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: 'active' },
    });
    return updated!;
  }

  async remove(id: string, actorId: string, req?: Request): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Department not found');
    const [childCount, employeeCount] = await Promise.all([
      this.repo.countChildren(id),
      this.employees.countByDepartment(id),
    ]);
    if (childCount > 0) throw new BusinessRuleError('Cannot delete a department that has sub-departments');
    if (employeeCount > 0) throw new BusinessRuleError('Cannot delete a department with assigned employees');
    await this.repo.softDelete(id);
    recordActivity({
      req,
      userId: actorId,
      action: 'department.deleted',
      entity: 'Department',
      entityId: id,
      oldValue: existing.toObject(),
    });
  }

  async getEmployeeCount(departmentId: string): Promise<number> {
    return this.employees.countByDepartment(departmentId);
  }

  async seedDefaults(): Promise<void> {
    await this.repo.seedDefaults();
  }

  async getHierarchy(): Promise<unknown[]> {
    const all = await this.repo.findAll({ page: 1, limit: 1000, skip: 0, status: 'active' });
    const map = new Map<string, any>();
    all.forEach((d) => map.set(d.id, { ...toDepartmentDTO(d), children: [] as unknown[] }));
    const roots: any[] = [];
    all.forEach((d) => {
      const node = map.get(d.id)!;
      const parentId = d.parentDepartment?.toString();
      if (parentId && map.has(parentId)) {
        map.get(parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  private buildReadScope(scope?: OrganizationScope): Record<string, unknown> | undefined {
    if (!scope) return undefined;
    if (scope.roleName === 'Department Head') {
      const conditions: Record<string, unknown>[] = [];
      if (scope.employeeId) conditions.push({ departmentHead: scope.employeeId });
      if (scope.departmentId) conditions.push({ _id: scope.departmentId });
      if (conditions.length === 0) return { _id: null };
      return conditions.length === 1 ? conditions[0] : { $or: conditions };
    }
    if (scope.roleName === 'Employee') {
      return { _id: scope.departmentId ?? 'none' };
    }
    return undefined;
  }

  private assertReadScope(department: IDepartment, scope?: OrganizationScope): void {
    if (!scope) return;
    if (scope.roleName === 'Department Head') {
      const isOwn =
        (scope.employeeId && department.departmentHead?.toString() === scope.employeeId) ||
        (scope.departmentId && department.id === scope.departmentId);
      if (!isOwn) throw new NotFoundError('Department not found');
    } else if (scope.roleName === 'Employee') {
      if (scope.departmentId !== department.id) throw new NotFoundError('Department not found');
    }
  }
}
