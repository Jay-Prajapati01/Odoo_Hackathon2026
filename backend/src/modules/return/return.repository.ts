import { FilterQuery, Model, SortOrder } from 'mongoose';
import { IReturn, ReturnModel } from './return.model';

export interface ReturnFilter {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  condition?: string;
  allocationId?: string;
  assetId?: string;
  returnedById?: string;
  returnDateFrom?: Date;
  returnDateTo?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ReturnRepository {
  constructor(private readonly model: Model<IReturn> = ReturnModel) {}

  async create(data: Partial<IReturn>): Promise<IReturn> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<IReturn | null> {
    return this.model.findById(id).exec();
  }

  async findByAllocationId(allocationId: string): Promise<IReturn | null> {
    return this.model.findOne({ allocationId }).exec();
  }

  async findAll(filter: ReturnFilter): Promise<IReturn[]> {
    return this.model
      .find(this.buildQuery(filter))
      .skip(filter.skip)
      .limit(filter.limit)
      .sort(this.buildSort(filter))
      .exec();
  }

  async count(filter: Partial<ReturnFilter>): Promise<number> {
    return this.model.countDocuments(this.buildQuery(filter)).exec();
  }

  private buildQuery(filter: Partial<ReturnFilter>): FilterQuery<IReturn> {
    const query: FilterQuery<IReturn> = {};

    if (filter.condition) query.condition = filter.condition;
    if (filter.allocationId) query.allocationId = filter.allocationId;
    if (filter.assetId) query.assetId = filter.assetId;
    if (filter.returnedById) query.returnedById = filter.returnedById;

    if (filter.returnDateFrom || filter.returnDateTo) {
      query.returnDate = {};
      if (filter.returnDateFrom) query.returnDate.$gte = filter.returnDateFrom;
      if (filter.returnDateTo) query.returnDate.$lte = filter.returnDateTo;
    }

    if (filter.search) {
      const searchRegex = { $regex: filter.search, $options: 'i' };
      query.$or = [
        { damageNotes: searchRegex },
        { remarks: searchRegex },
      ];
    }

    return query;
  }

  private buildSort(filter: Partial<ReturnFilter>): Record<string, SortOrder> {
    const order: SortOrder = filter.sortOrder === 'asc' ? 1 : -1;
    switch (filter.sortBy) {
      case 'oldest':
        return { returnDate: 1 };
      case 'newest':
      default:
        return { returnDate: -1 };
    }
  }
}
