import { Model } from 'mongoose';
import { IActivityLog, ActivityLogModel } from '../models/activity-log.model';
import { ActivityLogFilter, ActivityLogScope } from '../interfaces/activity-log.interface';

export class ActivityLogRepository {
  constructor(private readonly model: Model<IActivityLog> = ActivityLogModel) {}

  async create(data: Partial<IActivityLog>): Promise<IActivityLog> {
    return this.model.create(data);
  }

  private isOwner(doc: IActivityLog, scope: ActivityLogScope): boolean {
    if (scope.roleName === 'Admin' || scope.roleName === 'Asset Manager') return true;
    return doc.user === scope.userId;
  }

  private buildMatch(filter: ActivityLogFilter): Record<string, unknown> {
    const match: Record<string, unknown> = { ...(filter.scope ?? {}) };
    if (filter.module) match.module = filter.module;
    if (filter.entityType) match.entityType = filter.entityType;
    if (filter.entityId) match.entityId = filter.entityId;
    if (filter.user) match.user = filter.user;
    if (filter.action) match.action = filter.action;
    if (filter.dateFrom || filter.dateTo) {
      const range: Record<string, Date> = {};
      if (filter.dateFrom) range.$gte = filter.dateFrom;
      if (filter.dateTo) range.$lte = filter.dateTo;
      match.createdAt = range;
    }
    if (filter.search) {
      const term = filter.search;
      match.$or = [
        { description: { $regex: term, $options: 'i' } },
        { user: { $regex: term, $options: 'i' } },
        { entityType: { $regex: term, $options: 'i' } },
        { action: { $regex: term, $options: 'i' } },
      ];
    }
    return match;
  }

  async list(filter: ActivityLogFilter): Promise<IActivityLog[]> {
    const sort: Record<string, 1 | -1> = filter.sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };
    return this.model
      .find(this.buildMatch(filter))
      .skip(filter.skip)
      .limit(filter.limit)
      .sort(sort)
      .exec();
  }

  async count(filter: ActivityLogFilter): Promise<number> {
    return this.model.countDocuments(this.buildMatch(filter)).exec();
  }

  async findById(id: string, scope?: ActivityLogScope): Promise<IActivityLog | null> {
    const doc = await this.model.findById(id).exec();
    if (!doc) return null;
    if (scope && !this.isOwner(doc, scope)) return null;
    return doc;
  }
}
