import { IAuditTrail } from '../models/audit-trail.model';

const getId = (doc: IAuditTrail): string => {
  const anyDoc = doc as unknown as { _id?: { toString(): string }; id?: string };
  return anyDoc._id ? anyDoc._id.toString() : (anyDoc.id as string);
};

export const toAuditTrailDTO = (doc: IAuditTrail) => ({
  id: getId(doc),
  entity: doc.entity,
  entityId: doc.entityId,
  operation: doc.operation,
  performedBy: doc.performedBy,
  module: doc.module,
  ipAddress: doc.ipAddress ?? null,
  oldSnapshot: doc.oldSnapshot ?? null,
  newSnapshot: doc.newSnapshot ?? null,
  timestamp: doc.timestamp,
  createdAt: doc.createdAt,
});

export const toAuditTrailDetailDTO = (doc: IAuditTrail) => toAuditTrailDTO(doc);
