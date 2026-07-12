import {
  User, Asset, Allocation, Transfer, Return, Booking, MaintenanceTicket,
  AuditCycle, AuditItem, Notification, Department, Employee, AssetCategory,
  Setting, DashboardSummary, PaginatedResponse, Role,
} from "../types";
import {
  mockUsers, mockRoles, mockDepartments, mockEmployees, mockAssetCategories,
  mockAssets, mockAllocations, mockTransfers, mockReturns, mockBookings,
  mockMaintenanceTickets, mockAuditCycles, mockAuditItems, mockNotifications,
  mockSettings, mockDashboardSummary,
} from "./mockData";

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86400000).toISOString();
}

function delay(ms = 80): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function generateId(): string {
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function paginate<T>(
  items: T[],
  params?: { page?: number; limit?: number; search?: string; status?: string },
  searchFields: (keyof T)[] = ["name" as keyof T],
  searchFn?: (item: T, term: string) => boolean,
): PaginatedResponse<T> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  let filtered = [...items];

  if (params?.status) {
    filtered = filtered.filter((i) => (i as unknown as Record<string, unknown>).status === params.status);
  }

  if (params?.search) {
    const term = params.search.toLowerCase();
    if (searchFn) {
      filtered = filtered.filter((i) => searchFn(i, term));
    } else {
      filtered = filtered.filter((i) =>
        searchFields.some((f) => {
          const val = i[f];
          return typeof val === "string" && val.toLowerCase().includes(term);
        }),
      );
    }
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const data = filtered.slice((page - 1) * limit, page * limit);

  return { data, meta: { page, limit, total, totalPages } };
}

function wrap<T>(data: T): { success: boolean; message: string; data: T; timestamp: string } {
  return { success: true, message: "ok", data, timestamp: new Date().toISOString() };
}

// ── In-memory stores ───────────────────────────────────
let users = [...mockUsers];
let roles = [...mockRoles];
let departments = [...mockDepartments];
let employees = [...mockEmployees];
let assetCategories = [...mockAssetCategories];
let assets = [...mockAssets];
let allocations = [...mockAllocations];
let transfers = [...mockTransfers];
let returns = [...mockReturns];
let bookings = [...mockBookings];
let maintenanceTickets = [...mockMaintenanceTickets];
let auditCycles = [...mockAuditCycles];
let auditItems = [...mockAuditItems];
let notifications = [...mockNotifications];
let settings = [...mockSettings];

// ── Auth ───────────────────────────────────────────────
export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    await delay(200);
    const user = users.find((u) => u.email === credentials.email);
    if (!user) throw new Error("Invalid email or password");
    const role = roles.find((r) => r.roleName === user.role || r.id === user.role);
    const token = `mock_access_${generateId()}`;
    const refreshToken = `mock_refresh_${generateId()}`;
    return {
      user,
      accessToken: token,
      refreshToken,
      role: role?.roleName ?? user.role,
      permissions: role?.permissions ?? [],
    };
  },
  me: async () => {
    await delay(50);
    const token = localStorage.getItem("assetflow_access_token");
    if (!token) throw new Error("Not authenticated");
    const storedUser = localStorage.getItem("assetflow_user");
    const user = storedUser ? JSON.parse(storedUser) as User : users[0];
    const role = roles.find((r) => r.roleName === user.role || r.id === user.role);
    return { user, role: role?.roleName ?? user.role, permissions: role?.permissions ?? [] };
  },
  refresh: async (_refreshToken: string) => {
    await delay(100);
    return {
      accessToken: `mock_access_${generateId()}`,
      refreshToken: `mock_refresh_${generateId()}`,
    };
  },
  logout: async () => {
    await delay(50);
  },
};

// ── Dashboard ──────────────────────────────────────────
export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    await delay(100);
    return { ...mockDashboardSummary };
  },
};

