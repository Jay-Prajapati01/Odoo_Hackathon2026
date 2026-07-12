import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/async-handler';
import { sendResponse, sendPaginatedResponse } from '../../../common/api-response';
import { httpStatus } from '../../../common/http-status';
import { DepartmentRepository } from '../repositories/department.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { DepartmentService } from '../services/department.service';
import { EmployeeService } from '../services/employee.service';
import { UserRepository } from '../../auth/repositories/user.repository';
import { RoleRepository } from '../../rbac/repositories/role.repository';
import { authorize } from '../../../middleware/rbac';
import { validate } from '../../../middleware/error-handler';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentQuerySchema,
  idParamSchema,
} from '../validators/organization.validator';
import { OrganizationScope } from '../types/organization.types';
import { toDepartmentDTO } from '../dto/organization.dto';

const employeeService = new EmployeeService(
  new EmployeeRepository(),
  new DepartmentRepository(),
  new UserRepository(),
  new RoleRepository()
);

const departmentService = new DepartmentService(new DepartmentRepository(), new EmployeeRepository());

const buildScope = async (req: Request): Promise<OrganizationScope> => {
  const ctx = await employeeService.getCallerContext(req.user!.userId);
  return { roleName: req.user!.roleName, employeeId: ctx.employeeId, departmentId: ctx.departmentId };
};

/**
 * @swagger
 * /api/v1/departments:
 *   post:
 *     summary: Create a department (Admin only)
 *     tags: [Departments]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code]
 *             properties:
 *               name: { type: string }
 *               code: { type: string }
 *               description: { type: string }
 *               departmentHead: { type: string }
 *               parentDepartment: { type: string }
 *               status: { type: string, enum: [active, inactive] }
 *     responses:
 *       201: { description: Department created }
 *       409: { description: Name or code already exists }
 */
export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await departmentService.create(req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.CREATED, 'Department created', toDepartmentDTO(department));
});

/**
 * @swagger
 * /api/v1/departments:
 *   get:
 *     summary: List departments (RBAC scoped)
 *     tags: [Departments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [active, inactive] } }
 *     responses:
 *       200: { description: Paginated departments }
 */
export const listDepartments = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const result = await departmentService.list(req.query as Record<string, unknown>, scope);
  const data = await Promise.all(
    result.data.map(async (d) => ({
      ...toDepartmentDTO(d),
      employeeCount: await departmentService.getEmployeeCount(d.id),
    }))
  );
  sendPaginatedResponse(res, 'Departments retrieved', data, result.page, result.limit, result.total);
});

export const getDepartmentHierarchy = asyncHandler(async (_req: Request, res: Response) => {
  const hierarchy = await departmentService.getHierarchy();
  sendResponse(res, httpStatus.OK, 'Department hierarchy retrieved', hierarchy);
});

/**
 * @swagger
 * /api/v1/departments/{id}:
 *   get:
 *     summary: Get a department by id (RBAC scoped)
 *     tags: [Departments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Department }
 *       404: { description: Not found }
 */
export const getDepartment = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const department = await departmentService.getById(req.params.id, scope);
  const employeeCount = await departmentService.getEmployeeCount(department.id);
  sendResponse(res, httpStatus.OK, 'Department retrieved', { ...toDepartmentDTO(department), employeeCount });
});

/**
 * @swagger
 * /api/v1/departments/{id}:
 *   patch:
 *     summary: Update a department (Admin only)
 *     tags: [Departments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Department updated }
 */
export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const updated = await departmentService.update(req.params.id, req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Department updated', toDepartmentDTO(updated));
});

export const deactivateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const updated = await departmentService.deactivate(req.params.id, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Department deactivated', toDepartmentDTO(updated));
});

export const activateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const updated = await departmentService.activate(req.params.id, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Department activated', toDepartmentDTO(updated));
});

/**
 * @swagger
 * /api/v1/departments/{id}:
 *   delete:
 *     summary: Soft-delete a department (Admin only)
 *     tags: [Departments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Department deleted }
 */
export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
  await departmentService.remove(req.params.id, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Department deleted');
});

export const departmentRoutes = require('express').Router();
departmentRoutes.post('/', authorize('department.manage'), validate(createDepartmentSchema), createDepartment);
departmentRoutes.get('/', authorize('read'), validate(departmentQuerySchema), listDepartments);
departmentRoutes.get('/hierarchy', authorize('read'), getDepartmentHierarchy);
departmentRoutes.get('/:id', authorize('read'), validate(idParamSchema, 'params'), getDepartment);
departmentRoutes.patch('/:id', authorize('department.manage'), validate(updateDepartmentSchema), updateDepartment);
departmentRoutes.post('/:id/deactivate', authorize('department.manage'), deactivateDepartment);
departmentRoutes.post('/:id/activate', authorize('department.manage'), activateDepartment);
departmentRoutes.delete('/:id', authorize('department.manage'), deleteDepartment);
