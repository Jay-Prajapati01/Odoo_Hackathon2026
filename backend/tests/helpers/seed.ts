import { RoleRepository } from '../../src/modules/rbac/repositories/role.repository';
import { PermissionRepository } from '../../src/modules/rbac/repositories/permission.repository';
import { PermissionService } from '../../src/modules/rbac/services/permission.service';
import { RoleService } from '../../src/modules/rbac/services/role.service';

export const seedRolesAndPermissions = async (): Promise<void> => {
  const permissionService = new PermissionService(new PermissionRepository());
  const roleService = new RoleService(new RoleRepository(), permissionService);
  await roleService.seedDefaults();
};