// ── Assets ─────────────────────────────────────────────
export const assetsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; status?: string; category?: string; department?: string }) => {
    await delay();
    let filtered = [...assets];
    if (params?.status) filtered = filtered.filter((a) => a.status === params.status);
    if (params?.category) filtered = filtered.filter((a) => a.category === params.category);
    if (params?.department) filtered = filtered.filter((a) => a.department === params.department);
    if (params?.search) {
      const term = params.search.toLowerCase();
      filtered = filtered.filter((a) =>
        a.name.toLowerCase().includes(term) ||
        a.assetTag.toLowerCase().includes(term) ||
        (a.serialNumber?.toLowerCase().includes(term) ?? false) ||
        (a.manufacturer?.toLowerCase().includes(term) ?? false),
      );
    }
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    return { data: filtered.slice((page - 1) * limit, page * limit), meta: { page, limit, total, totalPages } };
  },
  getById: async (id: string): Promise<Asset> => {
    await delay();
    const asset = assets.find((a) => a.id === id);
    if (!asset) throw new Error("Asset not found");
    return { ...asset };
  },
  create: async (data: Partial<Asset>): Promise<Asset> => {
    await delay(150);
    const tagNum = assets.length + 1;
    const newAsset: Asset = {
      id: generateId(),
      assetTag: `AF-${String(tagNum).padStart(6, "0")}`,
      name: data.name ?? "Untitled Asset",
      description: data.description,
      category: data.category ?? "",
      categoryName: data.categoryName,
      department: data.department ?? "",
      departmentName: data.departmentName,
      location: data.location,
      serialNumber: data.serialNumber,
      manufacturer: data.manufacturer,
      assetModel: data.assetModel,
      supplier: data.supplier,
      condition: data.condition ?? "new",
      status: "available",
      purchaseDate: data.purchaseDate,
      purchaseCost: data.purchaseCost,
      currentValue: data.currentValue,
      warrantyStart: data.warrantyStart,
      warrantyEnd: data.warrantyEnd,
      sharedResource: data.sharedResource ?? false,
      specifications: data.specifications,
      createdBy: "u00000000000000000000002",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assets.unshift(newAsset);
    return newAsset;
  },
  update: async (id: string, data: Partial<Asset>): Promise<Asset> => {
    await delay(150);
    const idx = assets.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error("Asset not found");
    assets[idx] = { ...assets[idx], ...data, updatedAt: new Date().toISOString() };
    return { ...assets[idx] };
  },
  updateStatus: async (id: string, status: string): Promise<Asset> => {
    await delay(100);
    const idx = assets.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error("Asset not found");
    assets[idx] = { ...assets[idx], status: status as Asset["status"], updatedAt: new Date().toISOString() };
    return { ...assets[idx] };
  },
  delete: async (id: string) => {
    await delay(100);
    assets = assets.filter((a) => a.id !== id);
  },
  getHistory: async (id: string) => {
    await delay(80);
    return [
      { action: "created", timestamp: daysAgo(90), by: "Jordan Lee" },
      { action: "allocated", timestamp: daysAgo(85), by: "Jordan Lee" },
      { action: "maintenance_scheduled", timestamp: daysAgo(30), by: "System" },
    ];
  },
};

