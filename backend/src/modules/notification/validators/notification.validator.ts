import { z } from 'zod';
import { NOTIFICATION_STATUSES, NOTIFICATION_PRIORITIES } from '../models/notification.model';

const objectId = z.string().min(1, 'Invalid identifier');

export const notificationQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  type: z.string().trim().min(1).max(50).optional(),
  status: z.enum(NOTIFICATION_STATUSES).optional(),
  priority: z.enum(NOTIFICATION_PRIORITIES).optional(),
  module: z.string().trim().optional(),
  user: objectId.optional(),
  entity: objectId.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sort: z.enum(['newest', 'oldest', 'priority', 'unread']).optional(),
});

export const idParamSchema = z.object({ id: objectId });
