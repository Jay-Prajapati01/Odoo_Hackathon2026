import { Request } from 'express';
import { ActivityLogService } from '../modules/activity-log/services/activity-log.service';
import { ActivityLogRepository } from '../modules/activity-log/repositories/activity-log.repository';
import { AuditTrailService } from '../modules/audit-trail/services/audit-trail.service';
import { AuditTrailRepository } from '../modules/audit-trail/repositories/audit-trail.repository';
import { NotificationService } from '../modules/notification/services/notification.service';
import { NotificationRepository } from '../modules/notification/repositories/notification.repository';
import { NotificationPreferenceRepository } from '../modules/notification/repositories/notification-preference.repository';
import { INotification } from '../modules/notification/models/notification.model';
import { NotificationTemplateKey } from '../modules/notification/services/notification.templates';
import { AuditOperation } from '../modules/audit-trail/models/audit-trail.model';

const activityLogService = new ActivityLogService(new ActivityLogRepository());
const auditTrailService = new AuditTrailService(new AuditTrailRepository());
const notificationService = new NotificationService(
  new NotificationRepository(),
  new NotificationPreferenceRepository()
);

const ENTITY_MODULE_MAP: Record<string, string> = {
  User: 'auth',
  Role: 'rbac',
  Department: 'organization',
  Employee: 'organization',
  AssetCategory: 'organization',
  Asset: 'asset',
  Allocation: 'allocation',
  Transfer: 'transfer',
  Return: 'return',
  Booking: 'booking',
  Maintenance: 'maintenance',
  Audit: 'audit',
  Notification: 'notification',
  Settings: 'settings',
};

const deriveModule = (entity: string): string => ENTITY_MODULE_MAP[entity] ?? 'system';

const deriveOperation = (action: string): AuditOperation | null => {
  if (action.endsWith('.created')) return 'create';
  if (action.endsWith('.deleted')) return 'delete';
  if (action.endsWith('.updated') || action.endsWith('.changed')) return 'update';
  if (action.endsWith('.approved')) return 'approve';
  if (action.endsWith('.rejected')) return 'reject';
  if (action.includes('status')) return 'status_change';
  if (action.endsWith('.login')) return 'login';
  if (action.endsWith('.logout')) return 'logout';
  if (action.endsWith('.password_changed')) return 'password_change';
  if (action.endsWith('.exported')) return 'export';
  if (action.endsWith('.downloaded')) return 'download';
  if (action.endsWith('.assigned')) return 'assign';
  if (action.endsWith('.promoted')) return 'update';
  if (action.includes('.')) return 'update';
  return null;
};

const parseUserAgent = (
  ua?: string
): { browser?: string; device?: string } => {
  if (!ua) return {};
  let browser: string | undefined;
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  let device: string | undefined;
  if (/Mobi|Android/i.test(ua)) device = 'Mobile';
  else if (/Tablet|iPad/i.test(ua)) device = 'Tablet';
  else device = 'Desktop';

  return { browser, device };
};

export interface LogActivityParams {
  req?: Request;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  module?: string;
  description?: string;
}

export const recordActivity = (params: LogActivityParams): void => {
  const ip = params.req?.ip || params.req?.socket?.remoteAddress || 'unknown';
  const ua = params.req?.headers['user-agent'] as string | undefined;
  const { browser, device } = parseUserAgent(ua);
  const moduleName = params.module ?? deriveModule(params.entity);

    activityLogService
    .log({
      user: params.userId,
      action: params.action,
      entityType: params.entity,
      entityId: params.entityId,
      oldData: params.oldValue,
      newData: params.newValue,
      module: moduleName,
      ipAddress: ip,
      browser,
      device,
      description: params.description,
    })
    .catch((err) => console.error('Activity log failed', err));

  const operation = deriveOperation(params.action);
  if (operation) {
    auditTrailService
      .record({
        entity: params.entity,
        entityId: params.entityId,
        operation,
        performedBy: params.userId,
        oldSnapshot: params.oldValue,
        newSnapshot: params.newValue,
        module: moduleName,
        ipAddress: ip,
      })
      .catch((err) => console.error('Audit trail failed', err));
  }
};

export interface DispatchNotificationParams {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  reference?: { entity: string; entityId: string };
  channels?: INotification['channels'];
  module?: string;
  entityType?: string;
  entityId?: string;
  sender?: string;
  priority?: INotification['priority'];
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
  departmentId?: string;
  template?: NotificationTemplateKey;
  data?: Record<string, unknown>;
}

export const dispatchNotification = (params: DispatchNotificationParams): void => {
  notificationService
    .notify({
      receiver: params.recipientId,
      type: params.type,
      title: params.title,
      message: params.message,
      reference: params.reference,
      channels: params.channels,
      module: params.module,
      entityType: params.entityType,
      entityId: params.entityId,
      sender: params.sender,
      priority: params.priority,
      actionUrl: params.actionUrl,
      metadata: params.metadata,
      expiresAt: params.expiresAt,
      departmentId: params.departmentId,
      template: params.template,
      data: params.data,
    })
    .catch((err) => console.error('Notification dispatch failed', err));
};

export interface RecordAuditTrailParams {
  req?: Request;
  entity: string;
  entityId: string;
  operation: AuditOperation;
  performedBy: string;
  oldSnapshot?: Record<string, unknown>;
  newSnapshot?: Record<string, unknown>;
  module?: string;
  ipAddress?: string;
}

export const recordAuditTrail = (params: RecordAuditTrailParams): void => {
  const ip = params.req?.ip || params.req?.socket?.remoteAddress || params.ipAddress || 'unknown';
  auditTrailService
    .record({
      entity: params.entity,
      entityId: params.entityId,
      operation: params.operation,
      performedBy: params.performedBy,
      oldSnapshot: params.oldSnapshot,
      newSnapshot: params.newSnapshot,
      module: params.module ?? deriveModule(params.entity),
      ipAddress: ip,
    })
    .catch((err) => console.error('Audit trail failed', err));
};
