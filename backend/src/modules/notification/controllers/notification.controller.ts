import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/async-handler';
import { sendResponse, sendPaginatedResponse } from '../../../common/api-response';
import { httpStatus } from '../../../common/http-status';
import { NotificationService } from '../services/notification.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationPreferenceRepository } from '../repositories/notification-preference.repository';
import { authorize } from '../../../middleware/rbac';
import { validate } from '../../../middleware/error-handler';
import { notificationQuerySchema, idParamSchema } from '../validators/notification.validator';
import { toNotificationDTO, toNotificationDetailDTO } from '../dto/notification.dto';
import { buildScope } from '../../../shared/scope';

const notificationService = new NotificationService(
  new NotificationRepository(),
  new NotificationPreferenceRepository()
);

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: List notifications (search, filter, sort, paginate, RBAC scoped)
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: type, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [unread, read, archived, deleted] } }
 *       - { in: query, name: priority, schema: { type: string, enum: [low, medium, high, critical] } }
 *       - { in: query, name: module, schema: { type: string } }
 *       - { in: query, name: user, schema: { type: string } }
 *       - { in: query, name: entity, schema: { type: string } }
 *       - { in: query, name: dateFrom, schema: { type: string, format: date-time } }
 *       - { in: query, name: dateTo, schema: { type: string, format: date-time } }
 *       - { in: query, name: sort, schema: { type: string, enum: [newest, oldest, priority, unread] } }
 *     responses:
 *       200: { description: Paginated notifications }
 */
export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const result = await notificationService.list(req.query as Record<string, unknown>, scope);
  sendPaginatedResponse(
    res,
    'Notifications retrieved',
    result.data.map(toNotificationDTO),
    result.page,
    result.limit,
    result.total
  );
});

/**
 * @swagger
 * /api/v1/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count for the caller (RBAC scoped)
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unread count }
 */
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const unread = await notificationService.unreadCount(scope);
  sendResponse(res, httpStatus.OK, 'Unread count retrieved', { unread });
});

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   get:
 *     summary: Get a notification by id (RBAC scoped)
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Notification }
 *       404: { description: Not found }
 */
export const getNotification = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const notification = await notificationService.getById(req.params.id, scope);
  sendResponse(res, httpStatus.OK, 'Notification retrieved', toNotificationDetailDTO(notification));
});

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Notification marked as read }
 *       409: { description: Already read }
 */
export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const notification = await notificationService.markRead(req.params.id, scope);
  sendResponse(res, httpStatus.OK, 'Notification marked as read', toNotificationDetailDTO(notification));
});

/**
 * @swagger
 * /api/v1/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read (RBAC scoped)
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Count of updated notifications }
 */
export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const updated = await notificationService.markAllRead(scope);
  sendResponse(res, httpStatus.OK, 'All notifications marked as read', { updated });
});

/**
 * @swagger
 * /api/v1/notifications/{id}/archive:
 *   patch:
 *     summary: Archive a notification
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Notification archived }
 *       409: { description: Already archived }
 */
export const archiveNotification = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const notification = await notificationService.archive(req.params.id, scope);
  sendResponse(res, httpStatus.OK, 'Notification archived', toNotificationDetailDTO(notification));
});

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   delete:
 *     summary: Delete (soft) a notification
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Notification deleted }
 *       409: { description: Already deleted }
 */
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const notification = await notificationService.remove(req.params.id, scope);
  sendResponse(res, httpStatus.OK, 'Notification deleted', toNotificationDetailDTO(notification));
});

export const notificationRoutes = require('express').Router();
notificationRoutes.get('/unread-count', authorize('notification.read'), getUnreadCount);
notificationRoutes.patch('/read-all', authorize('notification.read'), markAllRead);
notificationRoutes.get('/', authorize('notification.read'), validate(notificationQuerySchema), listNotifications);
notificationRoutes.get('/:id', authorize('notification.read'), validate(idParamSchema, 'params'), getNotification);
notificationRoutes.patch('/:id/read', authorize('notification.read'), validate(idParamSchema, 'params'), markRead);
notificationRoutes.patch('/:id/archive', authorize('notification.read'), validate(idParamSchema, 'params'), archiveNotification);
notificationRoutes.delete('/:id', authorize('notification.read'), validate(idParamSchema, 'params'), deleteNotification);
