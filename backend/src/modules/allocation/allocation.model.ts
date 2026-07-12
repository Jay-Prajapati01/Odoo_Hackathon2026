import mongoose, { Schema, Document } from 'mongoose';

export const ALLOCATION_STATUSES = ['pending', 'allocated', 'returned', 'overdue', 'cancelled', 'transferred'] as const;
export type AllocationStatus = (typeof ALLOCATION_STATUSES)[number];

export const ALLOCATION_CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'damaged', 'lost'] as const;
export type AllocationCondition = (typeof ALLOCATION_CONDITIONS)[number];

export interface IAllocation extends Document {
  allocationNumber: string;
  assetId: string;
  employeeId: string;
  departmentId: string;
  allocatedById: string;
  allocationDate: Date;
  expectedReturnDate?: Date;
  actualReturnDate?: Date;
  purpose?: string;
  status: AllocationStatus;
  conditionAtAllocation?: AllocationCondition;
  conditionAtReturn?: AllocationCondition;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const allocationSchema = new Schema<IAllocation>(
  {
    allocationNumber: { type: String, required: true, unique: true, index: true },
    assetId: { type: String, required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    departmentId: { type: String, required: true, index: true },
    allocatedById: { type: String, required: true },
    allocationDate: { type: Date, default: Date.now, index: true },
    expectedReturnDate: { type: Date },
    actualReturnDate: { type: Date },
    purpose: { type: String, trim: true },
    status: {
      type: String,
      enum: ALLOCATION_STATUSES,
      default: 'pending',
      index: true,
    },
    conditionAtAllocation: {
      type: String,
      enum: ALLOCATION_CONDITIONS,
    },
    conditionAtReturn: {
      type: String,
      enum: ALLOCATION_CONDITIONS,
    },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

allocationSchema.index({ assetId: 1, status: 1 });
allocationSchema.index({ employeeId: 1, status: 1 });
allocationSchema.index({ departmentId: 1, status: 1 });
allocationSchema.index({ allocationNumber: 'text' });

export const AllocationModel = mongoose.model<IAllocation>('Allocation', allocationSchema);
