import { FilterQuery, Model, SortOrder } from 'mongoose';
import { IAllocation, AllocationModel } from './allocation.model';

export interface AllocationFilter {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  status?: string;
  employeeId?: string;
  departmentId?: string;
  assetId?: string;
  allocationDateFrom?: Date;
  allocationDateTo?: Date;
  expectedReturnFrom?: Date;
  expectedReturnTo?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class AllocationRepository {
  constructor(private readonly model: Model<IAllocation> = AllocationModel) {}

  async create(data: Partial<IAllocation>): Promise<IAllocation> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<IAllocation | null> {
    return this.model.findById(id).exec();
  }

  async findByAllocationNumber(allocationNumber: string): Promise<IAllocation | null> {
    return this.model.findOne({ allocationNumber }).exec();
  }

  async findActiveByAsset(assetId: string): Promise<IAllocation | null> {
    return this.model.findOne({ assetId, status: { $in: ['allocated', 'overdue'] } }).exec();
  }

  async findAll(filter: AllocationFilter): Promise<IAllocation[]> {
    return this.model
      .find(this.buildQuery(filter))
      .skip(filter.skip)
      .limit(filter.limit)
      .sort(this.buildSort(filter))
      .exec();
  }

  async count(filter: Partial<AllocationFilter>): Promise<number> {
    return this.model.countDocuments(this.buildQuery(filter)).exec();
  }

  async update(id: string, data: Partial<IAllocation>): Promise<IAllocation | null> {
    return this.model.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  }

  async countByStatus(): Promise<Record<string, number>> {
    const results = await this.model.aggregate([
      { $match: {} },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const counts: Record<string, number> = {};
    results.forEach((r) => (counts[r._id] = r.count));
    return counts;
  }

  private buildQuery(filter: Partial<AllocationFilter>): FilterQuery<IAllocation> {
    const query: FilterQuery<IAllocation> = {};

    if (filter.status) query.status = filter.status;
    if (filter.employeeId) query.employeeId = filter.employeeId;
    if (filter.departmentId) query.departmentId = filter.departmentId;
    if (filter.assetId) query.assetId = filter.assetId;

    if (filter.allocationDateFrom || filter.allocationDateTo) {
      query.allocationDate = {};
      if (filter.allocationDateFrom) query.allocationDate.$gte = filter.allocationDateFrom;
      if (filter.allocationDateTo) query.allocationDate.$lte = filter.allocationDateTo;
    }

    if (filter.expectedReturnFrom || filter.expectedReturnTo) {
      query.expectedReturnDate = {};
      if (filter.expectedReturnFrom) query.expectedReturnDate.$gte = filter.expectedReturnFrom;
      if (filter.expectedReturnTo) query.expectedReturnDate.$lte = filter.expectedReturnTo;
    }

    if (filter.search) {
      const searchRegex = { $regex: filter.search, $options: 'i' };
      query.$or = [
        { allocationNumber: searchRegex },
        { purpose: searchRegex },
        { remarks: searchRegex },
      ];
    }

    return query;
  }

  private buildSort(filter: Partial<AllocationFilter>): Record<string, SortOrder> {
    const order: SortOrder = filter.sortOrder === 'asc' ? 1 : -1;
    switch (filter.sortBy) {
      case 'oldest':
        return { createdAt: 1 };
      case 'allocationDate':
        return { allocationDate: order };
      case 'expectedReturn':
        return { expectedReturnDate: order };
      case 'newest':
      default:
        return { createdAt: -1 };
    }
  }
}
