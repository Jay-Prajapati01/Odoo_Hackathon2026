import { INotificationPreference } from '../models/notification-preference.model';

const getId = (doc: INotificationPreference): string => {
  const anyDoc = doc as unknown as { _id?: { toString(): string }; id?: string };
  return anyDoc._id ? anyDoc._id.toString() : (anyDoc.id as string);
};

export const toPreferenceDTO = (prefs: Record<string, boolean> | INotificationPreference) => {
  const record = prefs as Record<string, boolean>;
  return {
    id: '_id' in prefs ? getId(prefs as INotificationPreference) : undefined,
    email: record.email,
    inApp: record.inApp,
    reminder: record.reminder,
    maintenanceAlerts: record.maintenanceAlerts,
    bookingAlerts: record.bookingAlerts,
    auditAlerts: record.auditAlerts,
    transferAlerts: record.transferAlerts,
  };
};
