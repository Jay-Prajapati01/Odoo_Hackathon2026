import { z } from 'zod';
import { PERMISSIONS } from '../permissions';

export const createRoleSchema = z.object({
  roleName: z.string().min(2).max(50),
  description: z.string().max(300).optional(),
  permissions: z.array(z.enum(Object.values(PERMISSIONS) as [string, ...string[]])),
  status: z.enum(['active', 'inactive']).optional(),
  systemRole: z.boolean().optional(),
});

export const updateRoleSchema = createRoleSchema.partial();

export const roleQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  search: z.string().optional(),
});
