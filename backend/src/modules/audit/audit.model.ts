import mongoose, { Document, Schema } from 'mongoose';

export const AUDIT_SCOPES = ['department', 'location', 'organization'] as const;
export type AuditScopeType = (typeof AUDIT_SCOPES)[number];

export const AUDIT_STATUSES = ['draft', 'scheduled', 'active', 'completed', 'cancelled'] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export interface IAuditScope {
  type: AuditScopeType;
  departmentId?: string;
  location?: {
    building?: string;
    floor?: string;
    room?: string;
    shelf?: string;
    section?: string;
    label?: string;
  };
}

export interface IAudit extends Document {
  auditNumber: string;
  title: string;
  description?: string;
  scope: IAuditScope;
  department?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  status: AuditStatus;
  createdBy: string;
  closedBy?: string;
  closedDate?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditScopeSchema = new Schema<IAuditScope>(
  {
    type: { type: String, enum: AUDIT_SCOPES, required: true },
    departmentId: { type: String, index: true },
    location: {
      building: { type: String, trim: true },
      floor: { type: String, trim: true },
      room: { type: String, trim: true },
      shelf: { type: String, trim: true },
      section: { type: String, trim: true },
      label: { type: String, trim: true },
    },
  },
  { _id: false }
);

const auditSchema = new Schema<IAudit>(
  {
    auditNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true },
    scope: { type: auditScopeSchema, required: true },
    department: { type: String, index: true },
    location: { type: String, index: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    status: { type: String, enum: AUDIT_STATUSES, default: 'draft', index: true },
    createdBy: { type: String, required: true, index: true },
    closedBy: { type: String },
    closedDate: { type: Date },
    remarks: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false }
);

auditSchema.index({ status: 1, startDate: 1 });
auditSchema.index({ department: 1, status: 1 });

export const AuditModel = mongoose.model<IAudit>('Audit', auditSchema);
