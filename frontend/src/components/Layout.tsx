import React, { useState } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../services/api";
import { 
  LayoutDashboard, Building2, Package, ArrowLeftRight, Calendar, 
  Wrench, ClipboardCheck, BarChart3, Bell, Settings, HelpCircle, 
  Search, ShieldAlert, LogOut, ChevronDown, Check, X, Sparkles, Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, role: authRole, logout, switchRole } = useAuth();
  const { searchQuery, setSearchQuery, theme, setTheme, notificationBadgeCount, setNotificationBadgeCount } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Fetch notifications
  const { data: notificationsData = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      try {
        const resp = await notificationsApi.getAll();
        // Handle both raw array (mock API) and PaginatedResponse (real backend)
        return Array.isArray(resp) ? resp : (resp as any).data || [];
      } catch (err) {
        console.error("Failed to load notifications", err);
        return [];
      }
    },
    refetchInterval: 15000, // Poll every 15s
  });

  const notifications = Array.isArray(notificationsData) ? notificationsData : [];

  const unreadCount = notifications.filter(n => n.type === "unread" || n.status === "unread").length;

  // Notification actions
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const apiAny = notificationsApi as any;
      if (typeof apiAny.approve === "function") {
        return apiAny.approve(id);
      } else {
        // Fallback if MERN notificationsApi lacks approve
        return notificationsApi.markRead(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const apiAny = notificationsApi as any;
      if (typeof apiAny.reject === "function") {
        return apiAny.reject(id);
      } else {
        // Fallback
        return notificationsApi.markRead(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  // Breadcrumb generator
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Pages / Today's Overview";
    if (path === "/organization") return "Pages / Organization Setup";
    if (path === "/assets") return "Pages / Assets";
    if (path === "/allocation") return "Pages / Allocation & Transfer";
    if (path === "/booking") return "Pages / Resource Booking";
    if (path === "/maintenance") return "Pages / Maintenance";
    if (path === "/audit") return "Pages / Asset Audit";
    if (path === "/reports") return "Pages / Reports & Analytics";
    if (path === "/notifications") return "Pages / Notifications & Activity";
    if (path === "/settings") return "Pages / Settings";
    if (path === "/support") return "Pages / Help & Support";
    return "Pages / Dashboard";
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Today's Overview";
    if (path === "/organization") return "Organization Setup";
    if (path === "/assets") return "Assets Management";
    if (path === "/allocation") return "Allocation & Transfer";
    if (path === "/booking") return "Resource Booking";
    if (path === "/maintenance") return "Maintenance Management";
    if (path === "/audit") return "Asset Audit Center";
    if (path === "/reports") return "Reports & Analytics";
    if (path === "/notifications") return "Notifications & Activity Center";
    if (path === "/settings") return "System Settings";
    if (path === "/support") return "Help & Support";
    return "Dashboard";
  };

  // RBAC Navigation Links Definition
  const allNavLinks = [
    { to: "/dashboard", label: "Today's Overview", icon: LayoutDashboard, roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
    { to: "/organization", label: "Organization Setup", icon: Building2, roles: ["Admin"] },
    { to: "/assets", label: "Assets", icon: Package, roles: ["Admin", "Asset Manager"] },
    { to: "/allocation", label: "Allocation & Transfer", icon: ArrowLeftRight, roles: ["Admin", "Asset Manager", "Department Head"] },
    { to: "/booking", label: "Resource Booking", icon: Calendar, roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
    { to: "/maintenance", label: "Maintenance", icon: Wrench, roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
    { to: "/audit", label: "Asset Audit", icon: ClipboardCheck, roles: ["Admin", "Asset Manager"] },
    { to: "/reports", label: "Reports & Analytics", icon: BarChart3, roles: ["Admin", "Asset Manager", "Department Head"] },
    { to: "/notifications", label: "Notifications & Activity", icon: Bell, roles: ["Admin", "Asset Manager", "Department Head", "Employee"], badge: true },
    { to: "/settings", label: "Settings", icon: Settings, roles: ["Admin", "Asset Manager", "Department Head"] },
  ];

  // Filter links based on role
  const userRole = authRole || user?.role || "Employee";
  const visibleNavLinks = allNavLinks.filter(link => link.roles.includes(userRole));

  // Fallback for user name displaying (handling MERN firstName/lastName vs mock name)
  const userName = user ? (user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim()) : "Employee";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-gray">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
        {/* LOGO */}
        <div className="h-16 px-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/20">
            <span className="text-white font-bold text-lg font-mono">A</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-900 font-bold tracking-tight text-base leading-none">AssetFlow</span>
            <span className="text-primary font-semibold text-[10px] tracking-widest mt-1 font-mono uppercase">ERP ENTERPRISE</span>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {visibleNavLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/10"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.label}</span>
                </div>
                {link.badge && unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* SIDEBAR FOOTER */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <NavLink
            to="/support"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>Support & Help</span>
          </NavLink>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0 z-20">
          {/* BREADCRUMBS */}
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{getBreadcrumb()}</span>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">{getPageTitle()}</h1>
          </div>

          {/* ACTIONS ROW */}
          <div className="flex items-center gap-5">
            {/* SEARCH */}
            <div className="relative w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search assets, history, bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* QUICK ACTIONS BUTTON */}
            <div className="relative">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs px-3 py-1.5 rounded-lg font-semibold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Quick Actions</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              <AnimatePresence>
                {showQuickActions && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowQuickActions(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1.5 z-40"
                    >
                      <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100">
                        Raise Requests
                      </div>
                      <button
                        onClick={() => { setShowQuickActions(false); navigate("/booking?action=new"); }}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        Book Resource Room/Van
                      </button>
                      <button
                        onClick={() => { setShowQuickActions(false); navigate("/maintenance?action=new"); }}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Wrench className="w-3.5 h-3.5 text-primary" />
                        Report Damage/Repair
                      </button>
                      
                      {(user?.role === "Admin" || user?.role === "Asset Manager" || user?.role === "Department Head") && (
                        <>
                          <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase border-t border-gray-100 border-b">
                            Management Controls
                          </div>
                          <button
                            onClick={() => { setShowQuickActions(false); navigate("/allocation?action=transfer"); }}
                            className="w-full px-4 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5 text-primary" />
                            Transfer/Allocate Asset
                          </button>
                        </>
                      )}

                      {user?.role === "Admin" && (
                        <button
                          onClick={() => { setShowQuickActions(false); navigate("/assets?action=new"); }}
                          className="w-full px-4 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Package className="w-3.5 h-3.5 text-primary" />
                          Register New Serial Asset
                        </button>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* NOTIFICATIONS BELL */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg relative transition-all"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-40 overflow-hidden"
                    >
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900">Notifications ({unreadCount} Unread)</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={() => markAllReadMutation.mutate()}
                            className="text-[10px] text-primary hover:underline font-semibold"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-xs text-gray-400">No new notifications</div>
                        ) : (
                          notifications.map((notif) => {
                            const isApproval = notif.category === "Approval" || notif.type === "approval";
                            const notifTitle = notif.title || "Notification";
                            const notifMessage = notif.message || "";
                            const notifTime = notif.time || (notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : "");
                            return (
                              <div
                                key={notif.id}
                                className={`p-4 hover:bg-gray-50 transition-colors ${
                                  notif.status === "unread" || notif.type === "unread" ? "bg-primary/5" : ""
                                }`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    isApproval
                                      ? "bg-amber-100 text-amber-800"
                                      : notif.priority === "critical" || notif.priority === "Critical" || notif.category === "Alert"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}>
                                    {notif.category || notif.module || "Alert"}
                                  </span>
                                  <span className="text-[10px] text-gray-400">{notifTime}</span>
                                </div>
                                <h4 className="text-xs font-bold text-gray-900">{notifTitle}</h4>
                                <p className="text-[11px] text-gray-500 mt-0.5">{notifMessage}</p>

                                {/* Actionable Approvals */}
                                {isApproval && !notifTitle.includes("Approved") && !notifTitle.includes("Rejected") && (userRole === "Admin" || userRole === "Asset Manager" || userRole === "Department Head") && (
                                  <div className="flex gap-2 mt-2.5">
                                    <button
                                      onClick={() => approveMutation.mutate(notif.id)}
                                      disabled={approveMutation.isPending}
                                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-sm disabled:opacity-50"
                                    >
                                      <Check className="w-3 h-3" /> Approve
                                    </button>
                                    <button
                                      onClick={() => rejectMutation.mutate(notif.id)}
                                      disabled={rejectMutation.isPending}
                                      className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold px-2.5 py-1 rounded disabled:opacity-50"
                                    >
                                      <X className="w-3 h-3" /> Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
                        <Link
                          to="/notifications"
                          onClick={() => setShowNotifications(false)}
                          className="text-[11px] text-primary hover:underline font-bold"
                        >
                          View all activity center
                        </Link>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* PROFILE DROPDOWN WITH DEMO ROLE-SWITCHER */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-3 hover:bg-gray-50 p-1.5 rounded-lg transition-all"
              >
                <img
                  src={user?.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e"}
                  alt={userName}
                  className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-gray-900 leading-tight">{userName}</span>
                  <span className="text-[10px] font-medium text-gray-400">{userRole}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500 hidden md:block" />
              </button>

              <AnimatePresence>
                {showProfileDropdown && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowProfileDropdown(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl py-2 z-40"
                    >
                      {/* USER DETAILS */}
                      <div className="px-4 py-2 border-b border-gray-100 flex flex-col">
                        <span className="text-xs font-bold text-gray-900">{userName}</span>
                        <span className="text-[10px] text-gray-500 mt-0.5">{user?.email}</span>
                        <span className="text-[10px] font-semibold text-primary mt-1 font-mono uppercase">
                          {userRole} ACCOUNT
                        </span>
                      </div>

                      {/* LIVE DEMO ROLE SWITCHER (Odoo Hackathon Showcase Feature) */}
                      <div className="p-3 border-b border-gray-100 bg-amber-50/50">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                            RBAC Sandbox Switcher
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {(["Admin", "Asset Manager", "Department Head", "Employee"] as const).map((role) => (
                            <button
                              key={role}
                              onClick={() => {
                                switchRole(role);
                                queryClient.invalidateQueries(); // Refresh all API hooks
                                setShowProfileDropdown(false);
                                navigate("/dashboard");
                              }}
                              className={`px-2 py-1.5 text-[9px] font-bold rounded border text-left transition-all ${
                                userRole === role
                                  ? "bg-primary border-primary text-white"
                                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              {role === "Department Head" ? "Dept Head" : role}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* OTHER LINKS */}
                      <button
                        onClick={() => { setShowProfileDropdown(false); navigate("/settings"); }}
                        className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        System Settings
                      </button>

                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          logout();
                          navigate("/");
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100 mt-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Log out of ERP
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT CANVAS */}
        <main className="flex-1 overflow-y-auto bg-bg-gray relative">
          <div className="max-w-7xl mx-auto p-8 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
