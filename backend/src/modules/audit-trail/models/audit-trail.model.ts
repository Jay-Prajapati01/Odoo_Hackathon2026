import mongoose, { Schema, Document } from 'mongoose';

export const AUDIT_OPERATIONS = [
  'create',
  'update',
  'delete',
  'approve',
  'reject',
  'status_change',
  'login',
  'logout',
  'password_change',
  'export',
  'download',
  'assign',
] as const;
export type AuditOperation = (typeof AUDIT_OPERATIONS)[number];

export interface IAuditTrail extends Document {
  entity: string;
  entityId: string;
  operation: AuditOperation;
  performedBy: string;
  oldSnapshot?: Record<string, unknown>;
  newSnapshot?: Record<string, unknown>;
  module: string;
  ipAddress?: string;
  timestamp: Date;
  createdAt: Date;
}

const auditTrailSchema = new Schema<IAuditTrail>(
  {
    entity: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, required: true, index: true },
    operation: { type: String, enum: AUDIT_OPERATIONS, required: true, index: true },
    performedBy: { type: String, required: true, index: true },
    oldSnapshot: { type: Schema.Types.Mixed },
    newSnapshot: { type: Schema.Types.Mixed },
    module: { type: String, required: true, trim: true, index: true },
    ipAddress: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

auditTrailSchema.index({ entity: 1, entityId: 1, timestamp: -1 });
auditTrailSchema.index({ performedBy: 1, timestamp: -1 });
auditTrailSchema.index({ module: 1, timestamp: -1 });

export const AuditTrailModel = mongoose.model<IAuditTrail>('AuditTrail', auditTrailSchema);
