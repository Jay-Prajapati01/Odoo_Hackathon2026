import { AssetModel } from '../asset/asset.model';
import { AllocationModel } from '../allocation/allocation.model';
import { TransferModel } from '../transfer/transfer.model';
import { MaintenanceModel } from '../maintenance/maintenance.model';
import { BookingModel } from '../booking/models/booking.model';
import { AuditModel } from '../audit/audit.model';
import { EmployeeModel } from '../organization/models/employee.model';
import { DepartmentModel } from '../organization/models/department.model';
import { dashboardCache } from './cache.service';

const CACHE_KEY = 'dashboard';
const CACHE_TTL = 120_000;

export class DashboardService {
  async getKPIs() {
    const cached = dashboardCache.get<Record<string, unknown>>(CACHE_KEY);
    if (cached) return cached;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      assetsByStatus,
      totalAssetValue,
      pendingTransfers,
      pendingMaintenance,
      openMaintenance,
      activeAudits,
      todayBookings,
      upcomingReturns,
      overdueReturns,
      departmentCount,
      employeeCount,
      maintenanceCostThisMonth,
      assetsUnderMaintenance,
      resolvedThisMonth,
    ] = await Promise.all([
      AssetModel.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      AssetModel.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: null, total: { $sum: '$currentValue' } } },
      ]),
      TransferModel.countDocuments({ status: 'requested' }),
      MaintenanceModel.countDocuments({ status: 'pending' }),
      MaintenanceModel.countDocuments({
        status: { $in: ['approved', 'technician_assigned', 'in_progress'] },
      }),
      AuditModel.countDocuments({ status: { $in: ['scheduled', 'active'] } }),
      BookingModel.countDocuments({
        startDateTime: { $gte: todayStart, $lt: todayEnd },
        status: { $in: ['Upcoming', 'Ongoing'] },
      }),
      AllocationModel.countDocuments({
        status: 'allocated',
        expectedReturnDate: { $gte: now },
      }),
      AllocationModel.countDocuments({
        status: 'overdue',
      }),
      DepartmentModel.countDocuments({}),
      EmployeeModel.countDocuments({ isDeleted: false }),
      MaintenanceModel.aggregate([
        { $match: { completionDate: { $gte: monthStart, $lt: monthEnd }, actualCost: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$actualCost' } } },
      ]),
      AssetModel.countDocuments({ deletedAt: null, status: 'maintenance' }),
      MaintenanceModel.countDocuments({
        status: 'resolved',
        completionDate: { $gte: monthStart, $lt: monthEnd },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    assetsByStatus.forEach((s) => (statusMap[s._id] = s.count));

    const kpis = {
      assetsAvailable: statusMap['available'] ?? 0,
      assetsAllocated: statusMap['allocated'] ?? 0,
      assetsUnderMaintenance: assetsUnderMaintenance,
      assetsReserved: statusMap['reserved'] ?? 0,
      assetsLost: statusMap['lost'] ?? 0,
      assetsRetired: statusMap['retired'] ?? 0,
      assetsDisposed: statusMap['disposed'] ?? 0,
      totalAssetValue: totalAssetValue[0]?.total ?? 0,
      todaysBookings: todayBookings,
      pendingTransfers,
      pendingMaintenance,
      openMaintenance,
      activeAudits,
      upcomingReturns,
      overdueReturns,
      departmentCount,
      employeeCount,
      maintenanceCostThisMonth: maintenanceCostThisMonth[0]?.total ?? 0,
      resolvedThisMonth,
    };

    dashboardCache.set(CACHE_KEY, kpis, CACHE_TTL);
    return kpis;
  }

  async getAssetStatusChart() {
    const cached = dashboardCache.get('chart:assetStatus');
    if (cached) return cached;

    const data = await AssetModel.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const chart = {
      type: 'pie' as const,
      labels: data.map((d) => d._id),
      datasets: [{ data: data.map((d) => d.count) }],
    };
    dashboardCache.set('chart:assetStatus', chart, CACHE_TTL);
    return chart;
  }

  async getAssetValueByDepartment() {
    const cached = dashboardCache.get('chart:assetValueByDept');
    if (cached) return cached;

    const data = await AssetModel.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: { $ifNull: ['$departmentName', 'Unassigned'] },
          totalValue: { $sum: '$currentValue' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalValue: -1 } },
    ]);

    const chart = {
      type: 'bar' as const,
      labels: data.map((d) => d._id),
      datasets: [
        { label: 'Total Value', data: data.map((d) => d.totalValue) },
        { label: 'Asset Count', data: data.map((d) => d.count) },
      ],
    };
    dashboardCache.set('chart:assetValueByDept', chart, CACHE_TTL);
    return chart;
  }

  async getMaintenanceByPriority() {
    const cached = dashboardCache.get('chart:maintenancePriority');
    if (cached) return cached;

    const data = await MaintenanceModel.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const chart = {
      type: 'doughnut' as const,
      labels: data.map((d) => d._id),
      datasets: [{ data: data.map((d) => d.count) }],
    };
    dashboardCache.set('chart:maintenancePriority', chart, CACHE_TTL);
    return chart;
  }

  async getAllocationTrend(months: number = 6) {
    const cached = dashboardCache.get(`chart:allocationTrend:${months}`);
    if (cached) return cached;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const data = await AllocationModel.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const chart = {
      type: 'line' as const,
      labels: data.map((d) => d._id),
      datasets: [{ label: 'Allocations', data: data.map((d) => d.count) }],
    };
    dashboardCache.set(`chart:allocationTrend:${months}`, chart, CACHE_TTL);
    return chart;
  }

  async getMaintenanceTrend(months: number = 6) {
    const cached = dashboardCache.get(`chart:maintenanceTrend:${months}`);
    if (cached) return cached;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const data = await MaintenanceModel.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
          cost: { $sum: { $ifNull: ['$actualCost', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const chart = {
      type: 'line' as const,
      labels: data.map((d) => d._id),
      datasets: [
        { label: 'Requests', data: data.map((d) => d.count) },
        { label: 'Cost', data: data.map((d) => d.cost) },
      ],
    };
    dashboardCache.set(`chart:maintenanceTrend:${months}`, chart, CACHE_TTL);
    return chart;
  }

  async getBookingUtilization() {
    const cached = dashboardCache.get('chart:bookingUtilization');
    if (cached) return cached;

    const data = await BookingModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const chart = {
      type: 'bar' as const,
      labels: data.map((d) => d._id),
      datasets: [{ label: 'Bookings', data: data.map((d) => d.count) }],
    };
    dashboardCache.set('chart:bookingUtilization', chart, CACHE_TTL);
    return chart;
  }

  async getTransferStatusChart() {
    const cached = dashboardCache.get('chart:transferStatus');
    if (cached) return cached;

    const data = await TransferModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const chart = {
      type: 'pie' as const,
      labels: data.map((d) => d._id),
      datasets: [{ data: data.map((d) => d.count) }],
    };
    dashboardCache.set('chart:transferStatus', chart, CACHE_TTL);
    return chart;
  }

  async getDepartmentAssetHeatmap() {
    const cached = dashboardCache.get('chart:deptAssetHeatmap');
    if (cached) return cached;

    const data = await AssetModel.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: {
            department: { $ifNull: ['$departmentName', 'Unassigned'] },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const departments = [...new Set(data.map((d) => d._id.department))];
    const statuses = [...new Set(data.map((d) => d._id.status))];

    const matrix = departments.map((dept) => {
      const row: Record<string, number> = { department: departments.indexOf(dept) };
      statuses.forEach((status) => {
        const match = data.find((d) => d._id.department === dept && d._id.status === status);
        row[status] = match?.count ?? 0;
      });
      return row;
    });

    const chart = {
      type: 'heatmap' as const,
      labels: { departments, statuses },
      datasets: matrix,
    };
    dashboardCache.set('chart:deptAssetHeatmap', chart, CACHE_TTL);
    return chart;
  }

  async getDepartmentStatistics() {
    const departments = await DepartmentModel.find({}).lean();
    const stats = await Promise.all(
      departments.map(async (dept) => {
        const [assetCount, employeeCount, activeAllocations, maintenanceCount] = await Promise.all([
          AssetModel.countDocuments({ deletedAt: null, department: dept._id }),
          EmployeeModel.countDocuments({ departmentId: dept._id, isDeleted: false }),
          AllocationModel.countDocuments({ departmentId: dept._id, status: 'allocated' }),
          MaintenanceModel.countDocuments({ departmentId: dept._id, status: { $in: ['pending', 'approved', 'in_progress'] } }),
        ]);
        return {
          departmentId: dept._id,
          name: dept.name,
          assetCount,
          employeeCount,
          activeAllocations,
          pendingMaintenance: maintenanceCount,
        };
      })
    );
    return stats;
  }

  async getAuditStatistics() {
    const data = await AuditModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const total = data.reduce((sum, d) => sum + d.count, 0);
    return {
      total,
      byStatus: data.map((d) => ({ status: d._id, count: d.count })),
    };
  }

  invalidateCache(): void {
    dashboardCache.invalidateAll();
  }
}
