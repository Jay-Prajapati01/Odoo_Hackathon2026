import { IMaintenanceHistory, MaintenanceHistoryModel } from './maintenance-history.model';
import { Model } from 'mongoose';

export interface MaintenanceHistoryFilter {
  maintenanceId?: string;
  assetId?: string;
  action?: string;
  page: number;
  limit: number;
  skip: number;
}

export class MaintenanceHistoryRepository {
  constructor(private readonly model: Model<IMaintenanceHistory> = MaintenanceHistoryModel) {}

  async create(data: Partial<IMaintenanceHistory>): Promise<IMaintenanceHistory> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<IMaintenanceHistory | null> {
    return this.model.findById(id).exec();
  }

  async findAll(filter: MaintenanceHistoryFilter): Promise<IMaintenanceHistory[]> {
    const query: Record<string, unknown> = {};
    if (filter.maintenanceId) query.maintenanceId = filter.maintenanceId;
    if (filter.assetId) query.assetId = filter.assetId;
    if (filter.action) query.action = filter.action;
    return this.model.find(query).skip(filter.skip).limit(filter.limit).sort({ createdAt: -1 }).exec();
  }

  async count(filter: Partial<MaintenanceHistoryFilter>): Promise<number> {
    const query: Record<string, unknown> = {};
    if (filter.maintenanceId) query.maintenanceId = filter.maintenanceId;
    if (filter.assetId) query.assetId = filter.assetId;
    if (filter.action) query.action = filter.action;
    return this.model.countDocuments(query).exec();
  }
}
