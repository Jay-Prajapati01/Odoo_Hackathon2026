import mongoose, { Schema, Document } from 'mongoose';

export type DepartmentStatus = 'active' | 'inactive';

export interface IDepartment extends Document {
  name: string;
  code: string;
  description: string;
  departmentHead: mongoose.Types.ObjectId | null;
  parentDepartment: mongoose.Types.ObjectId | null;
  status: DepartmentStatus;
  isDeleted: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    departmentHead: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    parentDepartment: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

departmentSchema.index({ parentDepartment: 1 });
departmentSchema.index({ departmentHead: 1 });
departmentSchema.index({ name: 1 }, { collation: { locale: 'en', strength: 2 } });

export const DepartmentModel = mongoose.model<IDepartment>('Department', departmentSchema);
