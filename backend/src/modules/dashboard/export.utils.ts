export interface ExportColumn<T> {
  key: string;
  header: string;
  format?: (value: unknown, row: T) => string;
}

export class ExportEngine {
  static toCSV<T extends Record<string, unknown>>(data: T[], columns: ExportColumn<T>[]): string {
    const headers = columns.map((c) => c.header).join(',');
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const raw = row[col.key as keyof T];
          const value = col.format ? col.format(raw, row) : String(raw ?? '');
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    return [headers, ...rows].join('\n');
  }

  static toJSON<T>(data: T[]): T[] {
    return data;
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

export const ASSET_EXPORT_COLUMNS = [
  { key: 'assetTag', header: 'Asset Tag' },
  { key: 'name', header: 'Name' },
  { key: 'categoryName', header: 'Category' },
  { key: 'departmentName', header: 'Department' },
  { key: 'status', header: 'Status' },
  { key: 'condition', header: 'Condition' },
  { key: 'purchaseCost', header: 'Purchase Cost' },
  { key: 'currentValue', header: 'Current Value' },
  { key: 'serialNumber', header: 'Serial Number' },
  { key: 'manufacturer', header: 'Manufacturer' },
];

export const ALLOCATION_EXPORT_COLUMNS = [
  { key: 'allocationNumber', header: 'Allocation Number' },
  { key: 'assetId', header: 'Asset ID' },
  { key: 'employeeId', header: 'Employee ID' },
  { key: 'departmentId', header: 'Department ID' },
  { key: 'status', header: 'Status' },
  { key: 'allocationDate', header: 'Allocation Date' },
  { key: 'expectedReturnDate', header: 'Expected Return' },
  { key: 'actualReturnDate', header: 'Actual Return' },
  { key: 'purpose', header: 'Purpose' },
];

export const TRANSFER_EXPORT_COLUMNS = [
  { key: 'transferNumber', header: 'Transfer Number' },
  { key: 'assetId', header: 'Asset ID' },
  { key: 'currentHolderId', header: 'Current Holder' },
  { key: 'requestedHolderId', header: 'Requested Holder' },
  { key: 'status', header: 'Status' },
  { key: 'requestReason', header: 'Reason' },
  { key: 'createdAt', header: 'Requested At' },
];

export const MAINTENANCE_EXPORT_COLUMNS = [
  { key: 'requestNumber', header: 'Request Number' },
  { key: 'assetId', header: 'Asset ID' },
  { key: 'issueTitle', header: 'Issue' },
  { key: 'priority', header: 'Priority' },
  { key: 'status', header: 'Status' },
  { key: 'estimatedCost', header: 'Estimated Cost' },
  { key: 'actualCost', header: 'Actual Cost' },
  { key: 'requestedDate', header: 'Requested Date' },
  { key: 'completionDate', header: 'Completion Date' },
];

export const AUDIT_EXPORT_COLUMNS = [
  { key: 'auditNumber', header: 'Audit Number' },
  { key: 'title', header: 'Title' },
  { key: 'department', header: 'Department' },
  { key: 'status', header: 'Status' },
  { key: 'startDate', header: 'Start Date' },
  { key: 'endDate', header: 'End Date' },
  { key: 'createdBy', header: 'Created By' },
];

export const BOOKING_EXPORT_COLUMNS = [
  { key: 'bookingNumber', header: 'Booking Number' },
  { key: 'assetName', header: 'Asset' },
  { key: 'assetTag', header: 'Asset Tag' },
  { key: 'employeeName', header: 'Employee' },
  { key: 'departmentName', header: 'Department' },
  { key: 'status', header: 'Status' },
  { key: 'priority', header: 'Priority' },
  { key: 'startDateTime', header: 'Start' },
  { key: 'endDateTime', header: 'End' },
];
