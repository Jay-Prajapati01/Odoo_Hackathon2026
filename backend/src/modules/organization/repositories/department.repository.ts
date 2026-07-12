import { IDepartment, DepartmentModel } from '../models/department.model';
import { Model } from 'mongoose';
import { DepartmentFilter } from '../interfaces/organization.interface';

export class DepartmentRepository {
  constructor(private readonly model: Model<IDepartment> = DepartmentModel) {}

  async create(data: Partial<IDepartment>): Promise<IDepartment> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<IDepartment | null> {
    return this.model.findOne({ _id: id, isDeleted: false }).exec();
  }

  async findByCode(code: string): Promise<IDepartment | null> {
    return this.model.findOne({ code: code.toUpperCase(), isDeleted: false }).exec();
  }

  async findByName(name: string): Promise<IDepartment | null> {
    return this.model.findOne({ name, isDeleted: false }).collation({ locale: 'en', strength: 2 }).exec();
  }

  private buildQuery(filter: DepartmentFilter): Record<string, unknown> {
    const query: Record<string, unknown> = { ...(filter.scope ?? {}) };
    if (!filter.includeDeleted) query.isDeleted = false;
    if (filter.status) query.status = filter.status;
    if (filter.parentDepartment) query.parentDepartment = filter.parentDepartment;
    if (filter.departmentHead) query.departmentHead = filter.departmentHead;
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

  async findAll(filter: DepartmentFilter): Promise<IDepartment[]> {
    return this.model.find(this.buildQuery(filter)).skip(filter.skip).limit(filter.limit).sort({ name: 1 }).exec();
  }

  async count(filter: DepartmentFilter): Promise<number> {
    return this.model.countDocuments(this.buildQuery(filter)).exec();
  }

  async update(id: string, data: Partial<IDepartment>): Promise<IDepartment | null> {
    return this.model.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  }

  async softDelete(id: string): Promise<IDepartment | null> {
    return this.model.findByIdAndUpdate(id, { $set: { isDeleted: true } }, { new: true }).exec();
  }

  async countChildren(parentId: string): Promise<number> {
    return this.model.countDocuments({ parentDepartment: parentId, isDeleted: false }).exec();
  }

  async seedDefaults(): Promise<void> {
    const count = await this.count({ page: 1, limit: 1, skip: 0 });
    if (count === 0) {
      await this.create({ name: 'General', code: 'GEN', description: 'Default department', status: 'active' });
    }
  }
}