// ── Allocations ────────────────────────────────────────
export const allocationsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    await delay();
    let filtered = [...allocations];
    if (params?.status) filtered = filtered.filter((a) => a.status === params.status);
    if (params?.search) {
      const term = params.search.toLowerCase();
      filtered = filtered.filter((a) =>
        a.allocationNumber.toLowerCase().includes(term) ||
        a.purpose?.toLowerCase().includes(term),
      );
    }
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const total = filtered.length;
    return { data: filtered.slice((page - 1) * limit, page * limit), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },
  getById: async (id: string): Promise<Allocation> => {
    await delay();
    const item = allocations.find((a) => a.id === id);
    if (!item) throw new Error("Allocation not found");
    return { ...item };
  },
  create: async (data: { assetId: string; employeeId: string; departmentId: string; expectedReturnDate?: string; purpose?: string; conditionAtAllocation?: string; remarks?: string }): Promise<Allocation> => {
    await delay(150);
    const num = allocations.length + 1;
    const newAlloc: Allocation = {
      id: generateId(),
      allocationNumber: `ALLOC-2025-${String(num).padStart(3, "0")}`,
      assetId: data.assetId,
      employeeId: data.employeeId,
      departmentId: data.departmentId,
      allocatedById: "u00000000000000000000002",
      allocationDate: new Date().toISOString(),
      expectedReturnDate: data.expectedReturnDate,
      purpose: data.purpose,
      status: "pending",
      conditionAtAllocation: data.conditionAtAllocation,
      remarks: data.remarks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    allocations.unshift(newAlloc);
    return newAlloc;
  },
  update: async (id: string, data: Partial<Allocation>): Promise<Allocation> => {
    await delay(150);
    const idx = allocations.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error("Allocation not found");
    allocations[idx] = { ...allocations[idx], ...data, updatedAt: new Date().toISOString() };
    return { ...allocations[idx] };
  },
  cancel: async (id: string, remarks?: string) => {
    await delay(100);
    const idx = allocations.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error("Allocation not found");
    allocations[idx] = { ...allocations[idx], status: "cancelled", remarks: remarks ?? allocations[idx].remarks, updatedAt: new Date().toISOString() };
    return { ...allocations[idx] };
  },
  returnAsset: async (id: string, data: { conditionAtReturn: string; damageNotes?: string; remarks?: string }) => {
    await delay(150);
    const idx = allocations.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error("Allocation not found");
    allocations[idx] = {
      ...allocations[idx],
      status: "returned",
      actualReturnDate: new Date().toISOString(),
      conditionAtReturn: data.conditionAtReturn,
      remarks: data.remarks ?? allocations[idx].remarks,
      updatedAt: new Date().toISOString(),
    };
    return { ...allocations[idx] };
  },
  getHistory: async (id: string) => {
    await delay(80);
    return [
      { action: "created", timestamp: daysAgo(5), by: "Jordan Lee" },
      { action: "approved", timestamp: daysAgo(4), by: "Alex Morgan" },
    ];
  },
};

// ── Transfers ──────────────────────────────────────────
export const transfersApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    await delay();
    return paginate(transfers, params, ["transferNumber", "requestReason"]);
  },
  getById: async (id: string): Promise<Transfer> => {
    await delay();
    const item = transfers.find((t) => t.id === id);
    if (!item) throw new Error("Transfer not found");
    return { ...item };
  },
  create: async (data: { allocationId: string; requestedHolderId: string; requestReason: string }): Promise<Transfer> => {
    await delay(150);
    const num = transfers.length + 1;
    const allocation = allocations.find((a) => a.id === data.allocationId);
    const newTransfer: Transfer = {
      id: generateId(),
      transferNumber: `TRF-2025-${String(num).padStart(3, "0")}`,
      allocationId: data.allocationId,
      assetId: allocation?.assetId ?? "",
      currentHolderId: allocation?.employeeId ?? "",
      requestedHolderId: data.requestedHolderId,
      requestReason: data.requestReason,
      requestedById: "u00000000000000000000004",
      status: "requested",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    transfers.unshift(newTransfer);
    return newTransfer;
  },
  approve: async (id: string, _remarks?: string) => {
    await delay(100);
    const idx = transfers.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Transfer not found");
    transfers[idx] = {
      ...transfers[idx],
      status: "approved",
      approvedById: "u00000000000000000000001",
      approvalDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { ...transfers[idx] };
  },
  reject: async (id: string, rejectionReason: string) => {
    await delay(100);
    const idx = transfers.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Transfer not found");
    transfers[idx] = { ...transfers[idx], status: "rejected", rejectionReason, updatedAt: new Date().toISOString() };
    return { ...transfers[idx] };
  },
  complete: async (id: string) => {
    await delay(100);
    const idx = transfers.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Transfer not found");
    transfers[idx] = { ...transfers[idx], status: "completed", updatedAt: new Date().toISOString() };
    return { ...transfers[idx] };
  },
  cancel: async (id: string, _remarks?: string) => {
    await delay(100);
    const idx = transfers.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Transfer not found");
    transfers[idx] = { ...transfers[idx], status: "cancelled", updatedAt: new Date().toISOString() };
    return { ...transfers[idx] };
  },
};

// ── Returns ────────────────────────────────────────────
export const returnsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    await delay();
    return paginate(returns, params, ["allocationId"]);
  },
  create: async (data: { allocationId: string; condition: string; damageNotes?: string; remarks?: string }): Promise<Return> => {
    await delay(150);
    const allocation = allocations.find((a) => a.id === data.allocationId);
    const newReturn: Return = {
      id: generateId(),
      allocationId: data.allocationId,
      assetId: allocation?.assetId ?? "",
      returnedById: allocation?.employeeId ?? "",
      receivedById: "e00000000000000000000002",
      condition: data.condition,
      damageNotes: data.damageNotes,
      photos: [],
      returnDate: new Date().toISOString(),
      remarks: data.remarks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    returns.unshift(newReturn);
    return newReturn;
  },
};

