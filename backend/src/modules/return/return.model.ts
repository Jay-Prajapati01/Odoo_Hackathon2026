import mongoose, { Schema, Document } from 'mongoose';

export const RETURN_CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'damaged', 'lost'] as const;
export type ReturnCondition = (typeof RETURN_CONDITIONS)[number];

export interface IReturn extends Document {
  allocationId: string;
  assetId: string;
  returnedById: string;
  receivedById: string;
  condition: ReturnCondition;
  damageNotes?: string;
  photos: string[];
  returnDate: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const returnSchema = new Schema<IReturn>(
  {
    allocationId: { type: String, required: true, index: true },
    assetId: { type: String, required: true, index: true },
    returnedById: { type: String, required: true, index: true },
    receivedById: { type: String, required: true },
    condition: {
      type: String,
      enum: RETURN_CONDITIONS,
      required: true,
    },
    damageNotes: { type: String, trim: true },
    photos: { type: [String], default: [] },
    returnDate: { type: Date, default: Date.now, index: true },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

returnSchema.index({ allocationId: 1, returnDate: -1 });
returnSchema.index({ assetId: 1, returnDate: -1 });

export const ReturnModel = mongoose.model<IReturn>('Return', returnSchema);
