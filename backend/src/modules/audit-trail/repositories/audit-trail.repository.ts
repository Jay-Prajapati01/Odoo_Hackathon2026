import { Model } from 'mongoose';
import { IAuditTrail, AuditTrailModel } from '../models/audit-trail.model';
import { AuditTrailFilter, AuditTrailScope, CreateAuditTrailInput } from '../interfaces/audit-trail.interface';

export class AuditTrailRepository {
  constructor(private readonly model: Model<IAuditTrail> = AuditTrailModel) {}

  async create(data: Partial<IAuditTrail>): Promise<IAuditTrail> {
    return this.model.create(data);
  }

  private isOwner(doc: IAuditTrail, scope: AuditTrailScope): boolean {
    if (scope.roleName === 'Admin' || scope.roleName === 'Asset Manager') return true;
    return doc.performedBy === scope.userId;
  }

  private buildMatch(filter: AuditTrailFilter): Record<string, unknown> {
    const match: Record<string, unknown> = { ...(filter.scope ?? {}) };
    if (filter.entity) match.entity = filter.entity;
    if (filter.entityId) match.entityId = filter.entityId;
    if (filter.operation) match.operation = filter.operation;
    if (filter.performedBy) match.performedBy = filter.performedBy;
    if (filter.module) match.module = filter.module;
    if (filter.dateFrom || filter.dateTo) {
      const range: Record<string, Date> = {};
      if (filter.dateFrom) range.$gte = filter.dateFrom;
      if (filter.dateTo) range.$lte = filter.dateTo;
      match.timestamp = range;
    }
    if (filter.search) {
      const term = filter.search;
      match.$or = [
        { entity: { $regex: term, $options: 'i' } },
        { performedBy: { $regex: term, $options: 'i' } },
        { module: { $regex: term, $options: 'i' } },
        { operation: { $regex: term, $options: 'i' } },
      ];
    }
    return match;
  }

  async list(filter: AuditTrailFilter): Promise<IAuditTrail[]> {
    const sort: Record<string, 1 | -1> = filter.sort === 'oldest' ? { timestamp: 1 } : { timestamp: -1 };
    return this.model
      .find(this.buildMatch(filter))
      .skip(filter.skip)
      .limit(filter.limit)
      .sort(sort)
      .exec();
  }

  async count(filter: AuditTrailFilter): Promise<number> {
    return this.model.countDocuments(this.buildMatch(filter)).exec();
  }

  async findById(id: string, scope?: AuditTrailScope): Promise<IAuditTrail | null> {
    const doc = await this.model.findById(id).exec();
    if (!doc) return null;
    if (scope && !this.isOwner(doc, scope)) return null;
    return doc;
  }
}
