import { Model } from 'mongoose';
import {
  INotificationPreference,
  NotificationPreferenceModel,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../models/notification-preference.model';

export type NotificationPreferenceInput = Partial<{
  email: boolean;
  inApp: boolean;
  reminder: boolean;
  maintenanceAlerts: boolean;
  bookingAlerts: boolean;
  auditAlerts: boolean;
  transferAlerts: boolean;
}>;

export class NotificationPreferenceRepository {
  constructor(private readonly model: Model<INotificationPreference> = NotificationPreferenceModel) {}

  async findByUserId(userId: string): Promise<INotificationPreference | null> {
    return this.model.findOne({ userId }).exec();
  }

  async getOrDefaults(userId: string): Promise<Record<string, boolean>> {
    const doc = await this.model.findOne({ userId }).exec();
    if (!doc) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    return {
      email: doc.email,
      inApp: doc.inApp,
      reminder: doc.reminder,
      maintenanceAlerts: doc.maintenanceAlerts,
      bookingAlerts: doc.bookingAlerts,
      auditAlerts: doc.auditAlerts,
      transferAlerts: doc.transferAlerts,
    };
  }

  async upsert(userId: string, data: NotificationPreferenceInput): Promise<INotificationPreference> {
    return this.model
      .findOneAndUpdate({ userId }, { $set: { userId, ...data } }, { new: true, upsert: true, setDefaultsOnInsert: true })
      .exec() as Promise<INotificationPreference>;
  }
}
