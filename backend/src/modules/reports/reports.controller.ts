import { Request, Response } from 'express';
import { asyncHandler } from '../../common/async-handler';
import { sendResponse } from '../../common/api-response';
import { authorize } from '../../middleware/rbac';

export const reportsRoutes = require('express').Router();

reportsRoutes.get('/assets', authorize('report.view'), asyncHandler(async (_req: Request, res: Response) => {
  sendResponse(res, 200, 'Use /dashboard/reports/assets for full asset report');
}));

reportsRoutes.get('/allocations', authorize('report.view'), asyncHandler(async (_req: Request, res: Response) => {
  sendResponse(res, 200, 'Use /dashboard/reports/allocations for full allocation report');
}));

reportsRoutes.get('/transfers', authorize('report.view'), asyncHandler(async (_req: Request, res: Response) => {
  sendResponse(res, 200, 'Use /dashboard/reports/transfers for full transfer report');
}));

reportsRoutes.get('/audits', authorize('report.view'), asyncHandler(async (_req: Request, res: Response) => {
  sendResponse(res, 200, 'Use /dashboard/reports/audits for full audit report');
}));
