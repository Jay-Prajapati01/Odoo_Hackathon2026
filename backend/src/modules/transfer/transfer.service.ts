import { Request } from 'express';
import { TransferRepository } from './transfer.repository';
import { AllocationRepository } from '../allocation/allocation.repository';
import { AllocationHistoryRepository } from '../allocation/models/allocation-history.repository';
import { AssetRepository } from '../asset/asset.repository';
import { EmployeeRepository } from '../organization/repositories/employee.repository';
import { ITransfer, TransferStatus } from './transfer.model';
import { IAllocation } from '../allocation/allocation.model';
import { NotFoundError, BusinessRuleError, ConflictError } from '../../common/errors';
import { parsePagination } from '../../utils/pagination';
import { generateReferenceId } from '../../utils/helpers';
import { recordActivity, dispatchNotification } from '../../shared/events';

const VALID_DECISIONS: Record<string, TransferStatus[]> = {
  requested: ['approved', 'rejected'],
};

const VALID_COMPLETIONS: Record<string, TransferStatus[]> = {
  approved: ['completed'],
};

export class TransferService {
  constructor(
    private readonly repo: TransferRepository,
    private readonly allocations: AllocationRepository,
    private readonly allocationHistoryRepo: AllocationHistoryRepository,
    private readonly assets: AssetRepository,
    private readonly employees: EmployeeRepository
  ) {}

  async request(
    data: {
      allocationId: string;
      requestedHolderId: string;
      requestReason: string;
    },
    actorId: string,
    req?: Request
  ): Promise<ITransfer> {
    const allocation = await this.allocations.findById(data.allocationId);
    if (!allocation) throw new NotFoundError('Allocation not found');
    if (allocation.status !== 'allocated' && allocation.status !== 'overdue') {
      throw new BusinessRuleError('Only active allocations can be transferred');
    }

    const asset = await this.assets.findById(allocation.assetId);
    if (!asset) throw new NotFoundError('Asset not found');
    if (asset.status === 'lost' || asset.status === 'retired' || asset.status === 'disposed') {
      throw new BusinessRuleError(`Asset is '${asset.status}' and cannot be transferred`);
    }

    const requestedHolder = await this.employees.findById(data.requestedHolderId);
    if (!requestedHolder) throw new NotFoundError('Requested holder not found');
    if (requestedHolder.employmentStatus !== 'active') {
      throw new BusinessRuleError('Requested holder must be an active employee');
    }

    if (data.requestedHolderId === allocation.employeeId) {
      throw new BusinessRuleError('Cannot transfer asset to the same employee');
    }

    const pendingTransfer = await this.repo.count({
      allocationId: data.allocationId,
      status: 'requested',
    });
    if (pendingTransfer > 0) {
      throw new ConflictError('A pending transfer already exists for this allocation');
    }

    const transferNumber = generateReferenceId('TRF');

    const transfer = await this.repo.create({
      transferNumber,
      allocationId: data.allocationId,
      assetId: allocation.assetId,
      currentHolderId: allocation.employeeId,
      requestedHolderId: data.requestedHolderId,
      requestReason: data.requestReason,
      requestedById: actorId,
      status: 'requested',
    });

    recordActivity({
      req,
      userId: actorId,
      action: 'transfer.requested',
      entity: 'Transfer',
      entityId: transfer.id,
      newValue: transfer.toObject(),
    });

    dispatchNotification({
      recipientId: actorId,
      type: 'transfer',
      title: 'Transfer Requested',
      message: `Transfer request #${transferNumber} created for asset ${asset.assetTag}.`,
      reference: { entity: 'Transfer', entityId: transfer.id },
    });

    return transfer;
  }

  async approve(id: string, actorId: string, remarks?: string, req?: Request): Promise<ITransfer> {
    const transfer = await this.repo.findById(id);
    if (!transfer) throw new NotFoundError('Transfer not found');
    if (!VALID_DECISIONS[transfer.status]?.includes('approved')) {
      throw new BusinessRuleError(`Cannot approve a transfer in '${transfer.status}' state`);
    }

    const updated = await this.repo.update(id, {
      status: 'approved',
      approvedById: actorId,
      approvalDate: new Date(),
    });

    await this.allocations.update(transfer.allocationId, { status: 'transferred' });
    await this.allocationHistoryRepo.create({
      allocationId: transfer.allocationId,
      allocationNumber: '',
      action: 'transferred',
      assetId: transfer.assetId,
      employeeId: transfer.requestedHolderId,
      performedBy: actorId,
      details: { transferId: id, transferNumber: transfer.transferNumber },
    });

    const allocation = await this.allocations.findById(transfer.allocationId);
    if (allocation) {
      const newAllocationNumber = generateReferenceId('ALC');
      const newAllocation = await this.allocations.create({
        allocationNumber: newAllocationNumber,
        assetId: transfer.assetId,
        employeeId: transfer.requestedHolderId,
        departmentId: allocation.departmentId,
        allocatedById: actorId,
        allocationDate: new Date(),
        status: 'allocated',
        purpose: `Transfer from ${transfer.currentHolderId}`,
      });

      await this.assets.update(transfer.assetId, {
        status: 'allocated',
        assignedTo: transfer.requestedHolderId,
        departmentId: allocation.departmentId,
      });

      await this.allocationHistoryRepo.create({
        allocationId: newAllocation.id,
        allocationNumber: newAllocationNumber,
        action: 'approved',
        assetId: transfer.assetId,
        employeeId: transfer.requestedHolderId,
        performedBy: actorId,
        details: { transferId: id, fromEmployee: transfer.currentHolderId },
      });
    }

    recordActivity({
      req,
      userId: actorId,
      action: 'transfer.approved',
      entity: 'Transfer',
      entityId: id,
      oldValue: { status: 'requested' },
      newValue: { status: 'approved' },
    });

    dispatchNotification({
      recipientId: transfer.requestedById,
      type: 'approval',
      title: 'Transfer Approved',
      message: `Your transfer request #${transfer.transferNumber} has been approved.`,
      reference: { entity: 'Transfer', entityId: id },
    });

    return updated!;
  }

