import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, CheckCheck, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { formatDistanceToNow, format } from "date-fns";
import { useAuthStore } from "../../store/authStore";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { cardShell } from "../academics-shared/FeatureModalShell";
import { notificationsApi } from "./api";
import {
  useInvalidateNotifications,
  useNotificationsPaged,
} from "./hooks/useNotificationsQuery";
import { resolveNotificationHref } from "./utils";
import { cn } from "../../lib/cn";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ListFilterBar, ListPagination, Button } from "../../components/ui";
import { useListFilters, type FilterFieldDef } from "../list-filters";

export function NotificationsPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { school } = useAuthStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const highlightId = params.get("notificationId");
  const { toast, showToast } = usePageToast();
  const invalidate = useInvalidateNotifications();

  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "unread",
        label: t("common:status"),
        type: "enum",
        primary: true,
        allLabel: t("common:all"),
        options: [{ value: "unread", label: t("notifications.unread") }],
      },
    ],
    [t]
  );

  const filters = useListFilters({ fields: filterFields, syncUrl: true, defaultPageSize: 50 });

  const { data, isLoading, refetch } = useNotificationsPaged({
    page: filters.page,
    pageSize: filters.pageSize,
    unreadOnly: filters.values.unread === "unread",
    q: filters.committedQ,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead(school?.id);
      showToast(t("notifications.toast.allMarkedRead"));
      invalidate();
      refetch();
    } catch (err: any) {
      showToast(err?.message || t("notifications.toast.markAllFailed"), "error");
    }
  };

  const openItem = async (id: string, href?: string | null, readAt?: string | null) => {
    if (!readAt) {
      try {
        await notificationsApi.markRead(id);
        invalidate();
      } catch {
        /* soft */
      }
    }
    navigate(resolveNotificationHref(href, school?.slug));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-8 ${cardShell}`}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">{t("notifications.inbox")}</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 flex items-center gap-2 font-dashboard">
            <Bell className="w-7 h-7 text-indigo-600" />
            {t("notifications.title")}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {t("notifications.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={markAll}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <CheckCheck className="w-4 h-4" />
          {t("notifications.markAllRead")}
        </button>
      </motion.div>

      <div className={`${cardShell} overflow-hidden`}>
        <div className="p-6 border-b border-slate-100">
          <ListFilterBar
            fields={filterFields}
            q={filters.q}
            onSearchChange={filters.setQ}
            values={filters.values}
            onValueChange={filters.setValue}
            onClear={filters.clear}
            searchPlaceholder={t("pages:listFilters.searchPlaceholder")}
            shownCount={items.length}
            totalCount={total}
          />
        </div>

        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-slate-700 text-sm font-bold">
              {filters.hasActiveFilters ? t("pages:listFilters.noMatches") : t("notifications.emptyTitle")}
            </p>
            <p className="text-slate-500 text-sm mt-1">
              {filters.hasActiveFilters ? t("pages:listFilters.noMatchesHint") : t("notifications.emptyHint")}
            </p>
            {filters.hasActiveFilters ? (
              <Button type="button" variant="secondary" size="compact" className="mt-4" onClick={filters.clear}>
                {t("pages:listFilters.clearAll")}
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => {
              const highlighted = highlightId === n.id;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n.id, n.href, n.readAt)}
                    className={cn(
                      "w-full text-left p-5 sm:p-6 hover:bg-slate-50/70 transition-colors flex gap-4",
                      !n.readAt && "bg-indigo-50/30",
                      highlighted && "ring-2 ring-inset ring-indigo-200"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                        n.readAt
                          ? "bg-slate-50 text-slate-400 border-slate-100"
                          : "bg-indigo-50 text-indigo-600 border-indigo-100"
                      )}
                    >
                      {n.readAt ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Bell className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
                          {n.title}
                        </h2>
                        {!n.readAt && (
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                            {t("notifications.unread")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 font-medium mt-1 whitespace-pre-wrap">
                        {n.body}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-2">
                        {format(new Date(n.createdAt), "MMM d, yyyy · p")} ·{" "}
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <ListPagination
          total={total}
          page={filters.page}
          pageSize={filters.pageSize}
          onPageChange={filters.setPage}
          onPageSizeChange={filters.setPageSize}
        />
      </div>
    </div>
  );
}
