import React from "react";
import { useTranslation } from "react-i18next";
import {
  MapPin,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  X,
  Activity,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "motion/react";
import { fieldInput, fieldLabel } from "../../academics-shared/FeatureModalShell";
import type { StaffMember, WorkOrder } from "../types";
import { UserAvatar } from "../../../components/UserAvatar";
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  formatRole,
  priorityBadgeOnDark,
  priorityLabel,
  shortId,
  statusLabel,
} from "../utils";

export type WorkOrderDetailPanelProps = {
  assignablePersonnel: StaffMember[];
  canManage: boolean;
  handleAssignTechnician: (orderId: string, assigneeId: string) => void;
  handleUpdatePriority: (orderId: string, priority: string) => void;
  handleUpdateStatus: (orderId: string, status: string) => void;
  selectedOrder: WorkOrder;
  setSelectedOrder: (order: WorkOrder | null) => void;
  updatingId: string | null;
};

export function WorkOrderDetailPanel({
  assignablePersonnel,
  canManage,
  handleAssignTechnician,
  handleUpdatePriority,
  handleUpdateStatus,
  selectedOrder,
  setSelectedOrder,
  updatingId,
}: WorkOrderDetailPanelProps) {
  const { t } = useTranslation(["pages", "common"]);
  const busy = updatingId === selectedOrder.id;
  const isComplete = selectedOrder.status === "COMPLETED";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end">
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
        className="relative bg-slate-50 w-full max-w-lg h-full shadow-[0_4px_20px_rgb(0,0,0,0.08)] flex flex-col border-l border-slate-100"
      >
        <div className="p-6 bg-gradient-to-br from-slate-950 to-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${priorityBadgeOnDark(
                  selectedOrder.priority
                )}`}
              >
                {priorityLabel(selectedOrder.priority, t)}
              </span>
              <span className="text-xs font-mono font-bold text-slate-400 tracking-wider">
                #{shortId(selectedOrder.id)}
              </span>
            </div>
            <h2 className="text-lg font-extrabold tracking-tight mt-2 leading-snug">
              {selectedOrder.title}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {selectedOrder.createdAt
                ? format(new Date(selectedOrder.createdAt), "PPP · p")
                : t("workOrders.detail.justNow")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedOrder(null)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label={t("common:close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("workOrders.detail.status")}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const isCurrent = selectedOrder.status === opt.key;
                const icon =
                  opt.key === "OPEN" ? (
                    <Clock className="w-4 h-4" />
                  ) : opt.key === "IN_PROGRESS" ? (
                    <Activity className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  );
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() =>
                      canManage &&
                      handleUpdateStatus(selectedOrder.id, opt.key)
                    }
                    disabled={!canManage || busy || isCurrent}
                    className={`px-3 py-3.5 rounded-2xl border text-center transition-colors flex flex-col items-center justify-center gap-1.5 ${
                      isCurrent
                        ? opt.key === "COMPLETED"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : opt.key === "IN_PROGRESS"
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-60"
                    }`}
                  >
                    {icon}
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {statusLabel(opt.key, t)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {canManage && (
            <div className="space-y-2">
              <label className={fieldLabel}>{t("workOrders.detail.updatePriority")}</label>
              <select
                value={selectedOrder.priority}
                onChange={(e) =>
                  handleUpdatePriority(selectedOrder.id, e.target.value)
                }
                disabled={busy}
                className={`${fieldInput} disabled:opacity-50`}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {priorityLabel(p.key, t)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1.5">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("workOrders.detail.description")}
            </h4>
            <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
              {selectedOrder.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("workOrders.detail.location")}
              </p>
              <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-1.5">
                <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="truncate">
                  {selectedOrder.location || "—"}
                </span>
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("workOrders.detail.requestedBy")}
              </p>
              <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-1.5">
                <User className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="truncate">
                  {selectedOrder.requester?.name || t("workOrders.staffFallback")}
                </span>
              </p>
              {selectedOrder.requester?.role && (
                <p className="text-xs text-slate-500 font-bold mt-1 truncate">
                  {formatRole(selectedOrder.requester.role)}
                </p>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("workOrders.detail.assignee")}
              </h4>
            </div>

            {canManage ? (
              <select
                value={selectedOrder.assignedTo || ""}
                onChange={(e) =>
                  handleAssignTechnician(selectedOrder.id, e.target.value)
                }
                disabled={busy || isComplete}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <option value="">{t("workOrders.detail.unassigned")}</option>
                {assignablePersonnel.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} · {formatRole(person.role)}
                  </option>
                ))}
              </select>
            ) : null}

            {selectedOrder.assignee ? (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3">
                <UserAvatar
                  userId={selectedOrder.assignee.id}
                  name={selectedOrder.assignee.name}
                  photoUrl={selectedOrder.assignee.photoUrl}
                  size="sm"
                  rounded="2xl"
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {selectedOrder.assignee.name}
                  </p>
                  <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mt-0.5">
                    {formatRole(selectedOrder.assignee.role)} ·{" "}
                    {statusLabel(selectedOrder.status, t)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3 text-amber-800">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm font-medium leading-snug">
                  {canManage
                    ? t("workOrders.detail.noAssigneeYet") + t("workOrders.detail.chooseStaffAbove")
                    : t("workOrders.detail.noAssigneeHint")}
                </p>
              </div>
            )}

            {canManage && assignablePersonnel.length === 0 && (
              <p className="text-xs text-slate-500 font-medium">
                {t("workOrders.detail.noMaintenanceStaff")}
              </p>
            )}
          </div>

          {selectedOrder.updatedAt && (
            <p className="text-xs text-slate-500 font-medium text-center">
              {t("workOrders.detail.lastUpdated")}{" "}
              {format(new Date(selectedOrder.updatedAt), "MMM d, yyyy · p")}
            </p>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100 shrink-0 space-y-2">
          {canManage && !isComplete && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(selectedOrder.id, "COMPLETED")}
              disabled={busy}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t("workOrders.detail.markCompleted")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setSelectedOrder(null)}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
          >
            {t("common:close")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