// ── Bookings ───────────────────────────────────────────
export const bookingsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    await delay();
    let filtered = [...bookings];
    if (params?.status) filtered = filtered.filter((b) => b.status === params.status);
    if (params?.search) {
      const term = params.search.toLowerCase();
      filtered = filtered.filter((b) =>
        b.title.toLowerCase().includes(term) ||
        b.bookingNumber.toLowerCase().includes(term) ||
        b.purpose.toLowerCase().includes(term),
      );
    }
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const total = filtered.length;
    return { data: filtered.slice((page - 1) * limit, page * limit), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },
  getById: async (id: string): Promise<Booking> => {
    await delay();
    const item = bookings.find((b) => b.id === id);
    if (!item) throw new Error("Booking not found");
    return { ...item };
  },
  create: async (data: { asset: string; employee?: string; title: string; purpose: string; description?: string; startDateTime: string; endDateTime: string; priority?: string; remarks?: string }): Promise<Booking> => {
    await delay(150);
    const num = bookings.length + 1;
    const asset = assets.find((a) => a.id === data.asset);
    const newBooking: Booking = {
      id: generateId(),
      bookingNumber: `BKG-2025-${String(num).padStart(3, "0")}`,
      asset: data.asset,
      assetName: asset?.name,
      assetTag: asset?.assetTag,
      employee: data.employee,
      title: data.title,
      purpose: data.purpose,
      description: data.description,
      startDateTime: data.startDateTime,
      endDateTime: data.endDateTime,
      status: "Draft",
      priority: (data.priority as Booking["priority"]) ?? "Medium",
      remarks: data.remarks,
      createdBy: "u00000000000000000000004",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    bookings.unshift(newBooking);
    return newBooking;
  },
  update: async (id: string, data: Partial<Booking>): Promise<Booking> => {
    await delay(150);
    const idx = bookings.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error("Booking not found");
    bookings[idx] = { ...bookings[idx], ...data, updatedAt: new Date().toISOString() };
    return { ...bookings[idx] };
  },
  cancel: async (id: string, cancelReason: string) => {
    await delay(100);
    const idx = bookings.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error("Booking not found");
    bookings[idx] = { ...bookings[idx], status: "Cancelled", cancelReason, updatedAt: new Date().toISOString() };
    return { ...bookings[idx] };
  },
  start: async (id: string) => {
    await delay(100);
    const idx = bookings.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error("Booking not found");
    bookings[idx] = { ...bookings[idx], status: "Ongoing", actualStartTime: new Date().toISOString(), updatedAt: new Date().toISOString() };
    return { ...bookings[idx] };
  },
  complete: async (id: string) => {
    await delay(100);
    const idx = bookings.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error("Booking not found");
    bookings[idx] = { ...bookings[idx], status: "Completed", actualEndTime: new Date().toISOString(), updatedAt: new Date().toISOString() };
    return { ...bookings[idx] };
  },
};

