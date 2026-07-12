import { z } from 'zod';

const TRANSFER_STATUSES = ['requested', 'approved', 'rejected', 'completed', 'cancelled'] as const;

export const requestTransferSchema = z.object({
  allocationId: z.string().min(1, 'Allocation ID is required'),
  requestedHolderId: z.string().min(1, 'Requested holder ID is required'),
  requestReason: z.string().min(1, 'Reason is required').max(500),
});

export const approveTransferSchema = z.object({
  remarks: z.string().max(500).optional(),
});

export const rejectTransferSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required').max(500),
});

export const cancelTransferSchema = z.object({
  remarks: z.string().max(500).optional(),
});

export const transferQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(TRANSFER_STATUSES).optional(),
  assetId: z.string().optional(),
  currentHolderId: z.string().optional(),
  requestedHolderId: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'requestedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
