import { Request, Response } from 'express';
import { asyncHandler } from '../../common/async-handler';
import { sendResponse, sendPaginatedResponse } from '../../common/api-response';
import { httpStatus } from '../../common/http-status';
import { NotFoundError } from '../../common/errors';
import { MaintenanceRepository } from './maintenance.repository';
import { MaintenanceHistoryRepository } from './models/maintenance-history.repository';
import { MaintenanceService } from './maintenance.service';
import { AssetRepository } from '../asset/asset.repository';
import { EmployeeRepository } from '../organization/repositories/employee.repository';
import { DepartmentRepository } from '../organization/repositories/department.repository';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/error-handler';
import {
  createMaintenanceSchema,
  approveMaintenanceSchema,
  rejectMaintenanceSchema,
  assignTechnicianSchema,
  startRepairSchema,
  completeRepairSchema,
  cancelMaintenanceSchema,
  maintenanceQuerySchema,
} from './maintenance.validation';
import { toMaintenanceDTO } from './maintenance.dto';

const service = new MaintenanceService(
  new MaintenanceRepository(),
  new MaintenanceHistoryRepository(),
  new AssetRepository(),
  new EmployeeRepository(),
  new DepartmentRepository()
);

/**
 * @swagger
 * /maintenance:
 *   post:
 *     tags: [Maintenance]
 *     summary: Create a maintenance request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assetId, departmentId, issueTitle, issueDescription]
 *             properties:
 *               assetId:
 *                 type: string
 *               departmentId:
 *                 type: string
 *               issueTitle:
 *                 type: string
 *               issueDescription:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *               estimatedCost:
 *                 type: number
 *               estimatedDuration:
 *                 type: string
 *     responses:
 *       201:
 *         description: Maintenance request created
 */
export const createMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const maintenance = await service.create(req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.CREATED, 'Maintenance request created', toMaintenanceDTO(maintenance));
});

/**
 * @swagger
 * /maintenance/{id}/approve:
 *   patch:
 *     tags: [Maintenance]
 *     summary: Approve a maintenance request
 */
export const approveMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const maintenance = await service.approve(req.params.id, req.user!.userId, req.body, req);
  sendResponse(res, httpStatus.OK, 'Maintenance approved', toMaintenanceDTO(maintenance));
});

/**
 * @swagger
 * /maintenance/{id}/reject:
 *   patch:
 *     tags: [Maintenance]
 *     summary: Reject a maintenance request
 */
export const rejectMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const maintenance = await service.reject(req.params.id, req.user!.userId, req.body.rejectionReason, req);
  sendResponse(res, httpStatus.OK, 'Maintenance rejected', toMaintenanceDTO(maintenance));
});

/**
 * @swagger
 * /maintenance/{id}/assign-technician:
 *   patch:
 *     tags: [Maintenance]
 *     summary: Assign a technician to maintenance
 */
export const assignTechnician = asyncHandler(async (req: Request, res: Response) => {
  const maintenance = await service.assignTechnician(req.params.id, req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Technician assigned', toMaintenanceDTO(maintenance));
});

/**
 * @swagger
 * /maintenance/{id}/start-repair:
 *   patch:
 *     tags: [Maintenance]
 *     summary: Start repair work
 */
export const startRepair = asyncHandler(async (req: Request, res: Response) => {
  const maintenance = await service.startRepair(req.params.id, req.user!.userId, req.body.notes, req);
  sendResponse(res, httpStatus.OK, 'Repair started', toMaintenanceDTO(maintenance));
});

/**
 * @swagger
 * /maintenance/{id}/complete-repair:
 *   patch:
 *     tags: [Maintenance]
 *     summary: Complete repair work
 */
export const completeRepair = asyncHandler(async (req: Request, res: Response) => {
  const maintenance = await service.completeRepair(req.params.id, req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Repair completed', toMaintenanceDTO(maintenance));
});

/**
 * @swagger
 * /maintenance/{id}/cancel:
 *   patch:
 *     tags: [Maintenance]
 *     summary: Cancel a maintenance request
 */
export const cancelMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const maintenance = await service.cancel(req.params.id, req.user!.userId, req.body.remarks, req);
  sendResponse(res, httpStatus.OK, 'Maintenance cancelled', toMaintenanceDTO(maintenance));
});

