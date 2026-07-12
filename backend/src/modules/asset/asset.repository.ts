import { Model, SortOrder } from 'mongoose';
import { AssetModel, IAsset } from './asset.model';
import { AssetSequenceModel, IAssetSequence } from './asset-sequence.model';

export interface AssetFilter {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  status?: string;
  categoryId?: string;
  departmentId?: string;
  condition?: string;
  manufacturer?: string;
  serialNumber?: string;
  assetTag?: string;
  barcode?: string;
  qrCode?: string;
  sharedResource?: boolean;
  location?: string;
  purchaseDateFrom?: Date;
  purchaseDateTo?: Date;
  warrantyExpiringBefore?: Date;
  includeDeleted?: boolean;
  sort?: Record<string, SortOrder>;
}

export class AssetRepository {
  constructor(
    private readonly model: Model<IAsset> = AssetModel,
    private readonly sequenceModel: Model<IAssetSequence> = AssetSequenceModel
  ) {}

  async create(data: Partial<IAsset>): Promise<IAsset> {
    return this.model.create(data);
  }

  async findById(id: string, includeDeleted = false): Promise<IAsset | null> {
    const query = includeDeleted ? { _id: id } : { _id: id, deletedAt: null };
    return this.model.findOne(query).exec();
  }

  async findByTag(assetTag: string, includeDeleted = false): Promise<IAsset | null> {
    const query = includeDeleted ? { assetTag } : { assetTag, deletedAt: null };
    return this.model.findOne(query).exec();
  }

  async findByCode(code: string): Promise<IAsset | null> {
    return this.findByTag(code);
  }

  async findBySerialNumber(serialNumber: string, includeDeleted = false): Promise<IAsset | null> {
    const query = includeDeleted
      ? { serialNumber: serialNumber.toUpperCase() }
      : { serialNumber: serialNumber.toUpperCase(), deletedAt: null };
    return this.model.findOne(query).exec();
  }

  async findAll(filter: AssetFilter): Promise<IAsset[]> {
    return this.model
      .find(this.buildQuery(filter))
      .skip(filter.skip)
      .limit(filter.limit)
      .sort(filter.sort ?? { createdAt: -1 })
      .exec();
  }

  async count(filter: Partial<AssetFilter>): Promise<number> {
    return this.model.countDocuments(this.buildQuery(filter)).exec();
  }

  async update(id: string, data: Partial<IAsset>): Promise<IAsset | null> {
    return this.model.findOneAndUpdate({ _id: id, deletedAt: null }, { $set: data }, { new: true }).exec();
  }

  async softDelete(id: string, deletedAt: Date, deletedBy: string): Promise<IAsset | null> {
    return this.model
      .findOneAndUpdate({ _id: id, deletedAt: null }, { $set: { deletedAt, deletedBy, updatedBy: deletedBy } }, { new: true })
      .exec();
  }

  async nextSequenceValue(): Promise<number> {
    const sequence = await this.sequenceModel
      .findOneAndUpdate({ key: 'assetTag' }, { $inc: { value: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true })
      .exec();
    return sequence.value;
  }

  async aggregationStats(): Promise<{
    total: number;
    byStatus: Array<{ _id: string; count: number }>;
    totalValue: number;
  }> {
    const match = { deletedAt: null };
    const total = await this.model.countDocuments(match).exec();
    const byStatus = await this.model.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]).exec();
    const valueAgg = await this.model.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$currentValue' } } }]).exec();
    return { total, byStatus, totalValue: valueAgg[0]?.total ?? 0 };
  }

  async findByIds(ids: string[]): Promise<IAsset[]> {
    return this.model.find({ _id: { $in: ids }, deletedAt: null }).exec();
  }

  private buildQuery(filter: Partial<AssetFilter>): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    if (!filter.includeDeleted) {
      query.deletedAt = null;
    }
    if (filter.status) query.status = filter.status;
    if (filter.categoryId) query.category = filter.categoryId;
    if (filter.departmentId) query.department = filter.departmentId;
    if (filter.condition) query.condition = filter.condition;
    if (filter.manufacturer) query.manufacturer = { $regex: filter.manufacturer, $options: 'i' };
    if (filter.serialNumber) query.serialNumber = filter.serialNumber.toUpperCase();
    if (filter.assetTag) query.assetTag = { $regex: filter.assetTag, $options: 'i' };
    if (filter.barcode) query.barcode = { $regex: filter.barcode, $options: 'i' };
    if (filter.qrCode) query.qrCode = { $regex: filter.qrCode, $options: 'i' };
    if (filter.sharedResource !== undefined) query.sharedResource = filter.sharedResource;
    if (filter.location) {
      query.$or = [
        { 'location.building': { $regex: filter.location, $options: 'i' } },
        { 'location.floor': { $regex: filter.location, $options: 'i' } },
        { 'location.room': { $regex: filter.location, $options: 'i' } },
        { 'location.shelf': { $regex: filter.location, $options: 'i' } },
        { 'location.section': { $regex: filter.location, $options: 'i' } },
        { 'location.label': { $regex: filter.location, $options: 'i' } },
      ];
    }
    if (filter.purchaseDateFrom || filter.purchaseDateTo) {
      const purchaseDate: Record<string, Date> = {};
      if (filter.purchaseDateFrom) purchaseDate.$gte = filter.purchaseDateFrom;
      if (filter.purchaseDateTo) purchaseDate.$lte = filter.purchaseDateTo;
      query.purchaseDate = purchaseDate;
    }
    if (filter.warrantyExpiringBefore) {
      query.warrantyEnd = { $lte: filter.warrantyExpiringBefore };
    }
    if (filter.search) {
      const searchRegex = { $regex: filter.search, $options: 'i' };
      const searchClauses = [
        { assetTag: searchRegex },
        { name: searchRegex },
        { serialNumber: searchRegex },
        { manufacturer: searchRegex },
        { model: searchRegex },
        { categoryName: searchRegex },
        { departmentName: searchRegex },
        { 'location.label': searchRegex },
        { 'location.building': searchRegex },
        { 'location.room': searchRegex },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchClauses }];
        delete query.$or;
      } else {
        query.$or = searchClauses;
      }
    }

    return query;
  }
}