// ── Maintenance ────────────────────────────────────────
export const maintenanceApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    await delay();
    let filtered = [...maintenanceTickets];
    if (params?.status) filtered = filtered.filter((m) => m.status === params.status);
    if (params?.search) {
      const term = params.search.toLowerCase();
      filtered = filtered.filter((m) =>
        m.requestNumber.toLowerCase().includes(term) ||
        m.issueTitle.toLowerCase().includes(term),
      );
    }
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const total = filtered.length;
    return { data: filtered.slice((page - 1) * limit, page * limit), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },
  getById: async (id: string): Promise<MaintenanceTicket> => {
    await delay();
    const item = maintenanceTickets.find((m) => m.id === id);
    if (!item) throw new Error("Maintenance ticket not found");
    return { ...item };
  },
  create: async (data: { assetId: string; departmentId: string; issueTitle: string; issueDescription: string; priority?: string; estimatedCost?: number; estimatedDuration?: string }): Promise<MaintenanceTicket> => {
    await delay(150);
    const num = maintenanceTickets.length + 1;
    const newTicket: MaintenanceTicket = {
      id: generateId(),
      requestNumber: `MNT-2025-${String(num).padStart(3, "0")}`,
      assetId: data.assetId,
      requestedById: "e00000000000000000000004",
      departmentId: data.departmentId,
      issueTitle: data.issueTitle,
      issueDescription: data.issueDescription,
      priority: (data.priority as MaintenanceTicket["priority"]) ?? "medium",
      estimatedCost: data.estimatedCost,
      estimatedDuration: data.estimatedDuration,
      status: "pending",
      requestedDate: new Date().toISOString(),
      createdBy: "u00000000000000000000004",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    maintenanceTickets.unshift(newTicket);
    return newTicket;
  },
  approve: async (id: string, data?: { estimatedCost?: number; estimatedDuration?: string; remarks?: string }) => {
    await delay(100);
    const idx = maintenanceTickets.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Ticket not found");
    maintenanceTickets[idx] = {
      ...maintenanceTickets[idx],
      status: "approved",
      approvedById: "u00000000000000000000001",
      approvalDate: new Date().toISOString(),
      estimatedCost: data?.estimatedCost ?? maintenanceTickets[idx].estimatedCost,
      estimatedDuration: data?.estimatedDuration ?? maintenanceTickets[idx].estimatedDuration,
      updatedAt: new Date().toISOString(),
    };
    return { ...maintenanceTickets[idx] };
  },
  reject: async (id: string, rejectionReason: string) => {
    await delay(100);
    const idx = maintenanceTickets.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Ticket not found");
    maintenanceTickets[idx] = {
      ...maintenanceTickets[idx],
      status: "rejected",
      rejectionReason,
      approvedById: "u00000000000000000000001",
      approvalDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { ...maintenanceTickets[idx] };
  },
  assignTechnician: async (id: string, data: { technicianId: string; estimatedDuration?: string; estimatedCompletion?: string; remarks?: string }) => {
    await delay(100);
    const idx = maintenanceTickets.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Ticket not found");
    maintenanceTickets[idx] = {
      ...maintenanceTickets[idx],
      status: "technician_assigned",
      assignedTechnicianId: data.technicianId,
      technicianAssignedDate: new Date().toISOString(),
      estimatedDuration: data.estimatedDuration ?? maintenanceTickets[idx].estimatedDuration,
      updatedAt: new Date().toISOString(),
    };
    return { ...maintenanceTickets[idx] };
  },
  startRepair: async (id: string, _notes?: string) => {
    await delay(100);
    const idx = maintenanceTickets.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Ticket not found");
    maintenanceTickets[idx] = {
      ...maintenanceTickets[idx],
      status: "in_progress",
      workStartDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { ...maintenanceTickets[idx] };
  },
  completeRepair: async (id: string, data: { resolutionSummary: string; actualCost?: number }) => {
    await delay(150);
    const idx = maintenanceTickets.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Ticket not found");
    maintenanceTickets[idx] = {
      ...maintenanceTickets[idx],
      status: "resolved",
      completionDate: new Date().toISOString(),
      resolutionSummary: data.resolutionSummary,
      actualCost: data.actualCost,
      updatedAt: new Date().toISOString(),
    };
    return { ...maintenanceTickets[idx] };
  },
  cancel: async (id: string, remarks?: string) => {
    await delay(100);
    const idx = maintenanceTickets.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Ticket not found");
    maintenanceTickets[idx] = {
      ...maintenanceTickets[idx],
      status: "cancelled",
      resolutionSummary: remarks ?? "Cancelled",
      updatedAt: new Date().toISOString(),
    };
    return { ...maintenanceTickets[idx] };
  },
};

// ── Audits ─────────────────────────────────────────────
export const auditsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    await delay();
    return paginate(auditCycles, params, ["title", "description"]);
  },
  getById: async (id: string): Promise<AuditCycle & { items?: AuditItem[] }> => {
    await delay();
    const cycle = auditCycles.find((a) => a.id === id);
    if (!cycle) throw new Error("Audit not found");
    const items = auditItems.filter((ai) => ai.auditId === id);
    return { ...cycle, items };
  },
  create: async (data: { title: string; description?: string; scope: { type: string; departmentId?: string; location?: Record<string, string> }; startDate: string; endDate: string; remarks?: string }): Promise<AuditCycle> => {
    await delay(150);
    const newCycle: AuditCycle = {
      id: generateId(),
      title: data.title,
      description: data.description,
      scope: data.scope,
      startDate: data.startDate,
      endDate: data.endDate,
      status: "draft",
      remarks: data.remarks,
      createdBy: "u00000000000000000000001",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    auditCycles.unshift(newCycle);
    return newCycle;
  },
  start: async (id: string) => {
    await delay(100);
    const idx = auditCycles.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error("Audit not found");
    auditCycles[idx] = { ...auditCycles[idx], status: "active", updatedAt: new Date().toISOString() };
    return { ...auditCycles[idx] };
  },
  verifyItem: async (auditId: string, itemId: string, data: { verificationStatus: string; condition?: string; locationVerified?: boolean; remarks?: string }) => {
    await delay(100);
    const idx = auditItems.findIndex((ai) => ai.id === itemId && ai.auditId === auditId);
    if (idx === -1) throw new Error("Audit item not found");
    auditItems[idx] = {
      ...auditItems[idx],
      verificationStatus: data.verificationStatus as AuditItem["verificationStatus"],
      condition: data.condition ?? auditItems[idx].condition,
      locationVerified: data.locationVerified ?? auditItems[idx].locationVerified,
      remarks: data.remarks ?? auditItems[idx].remarks,
      verifiedById: "e00000000000000000000002",
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { ...auditItems[idx] };
  },
  close: async (id: string, remarks?: string) => {
    await delay(100);
    const idx = auditCycles.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error("Audit not found");
    auditCycles[idx] = { ...auditCycles[idx], status: "completed", remarks: remarks ?? auditCycles[idx].remarks, updatedAt: new Date().toISOString() };
    return { ...auditCycles[idx] };
  },
  getHistory: async (id: string) => {
    await delay(80);
    return [
      { action: "created", timestamp: daysAgo(20), by: "Alex Morgan" },
      { action: "started", timestamp: daysAgo(7), by: "Jordan Lee" },
    ];
  },
  getDiscrepancies: async (id: string) => {
    await delay(80);
    return auditItems.filter((ai) => ai.auditId === id && (ai.verificationStatus === "missing" || ai.verificationStatus === "damaged"));
  },
};

// ── Departments ────────────────────────────────────────
export const departmentsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    await delay();
    return paginate(departments, params, ["name", "code"]);
  },
  getById: async (id: string): Promise<Department> => {
    await delay();
    const dept = departments.find((d) => d.id === id);
    if (!dept) throw new Error("Department not found");
    return { ...dept };
  },
  create: async (data: { name: string; code: string; description?: string; departmentHead?: string; parentDepartment?: string }): Promise<Department> => {
    await delay(150);
    const newDept: Department = {
      id: generateId(),
      name: data.name,
      code: data.code,
      description: data.description,
      departmentHead: data.departmentHead,
      parentDepartment: data.parentDepartment,
      status: "active",
      employeeCount: 0,
    };
    departments.unshift(newDept);
    return newDept;
  },
  update: async (id: string, data: Partial<Department>): Promise<Department> => {
    await delay(150);
    const idx = departments.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error("Department not found");
    departments[idx] = { ...departments[idx], ...data };
    return { ...departments[idx] };
  },
};

