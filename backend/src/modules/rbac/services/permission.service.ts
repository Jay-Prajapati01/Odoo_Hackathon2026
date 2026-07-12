import { PermissionRepository } from '../repositories/permission.repository';
import { IPermission } from '../models/permission.model';
import { PERMISSION_DEFINITIONS } from '../permissions';

export class PermissionService {
  constructor(private readonly repo: PermissionRepository) {}

  async seedDefaults(): Promise<void> {
    await this.repo.createMany(PERMISSION_DEFINITIONS);
  }

  async list(): Promise<IPermission[]> {
    return this.repo.findAll();
  }
}
