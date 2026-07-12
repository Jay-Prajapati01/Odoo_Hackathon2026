import { Request, Response } from 'express';
import { asyncHandler } from '../../common/async-handler';
import { sendResponse, sendPaginatedResponse } from '../../common/api-response';
import { httpStatus } from '../../common/http-status';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/error-handler';
import { DashboardService } from './dashboard.service';
import { AnalyticsService } from './analytics.service';
import { ReportsService, ReportFilters } from '../reports/reports.service';
import { dashboardQuerySchema, analyticsQuerySchema, reportQuerySchema, exportQuerySchema } from './dashboard.validation';
import { recordActivity } from '../../shared/events';

const dashboardService = new DashboardService();
const analyticsService = new AnalyticsService();
const reportsService = new ReportsService();

const buildFilters = (query: Record<string, unknown>): ReportFilters => ({
  page: query.page ? Number(query.page) : 1,
  limit: query.limit ? Number(query.limit) : 50,
  search: query.search as string | undefined,
  status: query.status as string | undefined,
  departmentId: query.departmentId as string | undefined,
  categoryId: query.categoryId as string | undefined,
  employeeId: query.employeeId as string | undefined,
  assetId: query.assetId as string | undefined,
  priority: query.priority as string | undefined,
  condition: query.condition as string | undefined,
  location: query.location as string | undefined,
  dateFrom: query.dateFrom ? new Date(query.dateFrom as string) : undefined,
  dateTo: query.dateTo ? new Date(query.dateTo as string) : undefined,
  sortBy: query.sortBy as string | undefined,
  sortOrder: query.sortOrder as 'asc' | 'desc' | undefined,
});

// ─── Dashboard ────────────────────────────────────────────

/**
 * @swagger
 * /dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get full dashboard summary with KPIs
 *     responses:
 *       200:
 *         description: Dashboard summary
 */
export const getDashboardSummary = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getKPIs();
  sendResponse(res, httpStatus.OK, 'Dashboard summary', data);
});

/**
 * @swagger
 * /dashboard/departments:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get department statistics
 */
export const getDepartmentStats = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getDepartmentStatistics();
  sendResponse(res, httpStatus.OK, 'Department statistics', data);
});

/**
 * @swagger
 * /dashboard/audits:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get audit statistics
 */
export const getAuditStats = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getAuditStatistics();
  sendResponse(res, httpStatus.OK, 'Audit statistics', data);
});

// ─── Charts ───────────────────────────────────────────────

/**
 * @swagger
 * /dashboard/charts/asset-status:
 *   get:
 *     tags: [Dashboard Charts]
 *     summary: Asset status pie chart
 */
export const getAssetStatusChart = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getAssetStatusChart();
  sendResponse(res, httpStatus.OK, 'Asset status chart', data);
});

/**
 * @swagger
 * /dashboard/charts/asset-value-by-department:
 *   get:
 *     tags: [Dashboard Charts]
 *     summary: Asset value by department bar chart
 */
export const getAssetValueByDepartment = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getAssetValueByDepartment();
  sendResponse(res, httpStatus.OK, 'Asset value by department chart', data);
});

/**
 * @swagger
 * /dashboard/charts/maintenance-priority:
 *   get:
 *     tags: [Dashboard Charts]
 *     summary: Maintenance by priority doughnut chart
 */
export const getMaintenancePriorityChart = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getMaintenanceByPriority();
  sendResponse(res, httpStatus.OK, 'Maintenance priority chart', data);
});

/**
 * @swagger
 * /dashboard/charts/allocation-trend:
 *   get:
 *     tags: [Dashboard Charts]
 *     summary: Allocation trend line chart
 */
export const getAllocationTrend = asyncHandler(async (req: Request, res: Response) => {
  const months = req.query.months ? Number(req.query.months) : 6;
  const data = await dashboardService.getAllocationTrend(months);
  sendResponse(res, httpStatus.OK, 'Allocation trend chart', data);
});

/**
 * @swagger
 * /dashboard/charts/maintenance-trend:
 *   get:
 *     tags: [Dashboard Charts]
 *     summary: Maintenance trend line chart
 */
