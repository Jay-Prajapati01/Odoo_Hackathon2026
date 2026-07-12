import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/async-handler';
import { sendResponse, sendPaginatedResponse } from '../../../common/api-response';
import { httpStatus } from '../../../common/http-status';
import { NotFoundError, ConflictError } from '../../../common/errors';
import { RoleService } from '../services/role.service';
import { RoleRepository } from '../repositories/role.repository';
import { PermissionRepository } from '../repositories/permission.repository';
import { PermissionService } from '../services/permission.service';
import { validate } from '../../../middleware/error-handler';
import { authorize } from '../../../middleware/rbac';
import { createRoleSchema, updateRoleSchema, roleQuerySchema } from '../validators/role.validator';

const roleService = new RoleService(new RoleRepository(), new PermissionService(new PermissionRepository()));
const permissionService = new PermissionService(new PermissionRepository());

/**
 * @swagger
 * /api/v1/roles:
 *   post:
 *     summary: Create a role
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roleName, permissions]
 *             properties:
 *               roleName: { type: string }
 *               description: { type: string }
 *               permissions: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Role created }
 */
export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await roleService.create(req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.CREATED, 'Role created', role);
});

/**
 * @swagger
 * /api/v1/roles:
 *   get:
 *     summary: List roles
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Roles retrieved }
 */
export const listRoles = asyncHandler(async (req: Request, res: Response) => {
  const result = await roleService.list(req.query as Record<string, unknown>);
  sendPaginatedResponse(res, 'Roles retrieved', result.data, result.page, result.limit, result.total);
});

/**
 * @swagger
 * /api/v1/roles/{id}:
 *   get:
 *     summary: Get a role by id
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Role retrieved }
 */
export const getRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await roleService.getById(req.params.id);
  if (!role) throw new NotFoundError('Role not found');
  sendResponse(res, httpStatus.OK, 'Role retrieved', role);
});

/**
 * @swagger
 * /api/v1/roles/{id}:
 *   patch:
 *     summary: Update a role
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Role updated }
 */
export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const updated = await roleService.update(req.params.id, req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Role updated', updated);
});

/**
 * @swagger
 * /api/v1/roles/{id}:
 *   delete:
 *     summary: Delete a role (non-system only)
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Role deleted }
 */
export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  await roleService.remove(req.params.id);
  sendResponse(res, httpStatus.OK, 'Role deleted');
});

export const listPermissions = asyncHandler(async (_req: Request, res: Response) => {
  const data = await permissionService.list();
  sendResponse(res, httpStatus.OK, 'Permissions retrieved', data);
});
