import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, CheckCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { useAuthStore } from "../../../store/authStore";
import { notificationsApi } from "../api";
import {
  useInvalidateNotifications,
  useNotificationsInbox,
  useUnreadCount,
} from "../hooks/useNotificationsQuery";
import { resolveNotificationHref, formatBadgeCount } from "../utils";
import type { InAppNotification } from "../types";
import { cn } from "../../../lib/cn";

export function NotificationBell() {
  const { t } = useTranslation(["pages", "common"]);
  const { school, user } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const invalidate = useInvalidateNotifications();

  const { data: count = 0 } = useUnreadCount();
  const { data: items = [], isFetching, refetch } = useNotificationsInbox({
    enabled: open,
  });

  React.useEffect(() => {
    if (!open) return;
    refetch();
  }, [open, refetch]);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onOpenItem = async (n: InAppNotification) => {
    if (!n.readAt) {
      try {
        await notificationsApi.markRead(n.id);
        invalidate();
      } catch {
        /* soft-fail */
      }
    }
    setOpen(false);
    navigate(resolveNotificationHref(n.href, school?.slug));
  };

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead(school?.id);
      invalidate();
    } catch {
      /* soft-fail */
    }
  };

  if (!user || user.role === "SUPER_ADMIN") return null;

  const listPath = school?.slug ? `/${school.slug}/notifications` : "/";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
        aria-label={
          count
            ? t("notifications.unreadNotifications", { count })
            : t("notifications.bellLabel")
        }
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="w-6 h-6" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.15rem] h-[1.15rem] px-1 bg-rose-500 text-white text-xs font-bold rounded-full border-2 border-white flex items-center justify-center font-mono">
            {formatBadgeCount(count)}
          </span>
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {count > 0
          ? t("notifications.unreadNotifications", { count })
          : t("notifications.noUnread")}
      </span>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-[22rem] max-w-[90vw] bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.08)] z-50 overflow-hidden"
            role="dialog"
            aria-label={t("notifications.bellLabel")}
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-extrabold tracking-tight text-slate-900">
                  {t("notifications.title")}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {t("notifications.unreadCount", { count })}
                </p>
              </div>
              {count > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {t("notifications.markAllRead")}
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {isFetching && items.length === 0 ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 rounded-xl bg-slate-50 animate-pulse" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="py-12 px-6 text-center">
                  <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-900">{t("notifications.emptyTitle")}</p>
                  <p className="text-xs text-slate-500 mt-1">{t("notifications.bellEmpty")}</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => onOpenItem(n)}
                        className={cn(
                          "w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors",
                          !n.readAt && "bg-indigo-50/40"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-extrabold tracking-tight text-slate-900">
                            {n.title}
                          </p>
                          {!n.readAt && (
                            <span className="mt-1 w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-xs text-slate-500 font-medium mt-1.5">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50/50">
              <Link
                to={listPath}
                onClick={() => setOpen(false)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                {t("notifications.viewAll")}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