export const getMaintenanceTrend = asyncHandler(async (req: Request, res: Response) => {
  const months = req.query.months ? Number(req.query.months) : 6;
  const data = await dashboardService.getMaintenanceTrend(months);
  sendResponse(res, httpStatus.OK, 'Maintenance trend chart', data);
});

/**
 * @swagger
 * /dashboard/charts/booking-utilization:
 *   get:
 *     tags: [Dashboard Charts]
 *     summary: Booking utilization bar chart
 */
export const getBookingUtilizationChart = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getBookingUtilization();
  sendResponse(res, httpStatus.OK, 'Booking utilization chart', data);
});

/**
 * @swagger
 * /dashboard/charts/transfer-status:
 *   get:
 *     tags: [Dashboard Charts]
 *     summary: Transfer status pie chart
 */
export const getTransferStatusChart = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getTransferStatusChart();
  sendResponse(res, httpStatus.OK, 'Transfer status chart', data);
});

/**
 * @swagger
 * /dashboard/charts/department-heatmap:
 *   get:
 *     tags: [Dashboard Charts]
 *     summary: Department asset heatmap
 */
export const getDepartmentHeatmap = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getDepartmentAssetHeatmap();
  sendResponse(res, httpStatus.OK, 'Department asset heatmap', data);
});

// ─── Analytics ────────────────────────────────────────────

/**
 * @swagger
 * /dashboard/analytics/asset-utilization:
 *   get:
 *     tags: [Dashboard Analytics]
 *     summary: Asset utilization percentage
 */
export const getAssetUtilization = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getAssetUtilization();
  sendResponse(res, httpStatus.OK, 'Asset utilization', data);
});

/**
 * @swagger
 * /dashboard/analytics/most-used-assets:
 *   get:
 *     tags: [Dashboard Analytics]
 *     summary: Most used assets
 */
export const getMostUsedAssets = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const data = await analyticsService.getMostUsedAssets(limit);
  sendResponse(res, httpStatus.OK, 'Most used assets', data);
});

/**
 * @swagger
 * /dashboard/analytics/least-used-assets:
 *   get:
 *     tags: [Dashboard Analytics]
 *     summary: Least used assets
 */
export const getLeastUsedAssets = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const data = await analyticsService.getLeastUsedAssets(limit);
  sendResponse(res, httpStatus.OK, 'Least used assets', data);
});

/**
 * @swagger
 * /dashboard/analytics/idle-assets:
 *   get:
 *     tags: [Dashboard Analytics]
 *     summary: Idle assets (no allocation in 3 months)
 */
export const getIdleAssets = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getIdleAssets();
  sendResponse(res, httpStatus.OK, 'Idle assets', data);
});

/**
 * @swagger
 * /dashboard/analytics/maintenance-frequency:
 *   get:
 *     tags: [Dashboard Analytics]
 *     summary: Maintenance frequency over time
 */
export const getMaintenanceFrequency = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getMaintenanceFrequency();
  sendResponse(res, httpStatus.OK, 'Maintenance frequency', data);
});

/**
 * @swagger
 * /dashboard/analytics/maintenance-cost:
 *   get:
 *     tags: [Dashboard Analytics]
 *     summary: Maintenance cost over time
 */
export const getMaintenanceCost = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getMaintenanceCost();
  sendResponse(res, httpStatus.OK, 'Maintenance cost', data);
});

/**
 * @swagger
 * /dashboard/analytics/department-assets:
 *   get:
 *     tags: [Dashboard Analytics]
 *     summary: Department-wise asset distribution
 */
export const getDepartmentAssetDistribution = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getDepartmentAssetDistribution();
  sendResponse(res, httpStatus.OK, 'Department asset distribution', data);
});

/**
 * @swagger
 * /dashboard/analytics/department-allocations:
 *   get:
 *     tags: [Dashboard Analytics]
 *     summary: Department-wise allocation
 */
export const getDepartmentAllocation = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getDepartmentAllocation();
  sendResponse(res, httpStatus.OK, 'Department allocation', data);
});

/**
 * @swagger
 * /dashboard/analytics/department-maintenance:
 *   get:
 *     tags: [Dashboard Analytics]
 *     summary: Department-wise maintenance
 */
