import { AssetModel } from '../asset/asset.model';
import { AllocationModel } from '../allocation/allocation.model';
import { TransferModel } from '../transfer/transfer.model';
import { MaintenanceModel } from '../maintenance/maintenance.model';
import { BookingModel } from '../booking/models/booking.model';
import { AuditModel } from '../audit/audit.model';
import { EmployeeModel } from '../organization/models/employee.model';
import { DepartmentModel } from '../organization/models/department.model';
import { analyticsCache } from './cache.service';

export class AnalyticsService {
  async getAssetUtilization() {
    const cached = analyticsCache.get('analytics:assetUtilization');
    if (cached) return cached;

    const total = await AssetModel.countDocuments({ deletedAt: null });
    const allocated = await AssetModel.countDocuments({ deletedAt: null, status: 'allocated' });
    const reserved = await AssetModel.countDocuments({ deletedAt: null, status: 'reserved' });
    const inMaintenance = await AssetModel.countDocuments({ deletedAt: null, status: 'maintenance' });

    const utilization = total > 0 ? ((allocated + reserved) / total) * 100 : 0;

    const result = {
      total,
      allocated,
      reserved,
      inMaintenance,
      utilizationPercentage: Math.round(utilization * 100) / 100,
    };
    analyticsCache.set('analytics:assetUtilization', result, 300_000);
    return result;
  }

