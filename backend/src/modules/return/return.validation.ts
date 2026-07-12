import { z } from 'zod';

const RETURN_CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'damaged', 'lost'] as const;

export const requestReturnSchema = z.object({
  allocationId: z.string().min(1, 'Allocation ID is required'),
  condition: z.enum(RETURN_CONDITIONS, { required_error: 'Condition is required' }),
  damageNotes: z.string().max(1000).optional(),
  photos: z.array(z.string()).optional(),
  remarks: z.string().max(500).optional(),
});

export const returnQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  condition: z.enum(RETURN_CONDITIONS).optional(),
  allocationId: z.string().optional(),
  assetId: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  returnDateFrom: z.string().datetime().optional(),
  returnDateTo: z.string().datetime().optional(),
});
