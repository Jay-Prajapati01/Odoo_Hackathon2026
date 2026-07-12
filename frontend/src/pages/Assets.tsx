import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assetsApi, assetCategoriesApi, departmentsApi } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { 
  Search, Filter, Plus, FileSpreadsheet, QrCode, CheckCircle2, 
  HelpCircle, MoreHorizontal, ArrowUpDown, ChevronRight, X, Sparkles, 
  Trash2, Eye, ShieldAlert, MonitorCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-800",
  allocated: "bg-blue-100 text-blue-800",
  reserved: "bg-amber-100 text-amber-800",
  maintenance: "bg-red-100 text-red-800",
  lost: "bg-gray-100 text-gray-800",
  retired: "bg-gray-100 text-gray-500",
  disposed: "bg-gray-100 text-gray-400",
};

export const Assets: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { searchQuery } = useApp();

  // Search/Filter states
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  
  // Selected asset for Details Drawer
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Load datasets
  const { data: assetsData, isLoading } = useQuery({
    queryKey: ["assets", page, searchQuery, statusFilter, categoryFilter],
    queryFn: () => assetsApi.getAll({
      page,
      limit: 20,
      search: searchQuery || undefined,
      status: statusFilter === "All" ? undefined : statusFilter,
      category: categoryFilter === "All" ? undefined : categoryFilter,
    }),
  });

  const assets = assetsData?.data || [];
  const meta = assetsData?.meta;

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => assetCategoriesApi.getAll({ limit: 100 }),
  });
  const categories = categoriesData?.data || [];

  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentsApi.getAll({ limit: 100 }),
  });
  const departments = departmentsData?.data || [];

  const { data: selectedAsset } = useQuery({
    queryKey: ["asset", selectedAssetId],
    queryFn: () => assetsApi.getById(selectedAssetId!),
    enabled: !!selectedAssetId,
  });

  // Modal trigger via query param `action=new`
  const isNewModalOpen = searchParams.get("action") === "new";

  // Create Asset Form States
  const [assetName, setAssetName] = useState("");
  const [assetCategory, setAssetCategory] = useState("");
  const [assetLocation, setAssetLocation] = useState("HQ - Floor 1");
  const [assetSerial, setAssetSerial] = useState("");
  const [assetDept, setAssetDept] = useState("");

  const createAssetMutation = useMutation({
    mutationFn: assetsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      // Reset & close
      setAssetName("");
      setAssetSerial("");
      setAssetCategory("");
      setAssetDept("");
      setAssetLocation("HQ - Floor 1");
      setSearchParams({});
      alert("New asset added to the catalog successfully.");
    },
  });

  const handleRegisterAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName || !assetCategory) return;
    createAssetMutation.mutate({
      name: assetName,
      category: assetCategory,
      location: { label: assetLocation },
      serialNumber: assetSerial || "SN-" + Math.floor(100000 + Math.random() * 900000),
      department: assetDept || undefined,
      status: "available",
    });
  };

  return (
    <div className="space-y-6">
      {/* FILTER & OPERATIONS RIBBON */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {/* CATEGORY FILTER */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* STATUS FILTER */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Asset Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all"
            >
              <option value="All">All States</option>
              <option value="available">Available</option>
              <option value="allocated">Allocated</option>
              <option value="maintenance">Under Repair</option>
              <option value="reserved">Reserved</option>
              <option value="lost">Lost</option>
            </select>
          </div>
        </div>

        {/* OPERATIONS BUTTONS */}
        <div className="flex gap-2 w-full md:w-auto justify-end">
          <button 
            onClick={() => {
              alert("Exporting Asset Catalog to CSV spreadsheet format. Downloader triggered.");
            }}
            className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Catalog</span>
          </button>
          <button
            onClick={() => setSearchParams({ action: "new" })}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Asset</span>
          </button>
        </div>
      </div>

      {/* TWO COLUMN GRID: MAIN LIST AND ASSET DETAIL PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN DATA TABLE PANEL */}
        <div className={`${selectedAssetId ? "lg:col-span-2" : "lg:col-span-3"} bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-6 space-y-4`}>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Asset Catalog</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {meta ? `Showing ${assets.length} of ${meta.total} hardware items.` : `Found ${assets.length} hardware items.`}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    <th className="py-3 px-4">Asset Tag</th>
                    <th className="py-3 px-4">Equipment / Item Name</th>
                    <th className="py-3 px-4">Product Category</th>
                    <th className="py-3 px-4">Custodian Assigned</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {assets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 font-medium">
                        No hardware assets match the search criteria.
                      </td>
                    </tr>
                  ) : (
                    assets.map((asset) => (
                      <tr 
                        key={asset.id} 
                        onClick={() => setSelectedAssetId(asset.id)}
                        className={`hover:bg-gray-50/50 cursor-pointer transition-colors ${
                          selectedAssetId === asset.id ? "bg-primary/5 hover:bg-primary/5" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-primary font-mono">{asset.assetTag}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-950">{asset.name}</td>
                        <td className="py-3.5 px-4 text-gray-500 font-medium">{asset.categoryName || asset.category}</td>
                        <td className="py-3.5 px-4">
                          {asset.assignedTo ? (
                            <span className="font-semibold text-gray-800">{asset.assignedTo}</span>
                          ) : (
                            <span className="text-gray-400">Inventory Pool</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${
                            STATUS_COLORS[asset.status] || "bg-gray-100 text-gray-600"
                          }`}>
                            {asset.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedAssetId(asset.id)}
                            className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-40 transition-all">Previous</button>
              <span className="text-[10px] font-bold text-gray-400">Page {meta.page} of {meta.totalPages}</span>
              <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-40 transition-all">Next</button>
            </div>
          )}
        </div>

        {/* SIDE DRAWER FOR ASSET DETAIL CARD */}
        <AnimatePresence>
          {selectedAssetId && selectedAsset && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-md h-fit space-y-6 lg:sticky lg:top-4"
            >
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <div>
                  <span className="text-[10px] font-black font-mono text-primary uppercase">{selectedAsset.assetTag}</span>
                  <h3 className="text-sm font-bold text-gray-950 tracking-tight mt-0.5">{selectedAsset.name}</h3>
                </div>
                <button 
                  onClick={() => setSelectedAssetId(null)}
                  className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* QR / Barcode Verification Visuals */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center gap-3">
                <div className="w-32 h-32 bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
                  <QrCode className="w-24 h-24 text-gray-800" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black font-mono text-gray-500 tracking-widest leading-none">
                    * {selectedAsset.assetTag} *
                  </span>
                  <span className="text-[9px] text-gray-400 font-medium mt-1 uppercase tracking-wider">
                    SCAN FOR INVENTORY VERIFICATION
                  </span>
                </div>
              </div>

              {/* SPEC SHEET */}
              <div className="space-y-3.5">
                {[
                  { label: "Hardware Family", value: selectedAsset.categoryName || selectedAsset.category },
                  { label: "Device Serial Code", value: selectedAsset.serialNumber || "-", isMono: true },
                  { label: "Asset Tag Name", value: selectedAsset.assetTag, isMono: true },
                  { label: "Current Custodian", value: selectedAsset.assignedTo || "Inventory Pool" },
                  { label: "Primary Department", value: selectedAsset.departmentName || "-" },
                  { label: "Physical Location", value: selectedAsset.location?.label || [selectedAsset.location?.building, selectedAsset.location?.floor, selectedAsset.location?.room].filter(Boolean).join(", ") || "-" },
                  { label: "Condition Status", value: selectedAsset.condition || "Good" },
                  { label: "Depreciated Value", value: selectedAsset.currentValue != null ? `$${selectedAsset.currentValue.toLocaleString()}` : "-" },
                ].map((spec, index) => (
                  <div key={index} className="flex justify-between text-xs pb-2 border-b border-gray-50">
                    <span className="text-gray-400 font-medium">{spec.label}</span>
                    <span className={`font-semibold text-gray-900 ${spec.isMono ? "font-mono" : ""}`}>
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => navigate(`/allocation?assetId=${selectedAsset.id}`)}
                  className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white text-[10px] font-black tracking-wider uppercase rounded-lg shadow-sm transition-all"
                >
                  Initiate Transfer
                </button>
                <button
                  onClick={() => navigate(`/maintenance?assetId=${selectedAsset.id}`)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-black tracking-wider uppercase rounded-lg transition-all"
                >
                  Report Damage
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* REGISTER NEW ASSET MODAL */}
      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchParams({})}
              className="absolute inset-0 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-md relative z-10"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Register Serial Asset</h3>
                <button onClick={() => setSearchParams({})} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRegisterAsset} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Asset Name / Model Description
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MacBook Pro M3 Max 16\"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Product Category
                    </label>
                    <select
                      required
                      value={assetCategory}
                      onChange={(e) => setAssetCategory(e.target.value)}
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all"
                    >
                      <option value="">Select category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Serial Code (S/N)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SN-982039A83"
                      value={assetSerial}
                      onChange={(e) => setAssetSerial(e.target.value)}
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Primary Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Floor 3, Desk 12"
                      value={assetLocation}
                      onChange={(e) => setAssetLocation(e.target.value)}
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Assigned Department
                    </label>
                    <select
                      value={assetDept}
                      onChange={(e) => setAssetDept(e.target.value)}
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all"
                    >
                      <option value="">Select department...</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setSearchParams({})}
                    className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAssetMutation.isPending}
                    className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1"
                  >
                    {createAssetMutation.isPending ? "Registering..." : "Add to Catalog"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