// ── Employees ──────────────────────────────────────────
export const employeesApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; departmentId?: string }) => {
    await delay();
    let filtered = [...employees];
    if (params?.departmentId) filtered = filtered.filter((e) => e.departmentId === params.departmentId);
    if (params?.search) {
      const term = params.search.toLowerCase();
      filtered = filtered.filter((e) =>
        e.fullName.toLowerCase().includes(term) ||
        e.employeeCode.toLowerCase().includes(term) ||
        e.email.toLowerCase().includes(term),
      );
    }
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const total = filtered.length;
    return { data: filtered.slice((page - 1) * limit, page * limit), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },
  getById: async (id: string): Promise<Employee> => {
    await delay();
    const emp = employees.find((e) => e.id === id);
    if (!emp) throw new Error("Employee not found");
    return { ...emp };
  },
  create: async (data: Partial<Employee> & { userId?: string }): Promise<Employee> => {
    await delay(150);
    const num = employees.length + 1;
    const newEmp: Employee = {
      id: generateId(),
      employeeCode: `EMP${String(num).padStart(3, "0")}`,
      firstName: data.firstName ?? "",
      lastName: data.lastName ?? "",
      fullName: `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
      email: data.email ?? "",
      phone: data.phone,
      departmentId: data.departmentId,
      designation: data.designation ?? "",
      role: data.role,
      reportingManager: data.reportingManager,
      employmentStatus: "active",
      joiningDate: new Date().toISOString(),
    };
    employees.unshift(newEmp);
    return newEmp;
  },
};

// ── Asset Categories ───────────────────────────────────
export const assetCategoriesApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    await delay();
    return paginate(assetCategories, params, ["name", "code"]);
  },
  getById: async (id: string): Promise<AssetCategory> => {
    await delay();
    const cat = assetCategories.find((c) => c.id === id);
    if (!cat) throw new Error("Category not found");
    return { ...cat };
  },
  create: async (data: { name: string; code: string; description?: string }): Promise<AssetCategory> => {
    await delay(150);
    const newCat: AssetCategory = {
      id: generateId(),
      name: data.name,
      code: data.code,
      description: data.description,
      status: "active",
    };
    assetCategories.unshift(newCat);
    return newCat;
  },
};

// ── Notifications ──────────────────────────────────────
export const notificationsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    await delay();
    return paginate(notifications, params, ["title", "message"]);
  },
  getUnreadCount: async (): Promise<number> => {
    await delay(50);
    return notifications.filter((n) => n.status === "unread").length;
  },
  markRead: async (id: string) => {
    await delay(50);
    const idx = notifications.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error("Notification not found");
    notifications[idx] = {
      ...notifications[idx],
      status: "read",
      readAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { ...notifications[idx] };
  },
  markAllRead: async () => {
    await delay(100);
    notifications = notifications.map((n) =>
      n.status === "unread" ? { ...n, status: "read" as const, readAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : n,
    );
    return { success: true };
  },
  archive: async (id: string) => {
    await delay(50);
    const idx = notifications.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error("Notification not found");
    notifications[idx] = { ...notifications[idx], status: "archived", updatedAt: new Date().toISOString() };
    return { ...notifications[idx] };
  },
};

// ── Settings ───────────────────────────────────────────
export const settingsApi = {
  getAll: async (group?: string): Promise<Setting[]> => {
    await delay(80);
    if (group) return settings.filter((s) => s.group === group).map((s) => ({ ...s }));
    return settings.map((s) => ({ ...s }));
  },
  getByKey: async (key: string): Promise<Setting> => {
    await delay(50);
    const setting = settings.find((s) => s.key === key);
    if (!setting) throw new Error("Setting not found");
    return { ...setting };
  },
  set: async (key: string, value: unknown, group?: string, description?: string): Promise<Setting> => {
    await delay(100);
    const idx = settings.findIndex((s) => s.key === key);
    const updated: Setting = {
      key,
      value,
      group: group ?? settings[idx]?.group ?? "general",
      description: description ?? settings[idx]?.description,
      updatedAt: new Date().toISOString(),
    };
    if (idx >= 0) {
      settings[idx] = updated;
    } else {
      settings.push(updated);
    }
    return { ...updated };
  },
};

// ── Roles ──────────────────────────────────────────────
export const rolesApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    await delay();
    return paginate(roles, params, ["roleName", "description"]);
  },
};


