import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/async-handler';
import { sendResponse, sendPaginatedResponse } from '../../../common/api-response';
import { httpStatus } from '../../../common/http-status';
import { EmployeeRepository } from '../repositories/employee.repository';
import { DepartmentRepository } from '../repositories/department.repository';
import { UserRepository } from '../../auth/repositories/user.repository';
import { RoleRepository } from '../../rbac/repositories/role.repository';
import { EmployeeService } from '../services/employee.service';
import { authorize } from '../../../middleware/rbac';
import { validate } from '../../../middleware/error-handler';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeQuerySchema,
  assignRoleSchema,
  changeDepartmentSchema,
  idParamSchema,
} from '../validators/organization.validator';
import { OrganizationScope } from '../types/organization.types';
import { toEmployeeDTO, toEmployeeDetailDTO } from '../dto/organization.dto';

const employeeService = new EmployeeService(
  new EmployeeRepository(),
  new DepartmentRepository(),
  new UserRepository(),
  new RoleRepository()
);

const buildScope = async (req: Request): Promise<OrganizationScope> => {
  const ctx = await employeeService.getCallerContext(req.user!.userId);
  return { roleName: req.user!.roleName, employeeId: ctx.employeeId, departmentId: ctx.departmentId };
};

/**
 * @swagger
 * /api/v1/employees:
 *   post:
 *     summary: Create an employee (Admin only)
 *     tags: [Employees]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, employeeCode, firstName, lastName, email, designation]
 *             properties:
 *               userId: { type: string }
 *               employeeCode: { type: string }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               departmentId: { type: string }
 *               designation: { type: string }
 *               role: { type: string }
 *               reportingManager: { type: string }
 *               employmentStatus: { type: string, enum: [active, inactive, on_leave, terminated] }
 *     responses:
 *       201: { description: Employee created }
 *       409: { description: Code or email already exists }
 */
export const createEmployee = asyncHandler(async (req: Request, res: Response) => {
  const employee = await employeeService.create(req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.CREATED, 'Employee created', toEmployeeDetailDTO(employee));
});

/**
 * @swagger
 * /api/v1/employees:
 *   get:
 *     summary: List employees (RBAC scoped)
 *     tags: [Employees]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: departmentId, schema: { type: string } }
 *       - { in: query, name: employmentStatus, schema: { type: string } }
 *     responses:
 *       200: { description: Paginated employees }
 */
export const listEmployees = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const result = await employeeService.list(req.query as Record<string, unknown>, scope);
  sendPaginatedResponse(res, 'Employees retrieved', result.data.map(toEmployeeDTO), result.page, result.limit, result.total);
});

/**
 * @swagger
 * /api/v1/employees/me:
 *   get:
 *     summary: Get own employee profile
 *     tags: [Employees]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Own profile }
 */
export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const employee = await employeeService.me(req.user!.userId);
  sendResponse(res, httpStatus.OK, 'Employee profile retrieved', toEmployeeDetailDTO(employee));
});

/**
 * @swagger
 * /api/v1/employees/{id}:
 *   get:
 *     summary: Get an employee by id (RBAC scoped)
 *     tags: [Employees]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Employee }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
export const getEmployee = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const employee = await employeeService.getById(req.params.id, scope);
  sendResponse(res, httpStatus.OK, 'Employee retrieved', toEmployeeDetailDTO(employee));
});

export const updateEmployee = asyncHandler(async (req: Request, res: Response) => {
  const updated = await employeeService.update(req.params.id, req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Employee updated', toEmployeeDetailDTO(updated));
});

/**
 * @swagger
 * /api/v1/employees/{id}/role:
 *   post:
 *     summary: Assign/change an employee role (Admin only)
 *     tags: [Employees]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roleId]
 *             properties: { roleId: { type: string } }
 *     responses:
 *       200: { description: Role updated }
 */
export const assignEmployeeRole = asyncHandler(async (req: Request, res: Response) => {
  const updated = await employeeService.assignRole(req.params.id, req.body.roleId, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Employee role updated', toEmployeeDetailDTO(updated));
});

/**
 * @swagger
 * /api/v1/employees/{id}/department:
 *   post:
 *     summary: Change an employee department (Admin only)
 *     tags: [Employees]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [departmentId]
 *             properties: { departmentId: { type: string } }
 *     responses:
 *       200: { description: Department updated }
 *       400: { description: Inactive department }
 */
export const changeEmployeeDepartment = asyncHandler(async (req: Request, res: Response) => {
  const updated = await employeeService.changeDepartment(req.params.id, req.body.departmentId, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Employee department updated', toEmployeeDetailDTO(updated));
});

export const deactivateEmployee = asyncHandler(async (req: Request, res: Response) => {
  const updated = await employeeService.deactivate(req.params.id, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Employee deactivated', toEmployeeDetailDTO(updated));
});

/**
 * @swagger
 * /api/v1/employees/{id}:
 *   delete:
 *     summary: Soft-delete an employee and disable login (Admin only)
 *     tags: [Employees]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Employee deleted }
 */
export const deleteEmployee = asyncHandler(async (req: Request, res: Response) => {
  await employeeService.remove(req.params.id, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Employee deleted');
});

export const employeeRoutes = require('express').Router();
employeeRoutes.post('/', authorize('employee.manage'), validate(createEmployeeSchema), createEmployee);
employeeRoutes.get('/', authorize('read'), validate(employeeQuerySchema), listEmployees);
employeeRoutes.get('/me', authorize('read'), getMyProfile);
employeeRoutes.get('/:id', authorize('read'), validate(idParamSchema, 'params'), getEmployee);
employeeRoutes.patch('/:id', authorize('employee.manage'), validate(updateEmployeeSchema), updateEmployee);
employeeRoutes.post('/:id/role', authorize('user.promote'), validate(assignRoleSchema), assignEmployeeRole);
employeeRoutes.post('/:id/department', authorize('employee.manage'), validate(changeDepartmentSchema), changeEmployeeDepartment);
employeeRoutes.post('/:id/deactivate', authorize('employee.manage'), deactivateEmployee);
employeeRoutes.delete('/:id', authorize('employee.manage'), deleteEmployee);
