import { Model } from 'mongoose';
import { AuditDiscrepancyModel, IAuditDiscrepancy } from './audit-discrepancy.model';

export class AuditDiscrepancyRepository {
  constructor(private readonly model: Model<IAuditDiscrepancy> = AuditDiscrepancyModel) {}

  async create(data: Partial<IAuditDiscrepancy>): Promise<IAuditDiscrepancy> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<IAuditDiscrepancy | null> {
    return this.model.findById(id).exec();
  }

  async findByAuditCycle(auditCycle: string): Promise<IAuditDiscrepancy[]> {
    return this.model.find({ auditCycle }).sort({ createdAt: -1 }).exec();
  }

  async findOpenByAuditCycle(auditCycle: string): Promise<IAuditDiscrepancy[]> {
    return this.model.find({ auditCycle, status: { $in: ['open', 'in_review'] } }).exec();
  }

  async findByAuditItem(auditItem: string): Promise<IAuditDiscrepancy[]> {
    return this.model.find({ auditItem }).exec();
  }

  async update(id: string, data: Partial<IAuditDiscrepancy>): Promise<IAuditDiscrepancy | null> {
    return this.model.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  }
}
