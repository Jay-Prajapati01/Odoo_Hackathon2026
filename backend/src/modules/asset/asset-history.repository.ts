import { Model } from 'mongoose';
import { AssetHistoryModel, IAssetHistory } from './asset-history.model';

export interface AssetHistoryListFilter {
  assetId: string;
  page: number;
  limit: number;
  skip: number;
}

export class AssetHistoryRepository {
  constructor(private readonly model: Model<IAssetHistory> = AssetHistoryModel) {}

  async create(data: Partial<IAssetHistory>): Promise<IAssetHistory> {
    return this.model.create(data);
  }

  async findAll(filter: AssetHistoryListFilter): Promise<IAssetHistory[]> {
    return this.model
      .find({ assetId: filter.assetId })
      .skip(filter.skip)
      .limit(filter.limit)
      .sort({ createdAt: -1 })
      .exec();
  }

  async count(assetId: string): Promise<number> {
    return this.model.countDocuments({ assetId }).exec();
  }
}
