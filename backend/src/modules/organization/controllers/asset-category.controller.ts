import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/async-handler';
import { sendResponse, sendPaginatedResponse } from '../../../common/api-response';
import { httpStatus } from '../../../common/http-status';
import { AssetCategoryRepository } from '../repositories/asset-category.repository';
import { AssetCategoryService } from '../services/asset-category.service';
import { authorize } from '../../../middleware/rbac';
import { validate } from '../../../middleware/error-handler';
import {
  createAssetCategorySchema,
  updateAssetCategorySchema,
  assetCategoryQuerySchema,
  idParamSchema,
} from '../validators/organization.validator';
import { toAssetCategoryDTO } from '../dto/organization.dto';

const assetCategoryService = new AssetCategoryService(new AssetCategoryRepository());

/**
 * @swagger
 * /api/v1/asset-categories:
 *   post:
 *     summary: Create an asset category (Admin/Asset Manager)
 *     tags: [Asset Categories]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code]
 *             properties:
 *               name: { type: string }
 *               code: { type: string }
 *               description: { type: string }
 *               categoryType: { type: string }
 *               status: { type: string, enum: [active, inactive] }
 *               customFields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     key: { type: string }
 *                     label: { type: string }
 *                     type: { type: string, enum: [text, number, date, boolean, select] }
 *                     required: { type: boolean }
 *                     options: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Asset category created }
 *       409: { description: Name or code already exists }
 */
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await assetCategoryService.create(req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.CREATED, 'Asset category created', toAssetCategoryDTO(category));
});

/**
 * @swagger
 * /api/v1/asset-categories:
 *   get:
 *     summary: List asset categories
 *     tags: [Asset Categories]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [active, inactive] } }
 *     responses:
 *       200: { description: Paginated categories }
 */
export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const result = await assetCategoryService.list(req.query as Record<string, unknown>);
  sendPaginatedResponse(res, 'Asset categories retrieved', result.data.map(toAssetCategoryDTO), result.page, result.limit, result.total);
});

/**
 * @swagger
 * /api/v1/asset-categories/{id}:
 *   get:
 *     summary: Get an asset category by id
 *     tags: [Asset Categories]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Asset category }
 *       404: { description: Not found }
 */
export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await assetCategoryService.getById(req.params.id);
  sendResponse(res, httpStatus.OK, 'Asset category retrieved', toAssetCategoryDTO(category));
});

/**
 * @swagger
 * /api/v1/asset-categories/{id}:
 *   patch:
 *     summary: Update an asset category (Admin/Asset Manager)
 *     tags: [Asset Categories]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Asset category updated }
 */
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const updated = await assetCategoryService.update(req.params.id, req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Asset category updated', toAssetCategoryDTO(updated));
});

export const deactivateCategory = asyncHandler(async (req: Request, res: Response) => {
  const updated = await assetCategoryService.deactivate(req.params.id, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Asset category deactivated', toAssetCategoryDTO(updated));
});

export const activateCategory = asyncHandler(async (req: Request, res: Response) => {
  const updated = await assetCategoryService.activate(req.params.id, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Asset category activated', toAssetCategoryDTO(updated));
});

/**
 * @swagger
 * /api/v1/asset-categories/{id}:
 *   delete:
 *     summary: Soft-delete an asset category (Admin/Asset Manager)
 *     tags: [Asset Categories]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Asset category deleted }
 */
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  await assetCategoryService.remove(req.params.id, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Asset category deleted');
});

export const assetCategoryRoutes = require('express').Router();
assetCategoryRoutes.post('/', authorize('asset.manage'), validate(createAssetCategorySchema), createCategory);
assetCategoryRoutes.get('/', authorize('read'), validate(assetCategoryQuerySchema), listCategories);
assetCategoryRoutes.get('/:id', authorize('read'), validate(idParamSchema, 'params'), getCategory);
assetCategoryRoutes.patch('/:id', authorize('asset.manage'), validate(updateAssetCategorySchema), updateCategory);
assetCategoryRoutes.post('/:id/deactivate', authorize('asset.manage'), deactivateCategory);
assetCategoryRoutes.post('/:id/activate', authorize('asset.manage'), activateCategory);
assetCategoryRoutes.delete('/:id', authorize('asset.manage'), deleteCategory);
