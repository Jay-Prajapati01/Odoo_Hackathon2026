import { AuditTrailRepository } from '../repositories/audit-trail.repository';
import { CreateAuditTrailInput, AuditTrailFilter, AuditTrailScope } from '../interfaces/audit-trail.interface';
import { IAuditTrail } from '../models/audit-trail.model';
import { parsePagination } from '../../../utils/pagination';
import { NotFoundError } from '../../../common/errors';

export class AuditTrailService {
  constructor(private readonly repo: AuditTrailRepository) {}

  private scopeQuery(scope: AuditTrailScope): Record<string, unknown> {
    if (scope.roleName === 'Admin' || scope.roleName === 'Asset Manager') return {};
    return { performedBy: scope.userId };
  }

  async record(input: CreateAuditTrailInput): Promise<IAuditTrail> {
    return this.repo.create({
      entity: input.entity,
      entityId: input.entityId,
      operation: input.operation,
      performedBy: input.performedBy,
      oldSnapshot: input.oldSnapshot,
      newSnapshot: input.newSnapshot,
      module: input.module,
      ipAddress: input.ipAddress,
      timestamp: input.timestamp ?? new Date(),
    });
  }

  async list(query: Record<string, unknown>, scope: AuditTrailScope) {
    const { page, limit, skip } = parsePagination(query);
    const sortParam = (query.sort as string) || 'newest';
    const filter: AuditTrailFilter = {
      page,
      limit,
      skip,
      search: query.search ? String(query.search) : undefined,
      entity: query.entity ? String(query.entity) : undefined,
      entityId: query.entityId ? String(query.entityId) : undefined,
      operation: query.operation ? (String(query.operation) as AuditTrailFilter['operation']) : undefined,
      performedBy: query.performedBy ? String(query.performedBy) : undefined,
      module: query.module ? String(query.module) : undefined,
      dateFrom: query.dateFrom ? new Date(String(query.dateFrom)) : undefined,
      dateTo: query.dateTo ? new Date(String(query.dateTo)) : undefined,
      sort: (sortParam === 'oldest' ? 'oldest' : 'newest') as AuditTrailFilter['sort'],
      scope: this.scopeQuery(scope),
    };
    const data = await this.repo.list(filter);
    const total = await this.repo.count(filter);
    return { data, page, limit, total };
  }

  async getById(id: string, scope: AuditTrailScope): Promise<IAuditTrail> {
    const doc = await this.repo.findById(id, scope);
    if (!doc) throw new NotFoundError('Audit trail entry not found');
    return doc;
  }
}
