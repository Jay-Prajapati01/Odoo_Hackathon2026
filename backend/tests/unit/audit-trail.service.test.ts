import { AuditTrailService } from '../../src/modules/audit-trail/services/audit-trail.service';
import { AuditTrailRepository } from '../../src/modules/audit-trail/repositories/audit-trail.repository';
import { AuditTrailModel } from '../../src/modules/audit-trail/models/audit-trail.model';
import { startTestDb, stopTestDb, clearTestDb } from '../helpers/db';

describe('AuditTrailService', () => {
  let service: AuditTrailService;

  beforeAll(async () => {
    await startTestDb();
    service = new AuditTrailService(new AuditTrailRepository());
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('records an audit trail entry', async () => {
    const entry = await service.record({
      entity: 'Asset',
      entityId: 'asset-1',
      operation: 'update',
      performedBy: 'user-1',
      oldSnapshot: { status: 'active' },
      newSnapshot: { status: 'maintenance' },
      module: 'asset',
    });
    expect(entry.operation).toBe('update');
    expect(entry.timestamp).toBeDefined();
  });

  it('lists entries scoped to the performer', async () => {
    await service.record({ entity: 'Asset', entityId: 'a1', operation: 'create', performedBy: 'user-1', module: 'asset' });
    await service.record({ entity: 'Asset', entityId: 'a2', operation: 'delete', performedBy: 'user-2', module: 'asset' });

    const own = await service.list({ page: 1, limit: 10, skip: 0 }, { roleName: 'Employee', userId: 'user-1' });
    expect(own.total).toBe(1);
    expect(own.data[0].performedBy).toBe('user-1');

    const all = await service.list({ page: 1, limit: 10, skip: 0 }, { roleName: 'Admin', userId: 'admin' });
    expect(all.total).toBe(2);
  });

  it('retrieves a single entry by id', async () => {
    const entry = await service.record({ entity: 'Asset', entityId: 'a1', operation: 'create', performedBy: 'user-1', module: 'asset' });
    const fetched = await service.getById(entry._id.toString(), { roleName: 'Admin', userId: 'admin' });
    expect(fetched.entityId).toBe('a1');
  });

  it('filters by operation', async () => {
    await service.record({ entity: 'Asset', entityId: 'a1', operation: 'create', performedBy: 'user-1', module: 'asset' });
    await service.record({ entity: 'Asset', entityId: 'a2', operation: 'delete', performedBy: 'user-1', module: 'asset' });
    const result = await service.list({ page: 1, limit: 10, skip: 0, operation: 'delete' }, { roleName: 'Admin', userId: 'admin' });
    expect(result.total).toBe(1);
    expect(result.data[0].operation).toBe('delete');
  });
});
