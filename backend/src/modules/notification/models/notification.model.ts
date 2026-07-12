import mongoose, { Schema, Document } from 'mongoose';

export const NOTIFICATION_TYPES = [
  'success',
  'warning',
  'error',
  'info',
  'reminder',
  'approval',
  'rejection',
  'assignment',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export const NOTIFICATION_STATUSES = ['unread', 'read', 'archived', 'deleted'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ['in_app', 'email', 'sms'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export interface INotification extends Document {
  notificationNumber: string;
  title: string;
  message: string;
  type: string;
  module: string;
  entityId?: string;
  entityType?: string;
  receiver: string;
  sender?: string;
  departmentId?: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  readAt?: Date;
  expiresAt?: Date;
  actionUrl?: string;
  channels: NotificationChannel[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    notificationNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    type: { type: String, required: true, trim: true, index: true },
    module: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, index: true },
    entityType: { type: String, index: true },
    receiver: { type: String, required: true, index: true },
    sender: { type: String, index: true },
    departmentId: { type: String, index: true },
    priority: { type: String, enum: NOTIFICATION_PRIORITIES, default: 'medium', index: true },
    status: { type: String, enum: NOTIFICATION_STATUSES, default: 'unread', index: true },
    readAt: { type: Date },
    expiresAt: { type: Date },
    actionUrl: { type: String, trim: true },
    channels: { type: [String], enum: NOTIFICATION_CHANNELS, default: ['in_app'] },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false }
);

notificationSchema.index({ receiver: 1, status: 1 });
notificationSchema.index({ receiver: 1, createdAt: -1 });
notificationSchema.index({ receiver: 1, type: 1 });
notificationSchema.index({ entityType: 1, entityId: 1 });
notificationSchema.index({ departmentId: 1, status: 1 });

export const NotificationModel = mongoose.model<INotification>('Notification', notificationSchema);
