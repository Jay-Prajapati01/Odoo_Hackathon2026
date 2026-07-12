import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/async-handler';
import { sendResponse, sendPaginatedResponse } from '../../../common/api-response';
import { httpStatus } from '../../../common/http-status';
import { AuditTrailService } from '../services/audit-trail.service';
import { AuditTrailRepository } from '../repositories/audit-trail.repository';
import { authorize } from '../../../middleware/rbac';
import { validate } from '../../../middleware/error-handler';
import { auditTrailQuerySchema, idParamSchema } from '../validators/audit-trail.validator';
import { toAuditTrailDTO, toAuditTrailDetailDTO } from '../dto/audit-trail.dto';
import { buildScope } from '../../../shared/scope';

const auditTrailService = new AuditTrailService(new AuditTrailRepository());

/**
 * @swagger
 * /api/v1/audit-trail:
 *   get:
 *     summary: List audit trail entries (search, filter, sort, paginate, RBAC scoped)
 *     tags: [Audit Trail]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: entity, schema: { type: string } }
 *       - { in: query, name: entityId, schema: { type: string } }
 *       - { in: query, name: operation, schema: { type: string, enum: [create, update, delete, approve, reject, status_change, login, logout, password_change, export, download, assign] } }
 *       - { in: query, name: performedBy, schema: { type: string } }
 *       - { in: query, name: module, schema: { type: string } }
 *       - { in: query, name: dateFrom, schema: { type: string, format: date-time } }
 *       - { in: query, name: dateTo, schema: { type: string, format: date-time } }
 *       - { in: query, name: sort, schema: { type: string, enum: [newest, oldest] } }
 *     responses:
 *       200: { description: Paginated audit trail }
 */
export const listAuditTrail = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const result = await auditTrailService.list(req.query as Record<string, unknown>, scope);
  sendPaginatedResponse(
    res,
    'Audit trail retrieved',
    result.data.map(toAuditTrailDTO),
    result.page,
    result.limit,
    result.total
  );
});

/**
 * @swagger
 * /api/v1/audit-trail/{id}:
 *   get:
 *     summary: Get an audit trail entry by id (RBAC scoped)
 *     tags: [Audit Trail]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Audit trail entry }
 *       404: { description: Not found }
 */
export const getAuditTrail = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const entry = await auditTrailService.getById(req.params.id, scope);
  sendResponse(res, httpStatus.OK, 'Audit trail entry retrieved', toAuditTrailDetailDTO(entry));
});

export const auditTrailRoutes = require('express').Router();
auditTrailRoutes.get('/', authorize('audit_trail.read'), validate(auditTrailQuerySchema), listAuditTrail);
auditTrailRoutes.get('/:id', authorize('audit_trail.read'), validate(idParamSchema, 'params'), getAuditTrail);
