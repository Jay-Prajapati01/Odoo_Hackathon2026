import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  activityNumber: string;
  user: string;
  module: string;
  entityType: string;
  entityId: string;
  action: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  description?: string;
  ipAddress: string;
  browser?: string;
  device?: string;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    activityNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
    user: { type: String, required: true, index: true },
    module: { type: String, required: true, trim: true, index: true },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, required: true, index: true },
    action: { type: String, required: true, trim: true, index: true },
    oldData: { type: Schema.Types.Mixed },
    newData: { type: Schema.Types.Mixed },
    description: { type: String, trim: true, maxlength: 1000 },
    ipAddress: { type: String, default: 'unknown' },
    browser: { type: String, trim: true },
    device: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ module: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

export const ActivityLogModel = mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
