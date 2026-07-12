import mongoose, { Document, Schema } from 'mongoose';

export const AUDIT_ASSIGNMENT_STATUSES = ['assigned', 'accepted', 'rejected', 'completed'] as const;
export type AuditAssignmentStatus = (typeof AUDIT_ASSIGNMENT_STATUSES)[number];

export interface IAuditAssignment extends Document {
  auditCycle: string;
  auditor: string;
  auditorName?: string;
  assignedBy: string;
  assignedDate: Date;
  status: AuditAssignmentStatus;
  responseDate?: Date;
  responseRemarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditAssignmentSchema = new Schema<IAuditAssignment>(
  {
    auditCycle: { type: String, required: true, index: true },
    auditor: { type: String, required: true, index: true },
    auditorName: { type: String, trim: true },
    assignedBy: { type: String, required: true },
    assignedDate: { type: Date, default: Date.now },
    status: { type: String, enum: AUDIT_ASSIGNMENT_STATUSES, default: 'assigned', index: true },
    responseDate: { type: Date },
    responseRemarks: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false }
);

auditAssignmentSchema.index({ auditCycle: 1, auditor: 1 }, { unique: true });

export const AuditAssignmentModel = mongoose.model<IAuditAssignment>('AuditAssignment', auditAssignmentSchema);
