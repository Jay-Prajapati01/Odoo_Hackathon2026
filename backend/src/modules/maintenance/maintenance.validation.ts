import { z } from 'zod';

const MAINTENANCE_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'technician_assigned',
  'in_progress',
  'resolved',
  'cancelled',
] as const;

const MAINTENANCE_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

export const createMaintenanceSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  departmentId: z.string().min(1, 'Department ID is required'),
  issueTitle: z.string().min(1, 'Issue title is required').max(200),
  issueDescription: z.string().min(1, 'Issue description is required').max(2000),
  priority: z.enum(MAINTENANCE_PRIORITIES).optional(),
  estimatedCost: z.number().min(0).optional(),
  estimatedDuration: z.string().max(100).optional(),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1),
        path: z.string().min(1),
        mimeType: z.string().min(1),
        size: z.number().min(0),
      })
    )
    .optional(),
});

export const approveMaintenanceSchema = z.object({
  estimatedCost: z.number().min(0).optional(),
  estimatedDuration: z.string().max(100).optional(),
  remarks: z.string().max(500).optional(),
});

export const rejectMaintenanceSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required').max(500),
});

export const assignTechnicianSchema = z.object({
  technicianId: z.string().min(1, 'Technician ID is required'),
  estimatedDuration: z.string().max(100).optional(),
  estimatedCompletion: z.string().datetime().optional(),
  remarks: z.string().max(500).optional(),
});

export const startRepairSchema = z.object({
  notes: z.string().max(1000).optional(),
});

export const completeRepairSchema = z.object({
  resolutionSummary: z.string().min(1, 'Resolution summary is required').max(2000),
  actualCost: z.number().min(0).optional(),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1),
        path: z.string().min(1),
        mimeType: z.string().min(1),
        size: z.number().min(0),
      })
    )
    .optional(),
});

export const cancelMaintenanceSchema = z.object({
  remarks: z.string().max(500).optional(),
});

export const maintenanceQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(MAINTENANCE_STATUSES).optional(),
  priority: z.enum(MAINTENANCE_PRIORITIES).optional(),
  assetId: z.string().optional(),
  departmentId: z.string().optional(),
  requestedById: z.string().optional(),
  assignedTechnicianId: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'priority', 'completionDate', 'estimatedCost', 'requestedDate']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  requestedDateFrom: z.string().datetime().optional(),
  requestedDateTo: z.string().datetime().optional(),
  completionDateFrom: z.string().datetime().optional(),
  completionDateTo: z.string().datetime().optional(),
});
