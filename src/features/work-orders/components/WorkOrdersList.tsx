import React from "react";
import { useTranslation } from "react-i18next";
import {
  Wrench,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle2,
  MapPin,
  User,
  Calendar,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import {
  cardShell,
  childCard,
} from "../../academics-shared/FeatureModalShell";
import type { WorkOrder } from "../types";
import { priorityBadgeClass, priorityLabel, shortId, statusBadgeClass, statusLabel } from "../utils";
import { UserAvatar } from "../../../components/UserAvatar";
import { ListFilterBar } from "../../../components/ui";
import type { FilterFieldDef, UseListFiltersResult } from "../../list-filters";

export type WorkOrdersListProps = {
  filteredOrders: WorkOrder[];
  hasActiveFilters: boolean;
  loading: boolean;
  onClearFilters: () => void;
  onSelect: (order: WorkOrder) => void;
  onStatFilter: (kind: "ALL" | "OPEN" | "IN_PROGRESS" | "HIGH" | "COMPLETED" | "UNASSIGNED") => void;
  priorityFilter: string;
  selectedId: string | null;
  setSortBy: (v: "NEWEST" | "PRIORITY") => void;
  sortBy: "NEWEST" | "PRIORITY";
  stats: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    highSeverity: number;
    unassigned: number;
  };
  statusFilter: string;
  totalOrders: number;
  unassignedOnly: boolean;
  filterFields: FilterFieldDef[];
  filters: UseListFiltersResult;
  savedViewsScope?: string;
};

export function WorkOrdersList({
  filteredOrders,
  hasActiveFilters,
  loading,
  onClearFilters,
  onSelect,
  onStatFilter,
  priorityFilter,
  selectedId,
  setSortBy,
  sortBy,
  stats,
  statusFilter,
  totalOrders,
  unassignedOnly,
  filterFields,
  filters,
  savedViewsScope,
}: WorkOrdersListProps) {
  const { t } = useTranslation(["pages", "common"]);
  const statCards = [
    {
      key: "ALL" as const,
      label: t("workOrders.list.total"),
      value: stats.total,
      icon: Wrench,
      tone: "bg-slate-100 text-slate-600",
      active: statusFilter === "ALL" && priorityFilter === "ALL" && !unassignedOnly,
    },
    {
      key: "OPEN" as const,
      label: t("workOrders.list.open"),
      value: stats.open,
      icon: Clock,
      tone: "bg-amber-50 text-amber-600",
      active: statusFilter === "OPEN",
    },
    {
      key: "IN_PROGRESS" as const,
      label: t("workOrders.list.inProgress"),
      value: stats.inProgress,
      icon: Activity,
      tone: "bg-indigo-50 text-indigo-600",
      active: statusFilter === "IN_PROGRESS",
    },
    {
      key: "HIGH" as const,
      label: t("workOrders.list.highUrgent"),
      value: stats.highSeverity,
      icon: AlertCircle,
      tone: "bg-rose-50 text-rose-600",
      active: priorityFilter === "HIGH_OR_URGENT",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => onStatFilter(card.key)}
              className={`text-left p-6 rounded-2xl border transition-colors space-y-3 ${
                card.active
                  ? "bg-white border-indigo-200 shadow-[0_4px_20px_rgb(0,0,0,0.04)] ring-2 ring-indigo-100"
                  : "bg-white border-slate-100 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] hover:border-slate-200"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.tone}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {card.label}
              </p>
              <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
                {card.value}
              </p>
            </button>
          );
        })}
      </div>

      <div className={`${cardShell} p-5 sm:p-6`}>
        <ListFilterBar
          fields={filterFields}
          q={filters.q}
          onSearchChange={filters.setQ}
          values={filters.values}
          onValueChange={filters.setValue}
          onClear={onClearFilters}
          searchPlaceholder={t("workOrders.list.searchPlaceholderExtended")}
          shownCount={filteredOrders.length}
          savedViewsScope={savedViewsScope}
          actions={
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "NEWEST" | "PRIORITY")
              }
              className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="NEWEST">{t("workOrders.list.newestFirst")}</option>
              <option value="PRIORITY">{t("workOrders.list.highestPriority")}</option>
            </select>
          }
        />
      </div>

      <div className={`${cardShell} overflow-hidden`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              {t("workOrders.list.ordersTitle")}
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              {filteredOrders.length === 1
                ? t("workOrders.list.matchingOne", { count: filteredOrders.length })
                : t("workOrders.list.matchingMany", { count: filteredOrders.length })}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
            >
              {t("workOrders.list.clearFilters")}
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-20 ${childCard} animate-pulse`} />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-6 h-6 text-slate-300" />
            </div>
            {totalOrders === 0 ? (
              <>
                <p className="text-slate-700 text-sm font-bold">
                  {t("workOrders.list.emptyTitle")}
                </p>
                <p className="text-slate-500 text-sm font-medium mt-1 max-w-sm mx-auto">
                  {t("workOrders.list.emptyHint")}
                </p>
              </>
            ) : (
              <>
                <p className="text-slate-500 text-sm font-medium">
                  {t("workOrders.list.noMatch")}
                </p>
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="mt-4 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                >
                  {t("workOrders.list.clearFilters")}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredOrders.map((order) => {
              const timeFormatted = order.createdAt
                ? formatDistanceToNow(new Date(order.createdAt), {
                    addSuffix: true,
                  })
                : t("workOrders.list.justNow");
              const isSelected = selectedId === order.id;

              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => onSelect(order)}
                  className={`w-full text-left p-5 sm:p-6 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected
                      ? "bg-indigo-50/70"
                      : "hover:bg-slate-50/70"
                  }`}
                >
                  <div className="flex gap-4 items-start min-w-0 flex-1">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                        order.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : order.status === "IN_PROGRESS"
                            ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                            : "bg-slate-50 text-slate-600 border-slate-100"
                      }`}
                    >
                      {order.status === "COMPLETED" ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Wrench className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-400 tracking-wider">
                          #{shortId(order.id)}
                        </span>
                        <h3 className="font-extrabold tracking-tight text-slate-900 text-sm truncate">
                          {order.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider ${priorityBadgeClass(
                            order.priority
                          )}`}
                        >
                          {priorityLabel(order.priority, t)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 font-medium line-clamp-2">
                        {order.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium pt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {order.location || t("workOrders.list.noLocation")}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {order.requester?.name || t("workOrders.staffFallback")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {timeFormatted}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <div className="text-right hidden sm:block">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${statusBadgeClass(
                          order.status
                        )}`}
                      >
                        {statusLabel(order.status, t)}
                      </span>
                      <p className="text-xs text-slate-500 font-bold mt-1.5 truncate max-w-[140px] flex items-center justify-end gap-1.5">
                        {order.assignee ? (
                          <>
                            <UserAvatar
                              userId={order.assignee.id}
                              name={order.assignee.name}
                              photoUrl={order.assignee.photoUrl}
                              size="xs"
                              rounded="2xl"
                            />
                            <span className="truncate">{order.assignee.name}</span>
                          </>
                        ) : (
                          t("workOrders.list.unassigned")
                        )}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
