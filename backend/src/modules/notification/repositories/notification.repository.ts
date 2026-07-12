import { Model } from 'mongoose';
import {
  INotification,
  NotificationModel,
  NotificationPriority,
  NotificationStatus,
} from '../models/notification.model';
import { NotificationFilter, NotificationScope } from '../interfaces/notification.interface';

const PRIORITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 } as const;
const STATUS_RANK = { unread: 0, read: 1, archived: 2, deleted: 3 } as const;

export class NotificationRepository {
  constructor(private readonly model: Model<INotification> = NotificationModel) {}

  async create(data: Partial<INotification>): Promise<INotification> {
    return this.model.create(data);
  }

  private isOwner(doc: INotification, scope: NotificationScope): boolean {
    if (scope.roleName === 'Admin' || scope.roleName === 'Asset Manager') return true;
    if (scope.roleName === 'Department Head') {
      return doc.receiver === scope.userId || (scope.departmentId != null && doc.departmentId === scope.departmentId);
    }
    return doc.receiver === scope.userId;
  }

  private buildMatch(filter: NotificationFilter): Record<string, unknown> {
    const match: Record<string, unknown> = { ...(filter.scope ?? {}) };
    if (filter.type) match.type = filter.type;
    if (filter.status) {
      match.status = Array.isArray(filter.status) ? { $in: filter.status } : filter.status;
    }
    if (filter.priority) match.priority = filter.priority;
    if (filter.module) match.module = filter.module;
    if (filter.user) match.receiver = filter.user;
    if (filter.entity) match.entityId = filter.entity;
    if (filter.dateFrom || filter.dateTo) {
      const range: Record<string, Date> = {};
      if (filter.dateFrom) range.$gte = filter.dateFrom;
      if (filter.dateTo) range.$lte = filter.dateTo;
      match.createdAt = range;
    }
    if (filter.search) {
      const term = filter.search;
      match.$or = [
        { title: { $regex: term, $options: 'i' } },
        { module: { $regex: term, $options: 'i' } },
        { receiver: { $regex: term, $options: 'i' } },
        { entityId: { $regex: term, $options: 'i' } },
      ];
    }
    return match;
  }

  async list(filter: NotificationFilter): Promise<INotification[]> {
    const match = this.buildMatch(filter);
    const pipeline: any[] = [{ $match: match }];
    const sortStage: Record<string, 1 | -1> = {};
    if (filter.sort === 'priority') {
      pipeline.push({
        $addFields: { __pr: { $switch: { branches: [
          { case: { $eq: ['$priority', 'critical'] }, then: 4 },
          { case: { $eq: ['$priority', 'high'] }, then: 3 },
          { case: { $eq: ['$priority', 'medium'] }, then: 2 },
          { case: { $eq: ['$priority', 'low'] }, then: 1 },
        ], default: 0 } } },
      });
      sortStage.__pr = -1;
      sortStage.createdAt = -1;
    } else if (filter.sort === 'unread') {
      pipeline.push({
        $addFields: { __sr: { $switch: { branches: [
          { case: { $eq: ['$status', 'unread'] }, then: 0 },
          { case: { $eq: ['$status', 'read'] }, then: 1 },
          { case: { $eq: ['$status', 'archived'] }, then: 2 },
          { case: { $eq: ['$status', 'deleted'] }, then: 3 },
        ], default: 4 } } },
      });
      sortStage.__sr = 1;
      sortStage.createdAt = -1;
    } else if (filter.sort === 'oldest') {
      sortStage.createdAt = 1;
    } else {
      sortStage.createdAt = -1;
    }
    pipeline.push({ $sort: sortStage });
    pipeline.push({ $skip: filter.skip });
    pipeline.push({ $limit: filter.limit });
    return this.model.aggregate(pipeline).exec() as unknown as Promise<INotification[]>;
  }

  async count(filter: NotificationFilter): Promise<number> {
    return this.model.countDocuments(this.buildMatch(filter)).exec();
  }

  async unreadCount(scopeQuery: Record<string, unknown>): Promise<number> {
    return this.model.countDocuments({ ...scopeQuery, status: 'unread' }).exec();
  }

  async markAllRead(scopeQuery: Record<string, unknown>): Promise<number> {
    const result = await this.model.updateMany(
      { ...scopeQuery, status: 'unread' },
      { $set: { status: 'read', readAt: new Date() } }
    ).exec();
    return result.modifiedCount;
  }

  async findById(id: string, scope?: NotificationScope): Promise<INotification | null> {
    const doc = await this.model.findById(id).exec();
    if (!doc) return null;
    if (scope && !this.isOwner(doc, scope)) return null;
    return doc;
  }

  async updateStatus(
    id: string,
    status: NotificationStatus,
    extra: Record<string, unknown> = {}
  ): Promise<INotification | null> {
    return this.model
      .findByIdAndUpdate(id, { $set: { status, ...extra, updatedAt: new Date() } }, { new: true })
      .exec();
  }

  async markRead(id: string, scope: NotificationScope): Promise<INotification | null> {
    const doc = await this.model.findById(id).exec();
    if (!doc || (scope && !this.isOwner(doc, scope))) return null;
    return this.model
      .findByIdAndUpdate(id, { $set: { status: 'read', readAt: new Date(), updatedAt: new Date() } }, { new: true })
      .exec();
  }

  async archive(id: string, scope: NotificationScope): Promise<INotification | null> {
    const doc = await this.model.findById(id).exec();
    if (!doc || (scope && !this.isOwner(doc, scope))) return null;
    return this.model.findByIdAndUpdate(id, { $set: { status: 'archived', updatedAt: new Date() } }, { new: true }).exec();
  }

  async remove(id: string, scope: NotificationScope): Promise<INotification | null> {
    const doc = await this.model.findById(id).exec();
    if (!doc || (scope && !this.isOwner(doc, scope))) return null;
    return this.model.findByIdAndUpdate(id, { $set: { status: 'deleted', updatedAt: new Date() } }, { new: true }).exec();
  }
}
