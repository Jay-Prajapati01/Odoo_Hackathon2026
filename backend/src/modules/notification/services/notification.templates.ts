import { NotificationType, NotificationPriority } from '../models/notification.model';

export type NotificationTemplateKey =
  | 'user.signup'
  | 'role.promoted'
  | 'department.created'
  | 'department.updated'
  | 'category.created'
  | 'employee.updated'
  | 'asset.registered'
  | 'asset.updated'
  | 'asset.allocated'
  | 'transfer.requested'
  | 'transfer.approved'
  | 'transfer.rejected'
  | 'return.approved'
  | 'booking.created'
  | 'booking.cancelled'
  | 'booking.reminder'
  | 'maintenance.requested'
  | 'maintenance.approved'
  | 'maintenance.rejected'
  | 'repair.completed'
  | 'audit.assigned'
  | 'audit.completed'
  | 'discrepancy.created'
  | 'report.generated'
  | 'export.downloaded';

export interface NotificationTemplate {
  type: NotificationType;
  priority: NotificationPriority;
  module: string;
  title: string;
  message: string;
}

export const NOTIFICATION_TEMPLATES: Record<NotificationTemplateKey, NotificationTemplate> = {
  'user.signup': {
    type: 'info',
    priority: 'medium',
    module: 'auth',
    title: 'Welcome to AssetFlow',
    message: 'Your account has been created. You can start managing assets now.',
  },
  'role.promoted': {
    type: 'assignment',
    priority: 'high',
    module: 'rbac',
    title: 'Role updated',
    message: 'Your role has been updated to {{roleName}}.',
  },
  'department.created': {
    type: 'success',
    priority: 'low',
    module: 'organization',
    title: 'Department created',
    message: 'Department "{{name}}" was created.',
  },
  'department.updated': {
    type: 'info',
    priority: 'low',
    module: 'organization',
    title: 'Department updated',
    message: 'Department "{{name}}" was updated.',
  },
  'category.created': {
    type: 'success',
    priority: 'low',
    module: 'organization',
    title: 'Asset category created',
    message: 'Asset category "{{name}}" was created.',
  },
  'employee.updated': {
    type: 'info',
    priority: 'low',
    module: 'organization',
    title: 'Employee profile updated',
    message: 'Employee "{{name}}" profile was updated.',
  },
  'asset.registered': {
    type: 'success',
    priority: 'medium',
    module: 'asset',
    title: 'Asset registered',
    message: 'Asset {{assetTag}} ({{name}}) was registered.',
  },
  'asset.updated': {
    type: 'info',
    priority: 'low',
    module: 'asset',
    title: 'Asset updated',
    message: 'Asset {{assetTag}} ({{name}}) was updated.',
  },
  'asset.allocated': {
    type: 'assignment',
    priority: 'medium',
    module: 'asset',
    title: 'Asset allocated',
    message: 'Asset {{assetTag}} was allocated to {{employeeName}}.',
  },
  'transfer.requested': {
    type: 'approval',
    priority: 'medium',
    module: 'transfer',
    title: 'Transfer requested',
    message: 'A transfer request for {{assetTag}} was submitted by {{employeeName}}.',
  },
  'transfer.approved': {
    type: 'approval',
    priority: 'medium',
    module: 'transfer',
    title: 'Transfer approved',
    message: 'Transfer request for {{assetTag}} was approved.',
  },
  'transfer.rejected': {
    type: 'rejection',
    priority: 'medium',
    module: 'transfer',
    title: 'Transfer rejected',
    message: 'Transfer request for {{assetTag}} was rejected. Reason: {{reason}}',
  },
  'return.approved': {
    type: 'approval',
    priority: 'medium',
    module: 'return',
    title: 'Return approved',
    message: 'Return of {{assetTag}} was approved.',
  },
  'booking.created': {
    type: 'info',
    priority: 'medium',
    module: 'booking',
    title: 'Booking confirmed',
    message: 'Your booking for {{assetName}} ({{bookingNumber}}) is confirmed.',
  },
  'booking.cancelled': {
    type: 'warning',
    priority: 'medium',
    module: 'booking',
    title: 'Booking cancelled',
    message: 'Booking {{bookingNumber}} was cancelled. Reason: {{reason}}',
  },
  'booking.reminder': {
    type: 'reminder',
    priority: 'medium',
    module: 'booking',
    title: 'Booking reminder',
    message: 'Reminder: your booking {{bookingNumber}} for {{assetName}} starts soon.',
  },
  'maintenance.requested': {
    type: 'approval',
    priority: 'high',
    module: 'maintenance',
    title: 'Maintenance requested',
    message: 'Maintenance request for {{assetTag}} was submitted.',
  },
  'maintenance.approved': {
    type: 'approval',
    priority: 'high',
    module: 'maintenance',
    title: 'Maintenance approved',
    message: 'Maintenance request for {{assetTag}} was approved.',
  },
  'maintenance.rejected': {
    type: 'rejection',
    priority: 'medium',
    module: 'maintenance',
    title: 'Maintenance rejected',
    message: 'Maintenance request for {{assetTag}} was rejected.',
  },
  'repair.completed': {
    type: 'success',
    priority: 'medium',
    module: 'maintenance',
    title: 'Repair completed',
    message: 'Repair for {{assetTag}} was completed.',
  },
  'audit.assigned': {
    type: 'assignment',
    priority: 'high',
    module: 'audit',
    title: 'Audit assigned',
    message: 'You were assigned to audit cycle {{auditNumber}}.',
  },
  'audit.completed': {
    type: 'success',
    priority: 'medium',
    module: 'audit',
    title: 'Audit completed',
    message: 'Audit cycle {{auditNumber}} was completed.',
  },
  'discrepancy.created': {
    type: 'warning',
    priority: 'high',
    module: 'audit',
    title: 'Discrepancy detected',
    message: 'A discrepancy was recorded for {{assetTag}} during audit {{auditNumber}}.',
  },
  'report.generated': {
    type: 'info',
    priority: 'low',
    module: 'report',
    title: 'Report generated',
    message: 'Your {{reportName}} report was generated.',
  },
  'export.downloaded': {
    type: 'info',
    priority: 'low',
    module: 'report',
    title: 'Export downloaded',
    message: 'An export of {{reportName}} was downloaded.',
  },
};

const fillTemplate = (template: string, vars?: Record<string, unknown>): string => {
  if (!vars) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = vars[key];
    return value == null ? match : String(value);
  });
};

export interface RenderedTemplate {
  type: NotificationType;
  priority: NotificationPriority;
  module: string;
  title: string;
  message: string;
}

export const renderTemplate = (key: NotificationTemplateKey, vars?: Record<string, unknown>): RenderedTemplate => {
  const def = NOTIFICATION_TEMPLATES[key];
  if (!def) {
    return { type: 'info', priority: 'low', module: 'system', title: 'Notification', message: 'You have a new notification.' };
  }
  return {
    type: def.type,
    priority: def.priority,
    module: def.module,
    title: fillTemplate(def.title, vars),
    message: fillTemplate(def.message, vars),
  };
};

export const calculatePriority = (type: NotificationType): NotificationPriority => {
  switch (type) {
    case 'error':
      return 'critical';
    case 'rejection':
      return 'high';
    case 'approval':
    case 'assignment':
      return 'medium';
    case 'warning':
      return 'medium';
    default:
      return 'low';
  }
};
