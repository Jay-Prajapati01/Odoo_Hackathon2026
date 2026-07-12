import { Request } from 'express';
import { MaintenanceRepository } from './maintenance.repository';
import { MaintenanceHistoryRepository } from './models/maintenance-history.repository';
import { AssetRepository } from '../asset/asset.repository';
import { EmployeeRepository } from '../organization/repositories/employee.repository';
import { DepartmentRepository } from '../organization/repositories/department.repository';
import { IMaintenance, MaintenanceStatus } from './maintenance.model';
import { NotFoundError, BusinessRuleError, ConflictError } from '../../common/errors';
import { parsePagination } from '../../utils/pagination';
import { generateReferenceId } from '../../utils/helpers';
import { recordActivity, dispatchNotification } from '../../shared/events';

const BLOCKED_ASSET_STATUSES = ['lost', 'retired', 'disposed'];

const VALID_STATUS_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['technician_assigned', 'cancelled'],
  rejected: [],
  technician_assigned: ['in_progress', 'cancelled'],
  in_progress: ['resolved'],
  resolved: [],
  cancelled: [],
};

export class MaintenanceService {
  constructor(
    private readonly repo: MaintenanceRepository,
    private readonly historyRepo: MaintenanceHistoryRepository,
    private readonly assets: AssetRepository,
    private readonly employees: EmployeeRepository,
    private readonly departments: DepartmentRepository
  ) {}

  async create(
    data: {
      assetId: string;
      departmentId: string;
      issueTitle: string;
      issueDescription: string;
      priority?: string;
      estimatedCost?: number;
      estimatedDuration?: string;
      attachments?: Array<{ name: string; path: string; mimeType: string; size: number }>;
    },
    actorId: string,
    req?: Request
  ): Promise<IMaintenance> {
    const asset = await this.assets.findById(data.assetId);
    if (!asset) throw new NotFoundError('Asset not found');
    if (BLOCKED_ASSET_STATUSES.includes(asset.status)) {
      throw new BusinessRuleError(`Asset is '${asset.status}' and cannot enter maintenance`);
    }
    if (asset.status === 'maintenance') {
      throw new ConflictError('Asset is already under maintenance');
    }

    const employee = await this.employees.findByUserId(actorId);
    if (!employee) throw new NotFoundError('Requester employee record not found');
    if (employee.employmentStatus !== 'active') {
      throw new BusinessRuleError('Inactive or deleted employee cannot create maintenance request');
    }

    const department = await this.departments.findById(data.departmentId);
    if (!department) throw new NotFoundError('Department not found');

    const activeMaintenance = await this.repo.findActiveByAsset(data.assetId);
    if (activeMaintenance) {
      throw new ConflictError('Asset already has an active maintenance request');
    }

    const requestNumber = generateReferenceId('MNT');

    const attachments = (data.attachments ?? []).map((att) => ({
      ...att,
      uploadedAt: new Date(),
      uploadedBy: actorId,
    }));

    const maintenance = await this.repo.create({
      requestNumber,
      assetId: data.assetId,
      requestedById: actorId,
      departmentId: data.departmentId,
      issueTitle: data.issueTitle,
      issueDescription: data.issueDescription,
      priority: (data.priority as IMaintenance['priority']) ?? 'medium',
      attachments,
      estimatedCost: data.estimatedCost,
      estimatedDuration: data.estimatedDuration,
      status: 'pending',
      requestedDate: new Date(),
      createdBy: actorId,
    });

    await this.historyRepo.create({
      maintenanceId: maintenance.id,
      requestNumber,
      action: 'requested',
      assetId: data.assetId,
      performedBy: actorId,
      details: {
        issueTitle: data.issueTitle,
        priority: maintenance.priority,
        departmentId: data.departmentId,
      },
    });

    recordActivity({
      req,
      userId: actorId,
      action: 'maintenance.requested',
      entity: 'Maintenance',
      entityId: maintenance.id,
      newValue: maintenance.toObject(),
    });

    dispatchNotification({
      recipientId: actorId,
      type: 'maintenance',
      title: 'Maintenance Requested',
      message: `Maintenance request #${requestNumber} submitted for asset ${asset.assetTag}.`,
      reference: { entity: 'Maintenance', entityId: maintenance.id },
    });

    return maintenance;
  }

