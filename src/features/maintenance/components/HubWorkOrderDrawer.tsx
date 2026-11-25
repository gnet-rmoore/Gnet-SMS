import React from "react";
import {
  MapPin,
  User,
  CheckCircle2,
  Clock,
  Activity,
  X,
  Ban,
  CalendarClock,
  ClipboardList,
  ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "motion/react";
import type { StaffMember } from "../hooks/useMaintenanceQuery";
import { UserAvatar } from "../../../components/UserAvatar";

export type HubWorkOrderDrawerProps = {
  canManage: boolean;
  handleAssignTechnician: (orderId: string, technicianId: string) => void;
  handleUpdateStatus: (id: string, status: string) => void;
  selectedOrder: any;
  setSelectedOrder: (order: any | null) => void;
  technicians: StaffMember[];
  updatingId: string | null;
};

const STATUS_OPTS = [
  { key: "OPEN", label: "Open", icon: Clock },
  { key: "IN_PROGRESS", label: "In progress", icon: Activity },
  { key: "ON_HOLD", label: "On hold", icon: Clock },
  { key: "COMPLETED", label: "Completed", icon: CheckCircle2 },
  { key: "CANCELLED", label: "Cancelled", icon: Ban },
] as const;

function priorityClass(priority: string) {
  switch (priority) {
    case "URGENT":
      return "bg-rose-500/20 text-rose-200 border-rose-400/30";
    case "HIGH":
      return "bg-amber-500/20 text-amber-200 border-amber-400/30";
    case "LOW":
      return "bg-white/10 text-slate-300 border-white/15";
    default:
      return "bg-indigo-500/25 text-indigo-200 border-indigo-400/30";
  }
}

export function HubWorkOrderDrawer({
  canManage,
  handleAssignTechnician,
  handleUpdateStatus,
  selectedOrder,
  setSelectedOrder,
  technicians,
  updatingId,
}: HubWorkOrderDrawerProps) {
  const busy = updatingId === selectedOrder.id;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => setSelectedOrder(null)}
        className="absolute inset-0 bg-slate-900/40"
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.2 }}
        className="relative bg-slate-50 w-full max-w-md h-full shadow-[0_4px_20px_rgb(0,0,0,0.08)] flex flex-col border-l border-slate-100"
      >
        <div className="p-6 bg-gradient-to-br from-slate-950 to-slate-900 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <span
              className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${priorityClass(
                selectedOrder.priority
              )}`}
            >
              {selectedOrder.priority}
            </span>
            <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-white/15 bg-white/10 text-slate-200 ml-1">
              {String(selectedOrder.impact || "MEDIUM").replace(/_/g, " ")} impact
            </span>
            <h2 className="text-xl font-extrabold tracking-tight mt-2 leading-snug">
              {selectedOrder.title}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {String(selectedOrder.requestType || "REPAIR").replace(/_/g, " ")}
            </p>
            <p className="text-xs text-slate-500 font-mono mt-1">
              WO-{String(selectedOrder.id).slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedOrder(null)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Status
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STATUS_OPTS.map((opt) => {
                const Icon = opt.icon;
                const active = selectedOrder.status === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={!canManage || busy || active}
                    onClick={() => handleUpdateStatus(selectedOrder.id, opt.key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 ${
                      active
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Description
              </p>
              <p className="text-sm text-slate-700 font-medium mt-1.5 leading-relaxed">
                {selectedOrder.description}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Location
                </p>
                <p className="text-sm font-bold text-slate-800 mt-1">
                  {[selectedOrder.building, selectedOrder.room, selectedOrder.location]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Created
                </p>
                <p className="text-sm font-bold text-slate-800 mt-1">
                  {selectedOrder.createdAt
                    ? format(new Date(selectedOrder.createdAt), "MMM d, yyyy")
                    : "—"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <CalendarClock className="w-3 h-3" /> Target completion
                </p>
                <p className="text-sm font-bold text-slate-800 mt-1">
                  {selectedOrder.dueAt
                    ? format(new Date(selectedOrder.dueAt), "MMM d, yyyy h:mm a")
                    : "No target date"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Estimated cost
                </p>
                <p className="text-sm font-bold text-slate-800 mt-1">
                  {selectedOrder.estimatedCost == null
                    ? "Not estimated"
                    : Number(selectedOrder.estimatedCost).toLocaleString()}
                </p>
              </div>
            </div>
            {selectedOrder.asset && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <ClipboardList className="w-3 h-3" /> Related asset
                </p>
                <p className="text-sm font-bold text-slate-800 mt-1">
                  {selectedOrder.asset.name} · {selectedOrder.asset.assetTag || selectedOrder.asset.serialNumber || "No tag"}
                </p>
              </div>
            )}
            {selectedOrder.safetyRelated && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Safety-related work
                </p>
                <p className="text-sm text-rose-800 mt-1">{selectedOrder.safetyNotes || "No hazard notes provided."}</p>
              </div>
            )}
            {selectedOrder.accessNotes && (
              <p className="text-sm text-slate-600 border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-800">Access instructions: </span>
                {selectedOrder.accessNotes}
              </p>
            )}
          </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> People
            </p>
            <div className="flex justify-between text-sm items-center gap-3">
              <span className="text-slate-500">Requested by</span>
              <span className="font-bold text-slate-900 flex items-center gap-2 min-w-0">
                <UserAvatar
                  userId={selectedOrder.requester?.id || selectedOrder.requestedBy}
                  name={selectedOrder.requester?.name}
                  photoUrl={selectedOrder.requester?.photoUrl}
                  size="xs"
                  rounded="2xl"
                />
                <span className="truncate">{selectedOrder.requester?.name || "Staff"}</span>
              </span>
            </div>
            <div className="flex justify-between text-sm items-center gap-3">
              <span className="text-slate-500 shrink-0">Assignee</span>
              {canManage && selectedOrder.status !== "COMPLETED" && selectedOrder.status !== "CANCELLED" ? (
                <select
                  value={selectedOrder.assignedTo || ""}
                  disabled={busy}
                  onChange={(e) =>
                    handleAssignTechnician(selectedOrder.id, e.target.value)
                  }
                  className="flex-1 max-w-[180px] bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-bold text-slate-900 flex items-center gap-2 min-w-0">
                  {selectedOrder.assignee ? (
                    <>
                      <UserAvatar
                        userId={selectedOrder.assignee.id}
                        name={selectedOrder.assignee.name}
                        photoUrl={selectedOrder.assignee.photoUrl}
                        size="xs"
                        rounded="2xl"
                      />
                      <span className="truncate">{selectedOrder.assignee.name}</span>
                    </>
                  ) : (
                    "Unassigned"
                  )}
                </span>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Work-order activity
              </p>
              {selectedOrder.events?.length ? (
                <ol className="space-y-3">
                  {selectedOrder.events.map((event: any) => (
                    <li key={event.id} className="border-l-2 border-indigo-200 pl-3">
                      <p className="text-sm font-bold text-slate-800">{event.summary}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {event.createdAt
                          ? format(new Date(event.createdAt), "MMM d, yyyy h:mm a")
                          : "—"}{" "}
                        · {event.actorName || event.actorId}
                      </p>
                      {(event.oldValue || event.newValue) && (
                        <p className="text-xs text-slate-600 mt-0.5 break-words">
                          {event.oldValue || "—"} → {event.newValue || "—"}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-slate-500">No work-order history recorded.</p>
              )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
