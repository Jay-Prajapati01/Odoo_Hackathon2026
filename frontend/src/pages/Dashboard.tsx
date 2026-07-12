import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi, bookingsApi, departmentsApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { 
  ShieldAlert, Package, Calendar, Wrench, ArrowLeftRight, FileCheck, 
  ChevronRight, ArrowRight, TrendingUp, AlertTriangle, Clock, Play
} from "lucide-react";
import { motion } from "motion/react";

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, role: authRole } = useAuth();

  // Load MERN backend summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: dashboardApi.getSummary,
  });

  // Load real bookings for schedule list
  const { data: bookingsData } = useQuery({
    queryKey: ["bookings-list"],
    queryFn: () => bookingsApi.getAll({ page: 1, limit: 5 }),
  });

  // Load departments to map ID to name
  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentsApi.getAll({ limit: 100 }),
    enabled: !!user?.department,
  });

  const bookings = bookingsData?.data || [];
  const departments = departmentsData?.data || [];

  if (isSummaryLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 rounded-full border-primary border-t-transparent animate-spin"></div>
          <span className="text-xs text-gray-500 font-medium">Querying dashboard summary node...</span>
        </div>
      </div>
    );
  }

  // Compute live metrics from real MERN summary
  const availableCount = summary?.assets?.available ?? 0;
  const allocatedCount = summary?.assets?.allocated ?? 0;
  const maintenanceCount = (summary?.maintenance?.in_progress ?? 0) + (summary?.maintenance?.pending ?? 0);
  const bookingCount = summary?.bookings?.upcoming ?? 0;
  const history = summary?.recentActivity || [];

  // Fallback for user name displaying (handling MERN firstName/lastName vs mock name)
  const userName = user ? (user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim()) : "Employee";
  const userRole = authRole || user?.role || "Employee";
  const deptName = departments.find((d) => d.id === user?.department)?.name || user?.department || "General";

  return (
    <div className="space-y-6">
      {/* ENTERPRISE WELCOME CARD WITH STATUS BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Welcome back, {userName}!
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Active session authorized for <span className="font-semibold text-primary">{userRole}</span> in <span className="font-semibold text-gray-700">{deptName}</span>.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-primary-light text-primary border border-primary/20 px-4 py-2.5 rounded-lg text-xs font-semibold font-mono">
          <Clock className="w-4 h-4 animate-pulse" />
          <span>SERVER ONLINE • UTC ZONE</span>
        </div>
      </div>

      {/* DISCREPANCY ALERT BANNER */}
      {summary?.allocations?.overdue ? (
        <motion.div
          whileHover={{ scale: 1.005 }}
          onClick={() => navigate("/allocation")}
          className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start md:items-center justify-between gap-4 shadow-sm cursor-pointer hover:bg-amber-100/70 transition-all"
        >
          <div className="flex items-start md:items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 tracking-tight">Discrepancy alert detected!</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                {summary.allocations.overdue} overdue asset allocations require immediate physical sweep or return. Tap to resolve.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-700 shrink-0 hidden md:block" />
        </motion.div>
      ) : (
        <motion.div
          whileHover={{ scale: 1.005 }}
          onClick={() => navigate("/audit")}
          className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start md:items-center justify-between gap-4 shadow-sm cursor-pointer hover:bg-emerald-100/70 transition-all"
        >
          <div className="flex items-start md:items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5 text-emerald-800" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-900 tracking-tight">Audit Cycle Active</h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                System health metrics normal. Review the current engineering physical sweep worksheets.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-700 shrink-0 hidden md:block" />
        </motion.div>
      )}

      {/* KPI METRIC CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            title: "Available Assets",
            count: availableCount,
            subtext: "Ready for allocation",
            icon: Package,
            color: "text-emerald-600 bg-emerald-50",
            link: "/assets",
          },
          {
            title: "Allocated Assets",
            count: allocatedCount,
            subtext: "Assigned to personnel",
            icon: ArrowLeftRight,
            color: "text-blue-600 bg-blue-50",
            link: "/allocation",
          },
          {
            title: "Under Maintenance",
            count: maintenanceCount,
            subtext: "Repair tickets active",
            icon: Wrench,
            color: "text-red-600 bg-red-50",
            link: "/maintenance",
          },
          {
            title: "Active Bookings",
            count: bookingCount,
            subtext: "Resource allocations",
            icon: Calendar,
            color: "text-purple-600 bg-purple-50",
            link: "/booking",
          },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={() => navigate(kpi.link)}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{kpi.title}</span>
                <div className={`w-8 h-8 rounded-lg ${kpi.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-gray-900 font-mono tracking-tight">{kpi.count}</span>
                <span className="block text-[10px] text-gray-400 mt-1 font-medium">{kpi.subtext}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* TWO-COLUMN CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT/MID COLUMN: QUICK ACTIONS & INSIGHTS (SPAN 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* QUICK ACTIONS PANEL */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">Quick Operations Hub</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  title: "Book Resource room/van",
                  desc: "Reserve conference boards, testing labs, or corporate shuttle vans.",
                  icon: Calendar,
                  link: "/booking",
                  btnText: "Schedule Room",
                },
                {
                  title: "Raise Repair Ticket",
                  desc: "File support requests for screen glitches, battery failures, or damaged units.",
                  icon: Wrench,
                  link: "/maintenance",
                  btnText: "Raise Incident",
                },
                {
                  title: "Initiate Asset Transfer",
                  desc: "Submit request to transfer MacBooks, iPhones, or keyboards to another team member.",
                  icon: ArrowLeftRight,
                  link: "/allocation",
                  btnText: "Transfer Form",
                },
                {
                  title: "Asset Audit Center",
                  desc: "Perform dynamic physical audits, verify assets, and declare missing counts.",
                  icon: FileCheck,
                  link: "/audit",
                  btnText: "Verify Assets",
                },
              ].map((action, idx) => {
                const Icon = action.icon;
                return (
                  <div
                    key={idx}
                    className="p-4 border border-gray-100 hover:border-primary/20 hover:bg-gray-50/50 rounded-lg flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-primary shrink-0" />
                        <h4 className="text-xs font-bold text-gray-950 tracking-tight">{action.title}</h4>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">{action.desc}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-50 flex justify-end">
                      <button
                        onClick={() => navigate(action.link)}
                        className="text-[10px] font-bold text-primary hover:text-primary-hover flex items-center gap-1 hover:underline"
                      >
                        <span>{action.btnText}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE UTILITIES/BOOKINGS TABLE IN DASHBOARD */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resource Allocation schedule</h3>
              <Link to="/booking" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                <span>Timeline schedule</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    <th className="py-2.5 px-3">Resource Room</th>
                    <th className="py-2.5 px-3">Meeting / Purpose</th>
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-3">Schedule</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-400 italic">No bookings scheduled today</td>
                    </tr>
                  ) : (
                    bookings.slice(0, 3).map((b) => {
                      const startTime = b.startDateTime ? new Date(b.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                      const endTime = b.endDateTime ? new Date(b.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                      return (
                        <tr key={b.id} className="hover:bg-gray-50/40">
                          <td className="py-3 px-3 font-semibold text-gray-900">{b.assetName || b.asset || "Meeting Room"}</td>
                          <td className="py-3 px-3 text-gray-700 font-medium">{b.title}</td>
                          <td className="py-3 px-3 text-gray-500">{b.departmentName || b.department || "General"}</td>
                          <td className="py-3 px-3 text-gray-500 font-mono">{startTime} - {endTime}</td>
                          <td className="py-3 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${
                              (() => {
                                const statusStr = (b.status || "").toLowerCase();
                                if (statusStr === "completed") return "bg-emerald-100 text-emerald-800";
                                if (statusStr === "ongoing") return "bg-blue-100 text-blue-800";
                                if (statusStr === "maintenance") return "bg-red-100 text-red-800";
                                return "bg-amber-100 text-amber-800";
                              })()
                            }`}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT HISTORY FEED (SPAN 1) */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">Recent Asset events</h3>
            <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-gray-100">
              {history.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-6 text-center">No recent activity logs found</p>
              ) : (
                history.slice(0, 5).map((item) => {
                  const logTitle = item.action || "Asset Log";
                  const logDate = item.timestamp || "";
                  const logDetails = item.description || "";
                  return (
                    <div key={item.id} className="flex gap-4 relative group">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 border-white relative z-10 bg-primary-light text-primary">
                        <span className="text-[10px] font-black">{item.module ? item.module.slice(0, 2).toUpperCase() : "AC"}</span>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-gray-900 group-hover:text-primary transition-colors">
                          {logTitle}
                        </h5>
                        <p className="text-[10px] text-gray-400 font-medium font-mono mt-0.5">{logDate}</p>
                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{logDetails}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100 text-center">
            <Link to="/allocation" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
              <span>View full transfer ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
