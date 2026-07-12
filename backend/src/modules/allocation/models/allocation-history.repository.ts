import { IAllocationHistory, AllocationHistoryModel } from './allocation-history.model';
import { Model } from 'mongoose';

export interface AllocationHistoryFilter {
  allocationId?: string;
  assetId?: string;
  employeeId?: string;
  action?: string;
  page: number;
  limit: number;
  skip: number;
}

export class AllocationHistoryRepository {
  constructor(private readonly model: Model<IAllocationHistory> = AllocationHistoryModel) {}

  async create(data: Partial<IAllocationHistory>): Promise<IAllocationHistory> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<IAllocationHistory | null> {
    return this.model.findById(id).exec();
  }

  async findAll(filter: AllocationHistoryFilter): Promise<IAllocationHistory[]> {
    const query: Record<string, unknown> = {};
    if (filter.allocationId) query.allocationId = filter.allocationId;
    if (filter.assetId) query.assetId = filter.assetId;
    if (filter.employeeId) query.employeeId = filter.employeeId;
    if (filter.action) query.action = filter.action;
    return this.model.find(query).skip(filter.skip).limit(filter.limit).sort({ createdAt: -1 }).exec();
  }

  async count(filter: Partial<AllocationHistoryFilter>): Promise<number> {
    const query: Record<string, unknown> = {};
    if (filter.allocationId) query.allocationId = filter.allocationId;
    if (filter.assetId) query.assetId = filter.assetId;
    if (filter.employeeId) query.employeeId = filter.employeeId;
    if (filter.action) query.action = filter.action;
    return this.model.countDocuments(query).exec();
  }
}
