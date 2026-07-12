import { Request, Response } from 'express';
import { asyncHandler } from '../../common/async-handler';
import { sendPaginatedResponse, sendResponse } from '../../common/api-response';
import { httpStatus } from '../../common/http-status';
import { authorizeAny } from '../../middleware/rbac';
import { validate } from '../../middleware/error-handler';
import { UserRepository } from '../auth/repositories/user.repository';
import { AssetRepository } from '../asset/asset.repository';
import { EmployeeRepository } from '../organization/repositories/employee.repository';
import { DepartmentRepository } from '../organization/repositories/department.repository';
import { AuditAssignmentRepository } from './audit-assignment.repository';
import { AuditDiscrepancyRepository } from './audit-discrepancy.repository';
import { AuditHistoryRepository } from './audit-history.repository';
import { AuditItemRepository } from './audit-item.repository';
import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';
import { uploadAuditAttachments } from './audit.upload';
import {
  assignmentIdParamSchema,
  assignAuditorSchema,
  auditIdParamSchema,
  auditQuerySchema,
  closeAuditCycleSchema,
  createAuditCycleSchema,
  discrepancyIdParamSchema,
  itemIdParamSchema,
  resolveDiscrepancySchema,
  respondAssignmentSchema,
  verifyAuditItemSchema,
} from './audit.validation';

const service = new AuditService(
  new AuditRepository(),
  new AuditAssignmentRepository(),
  new AuditItemRepository(),
  new AuditDiscrepancyRepository(),
  new AuditHistoryRepository(),
  new AssetRepository(),
  new UserRepository(),
  new EmployeeRepository(),
  new DepartmentRepository()
);

/**
 * @swagger
 * /audits:
 *   post:
 *     summary: Create an audit cycle
 *     tags: [Audits]
 *   get:
 *     summary: List audit cycles
 *     tags: [Audits]
 * /audits/{id}:
 *   get:
 *     summary: Get audit details
 *     tags: [Audits]
 * /audits/{id}/assignments:
 *   post:
 *     summary: Assign an auditor
 *     tags: [Audits]
 * /audits/{id}/assignments/{assignmentId}/respond:
 *   patch:
 *     summary: Accept or reject an audit assignment
 *     tags: [Audits]
 * /audits/{id}/start:
 *   patch:
 *     summary: Start an audit cycle
 *     tags: [Audits]
 * /audits/{id}/items/{itemId}/verify:
 *   patch:
 *     summary: Verify an asset within an audit
 *     tags: [Audits]
 * /audits/discrepancies/{discrepancyId}/resolve:
 *   patch:
 *     summary: Resolve an audit discrepancy
 *     tags: [Audits]
 * /audits/{id}/close:
 *   patch:
 *     summary: Close an audit cycle
 *     tags: [Audits]
 * /audits/{id}/history:
 *   get:
 *     summary: Get audit history
 *     tags: [Audits]
 * /audits/{id}/discrepancies:
 *   get:
 *     summary: List discrepancies for an audit cycle
 *     tags: [Audits]
 */

export const createAuditCycle = asyncHandler(async (req: Request, res: Response) => {
  const audit = await service.createCycle(req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.CREATED, 'Audit cycle created', audit);
});

export const assignAuditor = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await service.assignAuditor(req.params.id, req.body.auditorId, req.user!.userId, req);
  sendResponse(res, httpStatus.CREATED, 'Auditor assigned', assignment);
});

export const respondToAssignment = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await service.respondToAssignment(req.params.id, req.params.assignmentId, req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Assignment updated', assignment);
});

export const startAuditCycle = asyncHandler(async (req: Request, res: Response) => {
  const audit = await service.startAudit(req.params.id, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Audit started', audit);
});

export const verifyAuditItem = asyncHandler(async (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  const item = await service.verifyAsset(req.params.id, req.params.itemId, req.body, req.user!.userId, files, req);
  sendResponse(res, httpStatus.OK, 'Audit item verified', item);
});

export const resolveDiscrepancy = asyncHandler(async (req: Request, res: Response) => {
  const discrepancy = await service.resolveDiscrepancy(req.params.discrepancyId, req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Discrepancy updated', discrepancy);
});

export const closeAuditCycle = asyncHandler(async (req: Request, res: Response) => {
  const audit = await service.closeAudit(req.params.id, req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Audit closed', audit);
});

export const listAudits = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.list(req.query as Record<string, unknown>, req.user);
  sendPaginatedResponse(res, 'Audits retrieved', result.data, result.page, result.limit, result.total);
});

export const getAudit = asyncHandler(async (req: Request, res: Response) => {
  const audit = await service.getById(req.params.id, req.user);
  sendResponse(res, httpStatus.OK, 'Audit retrieved', audit);
});

export const getAuditHistory = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getHistory(req.params.id, req.query as Record<string, unknown>, req.user);
  sendPaginatedResponse(res, 'Audit history retrieved', result.data, result.page, result.limit, result.total);
});

export const getAuditDiscrepancies = asyncHandler(async (req: Request, res: Response) => {
  const discrepancies = await service.getDiscrepancies(req.params.id, req.user);
  sendResponse(res, httpStatus.OK, 'Audit discrepancies retrieved', discrepancies);
});

export const auditRoutes = require('express').Router();
auditRoutes.post('/', authorizeAny('audit.manage', 'audit'), validate(createAuditCycleSchema), createAuditCycle);
auditRoutes.get('/', authorizeAny('audit.read', 'read', 'audit.manage', 'audit'), validate(auditQuerySchema, 'query'), listAudits);
auditRoutes.get('/:id', authorizeAny('audit.read', 'read', 'audit.manage', 'audit'), validate(auditIdParamSchema, 'params'), getAudit);
auditRoutes.post('/:id/assignments', authorizeAny('audit.manage', 'audit'), validate(auditIdParamSchema, 'params'), validate(assignAuditorSchema), assignAuditor);
auditRoutes.patch(
  '/:id/assignments/:assignmentId/respond',
  authorizeAny('audit.read', 'audit.manage', 'audit'),
  validate(assignmentIdParamSchema, 'params'),
  validate(respondAssignmentSchema),
  respondToAssignment
);
auditRoutes.patch('/:id/start', authorizeAny('audit.manage', 'audit'), validate(auditIdParamSchema, 'params'), startAuditCycle);
auditRoutes.patch(
  '/:id/items/:itemId/verify',
  authorizeAny('audit.read', 'audit.manage', 'audit'),
  validate(itemIdParamSchema, 'params'),
  uploadAuditAttachments,
  validate(verifyAuditItemSchema),
  verifyAuditItem
);
auditRoutes.patch(
  '/discrepancies/:discrepancyId/resolve',
  authorizeAny('audit.manage', 'audit'),
  validate(discrepancyIdParamSchema, 'params'),
  validate(resolveDiscrepancySchema),
  resolveDiscrepancy
);
auditRoutes.patch('/:id/close', authorizeAny('audit.manage', 'audit'), validate(auditIdParamSchema, 'params'), validate(closeAuditCycleSchema), closeAuditCycle);
auditRoutes.get('/:id/history', authorizeAny('audit.read', 'read', 'audit.manage', 'audit'), validate(auditIdParamSchema, 'params'), getAuditHistory);
auditRoutes.get('/:id/discrepancies', authorizeAny('audit.read', 'read', 'audit.manage', 'audit'), validate(auditIdParamSchema, 'params'), getAuditDiscrepancies);
