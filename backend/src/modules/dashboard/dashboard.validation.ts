import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  months: z.string().optional(),
  limit: z.string().optional(),
});

export const analyticsQuerySchema = z.object({
  limit: z.string().optional(),
  months: z.string().optional(),
});

export const reportQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  departmentId: z.string().optional(),
  categoryId: z.string().optional(),
  employeeId: z.string().optional(),
  assetId: z.string().optional(),
  priority: z.string().optional(),
  condition: z.string().optional(),
  location: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const exportQuerySchema = z.object({
  reportType: z.enum(['assets', 'allocations', 'transfers', 'maintenance', 'audits', 'bookings']),
  format: z.enum(['csv', 'json']).optional(),
});
