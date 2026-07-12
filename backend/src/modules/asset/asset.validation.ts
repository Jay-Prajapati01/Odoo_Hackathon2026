import { z } from 'zod';

const canonicalStatusMap = {
  available: 'available',
  allocated: 'allocated',
  reserved: 'reserved',
  maintenance: 'maintenance',
  'under maintenance': 'maintenance',
  lost: 'lost',
  retired: 'retired',
  disposed: 'disposed',
} as const;

const canonicalConditionMap = {
  new: 'new',
  excellent: 'excellent',
  good: 'good',
  fair: 'fair',
  poor: 'poor',
  damaged: 'damaged',
} as const;

const normalizeStringEnum = <T extends Record<string, string>>(value: string, map: T): T[keyof T] => {
  const normalized = value.trim().toLowerCase();
  const mapped = map[normalized as keyof T];
  if (!mapped) throw new Error('invalid enum');
  return mapped;
};

const statusSchema = z.string().transform((value, ctx) => {
  try {
    return normalizeStringEnum(value, canonicalStatusMap);
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Invalid asset status' });
    return z.NEVER;
  }
});

const conditionSchema = z.string().transform((value, ctx) => {
  try {
    return normalizeStringEnum(value, canonicalConditionMap);
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Invalid asset condition' });
    return z.NEVER;
  }
});

const dateSchema = z.coerce.date();

const locationSchema = z
  .object({
    building: z.string().trim().min(1).max(100).optional(),
    floor: z.string().trim().min(1).max(100).optional(),
    room: z.string().trim().min(1).max(100).optional(),
    shelf: z.string().trim().min(1).max(100).optional(),
    section: z.string().trim().min(1).max(100).optional(),
    label: z.string().trim().min(1).max(200).optional(),
  })
  .strict()
  .optional();

const specificationsSchema = z.record(
  z.string().trim().min(1).max(100),
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string()), z.array(z.number())])
);

const createAssetObject = z
  .object({
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().max(2000).optional(),
    categoryId: z.string().trim().min(1),
    departmentId: z.string().trim().min(1).optional(),
    serialNumber: z.string().trim().min(1).max(120).optional(),
    manufacturer: z.string().trim().max(120).optional(),
    assetModel: z.string().trim().max(120).optional(),
    supplier: z.string().trim().max(120).optional(),
    condition: conditionSchema.optional(),
    status: statusSchema.optional(),
    purchaseDate: dateSchema.optional(),
    purchaseCost: z.coerce.number().min(0),
    currentValue: z.coerce.number().min(0).optional(),
    warrantyStart: dateSchema.optional(),
    warrantyEnd: dateSchema.optional(),
    sharedResource: z.coerce.boolean().optional(),
    location: locationSchema,
    specifications: specificationsSchema.optional(),
  });

const assetCreateRefine = (data: any, ctx: z.RefinementCtx) => {
    if (data.currentValue !== undefined && data.currentValue > data.purchaseCost) {
      ctx.addIssue({
        code: 'custom',
        path: ['currentValue'],
        message: 'Current value cannot exceed purchase cost at registration',
      });
    }
    if (data.warrantyStart && data.warrantyEnd && data.warrantyEnd < data.warrantyStart) {
      ctx.addIssue({
        code: 'custom',
        path: ['warrantyEnd'],
        message: 'Warranty end must be after warranty start',
      });
    }
  };

export const createAssetSchema = createAssetObject.superRefine(assetCreateRefine);

export const updateAssetSchema = createAssetObject
  .partial()
  .extend({
    purchaseCost: z.coerce.number().min(0).optional(),
    specifications: specificationsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.warrantyStart && data.warrantyEnd && data.warrantyEnd < data.warrantyStart) {
      ctx.addIssue({
        code: 'custom',
        path: ['warrantyEnd'],
        message: 'Warranty end must be after warranty start',
      });
    }
  });

export const changeAssetStatusSchema = z.object({
  status: statusSchema,
});

export const assetQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  status: statusSchema.optional(),
  categoryId: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  condition: conditionSchema.optional(),
  manufacturer: z.string().trim().optional(),
  location: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  assetTag: z.string().trim().optional(),
  qrCode: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  sharedResource: z.coerce.boolean().optional(),
  purchaseDateFrom: dateSchema.optional(),
  purchaseDateTo: dateSchema.optional(),
  warrantyExpiringBefore: dateSchema.optional(),
  sortBy: z
    .enum(['newest', 'oldest', 'alphabetical', 'purchaseCost', 'warrantyExpiry', 'currentValue'])
    .optional(),
});

export const assetIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const assetHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
