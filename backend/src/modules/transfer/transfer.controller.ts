import { Request, Response } from 'express';
import { asyncHandler } from '../../common/async-handler';
import { sendResponse, sendPaginatedResponse } from '../../common/api-response';
import { httpStatus } from '../../common/http-status';
import { NotFoundError } from '../../common/errors';
import { TransferRepository } from './transfer.repository';
import { TransferService } from './transfer.service';
import { AllocationRepository } from '../allocation/allocation.repository';
import { AllocationHistoryRepository } from '../allocation/models/allocation-history.repository';
import { AssetRepository } from '../asset/asset.repository';
import { EmployeeRepository } from '../organization/repositories/employee.repository';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/error-handler';
import {
  requestTransferSchema,
  approveTransferSchema,
  rejectTransferSchema,
  cancelTransferSchema,
  transferQuerySchema,
} from './transfer.validation';
import { toTransferDTO } from './transfer.dto';

const service = new TransferService(
  new TransferRepository(),
  new AllocationRepository(),
  new AllocationHistoryRepository(),
  new AssetRepository(),
  new EmployeeRepository()
);

/**
 * @swagger
 * /transfers:
 *   post:
 *     tags: [Transfers]
 *     summary: Request an asset transfer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [allocationId, requestedHolderId, requestReason]
 *             properties:
 *               allocationId:
 *                 type: string
 *               requestedHolderId:
 *                 type: string
 *               requestReason:
 *                 type: string
 */
export const requestTransfer = asyncHandler(async (req: Request, res: Response) => {
  const transfer = await service.request(req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.CREATED, 'Transfer requested', toTransferDTO(transfer));
});

/**
 * @swagger
 * /transfers/{id}/approve:
 *   patch:
 *     tags: [Transfers]
 *     summary: Approve a transfer request
 */
export const approveTransfer = asyncHandler(async (req: Request, res: Response) => {
  const transfer = await service.approve(req.params.id, req.user!.userId, req.body.remarks, req);
  sendResponse(res, httpStatus.OK, 'Transfer approved', toTransferDTO(transfer));
});

/**
 * @swagger
 * /transfers/{id}/reject:
 *   patch:
 *     tags: [Transfers]
 *     summary: Reject a transfer request
 */
export const rejectTransfer = asyncHandler(async (req: Request, res: Response) => {
  const transfer = await service.reject(req.params.id, req.user!.userId, req.body.rejectionReason, req);
  sendResponse(res, httpStatus.OK, 'Transfer rejected', toTransferDTO(transfer));
});

/**
 * @swagger
 * /transfers/{id}/cancel:
 *   patch:
 *     tags: [Transfers]
 *     summary: Cancel a transfer request
 */
export const cancelTransfer = asyncHandler(async (req: Request, res: Response) => {
  const transfer = await service.cancel(req.params.id, req.user!.userId, req.body.remarks, req);
  sendResponse(res, httpStatus.OK, 'Transfer cancelled', toTransferDTO(transfer));
});

/**
 * @swagger
 * /transfers/{id}/complete:
 *   patch:
 *     tags: [Transfers]
 *     summary: Complete an approved transfer
 */
export const completeTransfer = asyncHandler(async (req: Request, res: Response) => {
  const transfer = await service.complete(req.params.id, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Transfer completed', toTransferDTO(transfer));
});

/**
 * @swagger
 * /transfers/{id}:
 *   get:
 *     tags: [Transfers]
 *     summary: Get transfer by ID
 */
export const getTransfer = asyncHandler(async (req: Request, res: Response) => {
  const transfer = await service.getById(req.params.id);
  if (!transfer) throw new NotFoundError('Transfer not found');
  sendResponse(res, httpStatus.OK, 'Transfer retrieved', toTransferDTO(transfer));
});

/**
 * @swagger
 * /transfers:
 *   get:
 *     tags: [Transfers]
 *     summary: List transfers with filters and pagination
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
 *           enum: [requested, approved, rejected, completed, cancelled]
 *       - in: query
 *         name: assetId
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, requestedAt]
 */
export const listTransfers = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.list(req.query as Record<string, unknown>);
  sendPaginatedResponse(
    res,
    'Transfers retrieved',
    result.data.map(toTransferDTO),
    result.page,
    result.limit,
    result.total
  );
});

/**
 * @swagger
 * /transfers/status-counts:
 *   get:
 *     tags: [Transfers]
 *     summary: Get transfer counts by status
 */
export const getTransferStatusCounts = asyncHandler(async (_req: Request, res: Response) => {
  const counts = await service.getStatusCounts();
  sendResponse(res, httpStatus.OK, 'Transfer status counts', counts);
});

export const transferRoutes = require('express').Router();

transferRoutes.post(
  '/',
  authorize('transfer'),
  validate(requestTransferSchema),
  requestTransfer
);

transferRoutes.get(
  '/',
  authorize('read'),
  validate(transferQuerySchema, 'query'),
  listTransfers
);

transferRoutes.get(
  '/status-counts',
  authorize('read'),
  getTransferStatusCounts
);

transferRoutes.get(
  '/:id',
  authorize('read'),
  getTransfer
);

transferRoutes.patch(
  '/:id/approve',
  authorize('approve'),
  validate(approveTransferSchema),
  approveTransfer
);

transferRoutes.patch(
  '/:id/reject',
  authorize('approve'),
  validate(rejectTransferSchema),
  rejectTransfer
);

transferRoutes.patch(
  '/:id/complete',
  authorize('transfer'),
  completeTransfer
);

transferRoutes.patch(
  '/:id/cancel',
  authorize('transfer'),
  validate(cancelTransferSchema),
  cancelTransfer
);
