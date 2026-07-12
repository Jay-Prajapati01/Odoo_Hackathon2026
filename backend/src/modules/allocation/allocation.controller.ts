import { Request, Response } from 'express';
import { asyncHandler } from '../../common/async-handler';
import { sendResponse, sendPaginatedResponse } from '../../common/api-response';
import { httpStatus } from '../../common/http-status';
import { NotFoundError } from '../../common/errors';
import { AllocationRepository } from './allocation.repository';
import { AllocationHistoryRepository } from './models/allocation-history.repository';
import { AllocationService } from './allocation.service';
import { AssetRepository } from '../asset/asset.repository';
import { EmployeeRepository } from '../organization/repositories/employee.repository';
import { DepartmentRepository } from '../organization/repositories/department.repository';
import { authorize, authorizeAny } from '../../middleware/rbac';
import { validate } from '../../middleware/error-handler';
import {
  createAllocationSchema,
  updateAllocationSchema,
  cancelAllocationSchema,
  returnAllocationSchema,
  allocationQuerySchema,
} from './allocation.validation';
import { toAllocationDTO } from './allocation.dto';

const service = new AllocationService(
  new AllocationRepository(),
  new AllocationHistoryRepository(),
  new AssetRepository(),
  new EmployeeRepository(),
  new DepartmentRepository()
);

/**
 * @swagger
 * /allocations:
 *   post:
 *     tags: [Allocations]
 *     summary: Allocate an asset to an employee
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assetId, employeeId, departmentId]
 *             properties:
 *               assetId:
 *                 type: string
 *               employeeId:
 *                 type: string
 *               departmentId:
 *                 type: string
 *               expectedReturnDate:
 *                 type: string
 *                 format: date-time
 *               purpose:
 *                 type: string
 *               conditionAtAllocation:
 *                 type: string
 *                 enum: [excellent, good, fair, poor, damaged, lost]
 *               remarks:
 *                 type: string
 *     responses:
 *       201:
 *         description: Asset allocated
 */
export const createAllocation = asyncHandler(async (req: Request, res: Response) => {
  const allocation = await service.allocate(req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.CREATED, 'Asset allocated successfully', toAllocationDTO(allocation));
});

/**
 * @swagger
 * /allocations/{id}:
 *   patch:
 *     tags: [Allocations]
 *     summary: Update an allocation
 */
export const updateAllocation = asyncHandler(async (req: Request, res: Response) => {
  const allocation = await service.update(req.params.id, req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Allocation updated', toAllocationDTO(allocation));
});

/**
 * @swagger
 * /allocations/{id}/cancel:
 *   post:
 *     tags: [Allocations]
 *     summary: Cancel an allocation
 */
export const cancelAllocation = asyncHandler(async (req: Request, res: Response) => {
  const allocation = await service.cancel(req.params.id, req.user!.userId, req.body.remarks, req);
  sendResponse(res, httpStatus.OK, 'Allocation cancelled', toAllocationDTO(allocation));
});

/**
 * @swagger
 * /allocations/{id}:
 *   get:
 *     tags: [Allocations]
 *     summary: Get allocation by ID
 */
export const getAllocation = asyncHandler(async (req: Request, res: Response) => {
  const allocation = await service.getById(req.params.id);
  if (!allocation) throw new NotFoundError('Allocation not found');
  sendResponse(res, httpStatus.OK, 'Allocation retrieved', toAllocationDTO(allocation));
});

/**
 * @swagger
 * /allocations:
 *   get:
 *     tags: [Allocations]
 *     summary: List allocations with filters and pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, allocated, returned, overdue, cancelled, transferred]
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, allocationDate, expectedReturn]
 */
export const listAllocations = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.list(req.query as Record<string, unknown>);
  sendPaginatedResponse(
    res,
    'Allocations retrieved',
    result.data.map(toAllocationDTO),
    result.page,
    result.limit,
    result.total
  );
});

/**
 * @swagger
 * /allocations/{id}/return:
 *   post:
 *     tags: [Allocations]
 *     summary: Return an allocated asset
 */
export const returnAllocation = asyncHandler(async (req: Request, res: Response) => {
  const allocation = await service.returnAsset(req.params.id, req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Asset returned successfully', toAllocationDTO(allocation));
});

/**
 * @swagger
 * /allocations/{id}/history:
 *   get:
 *     tags: [Allocations]
 *     summary: Get allocation history
 */
export const getAllocationHistory = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getHistory(req.params.id, req.query as Record<string, unknown>);
  sendPaginatedResponse(res, 'Allocation history retrieved', result.data, result.page, result.limit, result.total);
});

/**
 * @swagger
 * /allocations/check-overdue:
 *   get:
 *     tags: [Allocations]
 *     summary: Check and mark overdue allocations
 */
export const checkOverdueAllocations = asyncHandler(async (req: Request, res: Response) => {
  const count = await service.checkOverdue(req.user!.userId, req);
  sendResponse(res, httpStatus.OK, `${count} allocations marked as overdue`);
});

/**
 * @swagger
 * /allocations/status-counts:
 *   get:
 *     tags: [Allocations]
 *     summary: Get allocation counts by status
 */
export const getAllocationStatusCounts = asyncHandler(async (_req: Request, res: Response) => {
  const counts = await service.getStatusCounts();
  sendResponse(res, httpStatus.OK, 'Allocation status counts', counts);
});

export const allocationRoutes = require('express').Router();

allocationRoutes.post(
  '/',
  authorize('asset.allocate', 'asset.manage'),
  validate(createAllocationSchema),
  createAllocation
);

allocationRoutes.get(
  '/',
  authorize('read'),
  validate(allocationQuerySchema, 'query'),
  listAllocations
);

allocationRoutes.get(
  '/status-counts',
  authorize('read'),
  getAllocationStatusCounts
);

allocationRoutes.get(
  '/check-overdue',
  authorize('asset.manage'),
  checkOverdueAllocations
);

allocationRoutes.get(
  '/:id',
  authorize('read'),
  getAllocation
);

allocationRoutes.patch(
  '/:id',
  authorize('asset.manage'),
  validate(updateAllocationSchema),
  updateAllocation
);

allocationRoutes.post(
  '/:id/cancel',
  authorize('asset.manage'),
  validate(cancelAllocationSchema),
  cancelAllocation
);

allocationRoutes.post(
  '/:id/return',
  authorizeAny('asset.manage', 'employee.self'),
  validate(returnAllocationSchema),
  returnAllocation
);

allocationRoutes.get(
  '/:id/history',
  authorize('read'),
  getAllocationHistory
);
