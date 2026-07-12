import { NotificationPreferenceRepository, NotificationPreferenceInput } from '../repositories/notification-preference.repository';
import { INotificationPreference } from '../models/notification-preference.model';
import { NotFoundError } from '../../../common/errors';

export class NotificationPreferenceService {
  constructor(private readonly repo: NotificationPreferenceRepository) {}

  async getOwn(userId: string): Promise<Record<string, boolean>> {
    return this.repo.getOrDefaults(userId);
  }

  async updateOwn(userId: string, data: NotificationPreferenceInput): Promise<INotificationPreference> {
    return this.repo.upsert(userId, data);
  }

  async getByUserId(targetUserId: string): Promise<Record<string, boolean>> {
    return this.repo.getOrDefaults(targetUserId);
  }

  async updateByUserId(targetUserId: string, data: NotificationPreferenceInput): Promise<INotificationPreference> {
    const updated = await this.repo.upsert(targetUserId, data);
    if (!updated) throw new NotFoundError('User preferences not found');
    return updated;
  }
}
