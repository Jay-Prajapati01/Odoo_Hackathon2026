import { Model } from 'mongoose';
import { IAudit, AuditModel } from './audit.model';
import { AuditSequenceModel, IAuditSequence } from './audit-sequence.model';
import { AuditItemModel, IAuditItem } from './audit-item.model';

export interface AuditCycleFilter {
  page: number;
  limit: number;
  skip: number;
  status?: string;
  department?: string;
  search?: string;
  auditor?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  sort?: Record<string, 1 | -1>;
  ids?: string[];
}

const normalizeStatus = (status?: string): string | undefined => {
  if (!status) return undefined;
  if (status === 'in_progress') return 'active';
  return status;
};

export class AuditRepository {
  constructor(
    private readonly model: Model<IAudit> = AuditModel,
    private readonly sequenceModel: Model<IAuditSequence> = AuditSequenceModel,
    private readonly itemModel: Model<IAuditItem> = AuditItemModel
  ) {}

  async create(data: Partial<IAudit>): Promise<IAudit> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<IAudit | null> {
    return this.model.findById(id).exec();
  }

  async findByAuditNumber(auditNumber: string): Promise<IAudit | null> {
    return this.model.findOne({ auditNumber: auditNumber.toUpperCase() }).exec();
  }

  async findAll(filter: AuditCycleFilter): Promise<IAudit[]> {
    return this.model
      .find(this.buildQuery(filter))
      .skip(filter.skip)
      .limit(filter.limit)
      .sort(filter.sort ?? { createdAt: -1 })
      .exec();
  }

  async count(filter: Partial<AuditCycleFilter>): Promise<number> {
    return this.model.countDocuments(this.buildQuery(filter)).exec();
  }

  async update(id: string, data: Partial<IAudit>): Promise<IAudit | null> {
    return this.model.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  }

  async findIdsBySearchTerm(search: string): Promise<string[]> {
    const records = await this.model
      .find({
        $or: [
          { auditNumber: { $regex: search, $options: 'i' } },
          { title: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
        ],
      })
      .select('_id')
      .lean()
      .exec();
    return records.map((record) => String(record._id));
  }

  async nextSequenceValue(): Promise<number> {
    const sequence = await this.sequenceModel
      .findOneAndUpdate({ key: 'auditNumber' }, { $inc: { value: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true })
      .exec();
    return sequence.value;
  }

  async findOneByAssetAndStatuses(assetId: string, statuses: string[]): Promise<IAudit | null> {
    const items = await this.itemModel
      .find({ asset: assetId })
      .select('auditCycle')
      .lean()
      .exec();
    const cycleIds = Array.from(new Set(items.map((item) => String(item.auditCycle))));
    if (cycleIds.length === 0) return null;
    return this.model.findOne({ _id: { $in: cycleIds }, status: { $in: statuses } }).exec();
  }

  private buildQuery(filter: Partial<AuditCycleFilter>): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    const status = normalizeStatus(filter.status);
    if (status) query.status = status;
    if (filter.department) query.department = filter.department;
    if (filter.ids?.length) query._id = { $in: filter.ids };
    if (filter.search) {
      query.$or = [
        { auditNumber: { $regex: filter.search, $options: 'i' } },
        { title: { $regex: filter.search, $options: 'i' } },
        { department: { $regex: filter.search, $options: 'i' } },
        { location: { $regex: filter.search, $options: 'i' } },
      ];
    }
    if (filter.startDateFrom || filter.startDateTo) {
      const startDate: Record<string, Date> = {};
      if (filter.startDateFrom) startDate.$gte = filter.startDateFrom;
      if (filter.startDateTo) startDate.$lte = filter.startDateTo;
      query.startDate = startDate;
    }
    return query;
  }
}
