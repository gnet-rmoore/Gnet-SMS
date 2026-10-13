import React from "react";
import {
  Wrench,
  Search,
  MapPin,
  CheckCircle2,
  Activity,
  ChevronRight,
} from "lucide-react";
import { motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import {
  cardShell,
  childCard,
} from "../../academics-shared/FeatureModalShell";
import type { StaffMember } from "../hooks/useMaintenanceQuery";

export type WorkOrdersTabProps = {
  canManage: boolean;
  filteredWorkOrders: any[];
  handleAssignTechnician: (orderId: string, technicianId: string) => void;
  handleUpdateStatus: (id: string, status: string) => void;
  loading: boolean;
  setSelectedOrder: (order: any) => void;
  setWoPriorityFilter: (v: string) => void;
  setWoSearch: (v: string) => void;
  setWoStatusFilter: (v: string) => void;
  technicians: StaffMember[];
  updatingId: string | null;
  woPriorityFilter: string;
  woSearch: string;
  woStatusFilter: string;
};

function priorityClass(priority: string) {
  switch (priority) {
    case "URGENT":
      return "bg-rose-50 text-rose-700";
    case "HIGH":
      return "bg-amber-50 text-amber-700";
    case "LOW":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-indigo-50 text-indigo-700";
  }
}

export function WorkOrdersTab({
  canManage,
  filteredWorkOrders,
  handleAssignTechnician,
  handleUpdateStatus,
  loading,
  setSelectedOrder,
  setWoPriorityFilter,
  setWoSearch,
  setWoStatusFilter,
  technicians,
  updatingId,
  woPriorityFilter,
  woSearch,
  woStatusFilter,
}: WorkOrdersTabProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className={`${cardShell} p-5 sm:p-6 space-y-4`}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={woSearch}
            onChange={(e) => setWoSearch(e.target.value)}
            placeholder="Search by title, description, or location…"
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
          />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {["ALL", "OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setWoStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                    woStatusFilter === status
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {status === "IN_PROGRESS"
                    ? "In progress"
                    : status === "ALL"
                      ? "All"
                      : status === "CANCELLED"
                        ? "Cancelled"
                        : status}
                </button>
              )
            )}
          </div>

          <select
            value={woPriorityFilter}
            onChange={(e) => setWoPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      <div className={`${cardShell} overflow-hidden`}>
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            Work orders
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            {filteredWorkOrders.length} matching · click a row for details
          </p>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-20 ${childCard} animate-pulse`} />
            ))}
          </div>
        ) : filteredWorkOrders.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <Wrench className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">
              No work orders match these filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredWorkOrders.map((order) => {
              const busy = updatingId === order.id;
              const closed =
                order.status === "COMPLETED" || order.status === "CANCELLED";
              return (
                <div key={order.id} className="p-5 sm:p-6 space-y-4">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="w-full flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-left group"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold tracking-tight text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                          {order.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider ${priorityClass(
                            order.priority
                          )}`}
                        >
                          {order.priority}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 font-medium line-clamp-2">
                        {order.description}
                      </p>
                      <p className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {order.location || "No location"}
                        </span>
                        <span>
                          {order.createdAt
                            ? formatDistanceToNow(new Date(order.createdAt), {
                                addSuffix: true,
                              })
                            : ""}
                        </span>
                        <span>
                          {order.assignee?.name
                            ? `Assigned: ${order.assignee.name}`
                            : "Unassigned"}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start shrink-0">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          order.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : order.status === "IN_PROGRESS"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              : order.status === "CANCELLED"
                                ? "bg-slate-100 text-slate-500 border border-slate-200"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}
                      >
                        {order.status === "IN_PROGRESS"
                          ? "In progress"
                          : order.status === "CANCELLED"
                            ? "Cancelled"
                            : order.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                    </div>
                  </button>

                  {canManage && !closed && (
                    <div
                      className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {order.status !== "IN_PROGRESS" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              handleUpdateStatus(order.id, "IN_PROGRESS")
                            }
                            className="px-3 py-2 rounded-xl text-xs font-bold border border-indigo-100 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            Start
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            handleUpdateStatus(order.id, "COMPLETED")
                          }
                          className="px-3 py-2 rounded-xl text-xs font-bold border border-emerald-100 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Complete
                        </button>
                      </div>

                      <select
                        value={order.assignedTo || ""}
                        disabled={busy}
                        onChange={(e) =>
                          handleAssignTechnician(order.id, e.target.value)
                        }
                        className="sm:ml-auto bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <option value="">Assign staff…</option>
                        {technicians.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
