import { z } from 'zod';

const objectId = z.string().min(1, 'Invalid identifier');

export const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  code: z.string().min(2, 'Code must be at least 2 characters').max(20),
  description: z.string().max(500).optional(),
  departmentHead: objectId.optional(),
  parentDepartment: objectId.optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const createAssetCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  code: z.string().min(2, 'Code must be at least 2 characters').max(20),
  description: z.string().max(500).optional(),
  categoryType: z.string().max(50).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  customFields: z
    .array(
      z.object({
        key: z.string().min(1).max(50),
        label: z.string().min(1).max(100),
        type: z.enum(['text', 'number', 'date', 'boolean', 'select']),
        required: z.boolean().optional(),
        options: z.array(z.string()).optional(),
      })
    )
    .max(30)
    .optional(),
});

export const updateAssetCategorySchema = createAssetCategorySchema.partial();

export const createEmployeeSchema = z.object({
  userId: objectId,
  employeeCode: z.string().min(2).max(20),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  departmentId: objectId.optional(),
  designation: z.string().min(1).max(100),
  role: objectId.optional(),
  reportingManager: objectId.optional(),
  joiningDate: z.string().datetime().optional(),
  employmentStatus: z.enum(['active', 'inactive', 'on_leave', 'terminated']).optional(),
  profilePhoto: z.string().url().optional().or(z.literal('')),
  address: z
    .object({
      street: z.string().max(200).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      postalCode: z.string().max(20).optional(),
      country: z.string().max(100).optional(),
    })
    .optional(),
  emergencyContact: z
    .object({
      name: z.string().max(100).optional(),
      phone: z.string().max(20).optional(),
      relationship: z.string().max(50).optional(),
    })
    .optional(),
  notes: z.string().max(1000).optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().omit({ userId: true });

export const assignRoleSchema = z.object({
  roleId: objectId,
});

export const changeDepartmentSchema = z.object({
  departmentId: objectId,
});

export const departmentQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  parentDepartment: objectId.optional(),
  sort: z.string().optional(),
});

export const assetCategoryQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  sort: z.string().optional(),
});

export const employeeQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  departmentId: objectId.optional(),
  employmentStatus: z.enum(['active', 'inactive', 'on_leave', 'terminated']).optional(),
  sort: z.string().optional(),
});

export const idParamSchema = z.object({ id: objectId });
