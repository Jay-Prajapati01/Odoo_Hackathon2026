# RBAC Matrix

AssetFlow uses four roles. Permissions are enforced by the `requirePermission` middleware
(keyed on `PERMISSIONS` in `src/modules/rbac/permissions.ts`). Data scoping is applied
in services via `buildScope(req)` (Admin = all, Department Head = department, Employee = own).

## Roles

| Role | Scope | Intent |
| ---- | ----- | ------ |
| **Admin** | Global | Full control of the system (all permissions). |
| **Asset Manager** | Global | Operates and manages the asset estate end-to-end. |
| **Department Head** | Own department | Approves/oversees requests within their department. |
| **Employee** | Self | Self-service: view catalog, book, request transfer, see own notifications & trail. |

## Permission → Role

Legend: ✅ granted · — not granted.

| Permission | Admin | Asset Manager | Dept Head | Employee |
| ---------- | :---: | :---: | :---: | :---: |
| `read` (generic) | ✅ | ✅ | ✅ | ✅ |
| `write` / `update` / `delete` (generic) | ✅ | ✅ | ✅ (`update`) | — |
| `approve` / `reject` | ✅ | ✅ | ✅ | — |
| `transfer` | ✅ | ✅ | ✅ | ✅ |
| `audit` (perform) | ✅ | ✅ | ✅ | — |
| `booking` (create) | ✅ | ✅ | ✅ | ✅ |
| `department.read` | ✅ | ✅ | ✅ | — |
| `department.create/update/delete/manage` | ✅ | ✅ (`create/update/delete` via MANAGE) | — | — |
| `employee.read` | ✅ | ✅ | ✅ | — |
| `employee.create/update/delete/manage` | ✅ | ✅ | — | — |
| `asset.read` | ✅ | ✅ | ✅ | ✅ |
| `asset.create/update/delete/allocate/transfer/manage` | ✅ | ✅ | `allocate`/`transfer` | — |
| `maintenance.read` | ✅ | ✅ | ✅ | — |
| `maintenance.approve` / `maintenance.manage` | ✅ | ✅ | — | — |
| `audit.read` / `audit.manage` | ✅ | ✅ | `read` | — |
| `booking.read` / `booking.create` / `booking.manage` | ✅ | ✅ | ✅ | `read`/`create` |
| `notification.read` / `notification.manage` | ✅ | ✅ | — | `read` |
| `activity.read` / `activity.manage` | ✅ | ✅ | `read` | — |
| `audit_trail.read` / `audit_trail.manage` | ✅ | ✅ | `read` | `read` |
| `report.view` / `report.export` | ✅ | ✅ | `view` | — |
| `dashboard.view` | ✅ | ✅ | ✅ | ✅ |
| `settings.read` / `settings.manage` | ✅ | ✅ (`read`/`manage`) | — | — |
| `user.promote` | ✅ | — | — | — |

> Notes: `Asset Manager` holds `ASSET_MANAGE` which covers create/update/delete; `Department Head`
> may `allocate`/`transfer` and fully `manage` bookings in scope; `Employee` is restricted to
> self-service actions. `AUDIT_TRAIL_MANAGE` is Admin-only.

## How assignment works

- Default role→permission mappings live in `DEFAULT_ROLE_PERMISSIONS` and are applied by
  `RoleService.seedDefaults()` on first boot (idempotent).
- Promote a user with `USER_PROMOTE` (Admin only) via the user/role endpoints.
- Permissions are checked at the route layer: `router.post('/assets', authenticate, requirePermission(PERMISSIONS.ASSET_CREATE), controller.create)`.

See [`docs/architecture.md`](architecture.md) and [`docs/api.md`](api.md).
