import { Router } from 'express';
import {
  createRole,
  listRoles,
  getRole,
  updateRole,
  deleteRole,
  listPermissions,
} from '../controllers/role.controller';
import { validate } from '../../../middleware/error-handler';
import { authorize } from '../../../middleware/rbac';
import { createRoleSchema, updateRoleSchema, roleQuerySchema } from '../validators/role.validator';

export const roleRoutes = Router();

roleRoutes.get('/permissions', authorize('read'), listPermissions);
roleRoutes.post('/', authorize('settings.manage'), validate(createRoleSchema), createRole);
roleRoutes.get('/', authorize('read'), validate(roleQuerySchema), listRoles);
roleRoutes.get('/:id', authorize('read'), getRole);
roleRoutes.patch('/:id', authorize('settings.manage'), validate(updateRoleSchema), updateRole);
roleRoutes.delete('/:id', authorize('settings.manage'), deleteRole);
