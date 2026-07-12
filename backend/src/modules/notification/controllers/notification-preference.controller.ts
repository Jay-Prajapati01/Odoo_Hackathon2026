import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/async-handler';
import { sendResponse } from '../../../common/api-response';
import { httpStatus } from '../../../common/http-status';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { NotificationPreferenceRepository } from '../repositories/notification-preference.repository';
import { authorize } from '../../../middleware/rbac';
import { validate } from '../../../middleware/error-handler';
import {
  updatePreferenceSchema,
  userIdParamSchema,
} from '../validators/notification-preference.validator';
import { toPreferenceDTO } from '../dto/notification-preference.dto';

const preferenceService = new NotificationPreferenceService(new NotificationPreferenceRepository());

/**
 * @swagger
 * /api/v1/notifications/preferences:
 *   get:
 *     summary: Get own notification preferences
 *     tags: [Notification Preferences]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Notification preferences }
 *   patch:
 *     summary: Update own notification preferences
 *     tags: [Notification Preferences]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated preferences }
 */
export const getOwnPreferences = asyncHandler(async (req: Request, res: Response) => {
  const prefs = await preferenceService.getOwn(req.user!.userId);
  sendResponse(res, httpStatus.OK, 'Notification preferences retrieved', toPreferenceDTO(prefs));
});

export const updateOwnPreferences = asyncHandler(async (req: Request, res: Response) => {
  const prefs = await preferenceService.updateOwn(req.user!.userId, req.body);
  sendResponse(res, httpStatus.OK, 'Notification preferences updated', toPreferenceDTO(prefs));
});

/**
 * @swagger
 * /api/v1/notifications/preferences/{userId}:
 *   get:
 *     summary: Get notification preferences for a user (Admin/Manager)
 *     tags: [Notification Preferences]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Notification preferences }
 */
export const getPreferencesForUser = asyncHandler(async (req: Request, res: Response) => {
  const prefs = await preferenceService.getByUserId(req.params.userId);
  sendResponse(res, httpStatus.OK, 'User notification preferences retrieved', toPreferenceDTO(prefs));
});

export const updatePreferencesForUser = asyncHandler(async (req: Request, res: Response) => {
  const prefs = await preferenceService.updateByUserId(req.params.userId, req.body);
  sendResponse(res, httpStatus.OK, 'User notification preferences updated', toPreferenceDTO(prefs));
});

export const notificationPreferenceRoutes = require('express').Router();
notificationPreferenceRoutes.get('/preferences', authorize('notification.read'), getOwnPreferences);
notificationPreferenceRoutes.patch('/preferences', authorize('notification.read'), validate(updatePreferenceSchema), updateOwnPreferences);
notificationPreferenceRoutes.get(
  '/preferences/:userId',
  authorize('notification.manage'),
  validate(userIdParamSchema, 'params'),
  getPreferencesForUser
);
notificationPreferenceRoutes.patch(
  '/preferences/:userId',
  authorize('notification.manage'),
  validate(userIdParamSchema, 'params'),
  validate(updatePreferenceSchema),
  updatePreferencesForUser
);
