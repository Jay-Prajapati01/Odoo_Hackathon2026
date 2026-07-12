export interface ActivityLogScope {
  roleName: string;
  userId: string;
  departmentId?: string;
}

export interface CreateActivityInput {
  user: string;
  module: string;
  entityType: string;
  entityId: string;
  action: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  description?: string;
  ipAddress?: string;
  browser?: string;
  device?: string;
}

export interface ActivityLogFilter {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  user?: string;
  action?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sort?: 'newest' | 'oldest';
  scope?: Record<string, unknown>;
}
