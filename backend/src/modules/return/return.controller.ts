import { Request, Response } from 'express';
import { asyncHandler } from '../../common/async-handler';
import { sendResponse, sendPaginatedResponse } from '../../common/api-response';
import { httpStatus } from '../../common/http-status';
import { NotFoundError } from '../../common/errors';
import { ReturnRepository } from './return.repository';
import { ReturnService } from './return.service';
import { AllocationRepository } from '../allocation/allocation.repository';
import { AllocationHistoryRepository } from '../allocation/models/allocation-history.repository';
import { AssetRepository } from '../asset/asset.repository';
import { EmployeeRepository } from '../organization/repositories/employee.repository';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/error-handler';
import { requestReturnSchema, returnQuerySchema } from './return.validation';
import { toReturnDTO } from './return.dto';

const service = new ReturnService(
  new ReturnRepository(),
  new AllocationRepository(),
  new AllocationHistoryRepository(),
  new AssetRepository(),
  new EmployeeRepository()
);

/**
 * @swagger
 * /returns:
 *   post:
 *     tags: [Returns]
 *     summary: Request a return for an allocated asset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [allocationId, condition]
 *             properties:
 *               allocationId:
 *                 type: string
 *               condition:
 *                 type: string
 *                 enum: [excellent, good, fair, poor, damaged, lost]
 *               damageNotes:
 *                 type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *               remarks:
 *                 type: string
 */
export const requestReturn = asyncHandler(async (req: Request, res: Response) => {
  const ret = await service.requestReturn(req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.CREATED, 'Return processed successfully', toReturnDTO(ret));
});

/**
 * @swagger
 * /returns/{id}:
 *   get:
 *     tags: [Returns]
 *     summary: Get return by ID
 */
export const getReturn = asyncHandler(async (req: Request, res: Response) => {
  const ret = await service.getById(req.params.id);
  if (!ret) throw new NotFoundError('Return not found');
  sendResponse(res, httpStatus.OK, 'Return retrieved', toReturnDTO(ret));
});

/**
 * @swagger
 * /returns:
 *   get:
 *     tags: [Returns]
 *     summary: List returns with filters and pagination
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
 *         name: condition
 *         schema:
 *           type: string
 *           enum: [excellent, good, fair, poor, damaged, lost]
 *       - in: query
 *         name: allocationId
 *         schema:
 *           type: string
 *       - in: query
 *         name: assetId
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 */
export const listReturns = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.list(req.query as Record<string, unknown>);
  sendPaginatedResponse(
    res,
    'Returns retrieved',
    result.data.map(toReturnDTO),
    result.page,
    result.limit,
    result.total
  );
});

export const returnRoutes = require('express').Router();

returnRoutes.post(
  '/',
  authorize('asset.manage'),
  validate(requestReturnSchema),
  requestReturn
);

returnRoutes.get(
  '/',
  authorize('read'),
  validate(returnQuerySchema, 'query'),
  listReturns
);

returnRoutes.get(
  '/:id',
  authorize('read'),
  getReturn
);
