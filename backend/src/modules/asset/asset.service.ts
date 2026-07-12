import { Request } from 'express';
import path from 'path';
import { AuditRepository } from '../audit/audit.repository';
import { AssetCategoryRepository } from '../organization/repositories/asset-category.repository';
import { DepartmentRepository } from '../organization/repositories/department.repository';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../common/errors';
import { parsePagination } from '../../utils/pagination';
import { dispatchNotification, recordActivity } from '../../shared/events';
import { AssetHistoryRepository } from './asset-history.repository';
import { AssetHistoryAction } from './asset-history.model';
import { AssetRepository } from './asset.repository';
import { AssetCondition, AssetDocumentType, AssetStatus, IAsset, IAssetDocument } from './asset.model';
import { generateAssetTag, generateBarcodeAsset, generateQrCodeAsset } from './asset.utils';

const VALID_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  available: ['allocated', 'reserved', 'maintenance', 'lost', 'retired', 'disposed'],
  allocated: ['available', 'maintenance', 'lost', 'retired'],
  reserved: ['available', 'allocated', 'maintenance', 'lost', 'retired'],
  maintenance: ['available', 'lost', 'retired'],
  lost: ['available', 'retired', 'disposed'],
  retired: ['disposed'],
  disposed: [],
};

const BLOCKED_DELETE_MESSAGES: Partial<Record<AssetStatus, string>> = {
  allocated: 'Cannot delete an allocated asset',
  reserved: 'Cannot delete a reserved asset',
  maintenance: 'Cannot delete an asset under maintenance',
};

const getDocumentType = (mimeType: string): AssetDocumentType => {
  if (mimeType === 'application/pdf') return 'invoice';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('word')) return 'manual';
  return 'other';
};

const normalizeSerialNumber = (serialNumber?: string): string | undefined => serialNumber?.trim().toUpperCase() || undefined;

const sanitizeAssetPatch = (
  data: Record<string, unknown>
): Partial<IAsset> & { categoryId?: string; departmentId?: string } => {
  const patch = { ...data } as Partial<IAsset> & { categoryId?: string; departmentId?: string };

  if ('assetCode' in patch) delete patch.assetCode;
  if ('assetTag' in patch) delete patch.assetTag;

  if (patch.categoryId && !patch.category) patch.category = patch.categoryId;
  if (patch.departmentId && !patch.department) patch.department = patch.departmentId;

  delete patch.categoryId;
  delete patch.departmentId;

  if (patch.serialNumber) patch.serialNumber = normalizeSerialNumber(patch.serialNumber);
  if (patch.location && typeof patch.location === 'object') {
    patch.location = Object.fromEntries(
      Object.entries(patch.location as Record<string, unknown>).filter(([, value]) => value !== undefined && value !== '')
    ) as IAsset['location'];
  }

  return patch;
};

const createHistoryChanges = (before: Partial<IAsset>, after: Partial<IAsset>): Array<{ field: string; oldValue?: unknown; newValue?: unknown }> => {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  return keys
    .filter((key) => JSON.stringify(before[key as keyof IAsset]) !== JSON.stringify(after[key as keyof IAsset]))
    .map((key) => ({
      field: key,
      oldValue: before[key as keyof IAsset],
      newValue: after[key as keyof IAsset],
    }));
};

export class AssetService {
  constructor(
    private readonly repo: AssetRepository,
    private readonly historyRepo: AssetHistoryRepository,
    private readonly categoryRepo: AssetCategoryRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly auditRepo: AuditRepository
  ) {}