  async reject(id: string, actorId: string, rejectionReason: string, req?: Request): Promise<ITransfer> {
    const transfer = await this.repo.findById(id);
    if (!transfer) throw new NotFoundError('Transfer not found');
    if (!VALID_DECISIONS[transfer.status]?.includes('rejected')) {
      throw new BusinessRuleError(`Cannot reject a transfer in '${transfer.status}' state`);
    }

    const updated = await this.repo.update(id, {
      status: 'rejected',
      approvedById: actorId,
      approvalDate: new Date(),
      rejectionReason,
    });

    recordActivity({
      req,
      userId: actorId,
      action: 'transfer.rejected',
      entity: 'Transfer',
      entityId: id,
      oldValue: { status: 'requested' },
      newValue: { status: 'rejected', rejectionReason },
    });

    dispatchNotification({
      recipientId: transfer.requestedById,
      type: 'approval',
      title: 'Transfer Rejected',
      message: `Your transfer request #${transfer.transferNumber} has been rejected. Reason: ${rejectionReason}`,
      reference: { entity: 'Transfer', entityId: id },
    });

    return updated!;
  }

  async complete(id: string, actorId: string, req?: Request): Promise<ITransfer> {
    const transfer = await this.repo.findById(id);
    if (!transfer) throw new NotFoundError('Transfer not found');
    if (!VALID_COMPLETIONS[transfer.status]?.includes('completed')) {
      throw new BusinessRuleError(`Cannot complete a transfer in '${transfer.status}' state`);
    }

    const asset = await this.assets.findById(transfer.assetId);
    if (!asset) throw new NotFoundError('Asset not found');

    await this.assets.update(transfer.assetId, {
      assignedTo: transfer.requestedHolderId,
    });

    const updated = await this.repo.update(id, { status: 'completed' });

    recordActivity({
      req,
      userId: actorId,
      action: 'transfer.completed',
      entity: 'Transfer',
      entityId: id,
      newValue: { status: 'completed' },
    });

    dispatchNotification({
      recipientId: transfer.requestedById,
      type: 'transfer',
      title: 'Transfer Completed',
      message: `Transfer #${transfer.transferNumber} has been completed.`,
      reference: { entity: 'Transfer', entityId: id },
    });

    return updated!;
  }

  async cancel(id: string, actorId: string, remarks?: string, req?: Request): Promise<ITransfer> {
    const transfer = await this.repo.findById(id);
    if (!transfer) throw new NotFoundError('Transfer not found');
    if (transfer.status !== 'requested' && transfer.status !== 'approved') {
      throw new BusinessRuleError('Only requested or approved transfers can be cancelled');
    }

    if (transfer.status === 'approved') {
      const allocation = await this.allocations.findById(transfer.allocationId);
      if (allocation && allocation.status === 'transferred') {
        await this.allocations.update(transfer.allocationId, { status: 'allocated' });
      }
    }

    const updated = await this.repo.update(id, { status: 'cancelled' });

    recordActivity({
      req,
      userId: actorId,
      action: 'transfer.cancelled',
      entity: 'Transfer',
      entityId: id,
      oldValue: { status: transfer.status },
      newValue: { status: 'cancelled' },
    });

    dispatchNotification({
      recipientId: transfer.requestedById,
      type: 'transfer',
      title: 'Transfer Cancelled',
      message: `Transfer #${transfer.transferNumber} has been cancelled.`,
      reference: { entity: 'Transfer', entityId: id },
    });

    return updated!;
  }

  async getById(id: string): Promise<ITransfer | null> {
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
      assetId: query.assetId as string | undefined,
      currentHolderId: query.currentHolderId as string | undefined,
      requestedHolderId: query.requestedHolderId as string | undefined,
      sortBy: query.sortBy as string | undefined,
      sortOrder: query.sortOrder as 'asc' | 'desc' | undefined,
    });
    const total = await this.repo.count({
      search: query.search as string | undefined,
      status: query.status as string | undefined,
      assetId: query.assetId as string | undefined,
      currentHolderId: query.currentHolderId as string | undefined,
      requestedHolderId: query.requestedHolderId as string | undefined,
    });
    return { data, page, limit, total };
  }

  async getStatusCounts(): Promise<Record<string, number>> {
    return this.repo.countByStatus();
  }
}
