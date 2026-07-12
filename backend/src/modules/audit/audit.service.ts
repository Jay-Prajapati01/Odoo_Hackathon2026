import path from 'path';
import { Request } from 'express';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../common/errors';
import { parsePagination } from '../../utils/pagination';
import { dispatchNotification, recordActivity } from '../../shared/events';
import { UserRepository } from '../auth/repositories/user.repository';
import { AssetRepository } from '../asset/asset.repository';
import { EmployeeRepository } from '../organization/repositories/employee.repository';
import { DepartmentRepository } from '../organization/repositories/department.repository';
import { AuditAssignmentRepository } from './audit-assignment.repository';
import { AuditAssignmentStatus, IAuditAssignment } from './audit-assignment.model';
import { AuditDiscrepancyRepository } from './audit-discrepancy.repository';
import { AuditDiscrepancyIssueType, IAuditDiscrepancy } from './audit-discrepancy.model';
import { AuditHistoryRepository } from './audit-history.repository';
import { AuditHistoryAction } from './audit-history.model';
import { AuditItemRepository } from './audit-item.repository';
import { AuditVerificationStatus, IAuditAttachment, IAuditItem } from './audit-item.model';
import { IAudit, AuditStatus } from './audit.model';
import { AuditRepository } from './audit.repository';
import { generateAuditNumber } from './audit.utils';

const EXCLUDED_ASSET_STATUSES = new Set(['disposed', 'retired', 'lost']);
const ACTIVE_ASSIGNMENT_STATUSES: AuditAssignmentStatus[] = ['assigned', 'accepted'];
export class AuditService {
  constructor(
    private readonly audits: AuditRepository,
    private readonly assignments: AuditAssignmentRepository,
    private readonly items: AuditItemRepository,
    private readonly discrepancies: AuditDiscrepancyRepository,
    private readonly history: AuditHistoryRepository,
    private readonly assets: AssetRepository,
    private readonly users: UserRepository,
    private readonly employees: EmployeeRepository,
    private readonly departments: DepartmentRepository
  ) {}

  async createCycle(
    data: {
      title: string;
      description?: string;
      scope: { type: 'department' | 'location' | 'organization'; departmentId?: string; location?: Record<string, string> };
      startDate: Date;
      endDate: Date;
      remarks?: string;
    },
    actorId: string,
    req?: Request
  ): Promise<IAudit> {
    if (data.scope.type === 'department' && data.scope.departmentId) {
      const department = await this.departments.findById(data.scope.departmentId);
      if (!department) throw new NotFoundError('Department not found');
    }

    const sequenceValue = await this.audits.nextSequenceValue();
    const auditNumber = generateAuditNumber(sequenceValue);
    const assetsInScope = await this.loadAssetsForScope(data.scope);
    if (assetsInScope.length === 0) throw new BusinessRuleError('No eligible assets found for the selected audit scope');

    const audit = await this.audits.create({
      auditNumber,
      title: data.title,
      description: data.description,
      scope: data.scope,
      department: data.scope.departmentId,
      location: this.stringifyLocation(data.scope.location),
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'scheduled',
      createdBy: actorId,
      remarks: data.remarks,
    });

    await this.items.createMany(
      assetsInScope.map((asset) => ({
        auditCycle: audit.id,
        asset: asset.id,
        assetTag: asset.assetTag,
        assetName: asset.name,
        department: asset.department,
        verificationStatus: 'pending',
      }))
    );

    await this.addHistory(audit.id, 'cycle_created', actorId, audit.id, {
      auditNumber,
      assetsInScope: assetsInScope.length,
      scope: data.scope,
    });

    recordActivity({
      req,
      userId: actorId,
      action: 'audit.created',
      entity: 'Audit',
      entityId: audit.id,
      newValue: audit.toObject(),
    });

    return audit;
  }