  async create(data: Record<string, unknown>, actorId: string, req?: Request): Promise<IAsset> {
    const sequenceValue = await this.repo.nextSequenceValue();
    const assetTag = generateAssetTag(sequenceValue);
    const patch = sanitizeAssetPatch(data);

    if (patch.serialNumber) {
      const existingSerial = await this.repo.findBySerialNumber(patch.serialNumber);
      if (existingSerial) throw new ConflictError('Serial number already exists');
    }

    const category = await this.categoryRepo.findById(patch.category!);
    if (!category) throw new NotFoundError('Asset category not found');

    let departmentName: string | undefined;
    if (patch.department) {
      const department = await this.departmentRepo.findById(patch.department);
      if (!department) throw new NotFoundError('Department not found');
      departmentName = department.name;
    }

    const qrCode = generateQrCodeAsset(assetTag);
    const barcode = generateBarcodeAsset(assetTag);

    const asset = await this.repo.create({
      ...patch,
      assetTag,
      categoryName: category.name,
      departmentName,
      qrCode,
      barcode,
      status: (patch.status as AssetStatus | undefined) ?? 'available',
      condition: (patch.condition as AssetCondition | undefined) ?? 'new',
      currentValue: patch.currentValue ?? patch.purchaseCost ?? 0,
      createdBy: actorId,
      updatedBy: actorId,
      documents: [],
      specifications: patch.specifications ?? {},
    });

    await this.logHistory(asset, 'created', actorId, [], req, asset.toObject());
    await this.logHistory(asset, 'qr_generated', actorId, [{ field: 'qrCode', newValue: asset.qrCode }], req);
    await this.logHistory(asset, 'barcode_generated', actorId, [{ field: 'barcode', newValue: asset.barcode }], req);

    recordActivity({
      req,
      userId: actorId,
      action: 'asset.created',
      entity: 'Asset',
      entityId: asset.id,
      newValue: asset.toObject(),
    });
    dispatchNotification({
      recipientId: actorId,
      type: 'general',
      title: 'Asset Registered',
      message: `Asset ${asset.assetTag} (${asset.name}) registered successfully.`,
      reference: { entity: 'Asset', entityId: asset.id },
    });
    this.notifyWarrantyIfNeeded(asset, actorId);

    return asset;
  }

  async getById(id: string): Promise<IAsset | null> {
    return this.repo.findById(id);
  }

  async list(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePagination(query);
    const sort = this.resolveSort(query.sortBy as string | undefined);
    const data = await this.repo.findAll({
      page,
      limit,
      skip,
      search: query.search as string | undefined,
      status: query.status as string | undefined,
      categoryId: query.categoryId as string | undefined,
      departmentId: query.departmentId as string | undefined,
      condition: query.condition as string | undefined,
      manufacturer: query.manufacturer as string | undefined,
      location: query.location as string | undefined,
      serialNumber: query.serialNumber as string | undefined,
      assetTag: query.assetTag as string | undefined,
      barcode: query.barcode as string | undefined,
      qrCode: query.qrCode as string | undefined,
      sharedResource: query.sharedResource as boolean | undefined,
      purchaseDateFrom: query.purchaseDateFrom as Date | undefined,
      purchaseDateTo: query.purchaseDateTo as Date | undefined,
      warrantyExpiringBefore: query.warrantyExpiringBefore as Date | undefined,
      sort,
    });
    const total = await this.repo.count({
      search: query.search as string | undefined,
      status: query.status as string | undefined,
      categoryId: query.categoryId as string | undefined,
      departmentId: query.departmentId as string | undefined,
      condition: query.condition as string | undefined,
      manufacturer: query.manufacturer as string | undefined,
      location: query.location as string | undefined,
      serialNumber: query.serialNumber as string | undefined,
      assetTag: query.assetTag as string | undefined,
      barcode: query.barcode as string | undefined,
      qrCode: query.qrCode as string | undefined,
      sharedResource: query.sharedResource as boolean | undefined,
      purchaseDateFrom: query.purchaseDateFrom as Date | undefined,
      purchaseDateTo: query.purchaseDateTo as Date | undefined,
      warrantyExpiringBefore: query.warrantyExpiringBefore as Date | undefined,
    });
    return { data, page, limit, total };
  }

  async update(id: string, data: Record<string, unknown>, actorId: string, req?: Request): Promise<IAsset> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Asset not found');

    const patch = sanitizeAssetPatch(data);

    if (patch.serialNumber && patch.serialNumber !== existing.serialNumber) {
      const duplicateSerial = await this.repo.findBySerialNumber(patch.serialNumber);
      if (duplicateSerial && duplicateSerial.id !== id) throw new ConflictError('Serial number already exists');
    }

    if (patch.category && patch.category !== existing.category) {
      const category = await this.categoryRepo.findById(patch.category);
      if (!category) throw new NotFoundError('Asset category not found');
      patch.categoryName = category.name;
    }

    if (patch.department !== undefined && patch.department !== existing.department) {
      if (patch.department) {
        const department = await this.departmentRepo.findById(patch.department);
        if (!department) throw new NotFoundError('Department not found');
        patch.departmentName = department.name;
      } else {
        patch.departmentName = undefined;
      }
    }

    if (patch.status && patch.status !== existing.status) {
      this.assertStatusTransition(existing.status, patch.status as AssetStatus);
    }

    patch.updatedBy = actorId;
    const updated = await this.repo.update(id, patch);
    if (!updated) throw new NotFoundError('Asset not found');

    const changes = createHistoryChanges(existing.toObject(), updated.toObject());
    await this.logHistory(updated, 'updated', actorId, changes, req);

