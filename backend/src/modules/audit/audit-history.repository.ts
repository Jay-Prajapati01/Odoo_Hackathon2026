import { Model } from 'mongoose';
import { AuditHistoryModel, IAuditHistory } from './audit-history.model';

export class AuditHistoryRepository {
  constructor(private readonly model: Model<IAuditHistory> = AuditHistoryModel) {}

  async create(data: Partial<IAuditHistory>): Promise<IAuditHistory> {
    return this.model.create(data);
  }

  async findByAuditCycle(auditCycle: string, page: number, limit: number, skip: number): Promise<IAuditHistory[]> {
    return this.model.find({ auditCycle }).skip(skip).limit(limit).sort({ createdAt: -1 }).exec();
  }

  async count(auditCycle: string): Promise<number> {
    return this.model.countDocuments({ auditCycle }).exec();
  }
}
