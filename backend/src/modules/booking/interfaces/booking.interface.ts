export interface BookingFilter {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  status?: string | string[];
  department?: string;
  employee?: string;
  asset?: string;
  priority?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sort?: string;
  scope?: Record<string, unknown>;
}

export interface BookingListItem {
  id: string;
  bookingNumber: string;
  asset: string;
  assetName: string;
  assetTag: string;
  employee: string;
  employeeName: string;
  department?: string | null;
  departmentName: string;
  title: string;
  purpose: string;
  bookingDate: Date;
  startDateTime: Date;
  endDateTime: Date;
  status: string;
  priority: string;
}
