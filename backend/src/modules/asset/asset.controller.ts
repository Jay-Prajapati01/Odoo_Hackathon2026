import { Request, Response } from 'express';
import { asyncHandler } from '../../common/async-handler';
import { sendPaginatedResponse, sendResponse } from '../../common/api-response';
import { httpStatus } from '../../common/http-status';
import { NotFoundError } from '../../common/errors';
import { validate } from '../../middleware/error-handler';
import { authorizeAny } from '../../middleware/rbac';
import { AuditRepository } from '../audit/audit.repository';
import { AssetCategoryRepository } from '../organization/repositories/asset-category.repository';
import { DepartmentRepository } from '../organization/repositories/department.repository';
import { AssetHistoryRepository } from './asset-history.repository';
import { AssetRepository } from './asset.repository';
import { AssetService } from './asset.service';
import { uploadAssetDocuments, uploadAssetImage } from './asset.upload';
import {
  assetHistoryQuerySchema,
  assetIdParamSchema,
  assetQuerySchema,
  changeAssetStatusSchema,
  createAssetSchema,
  updateAssetSchema,
} from './asset.validation';

const service = new AssetService(
  new AssetRepository(),
  new AssetHistoryRepository(),
  new AssetCategoryRepository(),
  new DepartmentRepository(),
  new AuditRepository()
);

/**
 * @swagger
 * components:
 *   schemas:
 *     AssetLocation:
 *       type: object
 *       properties:
 *         building: { type: string }
 *         floor: { type: string }
 *         room: { type: string }
 *         shelf: { type: string }
 *         section: { type: string }
 *         label: { type: string }
 *     Asset:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         assetTag: { type: string, example: AF-000001 }
 *         name: { type: string }
 *         description: { type: string }
 *         category: { type: string }
 *         categoryName: { type: string }
 *         department: { type: string }
 *         departmentName: { type: string }
 *         serialNumber: { type: string }
 *         manufacturer: { type: string }
 *         model: { type: string }
 *         condition: { type: string }
 *         status: { type: string }
 *         purchaseDate: { type: string, format: date-time }
 *         purchaseCost: { type: number }
 *         currentValue: { type: number }
 *         supplier: { type: string }
 *         warrantyStart: { type: string, format: date-time }
 *         warrantyEnd: { type: string, format: date-time }
 *         sharedResource: { type: boolean }
 *         qrCode: { type: string }
 *         barcode: { type: string }
 *         assetImage: { type: string }
 *         location:
 *           $ref: '#/components/schemas/AssetLocation'
 *         specifications:
 *           type: object
 *           additionalProperties: true
 *         documents:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               path: { type: string }
 *               mimeType: { type: string }
 *               type: { type: string }
 *               uploadedAt: { type: string, format: date-time }
 *     AssetHistory:
 *       type: object
 *       properties:
 *         assetId: { type: string }
 *         assetTag: { type: string }
 *         action: { type: string }
 *         changes:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field: { type: string }
 *               oldValue: {}
 *               newValue: {}
 *         createdBy: { type: string }
 *         createdAt: { type: string, format: date-time }
 */

/**
 * @swagger
 * /assets:
 *   post:
 *     summary: Register a new asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Asset registered
 *   get:
 *     summary: List and search assets
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assets retrieved
 * /assets/{id}:
 *   get:
 *     summary: Get asset details
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Asset retrieved
 *   patch:
 *     summary: Update an asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Asset updated
 *   delete:
 *     summary: Soft delete an asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Asset deleted
 * /assets/{id}/status:
 *   patch:
 *     summary: Change asset lifecycle status
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Asset status changed
 * /assets/{id}/image:
 *   post:
 *     summary: Upload an asset image
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Asset image uploaded
 * /assets/{id}/documents:
 *   post:
 *     summary: Upload asset documents
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Asset documents uploaded
 * /assets/{id}/qr-code:
 *   post:
 *     summary: Regenerate asset QR code
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Asset QR code generated
 * /assets/{id}/barcode:
 *   post:
 *     summary: Regenerate asset barcode
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Asset barcode generated
 * /assets/{id}/history:
 *   get:
 *     summary: Get asset history
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Asset history retrieved
 */

