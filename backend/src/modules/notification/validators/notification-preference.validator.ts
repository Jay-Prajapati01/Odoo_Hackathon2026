import { z } from 'zod';

const objectId = z.string().min(1, 'Invalid identifier');

export const updatePreferenceSchema = z.object({
  email: z.boolean().optional(),
  inApp: z.boolean().optional(),
  reminder: z.boolean().optional(),
  maintenanceAlerts: z.boolean().optional(),
  bookingAlerts: z.boolean().optional(),
  auditAlerts: z.boolean().optional(),
  transferAlerts: z.boolean().optional(),
});

export const userIdParamSchema = z.object({ userId: objectId });
