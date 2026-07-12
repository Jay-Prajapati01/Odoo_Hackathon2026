import { FilterQuery, Model, SortOrder } from 'mongoose';
import { IMaintenance, MaintenanceModel } from './maintenance.model';

export interface MaintenanceFilter {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  status?: string;
  priority?: string;
  assetId?: string;
  departmentId?: string;
  requestedById?: string;
  assignedTechnicianId?: string;
  requestedDateFrom?: Date;
  requestedDateTo?: Date;
  completionDateFrom?: Date;
  completionDateTo?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class MaintenanceRepository {
  constructor(private readonly model: Model<IMaintenance> = MaintenanceModel) {}

  async create(data: Partial<IMaintenance>): Promise<IMaintenance> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<IMaintenance | null> {
    return this.model.findById(id).exec();
  }

  async findByRequestNumber(requestNumber: string): Promise<IMaintenance | null> {
    return this.model.findOne({ requestNumber }).exec();
  }

  async findActiveByAsset(assetId: string): Promise<IMaintenance | null> {
    const activeStatuses = ['pending', 'approved', 'technician_assigned', 'in_progress'];
    return this.model.findOne({ assetId, status: { $in: activeStatuses } }).exec();
  }

  async findAll(filter: MaintenanceFilter): Promise<IMaintenance[]> {
    return this.model
      .find(this.buildQuery(filter))
      .skip(filter.skip)
      .limit(filter.limit)
      .sort(this.buildSort(filter))
      .exec();
  }

  async count(filter: Partial<MaintenanceFilter>): Promise<number> {
    return this.model.countDocuments(this.buildQuery(filter)).exec();
  }

  async update(id: string, data: Partial<IMaintenance>): Promise<IMaintenance | null> {
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

  async countOpen(): Promise<number> {
    const statuses = ['pending', 'approved', 'technician_assigned', 'in_progress'];
    return this.model.countDocuments({ status: { $in: statuses } }).exec();
  }

  async getMaintenanceStats(): Promise<{
    totalPending: number;
    totalInProgress: number;
    totalResolved: number;
    totalCost: number;
    byPriority: Array<{ _id: string; count: number }>;
  }> {
    const [totalPending, totalInProgress, totalResolved, costAgg, byPriority] = await Promise.all([
      this.model.countDocuments({ status: 'pending' }).exec(),
      this.model.countDocuments({ status: { $in: ['approved', 'technician_assigned', 'in_progress'] } }).exec(),
      this.model.countDocuments({ status: 'resolved' }).exec(),
      this.model.aggregate([
        { $match: { actualCost: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$actualCost' } } },
      ]).exec(),
      this.model.aggregate([
        { $match: {} },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]).exec(),
    ]);
    return {
      totalPending,
      totalInProgress,
      totalResolved,
      totalCost: costAgg[0]?.total ?? 0,
      byPriority,
    };
  }

  private buildQuery(filter: Partial<MaintenanceFilter>): FilterQuery<IMaintenance> {
    const query: FilterQuery<IMaintenance> = {};

    if (filter.status) query.status = filter.status;
    if (filter.priority) query.priority = filter.priority;
    if (filter.assetId) query.assetId = filter.assetId;
    if (filter.departmentId) query.departmentId = filter.departmentId;
    if (filter.requestedById) query.requestedById = filter.requestedById;
    if (filter.assignedTechnicianId) query.assignedTechnicianId = filter.assignedTechnicianId;

    if (filter.requestedDateFrom || filter.requestedDateTo) {
      query.requestedDate = {};
      if (filter.requestedDateFrom) query.requestedDate.$gte = filter.requestedDateFrom;
      if (filter.requestedDateTo) query.requestedDate.$lte = filter.requestedDateTo;
    }

    if (filter.completionDateFrom || filter.completionDateTo) {
      query.completionDate = {};
      if (filter.completionDateFrom) query.completionDate.$gte = filter.completionDateFrom;
      if (filter.completionDateTo) query.completionDate.$lte = filter.completionDateTo;
    }

    if (filter.search) {
      const searchRegex = { $regex: filter.search, $options: 'i' };
      query.$or = [
        { requestNumber: searchRegex },
        { issueTitle: searchRegex },
        { issueDescription: searchRegex },
        { resolutionSummary: searchRegex },
      ];
    }

    return query;
  }

  private buildSort(filter: Partial<MaintenanceFilter>): Record<string, SortOrder> {
    const order: SortOrder = filter.sortOrder === 'asc' ? 1 : -1;
    switch (filter.sortBy) {
      case 'oldest':
        return { createdAt: 1 };
      case 'priority': {
        const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return { priority: 1, createdAt: -1 };
      }
      case 'completionDate':
        return { completionDate: order };
      case 'estimatedCost':
        return { estimatedCost: order };
      case 'requestedDate':
        return { requestedDate: order };
      case 'newest':
      default:
        return { createdAt: -1 };
    }
  }
}
