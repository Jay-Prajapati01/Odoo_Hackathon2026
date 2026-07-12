import { Model } from 'mongoose';
import { AuditItemModel, AuditVerificationStatus, IAuditItem } from './audit-item.model';

export interface AuditItemListFilter {
  auditCycle: string;
  auditor?: string;
  verificationStatus?: string;
}

export class AuditItemRepository {
  constructor(private readonly model: Model<IAuditItem> = AuditItemModel) {}

  async createMany(data: Array<Partial<IAuditItem>>): Promise<IAuditItem[]> {
    return (await this.model.insertMany(data)) as unknown as IAuditItem[];
  }

  async findById(id: string): Promise<IAuditItem | null> {
    return this.model.findById(id).exec();
  }

  async findByAuditCycle(filter: AuditItemListFilter): Promise<IAuditItem[]> {
    const query: Record<string, unknown> = { auditCycle: filter.auditCycle };
    if (filter.auditor) query.auditor = filter.auditor;
    if (filter.verificationStatus) query.verificationStatus = filter.verificationStatus;
    return this.model.find(query).sort({ assetTag: 1 }).exec();
  }

  async findByAuditCycleAndAsset(auditCycle: string, asset: string): Promise<IAuditItem | null> {
    return this.model.findOne({ auditCycle, asset }).exec();
  }

  async findAuditCycleIdsByAssetSearch(search: string): Promise<string[]> {
    const regex = { $regex: search, $options: 'i' };
    const records = await this.model.find({ $or: [{ assetTag: regex }, { assetName: regex }] }).select('auditCycle').lean().exec();
    return Array.from(new Set(records.map((record) => String(record.auditCycle))));
  }

  async update(id: string, data: Partial<IAuditItem>): Promise<IAuditItem | null> {
    return this.model.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  }

  async assignAuditorToPendingItems(auditCycle: string, auditor: string, auditorName?: string): Promise<void> {
    await this.model.updateMany({ auditCycle, auditor: { $exists: false } }, { $set: { auditor, auditorName } }).exec();
  }

  async countByStatuses(auditCycle: string, statuses: AuditVerificationStatus[]): Promise<number> {
    return this.model.countDocuments({ auditCycle, verificationStatus: { $in: statuses } }).exec();
  }

  async count(filter: { auditCycle: string; verificationStatus?: string }): Promise<number> {
    const query: Record<string, unknown> = { auditCycle: filter.auditCycle };
    if (filter.verificationStatus) query.verificationStatus = filter.verificationStatus;
    return this.model.countDocuments(query).exec();
  }
}
