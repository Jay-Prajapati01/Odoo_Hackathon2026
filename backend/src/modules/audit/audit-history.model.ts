import mongoose, { Document, Schema } from 'mongoose';

export const AUDIT_HISTORY_ACTIONS = [
  'cycle_created',
  'auditor_assigned',
  'assignment_responded',
  'audit_started',
  'asset_verified',
  'discrepancy_generated',
  'discrepancy_resolved',
  'audit_closed',
  'audit_cancelled',
] as const;

export type AuditHistoryAction = (typeof AUDIT_HISTORY_ACTIONS)[number];

export interface IAuditHistory extends Document {
  auditCycle: string;
  action: AuditHistoryAction;
  actor: string;
  entityId?: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

const auditHistorySchema = new Schema<IAuditHistory>(
  {
    auditCycle: { type: String, required: true, index: true },
    action: { type: String, enum: AUDIT_HISTORY_ACTIONS, required: true, index: true },
    actor: { type: String, required: true, index: true },
    entityId: { type: String },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

auditHistorySchema.index({ auditCycle: 1, createdAt: -1 });

export const AuditHistoryModel = mongoose.model<IAuditHistory>('AuditHistory', auditHistorySchema);