export const getDepartmentMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getDepartmentMaintenance();
  sendResponse(res, httpStatus.OK, 'Department maintenance', data);
});

/**
 * @swagger
 * /dashboard/analytics/department-audits:
 *   get:
 *     tags: [Dashboard Analytics]
 *     summary: Department-wise audit statistics
 */
export const getDepartmentAuditStats = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getDepartmentAuditStats();
  sendResponse(res, httpStatus.OK, 'Department audit stats', data);
});

/**
 * @swagger
 * /dashboard/analytics/booking-utilization:
 *   get:
 *     tags: [Dashboard Analytics]
 *     summary: Booking utilization analytics
 */
export const getBookingUtilizationAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getBookingUtilizationAnalytics();
  sendResponse(res, httpStatus.OK, 'Booking utilization analytics', data);
});

/**
 * @swagger
 * /dashboard/analytics/top-departments:
 *   get:
 *     tags: [Dashboard Analytics]
 *     summary: Top departments by usage
 */
export const getTopDepartments = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const data = await analyticsService.getTopDepartmentsByUsage(limit);
  sendResponse(res, httpStatus.OK, 'Top departments', data);
});

/**
 * @swagger
 * /dashboard/analytics/asset-aging:
 *   get:
 *     tags: [Dashboard Analytics]
 *     summary: Asset aging analysis
 */
export const getAssetAging = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getAssetAging();
  sendResponse(res, httpStatus.OK, 'Asset aging', data);
});

/**
 * @swagger
 * /dashboard/analytics/warranty-expiry:
 *   get:
 *     tags: [Dashboard Analytics]
 *     summary: Warranty expiry summary
 */
export const getWarrantyExpiry = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getWarrantyExpirySummary();
  sendResponse(res, httpStatus.OK, 'Warranty expiry summary', data);
});

/**
 * @swagger
 * /dashboard/analytics/asset-lifecycle:
 *   get:
 *     tags: [Dashboard Analytics]
 *     summary: Asset lifecycle summary
 */
export const getAssetLifecycle = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getAssetLifecycle();
  sendResponse(res, httpStatus.OK, 'Asset lifecycle', data);
});

// ─── Reports ──────────────────────────────────────────────

/**
 * @swagger
 * /dashboard/reports/assets:
 *   get:
 *     tags: [Dashboard Reports]
 *     summary: Asset report with filters
 */
export const getAssetReport = asyncHandler(async (req: Request, res: Response) => {
  const filters = buildFilters(req.query as Record<string, unknown>);
  const data = await reportsService.assetReport(filters);
  sendResponse(res, httpStatus.OK, 'Asset report', data);
});

/**
 * @swagger
 * /dashboard/reports/allocations:
 *   get:
 *     tags: [Dashboard Reports]
 *     summary: Allocation report
 */
export const getAllocationReport = asyncHandler(async (req: Request, res: Response) => {
  const filters = buildFilters(req.query as Record<string, unknown>);
  const data = await reportsService.allocationReport(filters);
  sendResponse(res, httpStatus.OK, 'Allocation report', data);
});

/**
 * @swagger
 * /dashboard/reports/transfers:
 *   get:
 *     tags: [Dashboard Reports]
 *     summary: Transfer report
 */
export const getTransferReport = asyncHandler(async (req: Request, res: Response) => {
  const filters = buildFilters(req.query as Record<string, unknown>);
  const data = await reportsService.transferReport(filters);
  sendResponse(res, httpStatus.OK, 'Transfer report', data);
});

/**
 * @swagger
 * /dashboard/reports/maintenance:
 *   get:
 *     tags: [Dashboard Reports]
 *     summary: Maintenance report
 */
export const getMaintenanceReport = asyncHandler(async (req: Request, res: Response) => {
  const filters = buildFilters(req.query as Record<string, unknown>);
  const data = await reportsService.maintenanceReport(filters);
  sendResponse(res, httpStatus.OK, 'Maintenance report', data);
});

/**
 * @swagger
 * /dashboard/reports/audits:
 *   get:
 *     tags: [Dashboard Reports]
 *     summary: Audit report
 */
export const getAuditReport = asyncHandler(async (req: Request, res: Response) => {
  const filters = buildFilters(req.query as Record<string, unknown>);
  const data = await reportsService.auditReport(filters);
  sendResponse(res, httpStatus.OK, 'Audit report', data);
});

