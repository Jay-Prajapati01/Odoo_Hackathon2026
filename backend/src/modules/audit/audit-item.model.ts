import mongoose, { Document, Schema } from 'mongoose';

export const AUDIT_VERIFICATION_STATUSES = ['pending', 'verified', 'missing', 'damaged', 'not_found'] as const;
export type AuditVerificationStatus = (typeof AUDIT_VERIFICATION_STATUSES)[number];

export interface IAuditAttachment {
  name: string;
  path: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface IAuditItem extends Document {
  auditCycle: string;
  asset: string;
  assetTag: string;
  assetName: string;
  department?: string;
  auditor?: string;
  auditorName?: string;
  verificationStatus: AuditVerificationStatus;
  condition?: string;
  locationVerified?: boolean;
  remarks?: string;
  photos: IAuditAttachment[];
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const auditAttachmentSchema = new Schema<IAuditAttachment>(
  {
    name: { type: String, required: true },
    path: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String, required: true },
  },
  { _id: false }
);

const auditItemSchema = new Schema<IAuditItem>(
  {
    auditCycle: { type: String, required: true, index: true },
    asset: { type: String, required: true, index: true },
    assetTag: { type: String, required: true, index: true },
    assetName: { type: String, required: true, trim: true },
    department: { type: String, index: true },
    auditor: { type: String, index: true },
    auditorName: { type: String, trim: true },
    verificationStatus: { type: String, enum: AUDIT_VERIFICATION_STATUSES, default: 'pending', index: true },
    condition: { type: String },
    locationVerified: { type: Boolean },
    remarks: { type: String, trim: true },
    photos: { type: [auditAttachmentSchema], default: [] },
    verifiedAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

auditItemSchema.index({ auditCycle: 1, asset: 1 }, { unique: true });
auditItemSchema.index({ auditCycle: 1, verificationStatus: 1 });

export const AuditItemModel = mongoose.model<IAuditItem>('AuditItem', auditItemSchema);
