import { AssetCategoryRepository } from '../repositories/asset-category.repository';
import { IAssetCategory } from '../models/asset-category.model';
import { ConflictError, NotFoundError } from '../../../common/errors';
import { parsePagination, parseSearch } from '../../../utils/pagination';
import { recordActivity } from '../../../shared/events';
import { Request } from 'express';
import { AssetCategoryInput } from '../types/organization.types';

export class AssetCategoryService {
  constructor(private readonly repo: AssetCategoryRepository) {}

  private validateCustomFields(fields: AssetCategoryInput['customFields']): void {
    if (!fields || fields.length === 0) return;
    const keys = new Set<string>();
    for (const field of fields) {
      if (keys.has(field.key)) throw new ConflictError(`Duplicate custom field key: ${field.key}`);
      keys.add(field.key);
      if (field.type === 'select') {
        if (!field.options || field.options.length === 0) {
          throw new ConflictError(`Custom field '${field.key}' of type select requires options`);
        }
      } else if (field.options && field.options.length > 0) {
        throw new ConflictError(`Custom field '${field.key}' does not support options`);
      }
    }
  }

  private async validateUniqueness(data: Partial<AssetCategoryInput>, excludeId?: string): Promise<void> {
    if (data.name) {
      const byName = await this.repo.findByName(data.name);
      if (byName && byName.id !== excludeId) throw new ConflictError('Asset category name already exists');
    }
    if (data.code) {
      const byCode = await this.repo.findByCode(data.code);
      if (byCode && byCode.id !== excludeId) throw new ConflictError('Asset category code already exists');
    }
  }

  async create(data: AssetCategoryInput, actorId: string, req?: Request): Promise<IAssetCategory> {
    await this.validateUniqueness(data);
    this.validateCustomFields(data.customFields);
    const category = await this.repo.create({
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description ?? '',
      categoryType: data.categoryType ?? 'General',
      status: data.status ?? 'active',
      customFields: (data.customFields ?? []).map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required ?? false,
        options: f.options ?? [],
      })),
      createdBy: actorId,
    });
    recordActivity({
      req,
      userId: actorId,
      action: 'asset_category.created',
      entity: 'AssetCategory',
      entityId: category.id,
      newValue: category.toObject(),
    });
    return category;
  }

  async getById(id: string): Promise<IAssetCategory> {
    const category = await this.repo.findById(id);
    if (!category) throw new NotFoundError('Asset category not found');
    return category;
  }

  async list(query: Record<string, unknown>): Promise<{ data: IAssetCategory[]; page: number; limit: number; total: number }> {
    const { page, limit, skip } = parsePagination(query);
    const search = parseSearch(query);
    const status = query.status as 'active' | 'inactive' | undefined;
    const data = await this.repo.findAll({ page, limit, skip, search, status });
    const total = await this.repo.count({ page, limit, skip, search, status });
    return { data, page, limit, total };
  }

  async update(id: string, data: AssetCategoryInput, actorId: string, req?: Request): Promise<IAssetCategory> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Asset category not found');
    await this.validateUniqueness(data, id);
    this.validateCustomFields(data.customFields);
    const updated = await this.repo.update(id, {
      ...data,
      code: data.code ? data.code.toUpperCase() : undefined,
      customFields: data.customFields
        ? data.customFields.map((f) => ({ key: f.key, label: f.label, type: f.type, required: f.required ?? false, options: f.options ?? [] }))
        : undefined,
      updatedBy: actorId,
    });
    recordActivity({
      req,
      userId: actorId,
      action: 'asset_category.updated',
      entity: 'AssetCategory',
      entityId: id,
      oldValue: existing.toObject(),
      newValue: updated?.toObject(),
    });
    return updated!;
  }

  async deactivate(id: string, actorId: string, req?: Request): Promise<IAssetCategory> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Asset category not found');
    const updated = await this.repo.update(id, { status: 'inactive', updatedBy: actorId });
    recordActivity({ req, userId: actorId, action: 'asset_category.deactivated', entity: 'AssetCategory', entityId: id, oldValue: { status: existing.status }, newValue: { status: 'inactive' } });
    return updated!;
  }

  async activate(id: string, actorId: string, req?: Request): Promise<IAssetCategory> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Asset category not found');
    const updated = await this.repo.update(id, { status: 'active', updatedBy: actorId });
    recordActivity({ req, userId: actorId, action: 'asset_category.activated', entity: 'AssetCategory', entityId: id, oldValue: { status: existing.status }, newValue: { status: 'active' } });
    return updated!;
  }

  async remove(id: string, actorId: string, req?: Request): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Asset category not found');
    await this.repo.softDelete(id);
    recordActivity({ req, userId: actorId, action: 'asset_category.deleted', entity: 'AssetCategory', entityId: id, oldValue: existing.toObject() });
  }
}
