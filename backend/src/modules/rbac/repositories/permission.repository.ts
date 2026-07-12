import { IPermission, PermissionModel } from '../models/permission.model';
import { Model } from 'mongoose';

export class PermissionRepository {
  constructor(private readonly model: Model<IPermission> = PermissionModel) {}

  async createMany(definitions: Array<{ key: string; description: string; group: string }>): Promise<void> {
    const ops = definitions.map((d) => ({
      updateOne: {
        filter: { key: d.key },
        update: { $set: d },
        upsert: true,
      },
    }));
    if (ops.length) await this.model.bulkWrite(ops);
  }

  async findAll(): Promise<IPermission[]> {
    return this.model.find().sort({ group: 1, key: 1 }).exec();
  }

  async findByKey(key: string): Promise<IPermission | null> {
    return this.model.findOne({ key }).exec();
  }
}
