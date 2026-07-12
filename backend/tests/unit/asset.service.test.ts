import { AssetService } from '../../src/modules/asset/asset.service';
import { AssetRepository } from '../../src/modules/asset/asset.repository';
import { AssetHistoryRepository } from '../../src/modules/asset/asset-history.repository';
import { AssetCategoryRepository } from '../../src/modules/organization/repositories/asset-category.repository';
import { DepartmentRepository } from '../../src/modules/organization/repositories/department.repository';
import { AuditRepository } from '../../src/modules/audit/audit.repository';
import { ConflictError, NotFoundError } from '../../src/common/errors';
import { createFixtures } from '../helpers/fixtures';
import { startTestDb, stopTestDb, clearTestDb } from '../helpers/db';

describe('AssetService', () => {
  let svc: AssetService;
  let fx: Awaited<ReturnType<typeof createFixtures>>;

  beforeAll(async () => {
    await startTestDb();
  });
  afterAll(async () => {
    await stopTestDb();
  });
  beforeEach(async () => {
    await clearTestDb();
    fx = await createFixtures();
    svc = new AssetService(
      new AssetRepository(),
      new AssetHistoryRepository(),
      new AssetCategoryRepository(),
      new DepartmentRepository(),
      new AuditRepository()
    );
  });

  it('creates an asset with generated tag, QR/barcode and history', async () => {
    const asset = await svc.create(
      { name: 'Dell', category: fx.cat.id, department: fx.dept.id, purchaseCost: 500, condition: 'new' },
      fx.actorId
    );
    expect(asset.assetTag).toMatch(/^AF-/);
    expect(asset.status).toBe('available');
    expect(asset.qrCode).toBeDefined();
    expect(asset.barcode).toBeDefined();
    expect(asset.categoryName).toBe(fx.cat.name);
  });

  it('rejects a duplicate serial number with ConflictError', async () => {
    await svc.create(
      { name: 'A', category: fx.cat.id, department: fx.dept.id, serialNumber: 'SN123', purchaseCost: 1 },
      fx.actorId
    );
    await expect(
      svc.create(
        { name: 'B', category: fx.cat.id, department: fx.dept.id, serialNumber: 'SN123', purchaseCost: 1 },
        fx.actorId
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws NotFoundError when the category is missing', async () => {
    await expect(
      svc.create(
        { name: 'X', category: '000000000000000000000000', department: fx.dept.id, purchaseCost: 1 },
        fx.actorId
      )
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
