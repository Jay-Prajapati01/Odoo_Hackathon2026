import mongoose, { Schema, Document } from 'mongoose';

export type EmploymentStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';

export interface IEmployeeAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface IEmployeeEmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

export interface IEmployee extends Document {
  userId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  designation: string;
  role: mongoose.Types.ObjectId | null;
  reportingManager?: string;
  joiningDate: Date;
  employmentStatus: EmploymentStatus;
  profilePhoto?: string;
  address?: IEmployeeAddress;
  emergencyContact?: IEmployeeEmergencyContact;
  notes?: string;
  isDeleted: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const employeeAddressSchema = new Schema<IEmployeeAddress>(
  {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String },
  },
  { _id: false }
);

const employeeEmergencyContactSchema = new Schema<IEmployeeEmergencyContact>(
  {
    name: { type: String },
    phone: { type: String },
    relationship: { type: String },
  },
  { _id: false }
);

const employeeSchema = new Schema<IEmployee>(
  {
    userId: { type: String, required: true, index: true },
    employeeCode: { type: String, required: true, unique: true, uppercase: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String },
    departmentId: { type: String, index: true },
    designation: { type: String, required: true, trim: true },
    role: { type: Schema.Types.ObjectId, ref: 'Role', default: null },
    reportingManager: { type: String },
    joiningDate: { type: Date, default: Date.now },
    employmentStatus: {
      type: String,
      enum: ['active', 'inactive', 'on_leave', 'terminated'],
      default: 'active',
      index: true,
    },
    profilePhoto: { type: String },
    address: { type: employeeAddressSchema, default: {} },
    emergencyContact: { type: employeeEmergencyContactSchema, default: {} },
    notes: { type: String },
    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

employeeSchema.index({ departmentId: 1, employmentStatus: 1 });
employeeSchema.index({ email: 1 });

export const EmployeeModel = mongoose.model<IEmployee>('Employee', employeeSchema);