    recordActivity({
      req,
      userId: actorId,
      action: 'asset.updated',
      entity: 'Asset',
      entityId: id,
      oldValue: existing.toObject(),
      newValue: updated.toObject(),
    });

    if (patch.status && patch.status !== existing.status) {
      dispatchNotification({
        recipientId: actorId,
        type: 'general',
        title: 'Asset Status Updated',
        message: `Asset ${updated.assetTag} status changed to ${updated.status}.`,
        reference: { entity: 'Asset', entityId: updated.id },
      });
    } else {
      dispatchNotification({
        recipientId: actorId,
        type: 'general',
        title: 'Asset Updated',
        message: `Asset ${updated.assetTag} was updated successfully.`,
        reference: { entity: 'Asset', entityId: updated.id },
      });
    }

    this.notifyWarrantyIfNeeded(updated, actorId);

    return updated;
  }

  async changeStatus(id: string, status: AssetStatus, actorId: string, req?: Request): Promise<IAsset> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Asset not found');

    this.assertStatusTransition(existing.status, status);

    const updated = await this.repo.update(id, { status, updatedBy: actorId });
    if (!updated) throw new NotFoundError('Asset not found');

    await this.logHistory(
      updated,
      'status_changed',
      actorId,
      [{ field: 'status', oldValue: existing.status, newValue: status }],
      req
    );

    recordActivity({
      req,
      userId: actorId,
      action: 'asset.status_changed',
      entity: 'Asset',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status },
    });
    dispatchNotification({
      recipientId: actorId,
      type: 'general',
      title: 'Asset Status Changed',
      message: `Asset ${updated.assetTag} moved from ${existing.status} to ${status}.`,
      reference: { entity: 'Asset', entityId: updated.id },
    });

    if (status === 'retired') {
      dispatchNotification({
        recipientId: actorId,
        type: 'general',
        title: 'Asset Retired',
        message: `Asset ${updated.assetTag} has been retired.`,
        reference: { entity: 'Asset', entityId: updated.id },
      });
    }

    return updated;
  }

  async uploadImage(id: string, file: Express.Multer.File, actorId: string, req?: Request): Promise<IAsset> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Asset not found');

    const assetImage = `/${path.relative(process.cwd(), file.path).replace(/\\/g, '/')}`;
    const updated = await this.repo.update(id, { assetImage, updatedBy: actorId });
    if (!updated) throw new NotFoundError('Asset not found');

    await this.logHistory(
      updated,
      'image_uploaded',
      actorId,
      [{ field: 'assetImage', oldValue: existing.assetImage, newValue: assetImage }],
      req
    );

    recordActivity({
      req,
      userId: actorId,
      action: 'asset.image_uploaded',
      entity: 'Asset',
      entityId: id,
      oldValue: { assetImage: existing.assetImage },
      newValue: { assetImage },
    });

    return updated;
  }

  async uploadDocuments(id: string, files: Express.Multer.File[], actorId: string, req?: Request): Promise<IAsset> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Asset not found');

    const uploadedDocuments: IAssetDocument[] = files.map((file) => ({
      name: file.originalname,
      path: `/${path.relative(process.cwd(), file.path).replace(/\\/g, '/')}`,
      mimeType: file.mimetype,
      size: file.size,
      type: getDocumentType(file.mimetype),
      uploadedAt: new Date(),
      uploadedBy: actorId,
    }));

    const updated = await this.repo.update(id, {
      documents: [...existing.documents, ...uploadedDocuments],
      updatedBy: actorId,
    });
    if (!updated) throw new NotFoundError('Asset not found');

    await this.logHistory(
      updated,
      'documents_uploaded',
      actorId,
      [{ field: 'documents', oldValue: existing.documents.length, newValue: updated.documents.length }],
      req,
      undefined,
      { uploadedFiles: uploadedDocuments.map((document) => document.name) }
    );

    recordActivity({
      req,
      userId: actorId,
      action: 'asset.documents_uploaded',
      entity: 'Asset',
      entityId: id,
      newValue: { uploadedDocuments: uploadedDocuments.map((document) => document.name) },
    });

    return updated;
  }

  async regenerateQrCode(id: string, actorId: string, req?: Request): Promise<IAsset> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Asset not found');

    const qrCode = generateQrCodeAsset(existing.assetTag);
    const updated = await this.repo.update(id, { qrCode, updatedBy: actorId });
    if (!updated) throw new NotFoundError('Asset not found');

    await this.logHistory(updated, 'qr_generated', actorId, [{ field: 'qrCode', oldValue: existing.qrCode, newValue: qrCode }], req);
    recordActivity({ req, userId: actorId, action: 'asset.qr_generated', entity: 'Asset', entityId: id, newValue: { qrCode } });
    return updated;
  }

  async regenerateBarcode(id: string, actorId: string, req?: Request): Promise<IAsset> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Asset not found');

    const barcode = generateBarcodeAsset(existing.assetTag);
    const updated = await this.repo.update(id, { barcode, updatedBy: actorId });
    if (!updated) throw new NotFoundError('Asset not found');

    await this.logHistory(
      updated,
      'barcode_generated',
      actorId,
      [{ field: 'barcode', oldValue: existing.barcode, newValue: barcode }],
      req
    );
    recordActivity({ req, userId: actorId, action: 'asset.barcode_generated', entity: 'Asset', entityId: id, newValue: { barcode } });
    return updated;
  }

  async remove(id: string, actorId: string, req?: Request): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Asset not found');

    const blockedDeleteMessage = BLOCKED_DELETE_MESSAGES[existing.status];
    if (blockedDeleteMessage) {
      throw new BusinessRuleError(blockedDeleteMessage);
    }

    const blockingAudit = await this.auditRepo.findOneByAssetAndStatuses(id, ['scheduled', 'in_progress']);
    if (blockingAudit) {
      throw new BusinessRuleError('Cannot delete asset while an audit is scheduled or in progress');
    }

    const deletedAt = new Date();
    const deleted = await this.repo.softDelete(id, deletedAt, actorId);
    if (!deleted) throw new NotFoundError('Asset not found');

    await this.logHistory(
      deleted,
      'deleted',
      actorId,
      [{ field: 'deletedAt', oldValue: null, newValue: deletedAt.toISOString() }],
      req
    );

    recordActivity({
      req,
      userId: actorId,
      action: 'asset.deleted',
      entity: 'Asset',
      entityId: id,
      oldValue: existing.toObject(),
      newValue: { deletedAt },
    });
    dispatchNotification({
      recipientId: actorId,
      type: 'general',
      title: 'Asset Deleted',
      message: `Asset ${existing.assetTag} was soft deleted.`,
      reference: { entity: 'Asset', entityId: id },
    });
  }

  async getHistory(id: string, query: Record<string, unknown>) {
    const asset = await this.repo.findById(id);
    if (!asset) throw new NotFoundError('Asset not found');

    const { page, limit, skip } = parsePagination(query);
    const data = await this.historyRepo.findAll({ assetId: id, page, limit, skip });
    const total = await this.historyRepo.count(id);
    return { data, page, limit, total };
  }

  private assertStatusTransition(from: AssetStatus, to: AssetStatus): void {
    const allowed = VALID_TRANSITIONS[from] ?? [];
    if (from !== to && !allowed.includes(to)) {
      throw new BusinessRuleError(`Cannot transition asset from '${from}' to '${to}'`);
    }
  }

  private resolveSort(sortBy?: string): Record<string, 1 | -1> {
    switch (sortBy) {
      case 'oldest':
        return { createdAt: 1 };
      case 'alphabetical':
        return { name: 1 };
      case 'purchaseCost':
        return { purchaseCost: -1, createdAt: -1 };
      case 'warrantyExpiry':
        return { warrantyEnd: 1, createdAt: -1 };
      case 'currentValue':
        return { currentValue: -1, createdAt: -1 };
      case 'newest':
      default:
        return { createdAt: -1 };
    }
  }

  private async logHistory(
    asset: IAsset,
    action: AssetHistoryAction,
    actorId: string,
    changes: Array<{ field: string; oldValue?: unknown; newValue?: unknown }>,
    req?: Request,
    snapshot?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.historyRepo.create({
      assetId: asset.id,
      assetTag: asset.assetTag,
      action,
      changes,
      snapshot: snapshot ?? asset.toObject(),
      metadata: {
        ...(metadata ?? {}),
        traceId: req?.traceId,
      },
      createdBy: actorId,
    });
  }

  private notifyWarrantyIfNeeded(asset: IAsset, actorId: string): void {
    if (!asset.warrantyEnd) return;
    const today = new Date();
    const differenceMs = asset.warrantyEnd.getTime() - today.getTime();
    const daysRemaining = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));

    if (daysRemaining >= 0 && daysRemaining <= 30) {
      dispatchNotification({
        recipientId: actorId,
        type: 'reminder',
        title: 'Warranty Expiring Soon',
        message: `Warranty for asset ${asset.assetTag} expires in ${daysRemaining} day(s).`,
        reference: { entity: 'Asset', entityId: asset.id },
      });
    }
  }
}
