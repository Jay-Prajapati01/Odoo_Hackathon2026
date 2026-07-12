import { Model } from 'mongoose';
import { IAuditTrail, AuditTrailModel, AuditOperation } from '../models/audit-trail.model';

export interface AuditTrailScope {
  roleName: string;
  userId: string;
  departmentId?: string;
}

export interface CreateAuditTrailInput {
  entity: string;
  entityId: string;
  operation: AuditOperation;
  performedBy: string;
  oldSnapshot?: Record<string, unknown>;
  newSnapshot?: Record<string, unknown>;
  module: string;
  ipAddress?: string;
  timestamp?: Date;
}

export interface AuditTrailFilter {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  entity?: string;
  entityId?: string;
  operation?: AuditOperation;
  performedBy?: string;
  module?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sort?: 'newest' | 'oldest';
  scope?: Record<string, unknown>;
}
