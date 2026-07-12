import mongoose, { Schema, Document } from 'mongoose';

export type UserStatus = 'pending' | 'active' | 'inactive' | 'locked';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role: mongoose.Types.ObjectId;
  department?: mongoose.Types.ObjectId;
  status: UserStatus;
  isEmailVerified: boolean;
  isDeleted: boolean;
  lastLogin?: Date;
  createdBy?: string;
  updatedBy?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String },
    password: { type: String, required: true, select: false },
    role: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department' },
    status: { type: String, enum: ['pending', 'active', 'inactive', 'locked'], default: 'pending', index: true },
    isEmailVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    lastLogin: { type: Date },
    createdBy: { type: String },
    updatedBy: { type: String },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ isDeleted: 1, status: 1 });

export const UserModel = mongoose.model<IUser>('User', userSchema);