/**
 * @swagger
 * /dashboard/reports/departments:
 *   get:
 *     tags: [Dashboard Reports]
 *     summary: Department report
 */
export const getDepartmentReport = asyncHandler(async (req: Request, res: Response) => {
  const filters = buildFilters(req.query as Record<string, unknown>);
  const data = await reportsService.departmentReport(filters);
  sendResponse(res, httpStatus.OK, 'Department report', data);
});

/**
 * @swagger
 * /dashboard/reports/employees:
 *   get:
 *     tags: [Dashboard Reports]
 *     summary: Employee report
 */
export const getEmployeeReport = asyncHandler(async (req: Request, res: Response) => {
  const filters = buildFilters(req.query as Record<string, unknown>);
  const data = await reportsService.employeeReport(filters);
  sendResponse(res, httpStatus.OK, 'Employee report', data);
});

/**
 * @swagger
 * /dashboard/reports/lifecycle:
 *   get:
 *     tags: [Dashboard Reports]
 *     summary: Asset lifecycle report
 */
export const getAssetLifecycleReport = asyncHandler(async (req: Request, res: Response) => {
  const filters = buildFilters(req.query as Record<string, unknown>);
  const data = await reportsService.assetLifecycleReport(filters);
  sendResponse(res, httpStatus.OK, 'Asset lifecycle report', data);
});

/**
 * @swagger
 * /dashboard/reports/utilization:
 *   get:
 *     tags: [Dashboard Reports]
 *     summary: Utilization report
 */
export const getUtilizationReport = asyncHandler(async (req: Request, res: Response) => {
  const filters = buildFilters(req.query as Record<string, unknown>);
  const data = await reportsService.utilizationReport(filters);
  sendResponse(res, httpStatus.OK, 'Utilization report', data);
});

// ─── Export ───────────────────────────────────────────────

/**
 * @swagger
 * /dashboard/export:
 *   get:
 *     tags: [Dashboard Export]
 *     summary: Export report data as CSV or JSON
 *     parameters:
 *       - in: query
 *         name: reportType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [assets, allocations, transfers, maintenance, audits, bookings]
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 */
export const exportReport = asyncHandler(async (req: Request, res: Response) => {
  const { reportType, format = 'csv' } = req.query as { reportType: string; format?: string };
  const filters = buildFilters(req.query as Record<string, unknown>);

  let reportData: Record<string, unknown>[] = [];

  switch (reportType) {
    case 'assets': {
      const report = await reportsService.assetReport(filters);
      reportData = (report as any).data;
      break;
    }
    case 'allocations': {
      const report = await reportsService.allocationReport(filters);
      reportData = (report as any).data;
      break;
    }
    case 'transfers': {
      const report = await reportsService.transferReport(filters);
      reportData = (report as any).data;
      break;
    }
    case 'maintenance': {
      const report = await reportsService.maintenanceReport(filters);
      reportData = (report as any).data;
      break;
    }
    case 'audits': {
      const report = await reportsService.auditReport(filters);
      reportData = (report as any).data;
      break;
    }
    case 'bookings': {
      reportData = [];
      break;
    }
    default: {
      reportData = [];
    }
  }

  recordActivity({
    req,
    userId: req.user!.userId,
    action: 'report.exported',
    entity: 'Settings',
    entityId: reportType,
    newValue: { reportType, format, recordCount: reportData.length },
  });

  if (format === 'csv') {
    const csv = reportsService.exportCSV(reportType, reportData);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report.csv"`);
    res.send(csv);
    return;
  }

  sendResponse(res, httpStatus.OK, `${reportType} report`, reportData);
});

// ─── Cache Invalidation ──────────────────────────────────

/**
 * @swagger
 * /dashboard/cache/invalidate:
 *   post:
 *     tags: [Dashboard]
 *     summary: Invalidate all dashboard caches
 */
export const invalidateCache = asyncHandler(async (req: Request, res: Response) => {
  dashboardService.invalidateCache();
  analyticsService.invalidateCache();
  reportsService.invalidateCache();
  sendResponse(res, httpStatus.OK, 'Dashboard cache invalidated');
});

