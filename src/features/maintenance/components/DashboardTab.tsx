import React from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Package,
  Users,
  Wrench,
  ArrowRight,
} from "lucide-react";
import { motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { Link, useParams } from "react-router-dom";
import { cardShell } from "../../academics-shared/FeatureModalShell";
import { UserAvatar } from "../../../components/UserAvatar";
import type { StaffMember } from "../hooks/useMaintenanceQuery";

export type DashboardTabProps = {
  completedWOs: number;
  inProgressWOs: number;
  lowStockItems: number;
  maintenanceStaff: StaffMember[];
  openWOs: number;
  recentOrders: any[];
  setActiveTab: (tab: string) => void;
  setSelectedOrder: (order: any) => void;
  setWoStatusFilter: (v: string) => void;
  staffJobCounts: Record<string, number>;
};

function priorityDot(priority: string) {
  switch (priority) {
    case "URGENT":
      return "bg-rose-500";
    case "HIGH":
      return "bg-amber-500";
    case "LOW":
      return "bg-slate-400";
    default:
      return "bg-indigo-500";
  }
}

export function DashboardTab({
  completedWOs,
  inProgressWOs,
  lowStockItems,
  maintenanceStaff,
  openWOs,
  recentOrders,
  setActiveTab,
  setSelectedOrder,
  setWoStatusFilter,
  staffJobCounts,
}: DashboardTabProps) {
  const { slug } = useParams();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Open",
            value: openWOs,
            icon: AlertCircle,
            color: "bg-amber-50 text-amber-600",
            status: "OPEN",
          },
          {
            label: "In progress",
            value: inProgressWOs,
            icon: Clock,
            color: "bg-indigo-50 text-indigo-600",
            status: "IN_PROGRESS",
          },
          {
            label: "Completed",
            value: completedWOs,
            icon: CheckCircle2,
            color: "bg-emerald-50 text-emerald-600",
            status: "COMPLETED",
          },
          {
            label: "Low stock",
            value: lowStockItems,
            icon: Package,
            color: "bg-rose-50 text-rose-600",
            status: null,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              type="button"
              onClick={() => {
                if (stat.status) {
                  setActiveTab("WORK_ORDERS");
                  setWoStatusFilter(stat.status);
                } else {
                  setActiveTab("INVENTORY");
                }
              }}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3 text-left hover:border-slate-200 transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
                {stat.value}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className={`lg:col-span-3 ${cardShell} overflow-hidden`}>
          <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                Recent work orders
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Tap a ticket to review or update
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("WORK_ORDERS")}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
            >
              All tickets <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-14 px-6 text-center">
              <Wrench className="w-8 h-8 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">
                No work orders yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedOrder(order)}
                  className="w-full px-6 py-4 flex items-start justify-between gap-4 text-left hover:bg-slate-50/80 transition-colors"
                >
                  <div className="min-w-0 flex items-start gap-3">
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${priorityDot(
                        order.priority
                      )}`}
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">
                        {order.title}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                        {order.location || "No location"} ·{" "}
                        {order.assignee?.name || "Unassigned"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                        order.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700"
                          : order.status === "IN_PROGRESS"
                            ? "bg-indigo-50 text-indigo-700"
                            : order.status === "CANCELLED"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {order.status === "IN_PROGRESS"
                        ? "In progress"
                        : order.status === "CANCELLED"
                          ? "Cancelled"
                          : order.status}
                    </span>
                    <p className="text-xs text-slate-500 font-medium mt-1.5">
                      {order.createdAt
                        ? formatDistanceToNow(new Date(order.createdAt), {
                            addSuffix: true,
                          })
                        : "—"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`lg:col-span-2 ${cardShell} overflow-hidden`}>
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Maintenance staff
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              Active open / in-progress jobs
            </p>
          </div>

          {maintenanceStaff.length === 0 ? (
            <div className="py-14 px-6 text-center">
              <p className="text-slate-500 text-sm font-medium">
                No staff with a Maintenance role yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {maintenanceStaff.map((tech) => (
                <div
                  key={tech.id}
                  className="px-6 py-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      userId={tech.id}
                      name={tech.name}
                      photoUrl={tech.photoUrl}
                      size="sm"
                      rounded="2xl"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">
                        {tech.name}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        Maintenance
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-extrabold text-slate-900">
                    {staffJobCounts[tech.id] || 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[32px] border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-slate-50 p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              Need the full dispatch board?
            </p>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              Use Work Orders for advanced filters and bulk triage.
            </p>
          </div>
        </div>
        <Link
          to={slug ? `/${slug}/work-orders` : "#"}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors text-center"
        >
          Go to Work Orders
        </Link>
      </div>
    </motion.div>
  );
}