export const createAsset = asyncHandler(async (req: Request, res: Response) => {
  const asset = await service.create(req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.CREATED, 'Asset registered', asset);
});

export const listAssets = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.list(req.query as Record<string, unknown>);
  sendPaginatedResponse(res, 'Assets retrieved', result.data, result.page, result.limit, result.total);
});

export const getAsset = asyncHandler(async (req: Request, res: Response) => {
  const asset = await service.getById(req.params.id);
  if (!asset) throw new NotFoundError('Asset not found');
  sendResponse(res, httpStatus.OK, 'Asset retrieved', asset);
});

export const updateAsset = asyncHandler(async (req: Request, res: Response) => {
  const asset = await service.update(req.params.id, req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Asset updated', asset);
});

export const changeAssetStatus = asyncHandler(async (req: Request, res: Response) => {
  const asset = await service.changeStatus(req.params.id, req.body.status, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Asset status changed', asset);
});

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new NotFoundError('Asset image file is required');
  const asset = await service.uploadImage(req.params.id, req.file, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Asset image uploaded', asset);
});

export const uploadDocuments = asyncHandler(async (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  if (files.length === 0) throw new NotFoundError('At least one document file is required');
  const asset = await service.uploadDocuments(req.params.id, files, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Asset documents uploaded', asset);
});

export const regenerateQrCode = asyncHandler(async (req: Request, res: Response) => {
  const asset = await service.regenerateQrCode(req.params.id, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Asset QR code generated', asset);
});

export const regenerateBarcode = asyncHandler(async (req: Request, res: Response) => {
  const asset = await service.regenerateBarcode(req.params.id, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Asset barcode generated', asset);
});

export const deleteAsset = asyncHandler(async (req: Request, res: Response) => {
  await service.remove(req.params.id, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Asset deleted');
});

export const getAssetHistory = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getHistory(req.params.id, req.query as Record<string, unknown>);
  sendPaginatedResponse(res, 'Asset history retrieved', result.data, result.page, result.limit, result.total);
});

export const assetRoutes = require('express').Router();
assetRoutes.post('/', authorizeAny('asset.create', 'asset.manage'), validate(createAssetSchema), createAsset);
assetRoutes.get('/', authorizeAny('asset.read', 'read', 'asset.manage'), validate(assetQuerySchema, 'query'), listAssets);
assetRoutes.get('/:id', authorizeAny('asset.read', 'read', 'asset.manage'), validate(assetIdParamSchema, 'params'), getAsset);
assetRoutes.patch('/:id', authorizeAny('asset.update', 'asset.manage'), validate(assetIdParamSchema, 'params'), validate(updateAssetSchema), updateAsset);
assetRoutes.patch(
  '/:id/status',
  authorizeAny('asset.update', 'asset.manage'),
  validate(assetIdParamSchema, 'params'),
  validate(changeAssetStatusSchema),
  changeAssetStatus
);
assetRoutes.post(
  '/:id/image',
  authorizeAny('asset.update', 'asset.manage'),
  validate(assetIdParamSchema, 'params'),
  uploadAssetImage,
  uploadImage
);
assetRoutes.post(
  '/:id/documents',
  authorizeAny('asset.update', 'asset.manage'),
  validate(assetIdParamSchema, 'params'),
  uploadAssetDocuments,
  uploadDocuments
);
assetRoutes.post('/:id/qr-code', authorizeAny('asset.update', 'asset.manage'), validate(assetIdParamSchema, 'params'), regenerateQrCode);
assetRoutes.post('/:id/barcode', authorizeAny('asset.update', 'asset.manage'), validate(assetIdParamSchema, 'params'), regenerateBarcode);
assetRoutes.get(
  '/:id/history',
  authorizeAny('asset.read', 'read', 'asset.manage'),
  validate(assetIdParamSchema, 'params'),
  validate(assetHistoryQuerySchema, 'query'),
  getAssetHistory
);
assetRoutes.delete('/:id', authorizeAny('asset.delete', 'asset.manage'), validate(assetIdParamSchema, 'params'), deleteAsset);
