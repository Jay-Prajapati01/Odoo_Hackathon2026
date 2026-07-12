import { z } from 'zod';

const dateSchema = z.coerce.date();

const locationSchema = z
  .object({
    building: z.string().trim().min(1).max(100).optional(),
    floor: z.string().trim().min(1).max(100).optional(),
    room: z.string().trim().min(1).max(100).optional(),
    shelf: z.string().trim().min(1).max(100).optional(),
    section: z.string().trim().min(1).max(100).optional(),
    label: z.string().trim().min(1).max(150).optional(),
  })
  .strict();

const auditScopeSchema = z
  .object({
    type: z.enum(['department', 'location', 'organization']),
    departmentId: z.string().trim().optional(),
    location: locationSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'department' && !value.departmentId) {
      ctx.addIssue({ code: 'custom', path: ['departmentId'], message: 'Department scope requires departmentId' });
    }
    if (value.type === 'location' && !value.location) {
      ctx.addIssue({ code: 'custom', path: ['location'], message: 'Location scope requires location details' });
    }
  });

export const createAuditCycleSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    scope: auditScopeSchema,
    startDate: dateSchema,
    endDate: dateSchema,
    remarks: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be after start date' });
    }
  });

export const assignAuditorSchema = z.object({
  auditorId: z.string().trim().min(1),
});

export const respondAssignmentSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
  remarks: z.string().trim().max(1000).optional(),
});

export const verifyAuditItemSchema = z.object({
  verificationStatus: z.enum(['verified', 'missing', 'damaged', 'not_found']),
  condition: z.enum(['new', 'excellent', 'good', 'fair', 'poor', 'damaged']).optional(),
  locationVerified: z.coerce.boolean().optional(),
  remarks: z.string().trim().max(2000).optional(),
});

export const resolveDiscrepancySchema = z.object({
  status: z.enum(['in_review', 'resolved', 'closed']),
  recommendedAction: z.string().trim().max(1000).optional(),
  resolutionRemarks: z.string().trim().max(2000).optional(),
  confirmMissingAsLost: z.boolean().optional(),
});

export const closeAuditCycleSchema = z.object({
  remarks: z.string().trim().max(2000).optional(),
});

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['draft', 'scheduled', 'active', 'completed', 'cancelled', 'in_progress']).optional(),
  department: z.string().trim().optional(),
  auditor: z.string().trim().optional(),
  verificationStatus: z.enum(['pending', 'verified', 'missing', 'damaged', 'not_found']).optional(),
  search: z.string().trim().optional(),
  startDateFrom: dateSchema.optional(),
  startDateTo: dateSchema.optional(),
  sortBy: z.enum(['newest', 'oldest', 'startDate', 'completionDate']).optional(),
});

export const auditIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const assignmentIdParamSchema = z.object({
  id: z.string().trim().min(1),
  assignmentId: z.string().trim().min(1),
});

export const itemIdParamSchema = z.object({
  id: z.string().trim().min(1),
  itemId: z.string().trim().min(1),
});

export const discrepancyIdParamSchema = z.object({
  discrepancyId: z.string().trim().min(1),
});
