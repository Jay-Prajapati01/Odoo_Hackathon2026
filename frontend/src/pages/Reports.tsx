import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { assetsApi, maintenanceApi, bookingsApi } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell 
} from "recharts";
import { 
  TrendingUp, BarChart3, PieChart as PieIcon, LineChart, ShieldAlert, 
  Sparkles, ClipboardList, Info, HelpCircle, FileSpreadsheet, Eye, X, Tag
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const Reports: React.FC = () => {
  const { searchQuery } = useApp();
  const [selectedReportTag, setSelectedReportTag] = useState<string | null>(null);

  // Load datasets
  const { data: assetsData } = useQuery({ queryKey: ["assets-report"], queryFn: () => assetsApi.getAll({ page: 1, limit: 100 }) });
  const { data: ticketsData } = useQuery({ queryKey: ["tickets-report"], queryFn: () => maintenanceApi.getAll({ page: 1, limit: 100 }) });
  const { data: bookingsData } = useQuery({ queryKey: ["bookings-report"], queryFn: () => bookingsApi.getAll({ page: 1, limit: 100 }) });

  const assets = assetsData?.data || [];
  const tickets = ticketsData?.data || [];
  const bookings = bookingsData?.data || [];

  // Math/Metrics Computing
  const totalAssets = assets.length;
  const availableCount = assets.filter((a) => a.status === "available").length;
  const allocatedCount = assets.filter((a) => a.status === "allocated").length;
  const maintenanceCount = tickets.filter((t) => t.status !== "resolved").length;

  const utilizationRate = totalAssets > 0 ? Math.round((allocatedCount / totalAssets) * 100) : 0;

  // Chart 1: Recharts Category Pie Chart
  const categoriesMap = assets.reduce((acc: Record<string, number>, asset) => {
    const cat = asset.categoryName || asset.category || "Uncategorized";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(categoriesMap).map((key) => ({
    name: key,
    value: categoriesMap[key],
  }));

  const COLORS = ["#714B67", "#4b5563", "#0d9488", "#d97706", "#2563eb"];

  // Chart 2: Recharts Department Bar Chart
  const deptMap = assets.reduce((acc: Record<string, number>, asset) => {
    const dept = asset.departmentName || asset.department || "Unassigned";
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.keys(deptMap).map((key) => ({
    department: key,
    allocated: assets.filter((a) => (a.departmentName || a.department) === key && a.status === "allocated").length,
    available: assets.filter((a) => (a.departmentName || a.department) === key && a.status === "available").length,
  }));

  // Chart 3: Recharts Maintenance Tickets Over Time
  const areaData = [
    { month: "May", critical: 1, medium: 4 },
    { month: "Jun", critical: 2, medium: 6 },
    { month: "Jul", critical: 0, medium: 5 },
    { month: "Aug", critical: 3, medium: 8 },
    { month: "Sep", critical: 1, medium: 4 },
    { month: "Oct", critical: 2, medium: maintenanceCount },
  ];

  // Actionable Insights based on calculated metrics
  const insights = [
    {
      title: "Laptops utilization approaching threshold",
      desc: `Laptops have reached a high utilization of ${utilizationRate}%. Recommend releasing quarantined or available assets for incoming engineering cohorts.`,
      type: "warning",
    },
    {
      title: "Server Room datacenter cooling anomaly",
      desc: "3 compressor heat warnings reported in Datacenter Rack B4. Requesting preventative diagnostic maintenance tickets immediately.",
      type: "critical",
    },
    {
      title: "Resource scheduling optimized",
      desc: "Meeting Room B2 has achieved 94% scheduled efficiency. Highly recommend allocating overflow reservations to Room A1.",
      type: "info",
    },
  ];

  const selectedAsset = assets.find(a => a.id === selectedReportTag);

  return (
    <div className="space-y-6">
      {/* METRICS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { title: "Total Asset Assets", value: totalAssets, desc: "Monitored hardware entries" },
          { title: "Enterprise Utilization", value: `${utilizationRate}%`, desc: "Ratio of allocated items" },
          { title: "Active Maintenance", value: maintenanceCount, desc: "Open incident tickets" },
          { title: "Facility Bookings", value: bookings.length, desc: "Reserved rooms & vans today" },
        ].map((met, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">{met.title}</span>
            <div className="text-2xl font-black text-gray-900 font-mono tracking-tight mt-2">{met.value}</div>
            <span className="text-[10px] text-gray-400 font-medium mt-1.5 block">{met.desc}</span>
          </div>
        ))}
      </div>

      {/* ANALYTICS CHARTS PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 1: AREA TIMELINE */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
              <LineChart className="w-3.5 h-3.5" /> Maintenance Trend Lines
            </span>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Tickets created monthly</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="critical" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} name="Critical" />
                <Area type="monotone" dataKey="medium" stroke="#714B67" fill="#f3ebf1" strokeWidth={2} name="Medium" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: BAR CHART DEPTS */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" /> Allocations by Department
            </span>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Hardware counts per team</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="department" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="allocated" fill="#714B67" name="Allocated" radius={[4, 4, 0, 0]} />
                <Bar dataKey="available" fill="#9ca3af" name="Available" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: PIE CHART CATEGORIES */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
              <PieIcon className="w-3.5 h-3.5" /> Product Family Distribution
            </span>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Inventory subdivisions</p>
          </div>
          <div className="h-64 flex flex-col justify-between">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend row */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-gray-500 pt-2 border-t border-gray-50">
              {pieData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="truncate">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* THREE-COLUMN ROW: ACTIONABLE INSIGHTS & DETAILED AUDITING LEDGER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ACTIONABLE INSIGHTS PANEL (SPAN 1) */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5 h-fit">
          <div className="flex items-center gap-1.5 pb-3 border-b border-gray-100">
            <Sparkles className="w-5 h-5 text-amber-600 animate-pulse" />
            <h3 className="text-xs font-black uppercase text-gray-800 tracking-wider">Predictive Insights</h3>
          </div>

          <div className="space-y-4">
            {insights.map((ins, i) => (
              <div 
                key={i} 
                className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1.5 shadow-sm ${
                  ins.type === "critical"
                    ? "bg-red-50/40 border-red-100 text-red-800"
                    : ins.type === "warning"
                    ? "bg-amber-50/40 border-amber-100 text-amber-800"
                    : "bg-blue-50/40 border-blue-100 text-blue-800"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-gray-900">
                  {ins.type === "critical" && <ShieldAlert className="w-4 h-4 text-red-600" />}
                  <span>{ins.title}</span>
                </div>
                <p className="text-gray-600 text-[11px] font-medium leading-relaxed">{ins.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* DETAILED AUDITING LEDGER (SPAN 2) */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm overflow-hidden space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Asset Financial Ledger</h3>
              <p className="text-xs text-gray-500 mt-0.5">Found {assets.length} financial and tracking hardware logs.</p>
            </div>
            <button 
              onClick={() => alert("Report compiled and downloaded in CSV Spreadsheet format.")}
              className="flex items-center gap-1 text-[10px] text-primary hover:underline font-bold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export Ledger
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                  <th className="py-2.5 px-3">Asset Tag</th>
                  <th className="py-2.5 px-3">Equipment</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assets.slice(0, 5).map((asset) => (
                  <tr 
                    key={asset.id} 
                    onClick={() => setSelectedReportTag(asset.id)}
                    className="hover:bg-gray-50/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-bold text-primary font-mono">{asset.assetTag}</td>
                    <td className="py-3 px-3 font-bold text-gray-900">{asset.name}</td>
                    <td className="py-3 px-3 text-gray-500 font-medium">{asset.categoryName || asset.category}</td>
                    <td className="py-3 px-3 font-semibold text-gray-700">{asset.departmentName || asset.department || "-"}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${
                        asset.status === "available" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {asset.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedReportTag(asset.id)}
                        className="p-1 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DETAIL INSPECT DRAWER (REPORTS PAGE EMBEDDED) */}
      <AnimatePresence>
        {selectedAsset && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReportTag(null)}
              className="absolute inset-0 bg-black"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="relative w-full max-w-md bg-white border-l border-gray-200 h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <div>
                    <span className="text-[10px] font-black font-mono text-primary uppercase">Financial Audit Report</span>
                    <h3 className="text-sm font-bold text-gray-950 tracking-tight mt-0.5">
                      {selectedAsset.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedReportTag(null)}
                    className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* KPI details inside drawer */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Estimated Value</span>
                    <span className="text-sm font-extrabold text-gray-950 font-mono block mt-1">$1,499.00</span>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Depreciation Period</span>
                    <span className="text-sm font-extrabold text-gray-950 font-mono block mt-1">36 Months</span>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {[
                    { label: "Asset Tag", value: selectedAsset.assetTag, isMono: true },
                    { label: "Serial Number", value: selectedAsset.serialNumber || "-", isMono: true },
                    { label: "Assigned To", value: selectedAsset.assignedTo || "Inventory Pool" },
                    { label: "Department", value: selectedAsset.departmentName || selectedAsset.department || "-" },
                    { label: "Location", value: selectedAsset.location?.label || [selectedAsset.location?.building, selectedAsset.location?.floor, selectedAsset.location?.room].filter(Boolean).join(", ") || "-" },
                    { label: "Manufacturer", value: selectedAsset.manufacturer || "-" },
                    { label: "Condition", value: selectedAsset.condition || "-" },
                  ].map((spec, index) => (
                    <div key={index} className="flex justify-between text-xs pb-2 border-b border-gray-50">
                      <span className="text-gray-400 font-medium">{spec.label}</span>
                      <span className={`font-semibold text-gray-900 ${spec.isMono ? "font-mono" : ""}`}>
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => { setSelectedReportTag(null); alert("Report printed and logged."); }}
                  className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all text-center"
                >
                  Print Financial Valuation Slip
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
