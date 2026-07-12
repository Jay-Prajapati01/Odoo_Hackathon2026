import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { maintenanceApi, assetsApi, departmentsApi, employeesApi } from "../services/api";
import { useApp } from "../contexts/AppContext";
import {
  Wrench, Plus, X, Clock, CheckCircle2, XCircle, UserCog, Play, Ban
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  technician_assigned: "bg-purple-100 text-purple-800",
  in_progress: "bg-orange-100 text-orange-800",
  resolved: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-gray-100 text-gray-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-gray-100 text-gray-500",
};

export const Maintenance: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { searchQuery } = useApp();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const isNewModalOpen = searchParams.get("action") === "new";
  const assignModalId = searchParams.get("assign");
  const completeModalId = searchParams.get("complete");
  const approveModalId = searchParams.get("approve");
  const rejectModalId = searchParams.get("reject");
  const cancelModalId = searchParams.get("cancel");

  const { data: ticketData, isLoading } = useQuery({
    queryKey: ["maintenance-tickets", page, searchQuery, statusFilter],
    queryFn: () => maintenanceApi.getAll({ page, limit: 20, search: searchQuery || undefined, status: statusFilter || undefined }),
  });

  const tickets = ticketData?.data || [];
  const meta = ticketData?.meta;

  const { data: assetsData } = useQuery({ queryKey: ["assets"], queryFn: () => assetsApi.getAll({ limit: 100 }) });
  const { data: departmentsData } = useQuery({ queryKey: ["departments"], queryFn: () => departmentsApi.getAll({ limit: 100 }) });
  const { data: employeesData } = useQuery({ queryKey: ["employees"], queryFn: () => employeesApi.getAll({ limit: 100 }) });

  const assets = assetsData?.data || [];
  const departments = departmentsData?.data || [];
  const employees = employeesData?.data || [];

  // Form states
  const [formAssetId, setFormAssetId] = useState("");
  const [formDeptId, setFormDeptId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPriority, setFormPriority] = useState<"low" | "medium" | "high" | "critical">("medium");

  // Assign tech form
  const [assignTechId, setAssignTechId] = useState("");
  const [assignDuration, setAssignDuration] = useState("");

  // Complete form
  const [completeSummary, setCompleteSummary] = useState("");
  const [completeCost, setCompleteCost] = useState("");

  // Approve form
  const [approveCost, setApproveCost] = useState("");
  const [approveDuration, setApproveDuration] = useState("");

  // Reject form
  const [rejectReason, setRejectReason] = useState("");

  // Cancel form
  const [cancelRemarks, setCancelRemarks] = useState("");

  const createMutation = useMutation({
    mutationFn: maintenanceApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      resetForm();
      setSearchParams({});
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { estimatedCost?: number; estimatedDuration?: string; remarks?: string } }) =>
      maintenanceApi.approve(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      setSearchParams({});
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => maintenanceApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      setSearchParams({});
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { technicianId: string; estimatedDuration?: string } }) =>
      maintenanceApi.assignTechnician(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      setSearchParams({});
    },
  });

  const startRepairMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => maintenanceApi.startRepair(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] }),
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { resolutionSummary: string; actualCost?: number } }) =>
      maintenanceApi.completeRepair(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      setSearchParams({});
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) => maintenanceApi.cancel(id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      setSearchParams({});
    },
  });

  function resetForm() {
    setFormAssetId("");
    setFormDeptId("");
    setFormTitle("");
    setFormDesc("");
    setFormPriority("medium");
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAssetId || !formDeptId || !formTitle) return;
    createMutation.mutate({
      assetId: formAssetId,
      departmentId: formDeptId,
      issueTitle: formTitle,
      issueDescription: formDesc,
      priority: formPriority,
    });
  };

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveModalId) return;
    approveMutation.mutate({
      id: approveModalId,
      data: {
        estimatedCost: approveCost ? parseFloat(approveCost) : undefined,
        estimatedDuration: approveDuration || undefined,
      },
    });
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalId || !rejectReason) return;
    rejectMutation.mutate({ id: rejectModalId, reason: rejectReason });
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalId || !assignTechId) return;
    assignMutation.mutate({
      id: assignModalId,
      data: { technicianId: assignTechId, estimatedDuration: assignDuration || undefined },
    });
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModalId || !completeSummary) return;
    completeMutation.mutate({
      id: completeModalId,
      data: {
        resolutionSummary: completeSummary,
        actualCost: completeCost ? parseFloat(completeCost) : undefined,
      },
    });
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalId) return;
    cancelMutation.mutate({ id: cancelModalId, remarks: cancelRemarks || undefined });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Maintenance Tickets</h3>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="technician_assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => setSearchParams({ action: "new" })}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all uppercase tracking-wider"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Ticket</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Maintenance Ledger</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {meta ? `Showing ${tickets.length} of ${meta.total} tickets` : `${tickets.length} tickets`}
            </p>
          </div>
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
                  <th className="py-3 px-4">Ticket #</th>
                  <th className="py-3 px-4">Issue</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Requested</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 font-medium">No tickets found.</td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-primary font-mono">{ticket.requestNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-950">{ticket.issueTitle}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${PRIORITY_COLORS[ticket.priority] || "bg-gray-100 text-gray-600"}`}>
                          {ticket.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${STATUS_COLORS[ticket.status] || "bg-gray-100 text-gray-600"}`}>
                          {ticket.status.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 font-medium">{new Date(ticket.requestedDate).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {ticket.status === "pending" && (
                            <>
                              <button
                                onClick={() => setSearchParams({ approve: ticket.id })}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setSearchParams({ reject: ticket.id })}
                                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold rounded-lg transition-all"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => { setCancelRemarks(""); setSearchParams({ cancel: ticket.id }); }}
                                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                                title="Cancel"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {ticket.status === "approved" && (
                            <>
                              <button
                                onClick={() => { setAssignTechId(""); setAssignDuration(""); setSearchParams({ assign: ticket.id }); }}
                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold rounded-lg transition-all"
                              >
                                Assign Tech
                              </button>
                              <button
                                onClick={() => { setCancelRemarks(""); setSearchParams({ cancel: ticket.id }); }}
                                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                                title="Cancel"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {ticket.status === "technician_assigned" && (
                            <button
                              onClick={() => startRepairMutation.mutate({ id: ticket.id })}
                              disabled={startRepairMutation.isPending}
                              className="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-[10px] font-bold rounded-lg transition-all"
                            >
                              Start Repair
                            </button>
                          )}
                          {ticket.status === "in_progress" && (
                            <button
                              onClick={() => { setCompleteSummary(""); setCompleteCost(""); setSearchParams({ complete: ticket.id }); }}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg transition-all"
                            >
                              Complete
                            </button>
                          )}
                        </div>
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

      {/* New Ticket Modal */}
      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSearchParams({})} className="absolute inset-0 bg-black" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-md relative z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Raise Maintenance Ticket</h3>
                <button onClick={() => setSearchParams({})} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Asset</label>
                  <select required value={formAssetId} onChange={(e) => setFormAssetId(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all">
                    <option value="">Select asset...</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>[{a.assetTag}] {a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Department</label>
                  <select required value={formDeptId} onChange={(e) => setFormDeptId(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all">
                    <option value="">Select department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Issue Title</label>
                  <input type="text" required placeholder="e.g. Display failure, battery swollen" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea required rows={3} placeholder="Describe the issue in detail..." value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Priority</label>
                  <select value={formPriority} onChange={(e) => setFormPriority(e.target.value as any)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setSearchParams({})} className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-all">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1">
                    {createMutation.isPending ? "Submitting..." : "Create Ticket"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Approve Modal */}
      <AnimatePresence>
        {approveModalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSearchParams({})} className="absolute inset-0 bg-black" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-sm relative z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Approve Ticket</h3>
                <button onClick={() => setSearchParams({})} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleApproveSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Estimated Cost</label>
                  <input type="number" step="0.01" placeholder="Optional" value={approveCost} onChange={(e) => setApproveCost(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Estimated Duration</label>
                  <input type="text" placeholder="e.g. 2 hours, 1 day" value={approveDuration} onChange={(e) => setApproveDuration(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setSearchParams({})} className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-all">Cancel</button>
                  <button type="submit" disabled={approveMutation.isPending} className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1">
                    {approveMutation.isPending ? "Approving..." : "Approve"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSearchParams({})} className="absolute inset-0 bg-black" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-sm relative z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Reject Ticket</h3>
                <button onClick={() => setSearchParams({})} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Rejection Reason</label>
                  <textarea required rows={3} placeholder="Provide reason for rejection..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setSearchParams({})} className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-all">Cancel</button>
                  <button type="submit" disabled={rejectMutation.isPending} className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1">
                    {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Technician Modal */}
      <AnimatePresence>
        {assignModalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSearchParams({})} className="absolute inset-0 bg-black" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-sm relative z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Assign Technician</h3>
                <button onClick={() => setSearchParams({})} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Technician</label>
                  <select required value={assignTechId} onChange={(e) => setAssignTechId(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all">
                    <option value="">Select technician...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.fullName} - {emp.designation}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Estimated Duration</label>
                  <input type="text" placeholder="e.g. 2 hours, 1 day" value={assignDuration} onChange={(e) => setAssignDuration(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setSearchParams({})} className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-all">Cancel</button>
                  <button type="submit" disabled={assignMutation.isPending} className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1">
                    {assignMutation.isPending ? "Assigning..." : "Assign Technician"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Complete Modal */}
      <AnimatePresence>
        {completeModalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSearchParams({})} className="absolute inset-0 bg-black" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-sm relative z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Complete Repair</h3>
                <button onClick={() => setSearchParams({})} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCompleteSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Resolution Summary</label>
                  <textarea required rows={3} placeholder="Describe how the issue was resolved..." value={completeSummary} onChange={(e) => setCompleteSummary(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Actual Cost</label>
                  <input type="number" step="0.01" placeholder="Optional" value={completeCost} onChange={(e) => setCompleteCost(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setSearchParams({})} className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-all">Cancel</button>
                  <button type="submit" disabled={completeMutation.isPending} className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1">
                    {completeMutation.isPending ? "Completing..." : "Mark Complete"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Modal */}
      <AnimatePresence>
        {cancelModalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSearchParams({})} className="absolute inset-0 bg-black" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-sm relative z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Cancel Ticket</h3>
                <button onClick={() => setSearchParams({})} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCancelSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Remarks</label>
                  <textarea rows={3} placeholder="Optional cancellation reason..." value={cancelRemarks} onChange={(e) => setCancelRemarks(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setSearchParams({})} className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-all">Back</button>
                  <button type="submit" disabled={cancelMutation.isPending} className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1">
                    {cancelMutation.isPending ? "Cancelling..." : "Cancel Ticket"}
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