  async getMostUsedAssets(limit: number = 10) {
    const cached = analyticsCache.get(`analytics:mostUsed:${limit}`);
    if (cached) return cached;

    const data = await AllocationModel.aggregate([
      { $match: { status: { $in: ['allocated', 'returned', 'transferred'] } } },
      { $group: { _id: '$assetId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    analyticsCache.set(`analytics:mostUsed:${limit}`, data, 300_000);
    return data;
  }

  async getLeastUsedAssets(limit: number = 10) {
    const cached = analyticsCache.get(`analytics:leastUsed:${limit}`);
    if (cached) return cached;

    const data = await AllocationModel.aggregate([
      { $match: { status: { $in: ['allocated', 'returned', 'transferred'] } } },
      { $group: { _id: '$assetId', count: { $sum: 1 } } },
      { $sort: { count: 1 } },
      { $limit: limit },
    ]);

    analyticsCache.set(`analytics:leastUsed:${limit}`, data, 300_000);
    return data;
  }

  async getIdleAssets() {
    const cached = analyticsCache.get('analytics:idleAssets');
    if (cached) return cached;

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const allocatedAssets = await AllocationModel.distinct('assetId', {
      status: 'allocated',
      createdAt: { $lt: threeMonthsAgo },
    });

    const result = {
      count: allocatedAssets.length,
      assetIds: allocatedAssets,
    };
    analyticsCache.set('analytics:idleAssets', result, 300_000);
    return result;
  }

  async getMaintenanceFrequency() {
    const cached = analyticsCache.get('analytics:maintenanceFreq');
    if (cached) return cached;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const data = await MaintenanceModel.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    analyticsCache.set('analytics:maintenanceFreq', data, 300_000);
    return data;
  }

  async getMaintenanceCost() {
    const cached = analyticsCache.get('analytics:maintenanceCost');
    if (cached) return cached;

    const data = await MaintenanceModel.aggregate([
      { $match: { actualCost: { $gt: 0 } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$completionDate' } },
          totalCost: { $sum: '$actualCost' },
          avgCost: { $avg: '$actualCost' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    analyticsCache.set('analytics:maintenanceCost', data, 300_000);
    return data;
  }

  async getDepartmentAssetDistribution() {
    const cached = analyticsCache.get('analytics:deptAssetDist');
    if (cached) return cached;

    const data = await AssetModel.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: { $ifNull: ['$departmentName', 'Unassigned'] },
          count: { $sum: 1 },
          totalValue: { $sum: '$currentValue' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    analyticsCache.set('analytics:deptAssetDist', data, 300_000);
    return data;
  }

  async getDepartmentAllocation() {
    const cached = analyticsCache.get('analytics:deptAllocation');
    if (cached) return cached;

    const data = await AllocationModel.aggregate([
      { $match: { status: { $in: ['allocated', 'overdue'] } } },
      {
        $group: {
          _id: '$departmentId',
          count: { $sum: 1 },
          overdue: {
            $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    analyticsCache.set('analytics:deptAllocation', data, 300_000);
    return data;
  }

  async getDepartmentMaintenance() {
    const cached = analyticsCache.get('analytics:deptMaintenance');
    if (cached) return cached;

    const data = await MaintenanceModel.aggregate([
      {
        $group: {
          _id: '$departmentId',
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
          totalCost: { $sum: { $ifNull: ['$actualCost', 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]);

    analyticsCache.set('analytics:deptMaintenance', data, 300_000);
    return data;
  }

  async getDepartmentAuditStats() {
    const cached = analyticsCache.get('analytics:deptAudit');
    if (cached) return cached;

    const data = await AuditModel.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$department', 'Organization'] },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          scheduled: {
            $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    analyticsCache.set('analytics:deptAudit', data, 300_000);
    return data;
  }

  async getBookingUtilizationAnalytics() {
    const cached = analyticsCache.get('analytics:bookingUtil');
    if (cached) return cached;

    const [total, byStatus, peakHours] = await Promise.all([
      BookingModel.countDocuments({}),
      BookingModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      BookingModel.aggregate([
        { $match: { status: { $in: ['Completed', 'Ongoing'] } } },
        {
          $group: {
            _id: { $hour: '$startDateTime' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const result = {
      total,
      byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
      peakHours: peakHours.map((h) => ({ hour: h._id, count: h.count })),
    };
    analyticsCache.set('analytics:bookingUtil', result, 300_000);
    return result;
  }

  async getTopDepartmentsByUsage(limit: number = 5) {
    const cached = analyticsCache.get(`analytics:topDepts:${limit}`);
    if (cached) return cached;

    const data = await AllocationModel.aggregate([
      { $match: { status: { $in: ['allocated', 'returned', 'transferred'] } } },
      { $group: { _id: '$departmentId', totalAllocations: { $sum: 1 } } },
      { $sort: { totalAllocations: -1 } },
      { $limit: limit },
    ]);

    analyticsCache.set(`analytics:topDepts:${limit}`, data, 300_000);
    return data;
  }

  async getAssetAging() {
    const cached = analyticsCache.get('analytics:assetAging');
    if (cached) return cached;

    const now = new Date();
    const ranges = [
      { label: '0-1 years', max: 1 },
      { label: '1-3 years', max: 3 },
      { label: '3-5 years', max: 5 },
      { label: '5-10 years', max: 10 },
      { label: '10+ years', max: 999 },
    ];

    const aging = await Promise.all(
      ranges.map(async (range) => {
        const start = new Date(now);
        start.setFullYear(start.getFullYear() - range.max);
        const end = new Date(now);
        if (range.max < 999) {
          end.setFullYear(end.getFullYear() - (range.max === 1 ? 0 : range.max - 1));
        }
        const count = await AssetModel.countDocuments({
          deletedAt: null,
          purchaseDate: range.max === 999
            ? { $lt: start }
            : { $gte: start, $lt: end },
        });
        return { label: range.label, count };
      })
    );

    analyticsCache.set('analytics:assetAging', aging, 300_000);
    return aging;
  }

  async getWarrantyExpirySummary() {
    const cached = analyticsCache.get('analytics:warrantyExpiry');
    if (cached) return cached;

    const now = new Date();
    const threeMonths = new Date(now);
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    const sixMonths = new Date(now);
    sixMonths.setMonth(sixMonths.getMonth() + 6);
    const oneYear = new Date(now);
    oneYear.setFullYear(oneYear.getFullYear() + 1);

    const [expired, within3Months, within6Months, within1Year] = await Promise.all([
      AssetModel.countDocuments({ deletedAt: null, warrantyEnd: { $lt: now } }),
      AssetModel.countDocuments({ deletedAt: null, warrantyEnd: { $gte: now, $lt: threeMonths } }),
      AssetModel.countDocuments({ deletedAt: null, warrantyEnd: { $gte: threeMonths, $lt: sixMonths } }),
      AssetModel.countDocuments({ deletedAt: null, warrantyEnd: { $gte: sixMonths, $lt: oneYear } }),
    ]);

    const result = { expired, within3Months, within6Months, within1Year };
    analyticsCache.set('analytics:warrantyExpiry', result, 300_000);
    return result;
  }

  async getAssetLifecycle() {
    const cached = analyticsCache.get('analytics:assetLifecycle');
    if (cached) return cached;

    const data = await AssetModel.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgValue: { $avg: '$currentValue' },
          totalValue: { $sum: '$currentValue' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    analyticsCache.set('analytics:assetLifecycle', data, 300_000);
    return data;
  }

  invalidateCache(): void {
    analyticsCache.invalidateAll();
  }
}
