import { IActivityLog } from '../models/activity-log.model';

const getId = (doc: IActivityLog): string => {
  const anyDoc = doc as unknown as { _id?: { toString(): string }; id?: string };
  return anyDoc._id ? anyDoc._id.toString() : (anyDoc.id as string);
};

export const toActivityLogDTO = (doc: IActivityLog) => ({
  id: getId(doc),
  activityNumber: doc.activityNumber,
  user: doc.user,
  module: doc.module,
  entityType: doc.entityType,
  entityId: doc.entityId,
  action: doc.action,
  description: doc.description ?? null,
  ipAddress: doc.ipAddress,
  browser: doc.browser ?? null,
  device: doc.device ?? null,
  createdAt: doc.createdAt,
});

export const toActivityLogDetailDTO = (doc: IActivityLog) => ({
  ...toActivityLogDTO(doc),
  oldData: doc.oldData ?? null,
  newData: doc.newData ?? null,
});