  async approve(id: string, actorId: string, data: { estimatedCost?: number; estimatedDuration?: string }, req?: Request): Promise<IMaintenance> {
    const maintenance = await this.repo.findById(id);
    if (!maintenance) throw new NotFoundError('Maintenance request not found');
    this.assertValidTransition(maintenance.status, 'approved');

    const patch: Partial<IMaintenance> = {
      status: 'approved',
      approvedById: actorId,
      approvalDate: new Date(),
      updatedBy: actorId,
    };
    if (data.estimatedCost !== undefined) patch.estimatedCost = data.estimatedCost;
    if (data.estimatedDuration !== undefined) patch.estimatedDuration = data.estimatedDuration;

    const updated = await this.repo.update(id, patch);

    await this.assets.update(maintenance.assetId, { status: 'maintenance' });

    await this.historyRepo.create({
      maintenanceId: id,
      requestNumber: maintenance.requestNumber,
      action: 'approved',
      assetId: maintenance.assetId,
      performedBy: actorId,
      details: { estimatedCost: data.estimatedCost, estimatedDuration: data.estimatedDuration },
    });

    recordActivity({
      req,
      userId: actorId,
      action: 'maintenance.approved',
      entity: 'Maintenance',
      entityId: id,
      oldValue: { status: maintenance.status },
      newValue: { status: 'approved' },
    });

    dispatchNotification({
      recipientId: maintenance.requestedById,
      type: 'approval',
      title: 'Maintenance Approved',
      message: `Your maintenance request #${maintenance.requestNumber} has been approved.`,
      reference: { entity: 'Maintenance', entityId: id },
    });

    return updated!;
  }

  async reject(id: string, actorId: string, rejectionReason: string, req?: Request): Promise<IMaintenance> {
    const maintenance = await this.repo.findById(id);
    if (!maintenance) throw new NotFoundError('Maintenance request not found');
    this.assertValidTransition(maintenance.status, 'rejected');

    const updated = await this.repo.update(id, {
      status: 'rejected',
      approvedById: actorId,
      approvalDate: new Date(),
      rejectionReason,
      updatedBy: actorId,
    });

    await this.historyRepo.create({
      maintenanceId: id,
      requestNumber: maintenance.requestNumber,
      action: 'rejected',
      assetId: maintenance.assetId,
      performedBy: actorId,
      details: { rejectionReason },
    });

    recordActivity({
      req,
      userId: actorId,
      action: 'maintenance.rejected',
      entity: 'Maintenance',
      entityId: id,
      oldValue: { status: maintenance.status },
      newValue: { status: 'rejected', rejectionReason },
    });

    dispatchNotification({
      recipientId: maintenance.requestedById,
      type: 'approval',
      title: 'Maintenance Rejected',
      message: `Your maintenance request #${maintenance.requestNumber} has been rejected. Reason: ${rejectionReason}`,
      reference: { entity: 'Maintenance', entityId: id },
    });

    return updated!;
  }

