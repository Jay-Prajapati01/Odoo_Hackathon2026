import { ActivityLogRepository } from '../repositories/activity-log.repository';
import { CreateActivityInput, ActivityLogFilter, ActivityLogScope } from '../interfaces/activity-log.interface';
import { IActivityLog } from '../models/activity-log.model';
import { generateReferenceId } from '../../../utils/helpers';
import { parsePagination } from '../../../utils/pagination';
import { NotFoundError } from '../../../common/errors';

export class ActivityLogService {
  constructor(private readonly repo: ActivityLogRepository) {}

  private scopeQuery(scope: ActivityLogScope): Record<string, unknown> {
    if (scope.roleName === 'Admin' || scope.roleName === 'Asset Manager') return {};
    return { user: scope.userId };
  }

  async log(input: CreateActivityInput): Promise<IActivityLog> {
    return this.repo.create({
      activityNumber: generateReferenceId('ACT'),
      user: input.user,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      oldData: input.oldData,
      newData: input.newData,
      description: input.description,
      ipAddress: input.ipAddress ?? 'unknown',
      browser: input.browser,
      device: input.device,
    });
  }

  async list(query: Record<string, unknown>, scope: ActivityLogScope) {
    const { page, limit, skip } = parsePagination(query);
    const sortParam = (query.sort as string) || 'newest';
    const filter: ActivityLogFilter = {
      page,
      limit,
      skip,
      search: query.search ? String(query.search) : undefined,
      module: query.module ? String(query.module) : undefined,
      entityType: query.entityType ? String(query.entityType) : undefined,
      entityId: query.entityId ? String(query.entityId) : undefined,
      user: query.user ? String(query.user) : undefined,
      action: query.action ? String(query.action) : undefined,
      dateFrom: query.dateFrom ? new Date(String(query.dateFrom)) : undefined,
      dateTo: query.dateTo ? new Date(String(query.dateTo)) : undefined,
      sort: (sortParam === 'oldest' ? 'oldest' : 'newest') as ActivityLogFilter['sort'],
      scope: this.scopeQuery(scope),
    };
    const data = await this.repo.list(filter);
    const total = await this.repo.count(filter);
    return { data, page, limit, total };
  }

  async getById(id: string, scope: ActivityLogScope): Promise<IActivityLog> {
    const doc = await this.repo.findById(id, scope);
    if (!doc) throw new NotFoundError('Activity log not found');
    return doc;
  }
}
