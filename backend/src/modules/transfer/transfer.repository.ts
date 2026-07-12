import { FilterQuery, Model, SortOrder } from 'mongoose';
import { ITransfer, TransferModel } from './transfer.model';

export interface TransferFilter {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  status?: string;
  assetId?: string;
  allocationId?: string;
  currentHolderId?: string;
  requestedHolderId?: string;
  requestedById?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class TransferRepository {
  constructor(private readonly model: Model<ITransfer> = TransferModel) {}

  async create(data: Partial<ITransfer>): Promise<ITransfer> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<ITransfer | null> {
    return this.model.findById(id).exec();
  }

  async findByTransferNumber(transferNumber: string): Promise<ITransfer | null> {
    return this.model.findOne({ transferNumber }).exec();
  }

  async findAll(filter: TransferFilter): Promise<ITransfer[]> {
    return this.model
      .find(this.buildQuery(filter))
      .skip(filter.skip)
      .limit(filter.limit)
      .sort(this.buildSort(filter))
      .exec();
  }

  async count(filter: Partial<TransferFilter>): Promise<number> {
    return this.model.countDocuments(this.buildQuery(filter)).exec();
  }

  async update(id: string, data: Partial<ITransfer>): Promise<ITransfer | null> {
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

  private buildQuery(filter: Partial<TransferFilter>): FilterQuery<ITransfer> {
    const query: FilterQuery<ITransfer> = {};

    if (filter.status) query.status = filter.status;
    if (filter.assetId) query.assetId = filter.assetId;
    if (filter.allocationId) query.allocationId = filter.allocationId;
    if (filter.currentHolderId) query.currentHolderId = filter.currentHolderId;
    if (filter.requestedHolderId) query.requestedHolderId = filter.requestedHolderId;
    if (filter.requestedById) query.requestedById = filter.requestedById;

    if (filter.search) {
      const searchRegex = { $regex: filter.search, $options: 'i' };
      query.$or = [
        { transferNumber: searchRegex },
        { requestReason: searchRegex },
        { rejectionReason: searchRegex },
      ];
    }

    return query;
  }

  private buildSort(filter: Partial<TransferFilter>): Record<string, SortOrder> {
    const order: SortOrder = filter.sortOrder === 'asc' ? 1 : -1;
    switch (filter.sortBy) {
      case 'oldest':
        return { createdAt: 1 };
      case 'requestedAt':
        return { createdAt: order };
      case 'newest':
      default:
        return { createdAt: -1 };
    }
  }
}
