import { DEFAULT_ROLE_PERMISSIONS, ALL_PERMISSIONS, PERMISSIONS, ROLE_NAMES } from '../../src/modules/rbac/permissions';

describe('RBAC permissions and default roles', () => {
  it('defines exactly the four required roles', () => {
    expect([...ROLE_NAMES].sort()).toEqual(['Admin', 'Asset Manager', 'Department Head', 'Employee'].sort());
  });

  it('Admin has every permission', () => {
    expect(DEFAULT_ROLE_PERMISSIONS['Admin'].sort()).toEqual([...ALL_PERMISSIONS].sort());
  });

  it('Employee does not have management permissions', () => {
    const employeePerms = DEFAULT_ROLE_PERMISSIONS['Employee'];
    expect(employeePerms).not.toContain(PERMISSIONS.ASSET_MANAGE);
    expect(employeePerms).not.toContain(PERMISSIONS.USER_PROMOTE);
  });

  it('only Admin can promote users', () => {
    expect(DEFAULT_ROLE_PERMISSIONS['Admin']).toContain(PERMISSIONS.USER_PROMOTE);
    expect(DEFAULT_ROLE_PERMISSIONS['Asset Manager']).not.toContain(PERMISSIONS.USER_PROMOTE);
    expect(DEFAULT_ROLE_PERMISSIONS['Department Head']).not.toContain(PERMISSIONS.USER_PROMOTE);
    expect(DEFAULT_ROLE_PERMISSIONS['Employee']).not.toContain(PERMISSIONS.USER_PROMOTE);
  });
});
