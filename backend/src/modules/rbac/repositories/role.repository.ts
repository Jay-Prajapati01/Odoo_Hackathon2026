import { IRole, RoleModel } from '../models/role.model';
import { Model } from 'mongoose';

export interface RoleFilter {
  page: number;
  limit: number;
  skip: number;
  status?: string;
  search?: string;
}

export class RoleRepository {
  constructor(private readonly model: Model<IRole> = RoleModel) {}

  async create(data: Partial<IRole>): Promise<IRole> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<IRole | null> {
    return this.model.findById(id).exec();
  }

  async findByRoleName(roleName: string): Promise<IRole | null> {
    return this.model.findOne({ roleName }).exec();
  }

  async findAll(filter: RoleFilter): Promise<IRole[]> {
    const query: Record<string, unknown> = {};
    if (filter.status) query.status = filter.status;
    if (filter.search) query.roleName = { $regex: filter.search, $options: 'i' };
    return this.model.find(query).skip(filter.skip).limit(filter.limit).sort({ roleName: 1 }).exec();
  }

  async count(filter: RoleFilter): Promise<number> {
    const query: Record<string, unknown> = {};
    if (filter.status) query.status = filter.status;
    if (filter.search) query.roleName = { $regex: filter.search, $options: 'i' };
    return this.model.countDocuments(query).exec();
  }

  async update(id: string, data: Partial<IRole>): Promise<IRole | null> {
    return this.model.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  }

  async delete(id: string): Promise<IRole | null> {
    return this.model.findByIdAndDelete(id).exec();
  }
}
