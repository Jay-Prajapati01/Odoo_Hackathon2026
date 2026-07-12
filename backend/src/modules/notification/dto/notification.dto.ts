import { INotification } from '../models/notification.model';

const getId = (doc: INotification): string => {
  const anyDoc = doc as unknown as { _id?: { toString(): string }; id?: string };
  return anyDoc._id ? anyDoc._id.toString() : (anyDoc.id as string);
};

export const toNotificationDTO = (doc: INotification) => ({
  id: getId(doc),
  notificationNumber: doc.notificationNumber,
  title: doc.title,
  message: doc.message,
  type: doc.type,
  module: doc.module,
  entityType: doc.entityType ?? null,
  entityId: doc.entityId ?? null,
  receiver: doc.receiver,
  sender: doc.sender ?? null,
  departmentId: doc.departmentId ?? null,
  priority: doc.priority,
  status: doc.status,
  readAt: doc.readAt ?? null,
  expiresAt: doc.expiresAt ?? null,
  actionUrl: doc.actionUrl ?? null,
  channels: doc.channels,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const toNotificationDetailDTO = (doc: INotification) => ({
  ...toNotificationDTO(doc),
  metadata: doc.metadata ?? null,
});
