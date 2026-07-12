import { IAssetCategory, AssetCategoryModel } from '../models/asset-category.model';
import { Model } from 'mongoose';
import { AssetCategoryFilter } from '../interfaces/organization.interface';

export class AssetCategoryRepository {
  constructor(private readonly model: Model<IAssetCategory> = AssetCategoryModel) {}

  async create(data: Partial<IAssetCategory>): Promise<IAssetCategory> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<IAssetCategory | null> {
    return this.model.findOne({ _id: id, isDeleted: false }).exec();
  }

  async findByCode(code: string): Promise<IAssetCategory | null> {
    return this.model.findOne({ code: code.toUpperCase(), isDeleted: false }).exec();
  }

  async findByName(name: string): Promise<IAssetCategory | null> {
    return this.model.findOne({ name, isDeleted: false }).collation({ locale: 'en', strength: 2 }).exec();
  }

  private buildQuery(filter: AssetCategoryFilter): Record<string, unknown> {
    const query: Record<string, unknown> = { ...(filter.scope ?? {}) };
    if (!filter.includeDeleted) query.isDeleted = false;
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      const searchClause = {
        $or: [
          { name: { $regex: filter.search, $options: 'i' } },
          { code: { $regex: filter.search, $options: 'i' } },
        ],
      };
      if (query.$or) query.$and = [{ $or: query.$or }, searchClause];
      else query.$or = searchClause.$or;
    }
    return query;
  }

  async findAll(filter: AssetCategoryFilter): Promise<IAssetCategory[]> {
    return this.model.find(this.buildQuery(filter)).skip(filter.skip).limit(filter.limit).sort({ name: 1 }).exec();
  }

  async count(filter: AssetCategoryFilter): Promise<number> {
    return this.model.countDocuments(this.buildQuery(filter)).exec();
  }

  async update(id: string, data: Partial<IAssetCategory>): Promise<IAssetCategory | null> {
    return this.model.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  }

  async softDelete(id: string): Promise<IAssetCategory | null> {
    return this.model.findByIdAndUpdate(id, { $set: { isDeleted: true } }, { new: true }).exec();
  }
}
