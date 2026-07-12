import { NotificationChannel, NotificationPriority, NotificationStatus } from '../models/notification.model';

export type NotificationSort = 'newest' | 'oldest' | 'priority' | 'unread';

export interface NotificationScope {
  roleName: string;
  userId: string;
  departmentId?: string;
}

export interface CreateNotificationInput {
  receiver: string;
  type: string;
  title: string;
  message: string;
  module?: string;
  entityId?: string;
  entityType?: string;
  sender?: string;
  departmentId?: string;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
  reference?: { entity: string; entityId: string };
}

export interface NotificationFilter {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  type?: string;
  status?: NotificationStatus | NotificationStatus[];
  priority?: NotificationPriority;
  module?: string;
  user?: string;
  entity?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sort?: NotificationSort;
  scope?: Record<string, unknown>;
}
