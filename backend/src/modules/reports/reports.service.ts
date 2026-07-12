import { AssetModel, IAsset } from '../asset/asset.model';
import { AllocationModel, IAllocation } from '../allocation/allocation.model';
import { TransferModel, ITransfer } from '../transfer/transfer.model';
import { MaintenanceModel, IMaintenance } from '../maintenance/maintenance.model';
import { BookingModel, IBooking } from '../booking/models/booking.model';
import { AuditModel, IAudit } from '../audit/audit.model';
import { EmployeeModel, IEmployee } from '../organization/models/employee.model';
import { DepartmentModel, IDepartment } from '../organization/models/department.model';
import { reportsCache } from '../dashboard/cache.service';
import { ExportEngine, ASSET_EXPORT_COLUMNS, ALLOCATION_EXPORT_COLUMNS, TRANSFER_EXPORT_COLUMNS, MAINTENANCE_EXPORT_COLUMNS, AUDIT_EXPORT_COLUMNS, BOOKING_EXPORT_COLUMNS } from '../dashboard/export.utils';

export interface ReportFilters {
  departmentId?: string;
  categoryId?: string;
  employeeId?: string;
  assetId?: string;
  status?: string;
  location?: string;
  dateFrom?: Date;
  dateTo?: Date;
  priority?: string;
  condition?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ReportsService {
  async assetReport(filters: ReportFilters) {
    const cacheKey = `report:assets:${JSON.stringify(filters)}`;
    const cached = reportsCache.get(cacheKey);
    if (cached) return cached;

    const query: Record<string, any> = { deletedAt: null };
    if (filters.departmentId) query.department = filters.departmentId;
    if (filters.categoryId) query.category = filters.categoryId;
    if (filters.status) query.status = filters.status;
    if (filters.condition) query.condition = filters.condition;
    if (filters.location) {
      query.$or = [
        { 'location.building': { $regex: filters.location, $options: 'i' } },
        { 'location.room': { $regex: filters.location, $options: 'i' } },
      ];
    }
    if (filters.search) {
      const regex = { $regex: filters.search, $options: 'i' };
      query.$or = [{ assetTag: regex }, { name: regex }, { serialNumber: regex }, { manufacturer: regex }];
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total, stats] = await Promise.all([
      AssetModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      AssetModel.countDocuments(query),
      AssetModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalValue: { $sum: '$currentValue' },
            avgValue: { $avg: '$currentValue' },
            totalPurchaseCost: { $sum: '$purchaseCost' },
          },
        },
      ]),
    ]);

    const result = {
      reportType: 'Asset Report',
      generatedAt: new Date().toISOString(),
      summary: {
        totalAssets: total,
        totalValue: stats[0]?.totalValue ?? 0,
        avgValue: stats[0]?.avgValue ?? 0,
        totalPurchaseCost: stats[0]?.totalPurchaseCost ?? 0,
      },
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
    reportsCache.set(cacheKey, result, 180_000);
    return result;
  }

  async allocationReport(filters: ReportFilters) {
    const cacheKey = `report:allocations:${JSON.stringify(filters)}`;
    const cached = reportsCache.get(cacheKey);
    if (cached) return cached;

    const query: Record<string, any> = {};
    if (filters.departmentId) query.departmentId = filters.departmentId;
    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.assetId) query.assetId = filters.assetId;
    if (filters.status) query.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      query.allocationDate = {};
      if (filters.dateFrom) query.allocationDate.$gte = filters.dateFrom;
      if (filters.dateTo) query.allocationDate.$lte = filters.dateTo;
    }
    if (filters.search) {
      const regex = { $regex: filters.search, $options: 'i' };
      query.$or = [{ allocationNumber: regex }, { purpose: regex }];
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total, statusCounts] = await Promise.all([
      AllocationModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      AllocationModel.countDocuments(query),
      AllocationModel.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const result = {
      reportType: 'Allocation Report',
      generatedAt: new Date().toISOString(),
      summary: {
        totalAllocations: total,
        byStatus: statusCounts.map((s) => ({ status: s._id, count: s.count })),
      },
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
    reportsCache.set(cacheKey, result, 180_000);
    return result;
  }

  async transferReport(filters: ReportFilters) {
    const cacheKey = `report:transfers:${JSON.stringify(filters)}`;
    const cached = reportsCache.get(cacheKey);
    if (cached) return cached;

    const query: Record<string, any> = {};
    if (filters.assetId) query.assetId = filters.assetId;
    if (filters.status) query.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
      if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
    }
    if (filters.search) {
      const regex = { $regex: filters.search, $options: 'i' };
      query.$or = [{ transferNumber: regex }, { requestReason: regex }];
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total, statusCounts] = await Promise.all([
      TransferModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      TransferModel.countDocuments(query),
      TransferModel.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const result = {
      reportType: 'Transfer Report',
      generatedAt: new Date().toISOString(),
      summary: {
        totalTransfers: total,
        byStatus: statusCounts.map((s) => ({ status: s._id, count: s.count })),
      },
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
    reportsCache.set(cacheKey, result, 180_000);
    return result;
  }

  async maintenanceReport(filters: ReportFilters) {
    const cacheKey = `report:maintenance:${JSON.stringify(filters)}`;
    const cached = reportsCache.get(cacheKey);
    if (cached) return cached;

    const query: Record<string, any> = {};
    if (filters.departmentId) query.departmentId = filters.departmentId;
    if (filters.assetId) query.assetId = filters.assetId;
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.dateFrom || filters.dateTo) {
      query.requestedDate = {};
      if (filters.dateFrom) query.requestedDate.$gte = filters.dateFrom;
      if (filters.dateTo) query.requestedDate.$lte = filters.dateTo;
    }
    if (filters.search) {
      const regex = { $regex: filters.search, $options: 'i' };
      query.$or = [{ requestNumber: regex }, { issueTitle: regex }];
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total, statusCounts, costStats] = await Promise.all([
      MaintenanceModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      MaintenanceModel.countDocuments(query),
      MaintenanceModel.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      MaintenanceModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalEstimated: { $sum: { $ifNull: ['$estimatedCost', 0] } },
            totalActual: { $sum: { $ifNull: ['$actualCost', 0] } },
          },
        },
      ]),
    ]);

    const result = {
      reportType: 'Maintenance Report',
      generatedAt: new Date().toISOString(),
      summary: {
        totalRequests: total,
        byStatus: statusCounts.map((s) => ({ status: s._id, count: s.count })),
        totalEstimatedCost: costStats[0]?.totalEstimated ?? 0,
        totalActualCost: costStats[0]?.totalActual ?? 0,
      },
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
    reportsCache.set(cacheKey, result, 180_000);
    return result;
  }

  async auditReport(filters: ReportFilters) {
    const cacheKey = `report:audits:${JSON.stringify(filters)}`;
    const cached = reportsCache.get(cacheKey);
    if (cached) return cached;

    const query: Record<string, any> = {};
    if (filters.departmentId) query.department = filters.departmentId;
    if (filters.status) query.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      query.startDate = {};
      if (filters.dateFrom) query.startDate.$gte = filters.dateFrom;
      if (filters.dateTo) query.startDate.$lte = filters.dateTo;
    }
    if (filters.search) {
      const regex = { $regex: filters.search, $options: 'i' };
      query.$or = [{ auditNumber: regex }, { title: regex }];
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total, statusCounts] = await Promise.all([
      AuditModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      AuditModel.countDocuments(query),
      AuditModel.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const result = {
      reportType: 'Audit Report',
      generatedAt: new Date().toISOString(),
      summary: {
        totalAudits: total,
        byStatus: statusCounts.map((s) => ({ status: s._id, count: s.count })),
      },
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
    reportsCache.set(cacheKey, result, 180_000);
    return result;
  }

  async departmentReport(filters: ReportFilters) {
    const cacheKey = `report:departments:${JSON.stringify(filters)}`;
    const cached = reportsCache.get(cacheKey);
    if (cached) return cached;

    const departments = await DepartmentModel.find({}).lean();

    const data = await Promise.all(
      departments.map(async (dept) => {
        const deptId = String(dept._id);
        const [assetCount, employeeCount, allocationCount, maintenanceCount] = await Promise.all([
          AssetModel.countDocuments({ deletedAt: null, department: deptId }),
          EmployeeModel.countDocuments({ departmentId: deptId, isDeleted: false }),
          AllocationModel.countDocuments({ departmentId: deptId, status: 'allocated' }),
          MaintenanceModel.countDocuments({ departmentId: deptId, status: { $in: ['pending', 'approved', 'in_progress'] } }),
        ]);
        return {
          departmentId: deptId,
          name: dept.name,
          assetCount,
          employeeCount,
          activeAllocations: allocationCount,
          pendingMaintenance: maintenanceCount,
        };
      })
    );

    const result = {
      reportType: 'Department Report',
      generatedAt: new Date().toISOString(),
      summary: {
        totalDepartments: departments.length,
        totalAssets: data.reduce((sum, d) => sum + d.assetCount, 0),
        totalEmployees: data.reduce((sum, d) => sum + d.employeeCount, 0),
      },
      data,
    };
    reportsCache.set(cacheKey, result, 180_000);
    return result;
  }

  async employeeReport(filters: ReportFilters) {
    const cacheKey = `report:employees:${JSON.stringify(filters)}`;
    const cached = reportsCache.get(cacheKey);
    if (cached) return cached;

    const query: Record<string, any> = { isDeleted: false };
    if (filters.departmentId) query.departmentId = filters.departmentId;
    if (filters.search) {
      const regex = { $regex: filters.search, $options: 'i' };
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { employeeCode: regex },
      ];
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      EmployeeModel.find(query).skip(skip).limit(limit).sort({ firstName: 1 }).lean(),
      EmployeeModel.countDocuments(query),
    ]);

    const result = {
      reportType: 'Employee Report',
      generatedAt: new Date().toISOString(),
      summary: { totalEmployees: total },
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
    reportsCache.set(cacheKey, result, 180_000);
    return result;
  }

  async assetLifecycleReport(filters: ReportFilters) {
    const cacheKey = `report:lifecycle:${JSON.stringify(filters)}`;
    const cached = reportsCache.get(cacheKey);
    if (cached) return cached;

    const query: Record<string, any> = { deletedAt: null };
    if (filters.departmentId) query.department = filters.departmentId;
    if (filters.categoryId) query.category = filters.categoryId;

    const [statusDistribution, valueByAge, conditionDistribution] = await Promise.all([
      AssetModel.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$currentValue' } } },
      ]),
      AssetModel.aggregate([
        { $match: { ...query, purchaseDate: { $ne: null } } },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  {
                    case: {
                      $gte: ['$purchaseDate', new Date(new Date().setFullYear(new Date().getFullYear() - 1))],
                    },
                    then: '0-1 years',
                  },
                  {
                    case: {
                      $gte: ['$purchaseDate', new Date(new Date().setFullYear(new Date().getFullYear() - 3))],
                    },
                    then: '1-3 years',
                  },
                  {
                    case: {
                      $gte: ['$purchaseDate', new Date(new Date().setFullYear(new Date().getFullYear() - 5))],
                    },
                    then: '3-5 years',
                  },
                ],
                default: '5+ years',
              },
            },
            count: { $sum: 1 },
            avgValue: { $avg: '$currentValue' },
          },
        },
      ]),
      AssetModel.aggregate([
        { $match: query },
        { $group: { _id: '$condition', count: { $sum: 1 } } },
      ]),
    ]);

    const result = {
      reportType: 'Asset Lifecycle Report',
      generatedAt: new Date().toISOString(),
      summary: {
        byStatus: statusDistribution.map((s) => ({ status: s._id, count: s.count, totalValue: s.totalValue })),
        byAge: valueByAge.map((a) => ({ ageGroup: a._id, count: a.count, avgValue: a.avgValue })),
        byCondition: conditionDistribution.map((c) => ({ condition: c._id, count: c.count })),
      },
    };
    reportsCache.set(cacheKey, result, 180_000);
    return result;
  }

  async utilizationReport(filters: ReportFilters) {
    const cacheKey = `report:utilization:${JSON.stringify(filters)}`;
    const cached = reportsCache.get(cacheKey);
    if (cached) return cached;

    const totalAssets = await AssetModel.countDocuments({ deletedAt: null });
    const allocated = await AssetModel.countDocuments({ deletedAt: null, status: 'allocated' });
    const reserved = await AssetModel.countDocuments({ deletedAt: null, status: 'reserved' });
    const inMaintenance = await AssetModel.countDocuments({ deletedAt: null, status: 'maintenance' });

    const totalBookings = await BookingModel.countDocuments({});
    const completedBookings = await BookingModel.countDocuments({ status: 'Completed' });

    const result = {
      reportType: 'Utilization Report',
      generatedAt: new Date().toISOString(),
      summary: {
        assetUtilization: {
          total: totalAssets,
          allocated,
          reserved,
          inMaintenance,
          utilizationPercentage: totalAssets > 0 ? Math.round(((allocated + reserved) / totalAssets) * 10000) / 100 : 0,
        },
        bookingUtilization: {
          total: totalBookings,
          completed: completedBookings,
          completionRate: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 10000) / 100 : 0,
        },
      },
    };
    reportsCache.set(cacheKey, result, 180_000);
    return result;
  }

  exportCSV(reportType: string, data: Record<string, unknown>[]): string {
    switch (reportType) {
      case 'assets':
        return ExportEngine.toCSV(data as any[], ASSET_EXPORT_COLUMNS);
      case 'allocations':
        return ExportEngine.toCSV(data as any[], ALLOCATION_EXPORT_COLUMNS);
      case 'transfers':
        return ExportEngine.toCSV(data as any[], TRANSFER_EXPORT_COLUMNS);
      case 'maintenance':
        return ExportEngine.toCSV(data as any[], MAINTENANCE_EXPORT_COLUMNS);
      case 'audits':
        return ExportEngine.toCSV(data as any[], AUDIT_EXPORT_COLUMNS);
      case 'bookings':
        return ExportEngine.toCSV(data as any[], BOOKING_EXPORT_COLUMNS);
      default:
        return ExportEngine.toCSV(data as any[], []);
    }
  }

  invalidateCache(): void {
    reportsCache.invalidateAll();
  }
}
