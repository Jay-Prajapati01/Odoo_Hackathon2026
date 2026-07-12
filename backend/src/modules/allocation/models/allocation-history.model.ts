import mongoose, { Schema, Document } from 'mongoose';

export type AllocationHistoryAction =
  | 'allocated'
  | 'returned'
  | 'transferred'
  | 'overdue'
  | 'cancelled'
  | 'approved'
  | 'rejected';

export interface IAllocationHistory extends Document {
  allocationId: string;
  allocationNumber: string;
  action: AllocationHistoryAction;
  assetId: string;
  employeeId?: string;
  departmentId?: string;
  performedBy: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

const allocationHistorySchema = new Schema<IAllocationHistory>(
  {
    allocationId: { type: String, required: true, index: true },
    allocationNumber: { type: String, required: true },
    action: {
      type: String,
      enum: ['allocated', 'returned', 'transferred', 'overdue', 'cancelled', 'approved', 'rejected'],
      required: true,
      index: true,
    },
    assetId: { type: String, required: true, index: true },
    employeeId: { type: String, index: true },
    departmentId: { type: String, index: true },
    performedBy: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

allocationHistorySchema.index({ allocationId: 1, createdAt: -1 });
allocationHistorySchema.index({ assetId: 1, createdAt: -1 });
allocationHistorySchema.index({ employeeId: 1, createdAt: -1 });

export const AllocationHistoryModel = mongoose.model<IAllocationHistory>(
  'AllocationHistory',
  allocationHistorySchema
);