  async assignTechnician(
    id: string,
    data: { technicianId: string; estimatedDuration?: string; estimatedCompletion?: string },
    actorId: string,
    req?: Request
  ): Promise<IMaintenance> {
    const maintenance = await this.repo.findById(id);
    if (!maintenance) throw new NotFoundError('Maintenance request not found');
    this.assertValidTransition(maintenance.status, 'technician_assigned');

    const technician = await this.employees.findById(data.technicianId);
    if (!technician) throw new NotFoundError('Technician not found');
    if (technician.employmentStatus !== 'active') {
      throw new BusinessRuleError('Technician must be an active employee');
    }

    const updated = await this.repo.update(id, {
      status: 'technician_assigned',
      assignedTechnicianId: data.technicianId,
      technicianAssignedDate: new Date(),
      estimatedDuration: data.estimatedDuration ?? maintenance.estimatedDuration,
      updatedBy: actorId,
    });

    await this.historyRepo.create({
      maintenanceId: id,
      requestNumber: maintenance.requestNumber,
      action: 'technician_assigned',
      assetId: maintenance.assetId,
      performedBy: actorId,
      details: {
        technicianId: data.technicianId,
        technicianName: `${technician.firstName} ${technician.lastName}`,
        estimatedDuration: data.estimatedDuration,
        estimatedCompletion: data.estimatedCompletion,
      },
    });

    recordActivity({
      req,
      userId: actorId,
      action: 'maintenance.technician_assigned',
      entity: 'Maintenance',
      entityId: id,
      oldValue: { status: maintenance.status },
      newValue: { status: 'technician_assigned', assignedTechnicianId: data.technicianId },
    });

    dispatchNotification({
      recipientId: maintenance.requestedById,
      type: 'maintenance',
      title: 'Technician Assigned',
      message: `Technician ${technician.firstName} ${technician.lastName} assigned to maintenance #${maintenance.requestNumber}.`,
      reference: { entity: 'Maintenance', entityId: id },
    });

    return updated!;
  }

  async startRepair(id: string, actorId: string, notes?: string, req?: Request): Promise<IMaintenance> {
    const maintenance = await this.repo.findById(id);
    if (!maintenance) throw new NotFoundError('Maintenance request not found');
    this.assertValidTransition(maintenance.status, 'in_progress');

    const updated = await this.repo.update(id, {
      status: 'in_progress',
      workStartDate: new Date(),
      updatedBy: actorId,
    });

    await this.historyRepo.create({
      maintenanceId: id,
      requestNumber: maintenance.requestNumber,
      action: 'repair_started',
      assetId: maintenance.assetId,
      performedBy: actorId,
      details: { notes },
    });

    recordActivity({
      req,
      userId: actorId,
      action: 'maintenance.repair_started',
      entity: 'Maintenance',
      entityId: id,
      oldValue: { status: maintenance.status },
      newValue: { status: 'in_progress' },
    });

    dispatchNotification({
      recipientId: maintenance.requestedById,
      type: 'maintenance',
      title: 'Repair Started',
      message: `Repair work has started on maintenance #${maintenance.requestNumber}.`,
      reference: { entity: 'Maintenance', entityId: id },
    });

    return updated!;
  }

  async completeRepair(
    id: string,
    data: { resolutionSummary: string; actualCost?: number; attachments?: Array<{ name: string; path: string; mimeType: string; size: number }> },
    actorId: string,
    req?: Request
  ): Promise<IMaintenance> {
    const maintenance = await this.repo.findById(id);
    if (!maintenance) throw new NotFoundError('Maintenance request not found');
    this.assertValidTransition(maintenance.status, 'resolved');

    const newAttachments = (data.attachments ?? []).map((att) => ({
      ...att,
      uploadedAt: new Date(),
      uploadedBy: actorId,
    }));

    const updated = await this.repo.update(id, {
      status: 'resolved',
      completionDate: new Date(),
      resolutionSummary: data.resolutionSummary,
      actualCost: data.actualCost,
      attachments: [...maintenance.attachments, ...newAttachments],
      updatedBy: actorId,
    });

    await this.assets.update(maintenance.assetId, {
      status: 'available',
      lastMaintenanceDate: new Date(),
    });

    await this.historyRepo.create({
      maintenanceId: id,
      requestNumber: maintenance.requestNumber,
      action: 'resolved',
      assetId: maintenance.assetId,
      performedBy: actorId,
      details: {
        resolutionSummary: data.resolutionSummary,
        actualCost: data.actualCost,
        completionDate: new Date(),
      },
    });

    recordActivity({
      req,
      userId: actorId,
      action: 'maintenance.resolved',
      entity: 'Maintenance',
      entityId: id,
      oldValue: { status: maintenance.status },
      newValue: { status: 'resolved', resolutionSummary: data.resolutionSummary },
    });

    dispatchNotification({
      recipientId: maintenance.requestedById,
      type: 'maintenance',
      title: 'Maintenance Resolved',
      message: `Maintenance #${maintenance.requestNumber} has been resolved. Asset is now available.`,
      reference: { entity: 'Maintenance', entityId: id },
    });

    return updated!;
  }

