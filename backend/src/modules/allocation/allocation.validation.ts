import { z } from 'zod';

const ALLOCATION_STATUSES = ['pending', 'allocated', 'returned', 'overdue', 'cancelled', 'transferred'] as const;
const ALLOCATION_CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'damaged', 'lost'] as const;

export const createAllocationSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  departmentId: z.string().min(1, 'Department ID is required'),
  expectedReturnDate: z.string().datetime().optional(),
  purpose: z.string().max(500).optional(),
  conditionAtAllocation: z.enum(ALLOCATION_CONDITIONS).optional(),
  remarks: z.string().max(500).optional(),
});

export const updateAllocationSchema = z.object({
  expectedReturnDate: z.string().datetime().optional(),
  purpose: z.string().max(500).optional(),
  conditionAtAllocation: z.enum(ALLOCATION_CONDITIONS).optional(),
  remarks: z.string().max(500).optional(),
});

export const cancelAllocationSchema = z.object({
  remarks: z.string().max(500).optional(),
});

export const returnAllocationSchema = z.object({
  conditionAtReturn: z.enum(ALLOCATION_CONDITIONS, { required_error: 'Condition at return is required' }),
  damageNotes: z.string().max(1000).optional(),
  photos: z.array(z.string()).optional(),
  remarks: z.string().max(500).optional(),
});

export const allocationQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(ALLOCATION_STATUSES).optional(),
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  assetId: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'allocationDate', 'expectedReturn']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  allocationDateFrom: z.string().datetime().optional(),
  allocationDateTo: z.string().datetime().optional(),
  expectedReturnFrom: z.string().datetime().optional(),
  expectedReturnTo: z.string().datetime().optional(),
});
