import { SettingsRepository } from './settings.repository';
import { Request, Response } from 'express';
import { asyncHandler } from '../../common/async-handler';
import { sendResponse } from '../../common/api-response';
import { authorize } from '../../middleware/rbac';

export class SettingsService {
  constructor(private readonly repo: SettingsRepository) {}
  get(key: string) {
    return this.repo.get(key);
  }
  list(group?: string) {
    return this.repo.list(group);
  }
  upsert(key: string, value: unknown, group: string, description?: string) {
    return this.repo.upsert(key, value, group, description);
  }
}

const service = new SettingsService(new SettingsRepository());

export const listSettings = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.list(req.query.group as string | undefined);
  sendResponse(res, 200, 'Settings retrieved', data);
});
export const getSetting = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.get(req.params.key);
  sendResponse(res, 200, 'Setting retrieved', data);
});
export const upsertSetting = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.upsert(req.params.key, req.body.value, req.body.group ?? 'general', req.body.description);
  sendResponse(res, 200, 'Setting saved', data);
});

export const settingsRoutes = require('express').Router();
settingsRoutes.get('/', authorize('read'), listSettings);
settingsRoutes.get('/:key', authorize('read'), getSetting);
settingsRoutes.put('/:key', authorize('settings.manage'), upsertSetting);