/**
 * @swagger
 * /maintenance/{id}:
 *   get:
 *     tags: [Maintenance]
 *     summary: Get maintenance request by ID
 */
export const getMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const maintenance = await service.getById(req.params.id);
  if (!maintenance) throw new NotFoundError('Maintenance request not found');
  sendResponse(res, httpStatus.OK, 'Maintenance retrieved', toMaintenanceDTO(maintenance));
});

/**
 * @swagger
 * /maintenance:
 *   get:
 *     tags: [Maintenance]
 *     summary: List maintenance requests with filters and pagination
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
 *           enum: [pending, approved, rejected, technician_assigned, in_progress, resolved, cancelled]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - in: query
 *         name: assetId
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
 *           enum: [newest, oldest, priority, completionDate, estimatedCost, requestedDate]
 */
export const listMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.list(req.query as Record<string, unknown>);
  sendPaginatedResponse(
    res,
    'Maintenance records retrieved',
    result.data.map(toMaintenanceDTO),
    result.page,
    result.limit,
    result.total
  );
});

/**
 * @swagger
 * /maintenance/{id}/history:
 *   get:
 *     tags: [Maintenance]
 *     summary: Get maintenance history
 */
export const getMaintenanceHistory = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getHistory(req.params.id, req.query as Record<string, unknown>);
  sendPaginatedResponse(res, 'Maintenance history retrieved', result.data, result.page, result.limit, result.total);
});

/**
 * @swagger
 * /maintenance/status-counts:
 *   get:
 *     tags: [Maintenance]
 *     summary: Get maintenance counts by status
 */
export const getMaintenanceStatusCounts = asyncHandler(async (_req: Request, res: Response) => {
  const counts = await service.getStatusCounts();
  sendResponse(res, httpStatus.OK, 'Maintenance status counts', counts);
});

/**
 * @swagger
 * /maintenance/stats:
 *   get:
 *     tags: [Maintenance]
 *     summary: Get maintenance statistics
 */
export const getMaintenanceStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await service.getStats();
  sendResponse(res, httpStatus.OK, 'Maintenance statistics', stats);
});

export const maintenanceRoutes = require('express').Router();

maintenanceRoutes.post(
  '/',
  authorize('asset.manage'),
  validate(createMaintenanceSchema),
  createMaintenance
);

maintenanceRoutes.get(
  '/',
  authorize('read'),
  validate(maintenanceQuerySchema, 'query'),
  listMaintenance
);

maintenanceRoutes.get(
  '/status-counts',
  authorize('read'),
  getMaintenanceStatusCounts
);

maintenanceRoutes.get(
  '/stats',
  authorize('read'),
  getMaintenanceStats
);

maintenanceRoutes.get(
  '/:id',
  authorize('read'),
  getMaintenance
);

maintenanceRoutes.patch(
  '/:id/approve',
  authorize('approve'),
  validate(approveMaintenanceSchema),
  approveMaintenance
);

maintenanceRoutes.patch(
  '/:id/reject',
  authorize('approve'),
  validate(rejectMaintenanceSchema),
  rejectMaintenance
);

maintenanceRoutes.patch(
  '/:id/assign-technician',
  authorize('approve'),
  validate(assignTechnicianSchema),
  assignTechnician
);

maintenanceRoutes.patch(
  '/:id/start-repair',
  authorize('approve'),
  validate(startRepairSchema),
  startRepair
);

maintenanceRoutes.patch(
  '/:id/complete-repair',
  authorize('approve'),
  validate(completeRepairSchema),
  completeRepair
);

maintenanceRoutes.patch(
  '/:id/cancel',
  authorize('asset.manage'),
  validate(cancelMaintenanceSchema),
  cancelMaintenance
);

maintenanceRoutes.get(
  '/:id/history',
  authorize('read'),
  getMaintenanceHistory
);
