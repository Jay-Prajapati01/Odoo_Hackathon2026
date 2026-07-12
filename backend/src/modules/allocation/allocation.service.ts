import { Request } from 'express';
import { AllocationRepository } from './allocation.repository';
import { AllocationHistoryRepository } from './models/allocation-history.repository';
import { AssetRepository } from '../asset/asset.repository';
import { EmployeeRepository } from '../organization/repositories/employee.repository';
import { DepartmentRepository } from '../organization/repositories/department.repository';
import { IAllocation, AllocationStatus } from './allocation.model';
import { NotFoundError, BusinessRuleError, ConflictError } from '../../common/errors';
import { parsePagination } from '../../utils/pagination';
import { generateReferenceId } from '../../utils/helpers';
import { recordActivity, dispatchNotification } from '../../shared/events';

const BLOCKED_ASSET_STATUSES = ['lost', 'retired', 'disposed', 'maintenance', 'reserved'];

const VALID_STATUS_TRANSITIONS: Record<AllocationStatus, AllocationStatus[]> = {
  pending: ['allocated', 'cancelled'],
  allocated: ['returned', 'overdue', 'transferred', 'cancelled'],
  returned: [],
  overdue: ['returned', 'cancelled'],
  cancelled: [],
  transferred: [],
};

export class AllocationService {
  constructor(
    private readonly repo: AllocationRepository,
    private readonly historyRepo: AllocationHistoryRepository,
    private readonly assets: AssetRepository,
    private readonly employees: EmployeeRepository,
    private readonly departments: DepartmentRepository
  ) {}

  async allocate(
    data: {
      assetId: string;
      employeeId: string;
      departmentId: string;
      expectedReturnDate?: string;
      purpose?: string;
      conditionAtAllocation?: string;
      remarks?: string;
    },
    actorId: string,
    req?: Request
  ): Promise<IAllocation> {
    const asset = await this.assets.findById(data.assetId);
    if (!asset) throw new NotFoundError('Asset not found');
    if (BLOCKED_ASSET_STATUSES.includes(asset.status)) {
      throw new BusinessRuleError(`Asset is '${asset.status}' and cannot be allocated`);
    }

    const active = await this.repo.findActiveByAsset(data.assetId);
    if (active) throw new ConflictError('Asset already has an active allocation');

    const employee = await this.employees.findById(data.employeeId);
    if (!employee) throw new NotFoundError('Employee not found');
    if (employee.employmentStatus !== 'active') {
      throw new BusinessRuleError('Inactive or deleted employee cannot receive assets');
    }

    const department = await this.departments.findById(data.departmentId);
    if (!department) throw new NotFoundError('Department not found');

    const allocationNumber = generateReferenceId('ALC');

    const allocation = await this.repo.create({
      allocationNumber,
      assetId: data.assetId,
      employeeId: data.employeeId,
      departmentId: data.departmentId,
      allocatedById: actorId,
      allocationDate: new Date(),
      expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : undefined,
      purpose: data.purpose,
      status: 'allocated',
      conditionAtAllocation: data.conditionAtAllocation as any,
      remarks: data.remarks,
    });

    await this.assets.update(data.assetId, {
      status: 'allocated',
      assignedTo: data.employeeId,
      departmentId: data.departmentId,
    });

    await this.historyRepo.create({
      allocationId: allocation.id,
      allocationNumber,
      action: 'allocated',
      assetId: data.assetId,
      employeeId: data.employeeId,
      departmentId: data.departmentId,
      performedBy: actorId,
      details: { purpose: data.purpose, expectedReturnDate: data.expectedReturnDate },
    });

    recordActivity({
      req,
      userId: actorId,
      action: 'allocation.created',
      entity: 'Allocation',
      entityId: allocation.id,
      newValue: allocation.toObject(),
    });

    dispatchNotification({
      recipientId: employee.userId,
      type: 'general',
      title: 'Asset Allocated',
      message: `Asset ${asset.assetTag} has been allocated to you. Allocation #${allocationNumber}`,
      reference: { entity: 'Allocation', entityId: allocation.id },
    });

    return allocation;
  }

  async cancel(id: string, actorId: string, remarks?: string, req?: Request): Promise<IAllocation> {
    const allocation = await this.repo.findById(id);
    if (!allocation) throw new NotFoundError('Allocation not found');
    this.assertValidTransition(allocation.status, 'cancelled');

    const updated = await this.repo.update(id, {
      status: 'cancelled',
      remarks: remarks ?? allocation.remarks,
    });

    await this.assets.update(allocation.assetId, { status: 'available', assignedTo: undefined });

    await this.historyRepo.create({
      allocationId: id,
      allocationNumber: allocation.allocationNumber,
      action: 'cancelled',
      assetId: allocation.assetId,
      employeeId: allocation.employeeId,
      departmentId: allocation.departmentId,
      performedBy: actorId,
      details: { reason: remarks },
    });

    recordActivity({
      req,
      userId: actorId,
      action: 'allocation.cancelled',
      entity: 'Allocation',
      entityId: id,
      oldValue: { status: allocation.status },
      newValue: { status: 'cancelled' },
    });

    dispatchNotification({
      recipientId: allocation.allocatedById,
      type: 'general',
      title: 'Allocation Cancelled',
      message: `Allocation #${allocation.allocationNumber} has been cancelled.`,
      reference: { entity: 'Allocation', entityId: id },
    });

    return updated!;
  }

