import { NotificationService } from '../../src/modules/notification/services/notification.service';
import { NotificationRepository } from '../../src/modules/notification/repositories/notification.repository';
import { NotificationPreferenceRepository } from '../../src/modules/notification/repositories/notification-preference.repository';
import { NotificationModel } from '../../src/modules/notification/models/notification.model';
import { NotificationPreferenceModel } from '../../src/modules/notification/models/notification-preference.model';
import { BusinessRuleError, NotFoundError } from '../../src/common/errors';
import { startTestDb, stopTestDb, clearTestDb } from '../helpers/db';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeAll(async () => {
    await startTestDb();
    service = new NotificationService(new NotificationRepository(), new NotificationPreferenceRepository());
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const scope = { roleName: 'Employee', userId: 'user-1' } as const;

  it('creates a notification with defaults (unread, generated number, channels)', async () => {
    const doc = await service.notify({
      receiver: 'user-1',
      type: 'info',
      title: 'Hello',
      message: 'World',
      module: 'asset',
    });
    expect(doc.status).toBe('unread');
    expect(doc.notificationNumber).toMatch(/^NTF-/);
    expect(doc.channels).toContain('in_app');
    expect(doc.channels).toContain('email');
  });

  it('respects disabled email preference by dropping the email channel', async () => {
    await NotificationPreferenceModel.create({ userId: 'user-2', email: false });
    const doc = await service.notify({
      receiver: 'user-2',
      type: 'info',
      title: 'Hi',
      message: 'There',
      module: 'asset',
    });
    expect(doc.channels).toContain('in_app');
    expect(doc.channels).not.toContain('email');
  });

  it('renders a template when a template key is supplied', async () => {
    const doc = await service.notify({
      receiver: 'user-1',
      template: 'role.promoted',
      data: { roleName: 'Asset Manager' },
    });
    expect(doc.type).toBe('info');
    expect(doc.module).toBe('auth');
    expect(doc.message).toContain('Asset Manager');
  });

  it('counts unread notifications for the receiver', async () => {
    await service.notify({ receiver: 'user-1', type: 'info', title: 'A', message: 'a', module: 'asset' });
    await service.notify({ receiver: 'user-1', type: 'info', title: 'B', message: 'b', module: 'asset' });
    const count = await service.unreadCount(scope);
    expect(count).toBe(2);
  });

  it('marks a notification read and rejects a second read', async () => {
    const doc = await service.notify({ receiver: 'user-1', type: 'info', title: 'A', message: 'a', module: 'asset' });
    await service.markRead(doc._id.toString(), scope);
    const after = await NotificationModel.findById(doc._id);
    expect(after?.status).toBe('read');
    expect(after?.readAt).toBeDefined();
    await expect(service.markRead(doc._id.toString(), scope)).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('archives a notification and rejects a second archive', async () => {
    const doc = await service.notify({ receiver: 'user-1', type: 'info', title: 'A', message: 'a', module: 'asset' });
    await service.archive(doc._id.toString(), scope);
    const after = await NotificationModel.findById(doc._id);
    expect(after?.status).toBe('archived');
    await expect(service.archive(doc._id.toString(), scope)).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('soft deletes a notification and rejects a second delete', async () => {
    const doc = await service.notify({ receiver: 'user-1', type: 'info', title: 'A', message: 'a', module: 'asset' });
    await service.remove(doc._id.toString(), scope);
    const after = await NotificationModel.findById(doc._id);
    expect(after?.status).toBe('deleted');
    await expect(service.remove(doc._id.toString(), scope)).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('throws NotFoundError when marking a missing notification', async () => {
    await expect(service.markRead('000000000000000000000000', scope)).rejects.toBeInstanceOf(NotFoundError);
  });
});
