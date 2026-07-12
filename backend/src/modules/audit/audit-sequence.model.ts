import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditSequence extends Document {
  key: string;
  value: number;
  createdAt: Date;
  updatedAt: Date;
}

const auditSequenceSchema = new Schema<IAuditSequence>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

export const AuditSequenceModel = mongoose.model<IAuditSequence>('AuditSequence', auditSequenceSchema);
