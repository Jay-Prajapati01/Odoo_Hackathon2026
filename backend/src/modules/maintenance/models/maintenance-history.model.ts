import mongoose, { Schema, Document } from 'mongoose';

export type MaintenanceHistoryAction =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'technician_assigned'
  | 'repair_started'
  | 'status_changed'
  | 'cost_updated'
  | 'resolved'
  | 'cancelled';

export interface IMaintenanceHistory extends Document {
  maintenanceId: string;
  requestNumber: string;
  action: MaintenanceHistoryAction;
  assetId: string;
  performedBy: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

const maintenanceHistorySchema = new Schema<IMaintenanceHistory>(
  {
    maintenanceId: { type: String, required: true, index: true },
    requestNumber: { type: String, required: true },
    action: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'technician_assigned', 'repair_started', 'status_changed', 'cost_updated', 'resolved', 'cancelled'],
      required: true,
      index: true,
    },
    assetId: { type: String, required: true, index: true },
    performedBy: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

maintenanceHistorySchema.index({ maintenanceId: 1, createdAt: -1 });
maintenanceHistorySchema.index({ assetId: 1, createdAt: -1 });

export const MaintenanceHistoryModel = mongoose.model<IMaintenanceHistory>(
  'MaintenanceHistory',
  maintenanceHistorySchema
);