// ─── Routes ───────────────────────────────────────────────

export const dashboardRoutes = require('express').Router();

// Dashboard
dashboardRoutes.get('/summary', authorize('dashboard.view'), getDashboardSummary);
dashboardRoutes.get('/departments', authorize('dashboard.view'), getDepartmentStats);
dashboardRoutes.get('/audits', authorize('dashboard.view'), getAuditStats);
dashboardRoutes.post('/cache/invalidate', authorize('dashboard.view'), invalidateCache);

// Charts
dashboardRoutes.get('/charts/asset-status', authorize('dashboard.view'), getAssetStatusChart);
dashboardRoutes.get('/charts/asset-value-by-department', authorize('dashboard.view'), getAssetValueByDepartment);
dashboardRoutes.get('/charts/maintenance-priority', authorize('dashboard.view'), getMaintenancePriorityChart);
dashboardRoutes.get('/charts/allocation-trend', authorize('dashboard.view'), getAllocationTrend);
dashboardRoutes.get('/charts/maintenance-trend', authorize('dashboard.view'), getMaintenanceTrend);
dashboardRoutes.get('/charts/booking-utilization', authorize('dashboard.view'), getBookingUtilizationChart);
dashboardRoutes.get('/charts/transfer-status', authorize('dashboard.view'), getTransferStatusChart);
dashboardRoutes.get('/charts/department-heatmap', authorize('dashboard.view'), getDepartmentHeatmap);

// Analytics
dashboardRoutes.get('/analytics/asset-utilization', authorize('dashboard.view'), getAssetUtilization);
dashboardRoutes.get('/analytics/most-used-assets', authorize('dashboard.view'), getMostUsedAssets);
dashboardRoutes.get('/analytics/least-used-assets', authorize('dashboard.view'), getLeastUsedAssets);
dashboardRoutes.get('/analytics/idle-assets', authorize('dashboard.view'), getIdleAssets);
dashboardRoutes.get('/analytics/maintenance-frequency', authorize('dashboard.view'), getMaintenanceFrequency);
dashboardRoutes.get('/analytics/maintenance-cost', authorize('dashboard.view'), getMaintenanceCost);
dashboardRoutes.get('/analytics/department-assets', authorize('dashboard.view'), getDepartmentAssetDistribution);
dashboardRoutes.get('/analytics/department-allocations', authorize('dashboard.view'), getDepartmentAllocation);
dashboardRoutes.get('/analytics/department-maintenance', authorize('dashboard.view'), getDepartmentMaintenance);
dashboardRoutes.get('/analytics/department-audits', authorize('dashboard.view'), getDepartmentAuditStats);
dashboardRoutes.get('/analytics/booking-utilization', authorize('dashboard.view'), getBookingUtilizationAnalytics);
dashboardRoutes.get('/analytics/top-departments', authorize('dashboard.view'), getTopDepartments);
dashboardRoutes.get('/analytics/asset-aging', authorize('dashboard.view'), getAssetAging);
dashboardRoutes.get('/analytics/warranty-expiry', authorize('dashboard.view'), getWarrantyExpiry);
dashboardRoutes.get('/analytics/asset-lifecycle', authorize('dashboard.view'), getAssetLifecycle);

// Reports
dashboardRoutes.get('/reports/assets', authorize('report.view'), getAssetReport);
dashboardRoutes.get('/reports/allocations', authorize('report.view'), getAllocationReport);
dashboardRoutes.get('/reports/transfers', authorize('report.view'), getTransferReport);
dashboardRoutes.get('/reports/maintenance', authorize('report.view'), getMaintenanceReport);
dashboardRoutes.get('/reports/audits', authorize('report.view'), getAuditReport);
dashboardRoutes.get('/reports/departments', authorize('report.view'), getDepartmentReport);
dashboardRoutes.get('/reports/employees', authorize('report.view'), getEmployeeReport);
dashboardRoutes.get('/reports/lifecycle', authorize('report.view'), getAssetLifecycleReport);
dashboardRoutes.get('/reports/utilization', authorize('report.view'), getUtilizationReport);

// Export
dashboardRoutes.get('/export', authorize('report.export'), exportReport);
