import { z } from 'zod';
import { AUDIT_OPERATIONS } from '../models/audit-trail.model';

const objectId = z.string().min(1, 'Invalid identifier');

export const auditTrailQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  entity: z.string().trim().optional(),
  entityId: objectId.optional(),
  operation: z.enum(AUDIT_OPERATIONS).optional(),
  performedBy: objectId.optional(),
  module: z.string().trim().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sort: z.enum(['newest', 'oldest']).optional(),
});

export const idParamSchema = z.object({ id: objectId });
