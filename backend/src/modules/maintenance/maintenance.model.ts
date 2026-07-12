import mongoose, { Schema, Document } from 'mongoose';

export const MAINTENANCE_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'technician_assigned',
  'in_progress',
  'resolved',
  'cancelled',
] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const MAINTENANCE_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number];

export interface IMaintenanceAttachment {
  name: string;
  path: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface IMaintenance extends Document {
  requestNumber: string;
  assetId: string;
  requestedById: string;
  departmentId: string;
  issueTitle: string;
  issueDescription: string;
  priority: MaintenancePriority;
  attachments: IMaintenanceAttachment[];
  estimatedCost?: number;
  estimatedDuration?: string;
  status: MaintenanceStatus;
  requestedDate: Date;
  approvedById?: string;
  approvalDate?: Date;
  rejectionReason?: string;
  assignedTechnicianId?: string;
  technicianAssignedDate?: Date;
  workStartDate?: Date;
  completionDate?: Date;
  resolutionSummary?: string;
  actualCost?: number;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceAttachmentSchema = new Schema<IMaintenanceAttachment>(
  {
    name: { type: String, required: true, trim: true },
    path: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String, required: true },
  },
  { _id: false }
);

const maintenanceSchema = new Schema<IMaintenance>(
  {
    requestNumber: { type: String, required: true, unique: true, index: true },
    assetId: { type: String, required: true, index: true },
    requestedById: { type: String, required: true, index: true },
    departmentId: { type: String, required: true, index: true },
    issueTitle: { type: String, required: true, trim: true },
    issueDescription: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: MAINTENANCE_PRIORITIES,
      default: 'medium',
      index: true,
    },
    attachments: { type: [maintenanceAttachmentSchema], default: [] },
    estimatedCost: { type: Number, min: 0 },
    estimatedDuration: { type: String, trim: true },
    status: {
      type: String,
      enum: MAINTENANCE_STATUSES,
      default: 'pending',
      index: true,
    },
    requestedDate: { type: Date, default: Date.now, index: true },
    approvedById: { type: String },
    approvalDate: { type: Date },
    rejectionReason: { type: String, trim: true },
    assignedTechnicianId: { type: String, index: true },
    technicianAssignedDate: { type: Date },
    workStartDate: { type: Date },
    completionDate: { type: Date, index: true },
    resolutionSummary: { type: String, trim: true },
    actualCost: { type: Number, min: 0 },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

maintenanceSchema.index({ assetId: 1, status: 1 });
maintenanceSchema.index({ status: 1, priority: 1 });
maintenanceSchema.index({ requestedById: 1, status: 1 });
maintenanceSchema.index({ departmentId: 1, status: 1 });
maintenanceSchema.index({ assignedTechnicianId: 1, status: 1 });
maintenanceSchema.index({ requestNumber: 'text', issueTitle: 'text', issueDescription: 'text' });

export const MaintenanceModel = mongoose.model<IMaintenance>('Maintenance', maintenanceSchema);
