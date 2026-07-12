import { ISetting, SettingModel } from './settings.model';
import { Model } from 'mongoose';

export class SettingsRepository {
  constructor(private readonly model: Model<ISetting> = SettingModel) {}
  async get(key: string): Promise<ISetting | null> {
    return this.model.findOne({ key }).exec();
  }
  async list(group?: string): Promise<ISetting[]> {
    const query: Record<string, unknown> = {};
    if (group) query.group = group;
    return this.model.find(query).exec();
  }
  async upsert(key: string, value: unknown, group: string, description?: string): Promise<ISetting> {
    return this.model.findOneAndUpdate(
      { key },
      { $set: { value, group, description } },
      { new: true, upsert: true }
    ).exec();
  }
}
