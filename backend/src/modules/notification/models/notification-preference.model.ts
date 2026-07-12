import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationPreference extends Document {
  userId: string;
  email: boolean;
  inApp: boolean;
  reminder: boolean;
  maintenanceAlerts: boolean;
  bookingAlerts: boolean;
  auditAlerts: boolean;
  transferAlerts: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },
    reminder: { type: Boolean, default: true },
    maintenanceAlerts: { type: Boolean, default: true },
    bookingAlerts: { type: Boolean, default: true },
    auditAlerts: { type: Boolean, default: true },
    transferAlerts: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  email: true,
  inApp: true,
  reminder: true,
  maintenanceAlerts: true,
  bookingAlerts: true,
  auditAlerts: true,
  transferAlerts: true,
};

export const NotificationPreferenceModel = mongoose.model<INotificationPreference>(
  'NotificationPreference',
  notificationPreferenceSchema
);
