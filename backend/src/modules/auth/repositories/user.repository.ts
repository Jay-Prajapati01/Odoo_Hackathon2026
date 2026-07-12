import { IUser, UserModel } from '../models/user.model';
import { Model } from 'mongoose';

export class UserRepository {
  constructor(private readonly model: Model<IUser> = UserModel) {}

  async create(data: Partial<IUser>): Promise<IUser> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<IUser | null> {
    return this.model.findById(id).exec();
  }

  async findByIdWithPassword(id: string): Promise<IUser | null> {
    return this.model.findById(id).select('+password').exec();
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.model.findOne({ email: email.toLowerCase(), isDeleted: false }).select('+password').exec();
  }

  async findByResetToken(token: string): Promise<IUser | null> {
    return this.model
      .findOne({ passwordResetToken: token, passwordResetExpires: { $gt: new Date() } })
      .select('+password')
      .exec();
  }

  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    return this.model.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  }

  async findActiveByRole(roleId: string): Promise<IUser[]> {
    return this.model.find({ role: roleId, isDeleted: false }).exec();
  }
}
