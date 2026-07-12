export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  status: "pending" | "active" | "inactive" | "locked";
  isEmailVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  avatar?: string;
}

export interface Role {
  id: string;
  roleName: string;
  description: string;
  permissions: string[];
  status: "active" | "inactive";
  systemRole: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
  timestamp: string;
}

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  description?: string;
  category: string;
  categoryName?: string;
  department: string;
  departmentName?: string;
  location?: {
    building?: string;
    floor?: string;
    room?: string;
    shelf?: string;
    section?: string;
    label?: string;
  };
  serialNumber?: string;
  manufacturer?: string;
  assetModel?: string;
  supplier?: string;
  condition?: "new" | "excellent" | "good" | "fair" | "poor" | "damaged";
  status: "available" | "allocated" | "reserved" | "maintenance" | "lost" | "retired" | "disposed";
  purchaseDate?: string;
  purchaseCost?: number;
  currentValue?: number;
  warrantyStart?: string;
  warrantyEnd?: string;
  sharedResource?: boolean;
  qrCode?: string;
  barcode?: string;
  assetImage?: string;
  documents?: AssetDocument[];
  specifications?: Record<string, unknown>;
  assignedTo?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetDocument {
  name: string;
  path: string;
  mimeType: string;
  size: number;
  type: "invoice" | "warranty" | "manual" | "certificate" | "image" | "other";
  uploadedAt: string;
  uploadedBy: string;
}

export interface Allocation {
  id: string;
  allocationNumber: string;
  assetId: string;
  employeeId: string;
  departmentId: string;
  allocatedById: string;
  allocationDate: string;
  expectedReturnDate?: string;
  actualReturnDate?: string;
  purpose?: string;
  status: "pending" | "allocated" | "returned" | "overdue" | "cancelled" | "transferred";
  conditionAtAllocation?: string;
  conditionAtReturn?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transfer {
  id: string;
  transferNumber: string;
  allocationId: string;
  assetId: string;
  currentHolderId: string;
  requestedHolderId: string;
  requestReason: string;
  requestedById: string;
  approvedById?: string;
  approvalDate?: string;
  rejectionReason?: string;
  status: "requested" | "approved" | "rejected" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface Return {
  id: string;
  allocationId: string;
  assetId: string;
  returnedById: string;
  receivedById: string;
  condition: string;
  damageNotes?: string;
  photos: string[];
  returnDate: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  asset: string;
  assetName?: string;
  assetTag?: string;
  employee?: string;
  employeeName?: string;
  department?: string;
  departmentName?: string;
  title: string;
  purpose: string;
  description?: string;
  bookingDate?: string;
  startDateTime: string;
  endDateTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: "Draft" | "Upcoming" | "Ongoing" | "Completed" | "Cancelled" | "Expired";
  priority: "Low" | "Medium" | "High" | "Urgent";
  remarks?: string;
  cancelReason?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceTicket {
  id: string;
  requestNumber: string;
  assetId: string;
  requestedById: string;
  departmentId: string;
  issueTitle: string;
  issueDescription: string;
  priority: "low" | "medium" | "high" | "critical";
  attachments?: { name: string; path: string; mimeType: string; size: number }[];
  estimatedCost?: number;
  estimatedDuration?: string;
  status: "pending" | "approved" | "rejected" | "technician_assigned" | "in_progress" | "resolved" | "cancelled";
  requestedDate: string;
  approvedById?: string;
  approvalDate?: string;
  rejectionReason?: string;
  assignedTechnicianId?: string;
  technicianAssignedDate?: string;
  workStartDate?: string;
  completionDate?: string;
  resolutionSummary?: string;
  actualCost?: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditCycle {
  id: string;
  title: string;
  description?: string;
  scope?: {
    type: string;
    departmentId?: string;
    location?: Record<string, string>;
  };
  startDate: string;
  endDate: string;
  status: "draft" | "scheduled" | "active" | "completed" | "cancelled";
  remarks?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditItem {
  id: string;
  auditId: string;
  assetId: string;
  verificationStatus: "pending" | "verified" | "missing" | "damaged" | "not_found";
  condition?: string;
  locationVerified?: boolean;
  remarks?: string;
  verifiedById?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  notificationNumber: string;
  title: string;
  message: string;
  type: string;
  module: string;
  entityType?: string;
  entityId?: string;
  receiver: string;
  sender?: string;
  departmentId?: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "unread" | "read" | "archived" | "deleted";
  readAt?: string;
  expiresAt?: string;
  actionUrl?: string;
  channels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  departmentHead?: string;
  parentDepartment?: string;
  status: "active" | "inactive";
  employeeCount: number;
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  designation: string;
  role?: string;
  reportingManager?: string;
  employmentStatus: "active" | "inactive" | "on_leave" | "terminated";
  joiningDate: string;
}

export interface AssetCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  categoryType?: string;
  status: "active" | "inactive";
  customFields?: { key: string; label: string; type: string; required: boolean; options?: string[] }[];
}

export interface Setting {
  key: string;
  value: unknown;
  group: string;
  description?: string;
  updatedAt: string;
}

export interface DashboardSummary {
  assets: {
    total: number;
    available: number;
    allocated: number;
    maintenance: number;
    reserved: number;
    lost: number;
    retired: number;
    disposed: number;
  };
  allocations: {
    total: number;
    pending: number;
    active: number;
    returned: number;
    overdue: number;
  };
  maintenance: {
    total: number;
    pending: number;
    approved: number;
    in_progress: number;
    resolved: number;
  };
  bookings: {
    total: number;
    upcoming: number;
    ongoing: number;
    completed: number;
    cancelled: number;
  };
  departments: number;
  employees: number;
  recentActivity: {
    id: string;
    module: string;
    action: string;
    description: string;
    timestamp: string;
  }[];
}
