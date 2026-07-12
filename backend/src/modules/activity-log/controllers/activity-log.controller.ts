import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/async-handler';
import { sendResponse, sendPaginatedResponse } from '../../../common/api-response';
import { httpStatus } from '../../../common/http-status';
import { ActivityLogService } from '../services/activity-log.service';
import { ActivityLogRepository } from '../repositories/activity-log.repository';
import { authorize } from '../../../middleware/rbac';
import { validate } from '../../../middleware/error-handler';
import { activityLogQuerySchema, idParamSchema } from '../validators/activity-log.validator';
import { toActivityLogDTO, toActivityLogDetailDTO } from '../dto/activity-log.dto';
import { buildScope } from '../../../shared/scope';

const activityLogService = new ActivityLogService(new ActivityLogRepository());

/**
 * @swagger
 * /api/v1/activity-logs:
 *   get:
 *     summary: List activity logs (search, filter, sort, paginate, RBAC scoped)
 *     tags: [Activity Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: module, schema: { type: string } }
 *       - { in: query, name: entityType, schema: { type: string } }
 *       - { in: query, name: entityId, schema: { type: string } }
 *       - { in: query, name: user, schema: { type: string } }
 *       - { in: query, name: action, schema: { type: string } }
 *       - { in: query, name: dateFrom, schema: { type: string, format: date-time } }
 *       - { in: query, name: dateTo, schema: { type: string, format: date-time } }
 *       - { in: query, name: sort, schema: { type: string, enum: [newest, oldest] } }
 *     responses:
 *       200: { description: Paginated activity logs }
 */
export const listActivityLogs = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const result = await activityLogService.list(req.query as Record<string, unknown>, scope);
  sendPaginatedResponse(
    res,
    'Activity logs retrieved',
    result.data.map(toActivityLogDTO),
    result.page,
    result.limit,
    result.total
  );
});

/**
 * @swagger
 * /api/v1/activity-logs/{id}:
 *   get:
 *     summary: Get an activity log by id (RBAC scoped)
 *     tags: [Activity Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Activity log }
 *       404: { description: Not found }
 */
export const getActivityLog = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const log = await activityLogService.getById(req.params.id, scope);
  sendResponse(res, httpStatus.OK, 'Activity log retrieved', toActivityLogDetailDTO(log));
});

export const activityLogRoutes = require('express').Router();
activityLogRoutes.get('/', authorize('activity.read'), validate(activityLogQuerySchema), listActivityLogs);
activityLogRoutes.get('/:id', authorize('activity.read'), validate(idParamSchema, 'params'), getActivityLog);
