import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationPreferenceRepository } from '../repositories/notification-preference.repository';
import { CreateNotificationInput, NotificationFilter, NotificationScope } from '../interfaces/notification.interface';
import { INotification, NotificationChannel, NotificationPriority } from '../models/notification.model';
import { generateReferenceId } from '../../../utils/helpers';
import { parsePagination } from '../../../utils/pagination';
import { NotFoundError, BusinessRuleError, ForbiddenError } from '../../../common/errors';
import { emitRealtime } from '../../../shared/realtime';
import {
  NotificationTemplateKey,
  renderTemplate,
} from './notification.templates';

export interface NotifyInput {
  receiver: string;
  type?: string;
  title?: string;
  message?: string;
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
  template?: NotificationTemplateKey;
  data?: Record<string, unknown>;
}

const NOTIFICATION_TTL_DAYS = 30;

const MODULE_CATEGORY_MAP: Record<string, keyof Record<string, boolean>> = {
  maintenance: 'maintenanceAlerts',
  booking: 'bookingAlerts',
  audit: 'auditAlerts',
  transfer: 'transferAlerts',
  reminder: 'reminder',
};

export class NotificationService {
  constructor(
    private readonly repo: NotificationRepository,
    private readonly preferences: NotificationPreferenceRepository = new NotificationPreferenceRepository()
  ) {}

  private scopeQuery(scope: NotificationScope): Record<string, unknown> {
    if (scope.roleName === 'Admin' || scope.roleName === 'Asset Manager') return {};
    if (scope.roleName === 'Department Head') {
      return scope.departmentId
        ? { $or: [{ receiver: scope.userId }, { departmentId: scope.departmentId }] }
        : { receiver: scope.userId };
    }
    return { receiver: scope.userId };
  }

  private async resolveChannels(
    receiver: string,
    module: string,
    requested?: NotificationChannel[]
  ): Promise<NotificationChannel[]> {
    const prefs = await this.preferences.getOrDefaults(receiver);
    const base: NotificationChannel[] = [];
    if (prefs.inApp) base.push('in_app');
    const categoryKey = MODULE_CATEGORY_MAP[module];
    if (prefs.email && (!categoryKey || (prefs as Record<string, boolean>)[categoryKey as string])) {
      base.push('email');
    }
    let final = base;
    if (requested && requested.length) {
      final = requested.filter((c) => base.includes(c));
      if (prefs.inApp && !final.includes('in_app')) final.push('in_app');
    }
    if (final.length === 0) final = ['in_app'];
    return Array.from(new Set(final));
  }

  async notify(input: NotifyInput): Promise<INotification> {
    const rendered = input.template ? renderTemplate(input.template, input.data) : null;

    const type = input.type ?? rendered?.type ?? 'info';
    const priority: NotificationPriority = input.priority ?? rendered?.priority ?? 'low';
    const module = input.module ?? rendered?.module ?? 'system';
    const title = input.title ?? rendered?.title ?? 'Notification';
    const message = input.message ?? rendered?.message ?? 'You have a new notification.';

    const entityType = input.entityType ?? input.reference?.entity;
    const entityId = input.entityId ?? input.reference?.entityId;

    const channels = await this.resolveChannels(input.receiver, module, input.channels);

    const doc = await this.repo.create({
      notificationNumber: generateReferenceId('NTF'),
      title,
      message,
      type,
      module,
      entityType,
      entityId,
      receiver: input.receiver,
      sender: input.sender,
      departmentId: input.departmentId,
      priority,
      status: 'unread',
      channels,
      actionUrl: input.actionUrl,
      metadata: input.metadata,
      expiresAt: input.expiresAt ?? new Date(Date.now() + NOTIFICATION_TTL_DAYS * 24 * 60 * 60 * 1000),
    });

    emitRealtime('notification.created', {
      id: doc._id.toString(),
      receiver: doc.receiver,
      type: doc.type,
      priority: doc.priority,
      title: doc.title,
    });

    return doc;
  }

  async list(query: Record<string, unknown>, scope: NotificationScope) {
    const { page, limit, skip } = parsePagination(query);
    const sortParam = (query.sort as string) || 'newest';
    const filter: NotificationFilter = {
      page,
      limit,
      skip,
      search: query.search ? String(query.search) : undefined,
      type: query.type ? String(query.type) : undefined,
      status: query.status ? (String(query.status) as NotificationFilter['status']) : undefined,
      priority: query.priority ? (String(query.priority) as NotificationPriority) : undefined,
      module: query.module ? String(query.module) : undefined,
      user: query.user ? String(query.user) : undefined,
      entity: query.entity ? String(query.entity) : undefined,
      dateFrom: query.dateFrom ? new Date(String(query.dateFrom)) : undefined,
      dateTo: query.dateTo ? new Date(String(query.dateTo)) : undefined,
      sort: (['newest', 'oldest', 'priority', 'unread'].includes(sortParam) ? sortParam : 'newest') as NotificationFilter['sort'],
      scope: this.scopeQuery(scope),
    };
    const data = await this.repo.list(filter);
    const total = await this.repo.count(filter);
    return { data, page, limit, total };
  }

  async unreadCount(scope: NotificationScope): Promise<number> {
    return this.repo.unreadCount(this.scopeQuery(scope));
  }

  async getById(id: string, scope: NotificationScope): Promise<INotification> {
    const doc = await this.repo.findById(id, scope);
    if (!doc) throw new NotFoundError('Notification not found');
    return doc;
  }

  async markRead(id: string, scope: NotificationScope): Promise<INotification> {
    const doc = await this.repo.findById(id, scope);
    if (!doc) throw new NotFoundError('Notification not found');
    if (doc.status === 'read') throw new BusinessRuleError('Notification already read');
    const updated = await this.repo.markRead(id, scope);
    if (!updated) throw new ForbiddenError('You are not allowed to modify this notification');
    emitRealtime('notification.read', { id, receiver: scope.userId });
    return updated;
  }

  async markAllRead(scope: NotificationScope): Promise<number> {
    return this.repo.markAllRead(this.scopeQuery(scope));
  }

  async archive(id: string, scope: NotificationScope): Promise<INotification> {
    const doc = await this.repo.findById(id, scope);
    if (!doc) throw new NotFoundError('Notification not found');
    if (doc.status === 'archived') throw new BusinessRuleError('Notification already archived');
    const updated = await this.repo.archive(id, scope);
    if (!updated) throw new ForbiddenError('You are not allowed to modify this notification');
    return updated;
  }

  async remove(id: string, scope: NotificationScope): Promise<INotification> {
    const doc = await this.repo.findById(id, scope);
    if (!doc) throw new NotFoundError('Notification not found');
    if (doc.status === 'deleted') throw new BusinessRuleError('Notification already deleted');
    const updated = await this.repo.remove(id, scope);
    if (!updated) throw new ForbiddenError('You are not allowed to modify this notification');
    return updated;
  }
}
