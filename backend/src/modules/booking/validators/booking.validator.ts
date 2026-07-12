import { z } from 'zod';

const objectId = z.string().min(1, 'Invalid identifier');

export const createBookingSchema = z.object({
  asset: objectId,
  employee: objectId.optional(),
  title: z.string().min(1).max(200),
  purpose: z.string().min(1).max(500),
  description: z.string().max(1000).optional(),
  startDateTime: z.string().datetime(),
  endDateTime: z.string().datetime(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  status: z.enum(['Draft', 'Upcoming']).optional(),
  remarks: z.string().max(1000).optional(),
});

export const updateBookingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  purpose: z.string().min(1).max(500).optional(),
  description: z.string().max(1000).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  remarks: z.string().max(1000).optional(),
});

export const rescheduleBookingSchema = z.object({
  startDateTime: z.string().datetime(),
  endDateTime: z.string().datetime(),
  remarks: z.string().max(1000).optional(),
});

export const cancelBookingSchema = z.object({
  cancelReason: z.string().min(1).max(500),
});

export const bookingQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  department: objectId.optional(),
  employee: objectId.optional(),
  asset: objectId.optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sort: z.enum(['newest', 'oldest', 'upcoming', 'completed', 'cancelled']).optional(),
});

export const calendarQuerySchema = z.object({
  view: z.enum(['day', 'week', 'month']).optional(),
  date: z.string().datetime().optional(),
  department: objectId.optional(),
  employee: objectId.optional(),
});

export const idParamSchema = z.object({ id: objectId });
