import { z } from 'zod';

const objectId = z.string().min(1, 'Invalid identifier');

export const activityLogQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  module: z.string().trim().optional(),
  entityType: z.string().trim().optional(),
  entityId: objectId.optional(),
  user: objectId.optional(),
  action: z.string().trim().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sort: z.enum(['newest', 'oldest']).optional(),
});

export const idParamSchema = z.object({ id: objectId });
