import mongoose, { Document, Schema } from 'mongoose';
import { IAuditAttachment } from './audit-item.model';

export const AUDIT_DISCREPANCY_ISSUE_TYPES = ['missing', 'damaged', 'location_mismatch', 'status_mismatch', 'condition_mismatch'] as const;
export type AuditDiscrepancyIssueType = (typeof AUDIT_DISCREPANCY_ISSUE_TYPES)[number];

export const AUDIT_DISCREPANCY_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type AuditDiscrepancySeverity = (typeof AUDIT_DISCREPANCY_SEVERITIES)[number];

export const AUDIT_DISCREPANCY_STATUSES = ['open', 'in_review', 'resolved', 'closed'] as const;
export type AuditDiscrepancyStatus = (typeof AUDIT_DISCREPANCY_STATUSES)[number];

export interface IAuditDiscrepancy extends Document {
  auditCycle: string;
  auditItem: string;
  asset: string;
  assetTag: string;
  issueType: AuditDiscrepancyIssueType;
  severity: AuditDiscrepancySeverity;
  description: string;
  recommendedAction?: string;
  status: AuditDiscrepancyStatus;
  attachments: IAuditAttachment[];
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditDiscrepancySchema = new Schema<IAuditDiscrepancy>(
  {
    auditCycle: { type: String, required: true, index: true },
    auditItem: { type: String, required: true, index: true },
    asset: { type: String, required: true, index: true },
    assetTag: { type: String, required: true, index: true },
    issueType: { type: String, enum: AUDIT_DISCREPANCY_ISSUE_TYPES, required: true, index: true },
    severity: { type: String, enum: AUDIT_DISCREPANCY_SEVERITIES, default: 'medium', index: true },
    description: { type: String, required: true, trim: true },
    recommendedAction: { type: String, trim: true },
    status: { type: String, enum: AUDIT_DISCREPANCY_STATUSES, default: 'open', index: true },
    attachments: { type: [new Schema<IAuditAttachment>({
      name: { type: String, required: true },
      path: { type: String, required: true },
      mimeType: { type: String, required: true },
      size: { type: Number, required: true, min: 0 },
      uploadedAt: { type: Date, default: Date.now },
      uploadedBy: { type: String, required: true },
    }, { _id: false })], default: [] },
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
  },
  { timestamps: true, versionKey: false }
);

auditDiscrepancySchema.index({ auditCycle: 1, status: 1 });

export const AuditDiscrepancyModel = mongoose.model<IAuditDiscrepancy>('AuditDiscrepancy', auditDiscrepancySchema);
