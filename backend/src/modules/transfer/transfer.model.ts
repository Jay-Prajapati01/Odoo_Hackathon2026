import mongoose, { Schema, Document } from 'mongoose';

export const TRANSFER_STATUSES = ['requested', 'approved', 'rejected', 'completed', 'cancelled'] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export interface ITransfer extends Document {
  transferNumber: string;
  allocationId: string;
  assetId: string;
  currentHolderId: string;
  requestedHolderId: string;
  requestReason: string;
  requestedById: string;
  approvedById?: string;
  approvalDate?: Date;
  rejectionReason?: string;
  status: TransferStatus;
  createdAt: Date;
  updatedAt: Date;
}

const transferSchema = new Schema<ITransfer>(
  {
    transferNumber: { type: String, required: true, unique: true, index: true },
    allocationId: { type: String, required: true, index: true },
    assetId: { type: String, required: true, index: true },
    currentHolderId: { type: String, required: true, index: true },
    requestedHolderId: { type: String, required: true, index: true },
    requestReason: { type: String, required: true, trim: true },
    requestedById: { type: String, required: true },
    approvedById: { type: String },
    approvalDate: { type: Date },
    rejectionReason: { type: String, trim: true },
    status: {
      type: String,
      enum: TRANSFER_STATUSES,
      default: 'requested',
      index: true,
    },
  },
  { timestamps: true }
);

transferSchema.index({ status: 1, requestedById: 1 });
transferSchema.index({ allocationId: 1, status: 1 });

export const TransferModel = mongoose.model<ITransfer>('Transfer', transferSchema);