  async assignAuditor(auditId: string, auditorId: string, actorId: string, req?: Request): Promise<IAuditAssignment> {
    const audit = await this.requireAudit(auditId);
    if (audit.status === 'completed' || audit.status === 'cancelled') {
      throw new BusinessRuleError('Cannot assign auditors to a closed audit');
    }

    const auditorUser = await this.users.findById(auditorId);
    if (!auditorUser || auditorUser.isDeleted || auditorUser.status !== 'active') {
      throw new NotFoundError('Auditor not found or inactive');
    }

    const existing = await this.assignments.findByAuditCycleAndAuditor(auditId, auditorId);
    if (existing) throw new ConflictError('Auditor is already assigned to this audit');

    const auditorName = `${auditorUser.firstName} ${auditorUser.lastName}`.trim();
    const assignment = await this.assignments.create({
      auditCycle: auditId,
      auditor: auditorId,
      auditorName,
      assignedBy: actorId,
      assignedDate: new Date(),
      status: 'assigned',
    });

    await this.items.assignAuditorToPendingItems(auditId, auditorId, auditorName);
    await this.addHistory(auditId, 'auditor_assigned', actorId, assignment.id, { auditorId, auditorName });

    recordActivity({
      req,
      userId: actorId,
      action: 'audit.auditor_assigned',
      entity: 'Audit',
      entityId: auditId,
      newValue: { assignmentId: assignment.id, auditorId, auditorName },
    });
    dispatchNotification({
      recipientId: auditorId,
      type: 'audit',
      title: 'Audit Assignment',
      message: `You have been assigned to audit ${audit.auditNumber}.`,
      reference: { entity: 'Audit', entityId: auditId },
    });

    return assignment;
  }

  async respondToAssignment(
    auditId: string,
    assignmentId: string,
    data: { status: 'accepted' | 'rejected'; remarks?: string },
    actorId: string,
    req?: Request
  ): Promise<IAuditAssignment> {
    const assignment = await this.assignments.findById(assignmentId);
    if (!assignment || assignment.auditCycle !== auditId) throw new NotFoundError('Audit assignment not found');
    if (assignment.auditor !== actorId) throw new BusinessRuleError('Only the assigned auditor can respond');
    if (assignment.status === 'completed') throw new BusinessRuleError('Assignment already completed');

    const updated = await this.assignments.update(assignmentId, {
      status: data.status,
      responseDate: new Date(),
      responseRemarks: data.remarks,
    });
    if (!updated) throw new NotFoundError('Audit assignment not found');

    await this.addHistory(auditId, 'assignment_responded', actorId, assignmentId, { status: data.status, remarks: data.remarks });
    recordActivity({
      req,
      userId: actorId,
      action: 'audit.assignment_responded',
      entity: 'Audit',
      entityId: auditId,
      oldValue: { status: assignment.status },
      newValue: { status: data.status },
    });

    return updated;
  }

  async startAudit(auditId: string, actorId: string, req?: Request): Promise<IAudit> {
    const audit = await this.requireAudit(auditId);
    if (audit.status !== 'scheduled' && audit.status !== 'draft') {
      throw new BusinessRuleError('Only draft or scheduled audits can be started');
    }

    const activeAssignments = await this.assignments.findAcceptedOrAssigned(auditId);
    if (activeAssignments.length === 0) throw new BusinessRuleError('Assign at least one auditor before starting the audit');

    const updated = await this.audits.update(auditId, { status: 'active' });
    if (!updated) throw new NotFoundError('Audit not found');

    await this.addHistory(auditId, 'audit_started', actorId, auditId, { startedAt: new Date().toISOString() });
    recordActivity({
      req,
      userId: actorId,
      action: 'audit.started',
      entity: 'Audit',
      entityId: auditId,
      oldValue: { status: audit.status },
      newValue: { status: 'active' },
    });
    await Promise.all(
      activeAssignments.map(async (assignment) =>
        dispatchNotification({
          recipientId: assignment.auditor,
          type: 'audit',
          title: 'Audit Started',
          message: `Audit ${updated.auditNumber} is now active.`,
          reference: { entity: 'Audit', entityId: auditId },
        })
      )
    );

    return updated;
  }

