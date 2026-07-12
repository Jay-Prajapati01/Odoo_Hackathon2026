import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auditsApi, assetsApi } from "../services/api";
import { useApp } from "../contexts/AppContext";
import {
  ClipboardCheck, Plus, X, Play, CheckCircle2, AlertTriangle, ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { AuditCycle, AuditItem } from "../types";

const CYCLE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  scheduled: "bg-amber-100 text-amber-800",
  active: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

const ITEM_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-500",
  verified: "bg-emerald-100 text-emerald-800",
  missing: "bg-red-100 text-red-800",
  damaged: "bg-orange-100 text-orange-800",
  not_found: "bg-gray-100 text-gray-500",
};

export const Audit: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { searchQuery } = useApp();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const isNewModalOpen = searchParams.get("action") === "new";
  const verifyItemId = searchParams.get("verify");
  const closeAuditId = searchParams.get("close");

  const { data: cycleData, isLoading } = useQuery({
    queryKey: ["audit-cycles", page, searchQuery, statusFilter],
    queryFn: () => auditsApi.getAll({ page, limit: 20, search: searchQuery || undefined, status: statusFilter || undefined }),
  });

  const cycles = cycleData?.data || [];
  const meta = cycleData?.meta;

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["audit-cycle-detail", detailId],
    queryFn: () => auditsApi.getById(detailId!),
    enabled: !!detailId,
  });

  const { data: assetsData } = useQuery({ queryKey: ["assets"], queryFn: () => assetsApi.getAll({ limit: 100 }) });
  const assets = assetsData?.data || [];

  // Create form
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formScopeType, setFormScopeType] = useState("organization");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  // Verify form
  const [verifyStatus, setVerifyStatus] = useState<"verified" | "missing" | "damaged" | "not_found">("verified");
  const [verifyCondition, setVerifyCondition] = useState("");
  const [verifyRemarks, setVerifyRemarks] = useState("");

  // Close form
  const [closeRemarks, setCloseRemarks] = useState("");

  const createMutation = useMutation({
    mutationFn: auditsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-cycles"] });
      resetCreateForm();
      setSearchParams({});
    },
  });

  const startMutation = useMutation({
    mutationFn: auditsApi.start,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["audit-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["audit-cycle-detail", data.id] });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ auditId, itemId, data }: { auditId: string; itemId: string; data: { verificationStatus: string; condition?: string; remarks?: string } }) =>
      auditsApi.verifyItem(auditId, itemId, data),
    onSuccess: () => {
      if (detailId) {
        queryClient.invalidateQueries({ queryKey: ["audit-cycle-detail", detailId] });
      }
      queryClient.invalidateQueries({ queryKey: ["audit-cycles"] });
      setSearchParams(detailId ? { view: detailId } : {});
    },
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) => auditsApi.close(id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-cycles"] });
      if (detailId) queryClient.invalidateQueries({ queryKey: ["audit-cycle-detail", detailId] });
      setSearchParams(detailId ? { view: detailId } : {});
    },
  });

  function resetCreateForm() {
    setFormTitle("");
    setFormDesc("");
    setFormScopeType("organization");
    setFormStartDate("");
    setFormEndDate("");
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formStartDate || !formEndDate) return;
    createMutation.mutate({
      title: formTitle,
      description: formDesc || undefined,
      scope: { type: formScopeType },
      startDate: formStartDate,
      endDate: formEndDate,
    });
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyItemId || !detailId) return;
    verifyMutation.mutate({
      auditId: detailId,
      itemId: verifyItemId,
      data: {
        verificationStatus: verifyStatus,
        condition: verifyCondition || undefined,
        remarks: verifyRemarks || undefined,
      },
    });
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeAuditId) return;
    closeMutation.mutate({ id: closeAuditId, remarks: closeRemarks || undefined });
  };

  const handleViewDetail = (id: string) => {
    setDetailId(id);
    setSearchParams({ view: id });
  };

  const handleBackToList = () => {
    setDetailId(null);
    setSearchParams({});
  };

  const currentDetail = detailData as (AuditCycle & { items?: AuditItem[] }) | undefined;

  // Detail view
  if (detailId) {
    const items = currentDetail?.items || [];
    return (
      <div className="space-y-6">
        {/* Detail header */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleBackToList} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${CYCLE_STATUS_COLORS[currentDetail?.status || "draft"] || "bg-gray-100 text-gray-600"}`}>
                  {(currentDetail?.status || "draft").toUpperCase()}
                </span>
                <span className="text-[10px] font-mono text-gray-400">ID: {detailId}</span>
              </div>
              <h2 className="text-sm font-bold text-gray-950 tracking-tight mt-1">{currentDetail?.title || "Loading..."}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(currentDetail?.status === "draft" || currentDetail?.status === "scheduled") && (
              <button
                onClick={() => startMutation.mutate(detailId)}
                disabled={startMutation.isPending}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                Start Audit
              </button>
            )}
            {currentDetail?.status === "active" && (
              <button
                onClick={() => { setCloseRemarks(""); setSearchParams({ view: detailId, close: detailId }); }}
                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 text-xs font-bold px-4 py-2 rounded-lg transition-all"
              >
                Close Audit
              </button>
            )}
          </div>
        </div>

        {/* Items table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-6 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Audit Items</h3>
            <p className="text-xs text-gray-500 mt-0.5">{items.length} items to verify</p>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    <th className="py-3 px-4">Asset ID</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4">Remarks</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">
                        {currentDetail?.status === "active" ? "Audit is active. Items will appear once added." : "No items to display yet."}
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-primary font-mono">{item.assetId}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${ITEM_STATUS_COLORS[item.verificationStatus] || "bg-gray-100 text-gray-600"}`}>
                            {item.verificationStatus.toUpperCase().replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 font-medium">{item.condition || "-"}</td>
                        <td className="py-3.5 px-4 text-gray-500 font-medium max-w-[200px] truncate">{item.remarks || "-"}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setVerifyStatus("verified");
                              setVerifyCondition("");
                              setVerifyRemarks("");
                              setSearchParams({ view: detailId, verify: item.id });
                            }}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg transition-all"
                          >
                            Verify
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Verify Modal */}
        <AnimatePresence>
          {verifyItemId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSearchParams({ view: detailId! })} className="absolute inset-0 bg-black" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-sm relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight">Verify Item</h3>
                  <button onClick={() => setSearchParams({ view: detailId! })} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleVerifySubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
                    <select value={verifyStatus} onChange={(e) => setVerifyStatus(e.target.value as any)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all">
                      <option value="verified">Verified</option>
                      <option value="missing">Missing</option>
                      <option value="damaged">Damaged</option>
                      <option value="not_found">Not Found</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Condition</label>
                    <select value={verifyCondition} onChange={(e) => setVerifyCondition(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all">
                      <option value="">Select condition...</option>
                      <option value="new">New</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Remarks</label>
                    <textarea rows={3} placeholder="Optional notes..." value={verifyRemarks} onChange={(e) => setVerifyRemarks(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                  </div>
                  <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                    <button type="button" onClick={() => setSearchParams({ view: detailId! })} className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-all">Cancel</button>
                    <button type="submit" disabled={verifyMutation.isPending} className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1">
                      {verifyMutation.isPending ? "Saving..." : "Save Verification"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Close Audit Modal */}
        <AnimatePresence>
          {closeAuditId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSearchParams({ view: detailId! })} className="absolute inset-0 bg-black" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-sm relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight">Close Audit Cycle</h3>
                  <button onClick={() => setSearchParams({ view: detailId! })} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleCloseSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Remarks</label>
                    <textarea rows={3} placeholder="Optional closing remarks..." value={closeRemarks} onChange={(e) => setCloseRemarks(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                  </div>
                  <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                    <button type="button" onClick={() => setSearchParams({ view: detailId! })} className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-all">Cancel</button>
                    <button type="submit" disabled={closeMutation.isPending} className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1">
                      {closeMutation.isPending ? "Closing..." : "Close Audit"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Audit Cycles</h3>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => setSearchParams({ action: "new" })}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all uppercase tracking-wider"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Audit</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-6 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Audit Cycles Ledger</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {meta ? `Showing ${cycles.length} of ${meta.total} cycles` : `${cycles.length} cycles`}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-100 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Scope</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">End Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cycles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 font-medium">No audit cycles found.</td>
                  </tr>
                ) : (
                  cycles.map((cycle) => (
                    <tr key={cycle.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => handleViewDetail(cycle.id)}>
                      <td className="py-3.5 px-4 font-bold text-gray-950">{cycle.title}</td>
                      <td className="py-3.5 px-4 text-gray-500 font-medium">{cycle.scope?.type || "-"}</td>
                      <td className="py-3.5 px-4 text-gray-500 font-medium">{new Date(cycle.startDate).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-gray-500 font-medium">{new Date(cycle.endDate).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${CYCLE_STATUS_COLORS[cycle.status] || "bg-gray-100 text-gray-600"}`}>
                          {cycle.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-[10px] font-bold rounded-lg transition-all">
                          View
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
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-40">Previous</button>
            <span className="text-[10px] font-bold text-gray-400">Page {meta.page} of {meta.totalPages}</span>
            <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {/* New Audit Modal */}
      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSearchParams({})} className="absolute inset-0 bg-black" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-md relative z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Create Audit Cycle</h3>
                <button onClick={() => setSearchParams({})} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Title</label>
                  <input type="text" required placeholder="e.g. Q1 2026 Physical Audit" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea rows={2} placeholder="Optional description..." value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Scope Type</label>
                  <select value={formScopeType} onChange={(e) => setFormScopeType(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all">
                    <option value="organization">Organization-wide</option>
                    <option value="department">Department</option>
                    <option value="location">Location</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Start Date</label>
                    <input type="date" required value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">End Date</label>
                    <input type="date" required value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                  </div>
                </div>
                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setSearchParams({})} className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-all">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1">
                    {createMutation.isPending ? "Creating..." : "Create Audit"}
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
