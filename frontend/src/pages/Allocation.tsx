import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { allocationsApi, transfersApi, assetsApi, employeesApi, departmentsApi } from "../services/api";
import { useApp } from "../contexts/AppContext";
import {
  Plus, X, RotateCcw, Ban
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const ALLOC_STATUS_COLORS: Record<string, string> = {
  allocated: "bg-blue-100 text-blue-800",
  pending: "bg-amber-100 text-amber-800",
  returned: "bg-emerald-100 text-emerald-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
  transferred: "bg-purple-100 text-purple-800",
};

const TRANSFER_STATUS_COLORS: Record<string, string> = {
  requested: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-500",
};

export const Allocation: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { searchQuery } = useApp();

  const [activeTab, setActiveTab] = useState<"allocations" | "transfers">("allocations");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const isNewAllocModalOpen = searchParams.get("action") === "new-alloc";
  const isNewTransferModalOpen = searchParams.get("action") === "new-transfer";
  const returnModalId = searchParams.get("return");

  const { data: allocData, isLoading: allocLoading } = useQuery({
    queryKey: ["allocations", page, searchQuery, statusFilter],
    queryFn: () => allocationsApi.getAll({ page, limit: 20, search: searchQuery || undefined, status: statusFilter || undefined }),
  });

  const allocations = allocData?.data || [];
  const allocMeta = allocData?.meta;

  const { data: transferData, isLoading: transferLoading } = useQuery({
    queryKey: ["transfers", page, searchQuery, statusFilter],
    queryFn: () => transfersApi.getAll({ page, limit: 20, search: searchQuery || undefined, status: statusFilter || undefined }),
    enabled: activeTab === "transfers",
  });

  const transfers = transferData?.data || [];
  const transferMeta = transferData?.meta;

  const { data: assetsData } = useQuery({ queryKey: ["assets"], queryFn: () => assetsApi.getAll({ limit: 100 }) });
  const { data: employeesData } = useQuery({ queryKey: ["employees"], queryFn: () => employeesApi.getAll({ limit: 100 }) });
  const { data: departmentsData } = useQuery({ queryKey: ["departments"], queryFn: () => departmentsApi.getAll({ limit: 100 }) });

  const assets = assetsData?.data || [];
  const employees = employeesData?.data || [];
  const departments = departmentsData?.data || [];

  const [formAssetId, setFormAssetId] = useState("");
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formDepartmentId, setFormDepartmentId] = useState("");
  const [formReturnDate, setFormReturnDate] = useState("");
  const [formPurpose, setFormPurpose] = useState("");
  const [formRemarks, setFormRemarks] = useState("");

  const [returnCondition, setReturnCondition] = useState("good");
  const [returnDamageNotes, setReturnDamageNotes] = useState("");
  const [returnRemarks, setReturnRemarks] = useState("");

  const [transferAllocId, setTransferAllocId] = useState("");
  const [transferHolderId, setTransferHolderId] = useState("");
  const [transferReason, setTransferReason] = useState("");

  const createAllocMutation = useMutation({
    mutationFn: allocationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      resetAllocForm();
      setSearchParams({});
    },
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { conditionAtReturn: string; damageNotes?: string; remarks?: string } }) =>
      allocationsApi.returnAsset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setSearchParams({});
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) => allocationsApi.cancel(id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: transfersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      resetTransferForm();
      setSearchParams({});
    },
  });

  const approveTransferMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) => transfersApi.approve(id, remarks),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transfers"] }),
  });

  const rejectTransferMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => transfersApi.reject(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transfers"] }),
  });

  const completeTransferMutation = useMutation({
    mutationFn: transfersApi.complete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  function resetAllocForm() {
    setFormAssetId("");
    setFormEmployeeId("");
    setFormDepartmentId("");
    setFormReturnDate("");
    setFormPurpose("");
    setFormRemarks("");
  }

  function resetTransferForm() {
    setTransferAllocId("");
    setTransferHolderId("");
    setTransferReason("");
  }

  const handleAllocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAssetId || !formEmployeeId || !formDepartmentId) return;
    createAllocMutation.mutate({
      assetId: formAssetId,
      employeeId: formEmployeeId,
      departmentId: formDepartmentId,
      expectedReturnDate: formReturnDate || undefined,
      purpose: formPurpose || undefined,
      remarks: formRemarks || undefined,
    });
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalId) return;
    returnMutation.mutate({
      id: returnModalId,
      data: {
        conditionAtReturn: returnCondition,
        damageNotes: returnDamageNotes || undefined,
        remarks: returnRemarks || undefined,
      },
    });
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAllocId || !transferHolderId || !transferReason) return;
    createTransferMutation.mutate({
      allocationId: transferAllocId,
      requestedHolderId: transferHolderId,
      requestReason: transferReason,
    });
  };

  const filteredAllocations = allocations;
  const filteredTransfers = transfers;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => { setActiveTab("allocations"); setPage(1); setStatusFilter(""); }}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "allocations"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Allocations
            </button>
            <button
              onClick={() => { setActiveTab("transfers"); setPage(1); setStatusFilter(""); }}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "transfers"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Transfers
            </button>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary"
            >
              <option value="">All Statuses</option>
              {activeTab === "allocations" ? (
                <>
                  <option value="pending">Pending</option>
                  <option value="allocated">Allocated</option>
                  <option value="returned">Returned</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="transferred">Transferred</option>
                </>
              ) : (
                <>
                  <option value="requested">Requested</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </>
              )}
            </select>
          </div>
        </div>
        <button
          onClick={() => setSearchParams({ action: activeTab === "allocations" ? "new-alloc" : "new-transfer" })}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all uppercase tracking-wider"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{activeTab === "allocations" ? "New Allocation" : "New Transfer"}</span>
        </button>
      </div>

      {activeTab === "allocations" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Asset Allocation Ledger</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {allocMeta ? `Showing ${allocations.length} of ${allocMeta.total} allocations` : `${allocations.length} allocations`}
              </p>
            </div>
          </div>

          {allocLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    <th className="py-3 px-4">Allocation #</th>
                    <th className="py-3 px-4">Asset ID</th>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAllocations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 font-medium">No allocations found.</td>
                    </tr>
                  ) : (
                    filteredAllocations.map((alloc) => (
                      <tr key={alloc.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-primary font-mono">{alloc.allocationNumber}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-950 font-mono">{alloc.assetId}</td>
                        <td className="py-3.5 px-4 text-gray-500 font-medium font-mono">{alloc.employeeId}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${ALLOC_STATUS_COLORS[alloc.status] || "bg-gray-100 text-gray-600"}`}>
                            {alloc.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 font-medium">{new Date(alloc.allocationDate).toLocaleDateString()}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(alloc.status === "allocated" || alloc.status === "overdue") && (
                              <>
                                <button
                                  onClick={() => setSearchParams({ return: alloc.id })}
                                  className="p-1.5 hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded-lg transition-colors"
                                  title="Return Asset"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => cancelMutation.mutate({ id: alloc.id })}
                                  disabled={cancelMutation.isPending}
                                  className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg transition-colors"
                                  title="Cancel Allocation"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              </>
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

          {allocMeta && allocMeta.totalPages > 1 && (
            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-40">Previous</button>
              <span className="text-[10px] font-bold text-gray-400">Page {allocMeta.page} of {allocMeta.totalPages}</span>
              <button disabled={page >= allocMeta.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}

      {activeTab === "transfers" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Transfer Requests</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {transferMeta ? `Showing ${transfers.length} of ${transferMeta.total} transfers` : `${transfers.length} transfers`}
              </p>
            </div>
          </div>

          {transferLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    <th className="py-3 px-4">Transfer #</th>
                    <th className="py-3 px-4">Allocation ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Requested By</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">No transfers found.</td>
                    </tr>
                  ) : (
                    filteredTransfers.map((transfer) => (
                      <tr key={transfer.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-primary font-mono">{transfer.transferNumber}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-950 font-mono">{transfer.allocationId}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${TRANSFER_STATUS_COLORS[transfer.status] || "bg-gray-100 text-gray-600"}`}>
                            {transfer.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 font-medium font-mono">{transfer.requestedById}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {transfer.status === "requested" && (
                              <>
                                <button
                                  onClick={() => approveTransferMutation.mutate({ id: transfer.id })}
                                  disabled={approveTransferMutation.isPending}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg transition-all"
                                  title="Approve"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt("Rejection reason:");
                                    if (reason) rejectTransferMutation.mutate({ id: transfer.id, reason });
                                  }}
                                  disabled={rejectTransferMutation.isPending}
                                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold rounded-lg transition-all"
                                  title="Reject"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {transfer.status === "approved" && (
                              <button
                                onClick={() => completeTransferMutation.mutate(transfer.id)}
                                disabled={completeTransferMutation.isPending}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg transition-all"
                                title="Complete"
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

          {transferMeta && transferMeta.totalPages > 1 && (
            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-40">Previous</button>
              <span className="text-[10px] font-bold text-gray-400">Page {transferMeta.page} of {transferMeta.totalPages}</span>
              <button disabled={page >= transferMeta.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isNewAllocModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSearchParams({})} className="absolute inset-0 bg-black" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-md relative z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Create New Allocation</h3>
                <button onClick={() => setSearchParams({})} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAllocSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Select Asset</label>
                  <select required value={formAssetId} onChange={(e) => setFormAssetId(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all">
                    <option value="">Choose asset...</option>
                    {assets.filter((a) => a.status === "available").map((a) => (
                      <option key={a.id} value={a.id}>[{a.assetTag}] {a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Employee</label>
                    <select required value={formEmployeeId} onChange={(e) => setFormEmployeeId(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all">
                      <option value="">Select employee...</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Department</label>
                    <select required value={formDepartmentId} onChange={(e) => setFormDepartmentId(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all">
                      <option value="">Select department...</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Expected Return Date</label>
                  <input type="date" value={formReturnDate} onChange={(e) => setFormReturnDate(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Purpose</label>
                  <input type="text" placeholder="e.g. Project work, onboarding" value={formPurpose} onChange={(e) => setFormPurpose(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Remarks</label>
                  <input type="text" placeholder="Optional notes" value={formRemarks} onChange={(e) => setFormRemarks(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setSearchParams({})} className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-all">Cancel</button>
                  <button type="submit" disabled={createAllocMutation.isPending} className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1">
                    {createAllocMutation.isPending ? "Creating..." : "Create Allocation"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {returnModalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSearchParams({})} className="absolute inset-0 bg-black" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-md relative z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Return Asset</h3>
                <button onClick={() => setSearchParams({})} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleReturnSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Condition at Return</label>
                  <select value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all">
                    <option value="new">New</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Damage Notes</label>
                  <textarea rows={3} placeholder="Describe any damage (optional)" value={returnDamageNotes} onChange={(e) => setReturnDamageNotes(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Remarks</label>
                  <input type="text" placeholder="Optional notes" value={returnRemarks} onChange={(e) => setReturnRemarks(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setSearchParams({})} className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-all">Cancel</button>
                  <button type="submit" disabled={returnMutation.isPending} className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1">
                    {returnMutation.isPending ? "Processing..." : "Confirm Return"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNewTransferModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSearchParams({})} className="absolute inset-0 bg-black" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-md relative z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Request Asset Transfer</h3>
                <button onClick={() => setSearchParams({})} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Current Allocation</label>
                  <select required value={transferAllocId} onChange={(e) => setTransferAllocId(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all">
                    <option value="">Select allocation...</option>
                    {allocations.filter((a) => a.status === "allocated").map((a) => (
                      <option key={a.id} value={a.id}>[{a.allocationNumber}] Asset: {a.assetId}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">New Holder (Employee)</label>
                  <select required value={transferHolderId} onChange={(e) => setTransferHolderId(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all">
                    <option value="">Select employee...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Reason for Transfer</label>
                  <textarea required rows={3} placeholder="Provide justification for this transfer request" value={transferReason} onChange={(e) => setTransferReason(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setSearchParams({})} className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-all">Cancel</button>
                  <button type="submit" disabled={createTransferMutation.isPending} className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1">
                    {createTransferMutation.isPending ? "Submitting..." : "Submit Transfer Request"}
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