  async verifyAsset(
    auditId: string,
    itemId: string,
    data: { verificationStatus: AuditVerificationStatus; condition?: string; locationVerified?: boolean; remarks?: string },
    actorId: string,
    files: Express.Multer.File[] = [],
    req?: Request
  ): Promise<IAuditItem> {
    const audit = await this.requireAudit(auditId);
    if (audit.status !== 'active') throw new BusinessRuleError('Audit is not active');

    const item = await this.items.findById(itemId);
    if (!item || item.auditCycle !== auditId) throw new NotFoundError('Audit item not found');
    if (item.verificationStatus !== 'pending') throw new BusinessRuleError('Asset already verified for this audit');

    const assignment = await this.assignments.findByAuditCycleAndAuditor(auditId, actorId);
    if (!assignment || !ACTIVE_ASSIGNMENT_STATUSES.includes(assignment.status)) {
      throw new BusinessRuleError('Auditor is not assigned to this audit');
    }
    if (item.auditor && item.auditor !== actorId) throw new BusinessRuleError('Audit item is assigned to another auditor');

    const asset = await this.assets.findById(item.asset);
    if (!asset) throw new NotFoundError('Asset not found');

    const attachments = files.map((file) => this.toAttachment(file, actorId));
    const updated = await this.items.update(itemId, {
      auditor: actorId,
      auditorName: assignment.auditorName,
      verificationStatus: data.verificationStatus,
      condition: data.condition ?? item.condition ?? asset.condition,
      locationVerified: data.locationVerified,
      remarks: data.remarks,
      photos: [...item.photos, ...attachments],
      verifiedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('Audit item not found');

    const discrepancy = await this.generateDiscrepancyIfNeeded(audit, updated, asset, actorId, attachments, req);

    if (data.verificationStatus === 'damaged') {
      await this.assets.update(asset.id, { condition: 'damaged', updatedBy: actorId });
    }

    const remaining = await this.items.countByStatuses(auditId, ['pending']);
    if (remaining === 0) {
      await this.assignments.update(assignment.id, { status: 'completed' });
    }

    await this.addHistory(auditId, 'asset_verified', actorId, itemId, {
      assetId: asset.id,
      assetTag: asset.assetTag,
      verificationStatus: data.verificationStatus,
      discrepancyId: discrepancy?.id,
    });

    recordActivity({
      req,
      userId: actorId,
      action: 'audit.asset_verified',
      entity: 'Audit',
      entityId: auditId,
      newValue: {
        itemId,
        assetId: asset.id,
        verificationStatus: data.verificationStatus,
      },
    });

    return updated;
  }

  async resolveDiscrepancy(
    discrepancyId: string,
    data: { status: 'in_review' | 'resolved' | 'closed'; recommendedAction?: string; resolutionRemarks?: string; confirmMissingAsLost?: boolean },
    actorId: string,
    req?: Request
  ): Promise<IAuditDiscrepancy> {
    const discrepancy = await this.discrepancies.findById(discrepancyId);
    if (!discrepancy) throw new NotFoundError('Discrepancy not found');

    const patch: Partial<IAuditDiscrepancy> = {
      status: data.status,
      recommendedAction: data.recommendedAction ?? discrepancy.recommendedAction,
    };

    if (data.status === 'resolved' || data.status === 'closed') {
      patch.resolvedAt = new Date();
      patch.resolvedBy = actorId;
    }

    const updated = await this.discrepancies.update(discrepancyId, patch);
    if (!updated) throw new NotFoundError('Discrepancy not found');

    if (discrepancy.issueType === 'missing' && data.confirmMissingAsLost) {
      await this.assets.update(discrepancy.asset, { status: 'lost', updatedBy: actorId });
    }

    await this.addHistory(discrepancy.auditCycle, 'discrepancy_resolved', actorId, discrepancyId, {
      status: data.status,
      confirmMissingAsLost: data.confirmMissingAsLost,
      resolutionRemarks: data.resolutionRemarks,
    });

    recordActivity({
      req,
      userId: actorId,
      action: 'audit.discrepancy_resolved',
      entity: 'Audit',
      entityId: discrepancy.auditCycle,
      oldValue: { status: discrepancy.status },
      newValue: { status: data.status },
    });
    dispatchNotification({
      recipientId: actorId,
      type: 'audit',
      title: 'Discrepancy Resolved',
      message: `Discrepancy for asset ${discrepancy.assetTag} is now ${data.status}.`,
      reference: { entity: 'Audit', entityId: discrepancy.auditCycle },
    });

    return updated;
  }

  async closeAudit(auditId: string, data: { remarks?: string }, actorId: string, req?: Request): Promise<IAudit> {
    const audit = await this.requireAudit(auditId);
    if (audit.status === 'completed') throw new BusinessRuleError('Audit already closed');
    if (audit.status === 'cancelled') throw new BusinessRuleError('Cancelled audits cannot be closed');

    const pendingItems = await this.items.countByStatuses(auditId, ['pending']);
    if (pendingItems > 0) throw new BusinessRuleError('Audit cannot be closed until every audit item has been reviewed');

    const openDiscrepancies = await this.discrepancies.findOpenByAuditCycle(auditId);
    if (openDiscrepancies.length > 0) throw new BusinessRuleError('Resolve or review all discrepancies before closing the audit');

    const updated = await this.audits.update(auditId, {
      status: 'completed',
      closedBy: actorId,
      closedDate: new Date(),
      remarks: data.remarks ?? audit.remarks,
    });
    if (!updated) throw new NotFoundError('Audit not found');

    await this.addHistory(auditId, 'audit_closed', actorId, auditId, { remarks: data.remarks });
    recordActivity({
      req,
      userId: actorId,
      action: 'audit.closed',
      entity: 'Audit',
      entityId: auditId,
      oldValue: { status: audit.status },
      newValue: { status: 'completed' },
    });
    dispatchNotification({
      recipientId: actorId,
      type: 'audit',
      title: 'Audit Completed',
      message: `Audit ${updated.auditNumber} has been completed.`,
      reference: { entity: 'Audit', entityId: auditId },
    });

    return updated;
  }

  async getById(auditId: string, authUser?: { userId: string; roleName: string }): Promise<Record<string, unknown>> {
    const audit = await this.requireAudit(auditId);
    await this.assertUserCanViewAudit(audit, authUser);
    const [assignments, items, discrepancies] = await Promise.all([
      this.assignments.findByAuditCycle(auditId),
      this.items.findByAuditCycle({ auditCycle: auditId }),
      this.discrepancies.findByAuditCycle(auditId),
    ]);
    return {
      audit,
      assignments,
      items,
      discrepancies,
      summary: {
        totalItems: items.length,
        pendingItems: items.filter((item) => item.verificationStatus === 'pending').length,
        verifiedItems: items.filter((item) => item.verificationStatus === 'verified').length,
        missingItems: items.filter((item) => item.verificationStatus === 'missing' || item.verificationStatus === 'not_found').length,
        damagedItems: items.filter((item) => item.verificationStatus === 'damaged').length,
        discrepancies: discrepancies.length,
      },
    };
  }

  async list(query: Record<string, unknown>, authUser?: { userId: string; roleName: string }) {
    const { page, limit, skip } = parsePagination(query);
    const sort = this.resolveSort(query.sortBy as string | undefined);
    const filter: Parameters<AuditRepository['findAll']>[0] = {
      page,
      limit,
      skip,
      status: query.status as string | undefined,
      department: query.department as string | undefined,
      search: query.search as string | undefined,
      startDateFrom: query.startDateFrom as Date | undefined,
      startDateTo: query.startDateTo as Date | undefined,
      sort,
    };

    if (query.search || query.auditor) {
      const matchingIds = await this.resolveCycleIdsFromCrossFilters(
        query.search as string | undefined,
        query.auditor as string | undefined
      );
      if (matchingIds) filter.ids = matchingIds;
    }

    const allowedAuditIds = await this.getAllowedAuditIdsForUser(authUser, filter);
    if (allowedAuditIds && allowedAuditIds.length === 0) {
      return { data: [], page, limit, total: 0 };
    }
    if (allowedAuditIds) {
      filter.ids = filter.ids ? filter.ids.filter((id) => allowedAuditIds.includes(id)) : allowedAuditIds;
    }
    if (filter.ids && filter.ids.length === 0) {
      return { data: [], page, limit, total: 0 };
    }

    const data = await this.audits.findAll(filter);
    const total = await this.audits.count(filter);
    return { data, page, limit, total };
  }

  async getHistory(auditId: string, query: Record<string, unknown>, authUser?: { userId: string; roleName: string }) {
    const audit = await this.requireAudit(auditId);
    await this.assertUserCanViewAudit(audit, authUser);
    const { page, limit, skip } = parsePagination(query);
    const data = await this.history.findByAuditCycle(auditId, page, limit, skip);
    const total = await this.history.count(auditId);
    return { data, page, limit, total };
  }

  async getDiscrepancies(auditId: string, authUser?: { userId: string; roleName: string }) {
    const audit = await this.requireAudit(auditId);
    await this.assertUserCanViewAudit(audit, authUser);
    return this.discrepancies.findByAuditCycle(auditId);
  }

  async findOneByAssetAndStatuses(assetId: string, statuses: string[]): Promise<IAudit | null> {
    const normalizedStatuses = statuses.map((status) => (status === 'in_progress' ? 'active' : status));
    const allActiveAudits = await this.audits.findAll({
      page: 1,
      limit: 500,
      skip: 0,
      sort: { createdAt: -1 },
    });
    const candidateAudits = allActiveAudits.filter((audit) => normalizedStatuses.includes(audit.status));
    for (const audit of candidateAudits) {
      const item = await this.items.findByAuditCycleAndAsset(audit.id, assetId);
      if (item) return audit;
    }
    return null;
  }

  private async requireAudit(auditId: string): Promise<IAudit> {
    const audit = await this.audits.findById(auditId);
    if (!audit) throw new NotFoundError('Audit not found');
    return audit;
  }

  private async loadAssetsForScope(scope: { type: 'department' | 'location' | 'organization'; departmentId?: string; location?: Record<string, string> }) {
    const filters: Parameters<AssetRepository['findAll']>[0] = {
      page: 1,
      limit: 5000,
      skip: 0,
      sort: { assetTag: 1 },
    };
    if (scope.type === 'department' && scope.departmentId) filters.departmentId = scope.departmentId;
    if (scope.type === 'location' && scope.location) filters.location = this.resolveLocationSearchTerm(scope.location);

    const assets = await this.assets.findAll(filters);
    return assets.filter((asset) => !EXCLUDED_ASSET_STATUSES.has(asset.status));
  }

  private stringifyLocation(location?: Record<string, string>): string | undefined {
    if (!location) return undefined;
    const parts = Object.values(location).filter((value) => value && value.trim());
    return parts.length > 0 ? parts.join(' / ') : undefined;
  }

  private async generateDiscrepancyIfNeeded(
    audit: IAudit,
    item: IAuditItem,
    asset: Awaited<ReturnType<AssetRepository['findById']>>,
    actorId: string,
    attachments: IAuditAttachment[],
    req?: Request
  ): Promise<IAuditDiscrepancy | null> {
    if (!asset) return null;

    const discrepancies: Array<{
      issueType: AuditDiscrepancyIssueType;
      severity: 'medium' | 'high' | 'critical';
      description: string;
      recommendedAction: string;
    }> = [];

    if (item.verificationStatus === 'missing' || item.verificationStatus === 'not_found') {
      discrepancies.push({
        issueType: 'missing',
        severity: 'critical',
        description: `Asset ${asset.assetTag} was reported as ${item.verificationStatus}.`,
        recommendedAction: 'Investigate asset whereabouts and confirm if the asset should be marked as lost.',
      });
    }
    if (item.verificationStatus === 'damaged') {
      discrepancies.push({
        issueType: 'damaged',
        severity: 'high',
        description: `Asset ${asset.assetTag} was reported as damaged during audit.`,
        recommendedAction: 'Inspect the asset and route it for maintenance or replacement.',
      });
    }
    if (item.locationVerified === false) {
      discrepancies.push({
        issueType: 'location_mismatch',
        severity: 'medium',
        description: `Asset ${asset.assetTag} was not found in its expected location.`,
        recommendedAction: 'Validate the physical location and update the asset record if needed.',
      });
    }
    if (item.condition && item.condition !== asset.condition) {
      discrepancies.push({
        issueType: 'condition_mismatch',
        severity: item.condition === 'damaged' ? 'high' : 'medium',
        description: `Audited condition (${item.condition}) differs from current asset condition (${asset.condition}).`,
        recommendedAction: 'Review the condition and update the asset record if the audit result is correct.',
      });
    }

    if (discrepancies.length === 0) return null;

    const created = await this.discrepancies.create({
      auditCycle: audit.id,
      auditItem: item.id,
      asset: asset.id,
      assetTag: asset.assetTag,
      issueType: discrepancies[0].issueType,
      severity: discrepancies[0].severity,
      description: discrepancies.map((entry) => entry.description).join(' '),
      recommendedAction: discrepancies.map((entry) => entry.recommendedAction).join(' '),
      status: 'open',
      attachments,
    });

    await this.addHistory(audit.id, 'discrepancy_generated', actorId, created.id, {
      assetId: asset.id,
      assetTag: asset.assetTag,
      issueType: created.issueType,
      severity: created.severity,
    });
    recordActivity({
      req,
      userId: actorId,
      action: 'audit.discrepancy_generated',
      entity: 'Audit',
      entityId: audit.id,
      newValue: { discrepancyId: created.id, issueType: created.issueType, assetTag: asset.assetTag },
    });
    dispatchNotification({
      recipientId: actorId,
      type: 'audit',
      title: 'Discrepancy Raised',
      message: `Discrepancy recorded for asset ${asset.assetTag}.`,
      reference: { entity: 'Audit', entityId: audit.id },
    });

    return created;
  }

  private resolveSort(sortBy?: string): Record<string, 1 | -1> {
    switch (sortBy) {
      case 'oldest':
        return { createdAt: 1 };
      case 'startDate':
        return { startDate: 1 };
      case 'completionDate':
        return { closedDate: -1, createdAt: -1 };
      case 'newest':
      default:
        return { createdAt: -1 };
    }
  }

  private async addHistory(
    auditCycle: string,
    action: AuditHistoryAction,
    actor: string,
    entityId?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.history.create({ auditCycle, action, actor, entityId, details });
  }

  private toAttachment(file: Express.Multer.File, actorId: string): IAuditAttachment {
    return {
      name: file.originalname,
      path: `/${path.relative(process.cwd(), file.path).replace(/\\/g, '/')}`,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
      uploadedBy: actorId,
    };
  }

  private async getAllowedAuditIdsForUser(
    authUser: { userId: string; roleName: string } | undefined,
    filter: Parameters<AuditRepository['findAll']>[0]
  ): Promise<string[] | undefined> {
    if (!authUser) return undefined;
    if (authUser.roleName === 'Admin' || authUser.roleName === 'Asset Manager') return undefined;

    if (authUser.roleName === 'Department Head') {
      const employee = await this.employees.findByUserId(authUser.userId);
      if (!employee?.departmentId) return [];
      filter.department = employee.departmentId;
      return undefined;
    }

    return this.assignments.findAuditCycleIdsByAuditor(authUser.userId);
  }

  private async resolveCycleIdsFromCrossFilters(search?: string, auditor?: string): Promise<string[] | undefined> {
    let ids: string[] | undefined;

    if (search) {
      const rootIds = await this.audits.findIdsBySearchTerm(search);
      const itemIds = await this.items.findAuditCycleIdsByAssetSearch(search);
      ids = Array.from(new Set([...rootIds, ...itemIds]));
    }

    if (auditor) {
      const auditorIds = await this.assignments.findAuditCycleIdsByAuditor(auditor);
      ids = ids ? ids.filter((id) => auditorIds.includes(id)) : auditorIds;
    }

    return ids;
  }

  private resolveLocationSearchTerm(location?: Record<string, string>): string | undefined {
    if (!location) return undefined;
    return Object.values(location).find((value) => value && value.trim())?.trim();
  }

  private async assertUserCanViewAudit(
    audit: IAudit,
    authUser?: { userId: string; roleName: string }
  ): Promise<void> {
    if (!authUser) return;
    if (authUser.roleName === 'Admin' || authUser.roleName === 'Asset Manager') return;
    if (authUser.roleName === 'Department Head') {
      const employee = await this.employees.findByUserId(authUser.userId);
      if (employee?.departmentId && audit.department === employee.departmentId) return;
    }
    const assignment = await this.assignments.findByAuditCycleAndAuditor(audit.id, authUser.userId);
    if (assignment) return;
    throw new BusinessRuleError('You are not authorized to view this audit');
  }
}
