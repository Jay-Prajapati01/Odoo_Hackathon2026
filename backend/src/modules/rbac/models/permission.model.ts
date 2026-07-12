import mongoose, { Schema, Document } from 'mongoose';

export interface IPermission extends Document {
  key: string;
  description: string;
  group: string;
  createdAt: Date;
}

const permissionSchema = new Schema<IPermission>(
  {
    key: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true },
    group: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PermissionModel = mongoose.model<IPermission>('Permission', permissionSchema);
