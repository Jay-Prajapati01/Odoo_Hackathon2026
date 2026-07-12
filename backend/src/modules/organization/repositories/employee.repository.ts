import { IEmployee, EmployeeModel } from '../models/employee.model';
import { Model } from 'mongoose';
import { EmployeeFilter } from '../interfaces/organization.interface';

export class EmployeeRepository {
  constructor(private readonly model: Model<IEmployee> = EmployeeModel) {}

  async create(data: Partial<IEmployee>): Promise<IEmployee> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<IEmployee | null> {
    return this.model.findOne({ _id: id, isDeleted: false }).exec();
  }

  async findByUserId(userId: string): Promise<IEmployee | null> {
    return this.model.findOne({ userId, isDeleted: false }).exec();
  }

  async findByCode(code: string): Promise<IEmployee | null> {
    return this.model.findOne({ employeeCode: code.toUpperCase(), isDeleted: false }).exec();
  }

  async findByEmail(email: string): Promise<IEmployee | null> {
    return this.model.findOne({ email: email.toLowerCase(), isDeleted: false }).exec();
  }

  private buildQuery(filter: EmployeeFilter): Record<string, unknown> {
    const query: Record<string, unknown> = { ...(filter.scope ?? {}) };
    if (!filter.includeDeleted) query.isDeleted = false;
    if (filter.departmentId) query.departmentId = filter.departmentId;
    if (filter.employmentStatus) query.employmentStatus = filter.employmentStatus;
    if (filter.search) {
      const searchClause = {
        $or: [
          { firstName: { $regex: filter.search, $options: 'i' } },
          { lastName: { $regex: filter.search, $options: 'i' } },
          { email: { $regex: filter.search, $options: 'i' } },
          { employeeCode: { $regex: filter.search, $options: 'i' } },
        ],
      };
      if (query.$or) query.$and = [{ $or: query.$or }, searchClause];
      else query.$or = searchClause.$or;
    }
    return query;
  }

  async findAll(filter: EmployeeFilter): Promise<IEmployee[]> {
    return this.model.find(this.buildQuery(filter)).skip(filter.skip).limit(filter.limit).sort({ firstName: 1 }).exec();
  }

  async count(filter: EmployeeFilter): Promise<number> {
    return this.model.countDocuments(this.buildQuery(filter)).exec();
  }

  async update(id: string, data: Partial<IEmployee>): Promise<IEmployee | null> {
    return this.model.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  }

  async softDelete(id: string): Promise<IEmployee | null> {
    return this.model.findByIdAndUpdate(id, { $set: { isDeleted: true } }, { new: true }).exec();
  }

  async countByDepartment(departmentId: string): Promise<number> {
    return this.model.countDocuments({ departmentId, employmentStatus: 'active', isDeleted: false }).exec();
  }
}
