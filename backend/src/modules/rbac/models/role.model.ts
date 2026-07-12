import mongoose, { Schema, Document } from 'mongoose';

export type RoleStatus = 'active' | 'inactive';

export interface IRole extends Document {
  roleName: string;
  description: string;
  permissions: string[];
  status: RoleStatus;
  systemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    roleName: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    permissions: { type: [String], required: true, default: [] },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    systemRole: { type: Boolean, default: false },
  },
  { timestamps: true }
);

roleSchema.index({ roleName: 1 });

export const RoleModel = mongoose.model<IRole>('Role', roleSchema);
