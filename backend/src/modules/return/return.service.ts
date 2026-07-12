import { Request } from 'express';
import { ReturnRepository } from './return.repository';
import { AllocationRepository } from '../allocation/allocation.repository';
import { AllocationHistoryRepository } from '../allocation/models/allocation-history.repository';
import { AssetRepository } from '../asset/asset.repository';
import { EmployeeRepository } from '../organization/repositories/employee.repository';
import { IReturn, ReturnCondition } from './return.model';
import { NotFoundError, BusinessRuleError, ConflictError } from '../../common/errors';
import { parsePagination } from '../../utils/pagination';
import { recordActivity, dispatchNotification } from '../../shared/events';

export class ReturnService {
  constructor(
    private readonly repo: ReturnRepository,
    private readonly allocations: AllocationRepository,
    private readonly allocationHistoryRepo: AllocationHistoryRepository,
    private readonly assets: AssetRepository,
    private readonly employees: EmployeeRepository
  ) {}

  async requestReturn(
    data: {
      allocationId: string;
      condition: string;
      damageNotes?: string;
      photos?: string[];
      remarks?: string;
    },
    actorId: string,
    req?: Request
  ): Promise<IReturn> {
    const allocation = await this.allocations.findById(data.allocationId);
    if (!allocation) throw new NotFoundError('Allocation not found');
    if (allocation.status === 'returned') throw new BusinessRuleError('Allocation already returned');
    if (allocation.status === 'cancelled') throw new BusinessRuleError('Cannot return a cancelled allocation');
    if (allocation.status === 'pending') throw new BusinessRuleError('Allocation is still pending');

    const existingReturn = await this.repo.findByAllocationId(data.allocationId);
    if (existingReturn) throw new ConflictError('Return already processed for this allocation');

    const employee = await this.employees.findById(allocation.employeeId);
    const asset = await this.assets.findById(allocation.assetId);

    const ret = await this.repo.create({
      allocationId: data.allocationId,
      assetId: allocation.assetId,
      returnedById: actorId,
      receivedById: allocation.allocatedById,
      condition: data.condition as ReturnCondition,
      damageNotes: data.damageNotes,
      photos: data.photos ?? [],
      returnDate: new Date(),
      remarks: data.remarks,
    });

    await this.allocations.update(data.allocationId, {
      status: 'returned',
      actualReturnDate: new Date(),
      conditionAtReturn: data.condition as any,
    });

    await this.assets.update(allocation.assetId, {
      status: 'available',
      assignedTo: undefined,
      condition: data.condition as any,
    });

    await this.allocationHistoryRepo.create({
      allocationId: data.allocationId,
      allocationNumber: allocation.allocationNumber,
      action: 'returned',
      assetId: allocation.assetId,
      employeeId: allocation.employeeId,
      departmentId: allocation.departmentId,
      performedBy: actorId,
      details: {
        condition: data.condition,
        damageNotes: data.damageNotes,
        photos: data.photos,
      },
    });

    recordActivity({
      req,
      userId: actorId,
      action: 'return.completed',
      entity: 'Allocation',
      entityId: data.allocationId,
      oldValue: { status: allocation.status },
      newValue: { status: 'returned', condition: data.condition },
    });

    dispatchNotification({
      recipientId: allocation.allocatedById,
      type: 'general',
      title: 'Asset Return Completed',
      message: `Asset ${asset?.assetTag ?? 'N/A'} has been returned by ${employee?.firstName ?? 'employee'} ${employee?.lastName ?? ''}. Condition: ${data.condition}`,
      reference: { entity: 'Allocation', entityId: data.allocationId },
    });

    return ret;
  }

  async getById(id: string): Promise<IReturn | null> {
    return this.repo.findById(id);
  }

  async list(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePagination(query);
    const data = await this.repo.findAll({
      page,
      limit,
      skip,
      search: query.search as string | undefined,
      condition: query.condition as string | undefined,
      allocationId: query.allocationId as string | undefined,
      assetId: query.assetId as string | undefined,
      sortBy: query.sortBy as string | undefined,
      sortOrder: query.sortOrder as 'asc' | 'desc' | undefined,
      returnDateFrom: query.returnDateFrom ? new Date(query.returnDateFrom as string) : undefined,
      returnDateTo: query.returnDateTo ? new Date(query.returnDateTo as string) : undefined,
    });
    const total = await this.repo.count({
      search: query.search as string | undefined,
      condition: query.condition as string | undefined,
      allocationId: query.allocationId as string | undefined,
      assetId: query.assetId as string | undefined,
    });
    return { data, page, limit, total };
  }
}
