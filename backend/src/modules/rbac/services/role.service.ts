import { RoleRepository, RoleFilter } from '../repositories/role.repository';
import { IRole } from '../models/role.model';
import { PermissionService } from './permission.service';
import { ConflictError, NotFoundError } from '../../../common/errors';
import { parsePagination, parseSearch } from '../../../utils/pagination';
import { recordActivity } from '../../../shared/events';
import { DEFAULT_ROLE_PERMISSIONS } from '../permissions';
import { Request } from 'express';

export class RoleService {
  constructor(
    private readonly repo: RoleRepository,
    private readonly permissions: PermissionService
  ) {}

  async seedDefaults(): Promise<void> {
    await this.permissions.seedDefaults();
    for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const existing = await this.repo.findByRoleName(roleName);
      if (!existing) {
        await this.repo.create({
          roleName,
          permissions,
          description: `${roleName} system role`,
          systemRole: true,
          status: 'active',
        });
      }
    }
  }

  async create(data: Partial<IRole>, actorId: string, req?: Request): Promise<IRole> {
    const existing = await this.repo.findByRoleName(data.roleName!);
    if (existing) throw new ConflictError('Role name already exists');
    const role = await this.repo.create(data);
    recordActivity({ req, userId: actorId, action: 'role.created', entity: 'Role', entityId: role.id, newValue: role.toObject() });
    return role;
  }

  async getById(id: string): Promise<IRole | null> {
    return this.repo.findById(id);
  }

  async list(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePagination(query);
    const search = parseSearch(query);
    const filter: RoleFilter = {
      page,
      limit,
      skip,
      search,
      status: query.status as string | undefined,
    };
    const data = await this.repo.findAll(filter);
    const total = await this.repo.count(filter);
    return { data, page, limit, total };
  }

  async update(id: string, data: Partial<IRole>, actorId: string, req?: Request): Promise<IRole> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Role not found');
    if (data.roleName && data.roleName !== existing.roleName && existing.systemRole) {
      throw new ConflictError('System role name cannot be changed');
    }
    const updated = await this.repo.update(id, data);
    recordActivity({
      req,
      userId: actorId,
      action: 'role.updated',
      entity: 'Role',
      entityId: id,
      oldValue: existing.toObject(),
      newValue: updated?.toObject(),
    });
    return updated!;
  }

  async remove(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Role not found');
    if (existing.systemRole) throw new ConflictError('System role cannot be deleted');
    await this.repo.delete(id);
    recordActivity({ userId: 'system', action: 'role.deleted', entity: 'Role', entityId: id });
  }
}
