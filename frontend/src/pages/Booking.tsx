import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingsApi, assetsApi, employeesApi } from "../services/api";
import { useApp } from "../contexts/AppContext";
import {
  Plus, X, Play, CheckCircle2, Ban
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-600",
  Upcoming: "bg-blue-100 text-blue-800",
  Ongoing: "bg-amber-100 text-amber-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-red-100 text-red-700",
  Expired: "bg-gray-100 text-gray-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-gray-100 text-gray-600",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-amber-100 text-amber-800",
  Urgent: "bg-red-100 text-red-800",
};

export const Booking: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { searchQuery } = useApp();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const isNewModalOpen = searchParams.get("action") === "new";
  const cancelModalId = searchParams.get("cancel");

  const { data: bookingData, isLoading } = useQuery({
    queryKey: ["bookings", page, searchQuery, statusFilter],
    queryFn: () => bookingsApi.getAll({ page, limit: 20, search: searchQuery || undefined, status: statusFilter || undefined }),
  });

  const bookings = bookingData?.data || [];
  const meta = bookingData?.meta;

  const { data: assetsData } = useQuery({ queryKey: ["assets"], queryFn: () => assetsApi.getAll({ limit: 100 }) });
  const { data: employeesData } = useQuery({ queryKey: ["employees"], queryFn: () => employeesApi.getAll({ limit: 100 }) });

  const assets = assetsData?.data || [];
  const employees = employeesData?.data || [];

  const [formTitle, setFormTitle] = useState("");
  const [formAsset, setFormAsset] = useState("");
  const [formEmployee, setFormEmployee] = useState("");
  const [formPurpose, setFormPurpose] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formPriority, setFormPriority] = useState("Medium");

  const [cancelReason, setCancelReason] = useState("");

  const createBookingMutation = useMutation({
    mutationFn: bookingsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      resetForm();
      setSearchParams({});
    },
  });

  const startBookingMutation = useMutation({
    mutationFn: bookingsApi.start,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const completeBookingMutation = useMutation({
    mutationFn: bookingsApi.complete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const cancelBookingMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => bookingsApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setSearchParams({});
    },
  });

  function resetForm() {
    setFormTitle("");
    setFormAsset("");
    setFormEmployee("");
    setFormPurpose("");
    setFormStart("");
    setFormEnd("");
    setFormPriority("Medium");
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formAsset || !formStart || !formEnd) return;
    createBookingMutation.mutate({
      asset: formAsset,
      title: formTitle,
      purpose: formPurpose,
      startDateTime: formStart,
      endDateTime: formEnd,
      priority: formPriority,
      employee: formEmployee || undefined,
    });
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalId || !cancelReason) return;
    cancelBookingMutation.mutate({ id: cancelModalId, reason: cancelReason });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => setSearchParams({ action: "new" })}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all uppercase tracking-wider"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Booking</span>
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Booking Schedule</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {meta ? `Showing ${bookings.length} of ${meta.total} bookings` : `${bookings.length} bookings`}
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
                  <th className="py-3 px-4">Booking #</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Asset</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400 font-medium">No bookings found.</td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-primary font-mono">{booking.bookingNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-950">{booking.title}</td>
                      <td className="py-3.5 px-4 text-gray-500 font-medium">{booking.assetName || booking.asset}</td>
                      <td className="py-3.5 px-4 text-gray-500 font-medium">{booking.employeeName || booking.employee || "-"}</td>
                      <td className="py-3.5 px-4 text-gray-500 font-medium">
                        <div className="flex flex-col">
                          <span className="font-mono">{new Date(booking.startDateTime).toLocaleDateString()}</span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(booking.startDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(booking.endDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${PRIORITY_COLORS[booking.priority] || "bg-gray-100 text-gray-600"}`}>
                          {booking.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${STATUS_COLORS[booking.status] || "bg-gray-100 text-gray-600"}`}>
                          {booking.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {booking.status === "Upcoming" && (
                            <button
                              onClick={() => startBookingMutation.mutate(booking.id)}
                              disabled={startBookingMutation.isPending}
                              className="p-1.5 hover:bg-amber-50 text-amber-600 hover:text-amber-700 rounded-lg transition-colors"
                              title="Start Booking"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          {booking.status === "Ongoing" && (
                            <button
                              onClick={() => completeBookingMutation.mutate(booking.id)}
                              disabled={completeBookingMutation.isPending}
                              className="p-1.5 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 rounded-lg transition-colors"
                              title="Complete Booking"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {(booking.status === "Draft" || booking.status === "Upcoming") && (
                            <button
                              onClick={() => { setCancelReason(""); setSearchParams({ cancel: booking.id }); }}
                              className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg transition-colors"
                              title="Cancel Booking"
                            >
                              <Ban className="w-4 h-4" />
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

      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSearchParams({})} className="absolute inset-0 bg-black" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-md relative z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Create New Booking</h3>
                <button onClick={() => setSearchParams({})} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Booking Title</label>
                  <input type="text" required placeholder="e.g. Q3 Strategy Review" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Select Asset</label>
                    <select required value={formAsset} onChange={(e) => setFormAsset(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all">
                      <option value="">Choose asset...</option>
                      {assets.filter((a) => a.status === "available" || a.sharedResource).map((a) => (
                        <option key={a.id} value={a.id}>[{a.assetTag}] {a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Employee</label>
                    <select value={formEmployee} onChange={(e) => setFormEmployee(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all">
                      <option value="">Select employee...</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Purpose</label>
                  <input type="text" placeholder="e.g. Team sync, workshop" value={formPurpose} onChange={(e) => setFormPurpose(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Start Date & Time</label>
                    <input type="datetime-local" required value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">End Date & Time</label>
                    <input type="datetime-local" required value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Priority Level</label>
                  <div className="flex gap-2">
                    {["Low", "Medium", "High", "Urgent"].map((prio) => (
                      <button
                        key={prio}
                        type="button"
                        onClick={() => setFormPriority(prio)}
                        className={`flex-1 py-2 text-xs font-bold border rounded-lg transition-all ${
                          formPriority === prio
                            ? "bg-primary border-primary text-white"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {prio}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setSearchParams({})} className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-all">Cancel</button>
                  <button type="submit" disabled={createBookingMutation.isPending} className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1">
                    {createBookingMutation.isPending ? "Reserving..." : "Confirm Booking"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cancelModalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSearchParams({})} className="absolute inset-0 bg-black" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-md relative z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Cancel Booking</h3>
                <button onClick={() => setSearchParams({})} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCancelSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Cancellation Reason</label>
                  <textarea required rows={3} placeholder="Provide reason for cancellation" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all" />
                </div>
                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setSearchParams({})} className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-all">Back</button>
                  <button type="submit" disabled={cancelBookingMutation.isPending} className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1">
                    {cancelBookingMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
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