  async cancel(id: string, actorId: string, remarks?: string, req?: Request): Promise<IMaintenance> {
    const maintenance = await this.repo.findById(id);
    if (!maintenance) throw new NotFoundError('Maintenance request not found');
    if (maintenance.status === 'resolved') throw new BusinessRuleError('Cannot cancel a resolved maintenance');
    if (maintenance.status === 'cancelled') throw new BusinessRuleError('Maintenance already cancelled');

    const wasUnderMaintenance = ['approved', 'technician_assigned', 'in_progress'].includes(maintenance.status);

    const updated = await this.repo.update(id, {
      status: 'cancelled',
      updatedBy: actorId,
    });

    if (wasUnderMaintenance) {
      const activeAllocation = await this.assets.findById(maintenance.assetId);
      if (activeAllocation && activeAllocation.status === 'maintenance') {
        await this.assets.update(maintenance.assetId, { status: 'available' });
      }
    }

    await this.historyRepo.create({
      maintenanceId: id,
      requestNumber: maintenance.requestNumber,
      action: 'cancelled',
      assetId: maintenance.assetId,
      performedBy: actorId,
      details: { reason: remarks },
    });

    recordActivity({
      req,
      userId: actorId,
      action: 'maintenance.cancelled',
      entity: 'Maintenance',
      entityId: id,
      oldValue: { status: maintenance.status },
      newValue: { status: 'cancelled' },
    });

    dispatchNotification({
      recipientId: maintenance.requestedById,
      type: 'maintenance',
      title: 'Maintenance Cancelled',
      message: `Maintenance #${maintenance.requestNumber} has been cancelled.`,
      reference: { entity: 'Maintenance', entityId: id },
    });

    return updated!;
  }

  async getById(id: string): Promise<IMaintenance | null> {
    return this.repo.findById(id);
  }

  async list(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePagination(query);
    const data = await this.repo.findAll({
      page,
      limit,
      skip,
      search: query.search as string | undefined,
      status: query.status as string | undefined,
      priority: query.priority as string | undefined,
      assetId: query.assetId as string | undefined,
      departmentId: query.departmentId as string | undefined,
      requestedById: query.requestedById as string | undefined,
      assignedTechnicianId: query.assignedTechnicianId as string | undefined,
      sortBy: query.sortBy as string | undefined,
      sortOrder: query.sortOrder as 'asc' | 'desc' | undefined,
      requestedDateFrom: query.requestedDateFrom ? new Date(query.requestedDateFrom as string) : undefined,
      requestedDateTo: query.requestedDateTo ? new Date(query.requestedDateTo as string) : undefined,
      completionDateFrom: query.completionDateFrom ? new Date(query.completionDateFrom as string) : undefined,
      completionDateTo: query.completionDateTo ? new Date(query.completionDateTo as string) : undefined,
    });
    const total = await this.repo.count({
      search: query.search as string | undefined,
      status: query.status as string | undefined,
      priority: query.priority as string | undefined,
      assetId: query.assetId as string | undefined,
      departmentId: query.departmentId as string | undefined,
      requestedById: query.requestedById as string | undefined,
      assignedTechnicianId: query.assignedTechnicianId as string | undefined,
    });
    return { data, page, limit, total };
  }

  async getHistory(id: string, query: Record<string, unknown>) {
    const { page, limit, skip } = parsePagination(query);
    const data = await this.historyRepo.findAll({ maintenanceId: id, page, limit, skip });
    const total = await this.historyRepo.count({ maintenanceId: id });
    return { data, page, limit, total };
  }

  async getStatusCounts(): Promise<Record<string, number>> {
    return this.repo.countByStatus();
  }

  async getStats() {
    return this.repo.getMaintenanceStats();
  }

  private assertValidTransition(from: MaintenanceStatus, to: MaintenanceStatus): void {
    const allowed = VALID_STATUS_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BusinessRuleError(`Cannot transition maintenance from '${from}' to '${to}'`);
    }
  }
}