  async returnAsset(
    id: string,
    data: {
      conditionAtReturn: string;
      damageNotes?: string;
      photos?: string[];
      remarks?: string;
    },
    actorId: string,
    req?: Request
  ): Promise<IAllocation> {
    const allocation = await this.repo.findById(id);
    if (!allocation) throw new NotFoundError('Allocation not found');
    if (allocation.status === 'returned') throw new BusinessRuleError('Allocation already returned');
    if (allocation.status === 'cancelled') throw new BusinessRuleError('Cannot return a cancelled allocation');

    const updated = await this.repo.update(id, {
      status: 'returned',
      actualReturnDate: new Date(),
      conditionAtReturn: data.conditionAtReturn as any,
      remarks: data.remarks ?? allocation.remarks,
    });

    await this.assets.update(allocation.assetId, {
      status: 'available',
      assignedTo: undefined,
      condition: data.conditionAtReturn as any,
    });

    await this.historyRepo.create({
      allocationId: id,
      allocationNumber: allocation.allocationNumber,
      action: 'returned',
      assetId: allocation.assetId,
      employeeId: allocation.employeeId,
      departmentId: allocation.departmentId,
      performedBy: actorId,
      details: {
        conditionAtReturn: data.conditionAtReturn,
        damageNotes: data.damageNotes,
        photos: data.photos,
      },
    });

    recordActivity({
      req,
      userId: actorId,
      action: 'allocation.returned',
      entity: 'Allocation',
      entityId: id,
      oldValue: { status: allocation.status },
      newValue: { status: 'returned', conditionAtReturn: data.conditionAtReturn },
    });

    dispatchNotification({
      recipientId: allocation.allocatedById,
      type: 'general',
      title: 'Asset Return Completed',
      message: `Asset from allocation #${allocation.allocationNumber} has been returned.`,
      reference: { entity: 'Allocation', entityId: id },
    });

    return updated!;
  }

  async update(
    id: string,
    data: { expectedReturnDate?: string; purpose?: string; conditionAtAllocation?: string; remarks?: string },
    actorId: string,
    req?: Request
  ): Promise<IAllocation> {
    const allocation = await this.repo.findById(id);
    if (!allocation) throw new NotFoundError('Allocation not found');
    if (allocation.status !== 'allocated' && allocation.status !== 'overdue') {
      throw new BusinessRuleError('Only active allocations can be updated');
    }

    const patch: Partial<IAllocation> = {};
    if (data.expectedReturnDate !== undefined) patch.expectedReturnDate = new Date(data.expectedReturnDate);
    if (data.purpose !== undefined) patch.purpose = data.purpose;
    if (data.conditionAtAllocation !== undefined) patch.conditionAtAllocation = data.conditionAtAllocation as any;
    if (data.remarks !== undefined) patch.remarks = data.remarks;

    const updated = await this.repo.update(id, patch);

    recordActivity({
      req,
      userId: actorId,
      action: 'allocation.updated',
      entity: 'Allocation',
      entityId: id,
      oldValue: allocation.toObject(),
      newValue: updated!.toObject(),
    });

    return updated!;
  }

  async checkOverdue(actorId: string, req?: Request): Promise<number> {
    const now = new Date();
    const overdueAllocations = await this.repo.findAll({
      status: 'allocated',
      expectedReturnTo: now,
      page: 1,
      limit: 1000,
      skip: 0,
    });

    let count = 0;
    for (const allocation of overdueAllocations) {
      if (allocation.expectedReturnDate && allocation.expectedReturnDate < now) {
        await this.repo.update(allocation.id, { status: 'overdue' });
        count++;

        await this.historyRepo.create({
          allocationId: allocation.id,
          allocationNumber: allocation.allocationNumber,
          action: 'overdue',
          assetId: allocation.assetId,
          employeeId: allocation.employeeId,
          departmentId: allocation.departmentId,
          performedBy: actorId,
          details: { expectedReturnDate: allocation.expectedReturnDate, overdueAt: now },
        });

        dispatchNotification({
          recipientId: allocation.allocatedById,
          type: 'overdue',
          title: 'Overdue Return',
          message: `Allocation #${allocation.allocationNumber} has passed its expected return date.`,
          reference: { entity: 'Allocation', entityId: allocation.id },
        });
      }
    }
    return count;
  }

  async getById(id: string): Promise<IAllocation | null> {
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
      employeeId: query.employeeId as string | undefined,
      departmentId: query.departmentId as string | undefined,
      assetId: query.assetId as string | undefined,
      sortBy: query.sortBy as string | undefined,
      sortOrder: query.sortOrder as 'asc' | 'desc' | undefined,
      allocationDateFrom: query.allocationDateFrom ? new Date(query.allocationDateFrom as string) : undefined,
      allocationDateTo: query.allocationDateTo ? new Date(query.allocationDateTo as string) : undefined,
      expectedReturnFrom: query.expectedReturnFrom ? new Date(query.expectedReturnFrom as string) : undefined,
      expectedReturnTo: query.expectedReturnTo ? new Date(query.expectedReturnTo as string) : undefined,
    });
    const total = await this.repo.count({
      search: query.search as string | undefined,
      status: query.status as string | undefined,
      employeeId: query.employeeId as string | undefined,
      departmentId: query.departmentId as string | undefined,
      assetId: query.assetId as string | undefined,
    });
    return { data, page, limit, total };
  }

  async getHistory(id: string, query: Record<string, unknown>) {
    const { page, limit, skip } = parsePagination(query);
    const data = await this.historyRepo.findAll({
      allocationId: id,
      page,
      limit,
      skip,
    });
    const total = await this.historyRepo.count({ allocationId: id });
    return { data, page, limit, total };
  }

  async getStatusCounts(): Promise<Record<string, number>> {
    return this.repo.countByStatus();
  }

  private assertValidTransition(from: AllocationStatus, to: AllocationStatus): void {
    const allowed = VALID_STATUS_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BusinessRuleError(`Cannot transition allocation from '${from}' to '${to}'`);
    }
  }
}
