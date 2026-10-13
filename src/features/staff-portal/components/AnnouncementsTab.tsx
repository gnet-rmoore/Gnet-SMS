import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Megaphone,
  Pin,
  Check,
  CheckCircle2,
} from "lucide-react";
import { formatSafe } from "../utils/dateHelpers";

export type AnnouncementsTabProps = {
  announcements: any[];
  onAcknowledge: (id: string) => void;
  acknowledgingId?: string | null;
};

export function AnnouncementsTab({
  announcements,
  onAcknowledge,
  acknowledgingId = null,
}: AnnouncementsTabProps) {
  const { t } = useTranslation(["pages", "common"]);

  return (
    <motion.div
      key="announcements"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      {announcements.some((a) => a.isPinned) && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Pin className="w-4 h-4 text-indigo-500 fill-indigo-500" />
            {t("staffPortal.announcements.pinnedTitle")}
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {announcements.filter((a) => a.isPinned).map((announcement) => {
              const isAcknowledged = Boolean(announcement.acknowledgedByMe);
              const busy = acknowledgingId === announcement.id;
              return (
                <div
                  key={announcement.id}
                  className="bg-white rounded-[32px] border-2 border-indigo-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-6 md:p-8 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4">
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg">
                      {t("staffPortal.announcements.pinnedBadge")}
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                        <Megaphone className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-lg md:text-xl font-extrabold text-slate-800 leading-snug">
                          {announcement.title}
                        </h4>
                        <p className="text-xs font-semibold text-slate-400 mt-1">
                          {t("staffPortal.announcements.postedBy")}{" "}
                          <span className="font-extrabold text-slate-600">
                            {announcement.author?.name || t("staffPortal.announcements.schoolAdmin")}
                          </span>{" "}
                          • {formatSafe(announcement.createdAt, "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {!isAcknowledged ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onAcknowledge(announcement.id)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] shadow-indigo-600/10"
                        >
                          <Check className="w-4 h-4" />
                          <span>{busy ? t("common:saving") : t("staffPortal.announcements.acknowledgeNotice")}</span>
                        </button>
                      ) : (
                        <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>{t("staffPortal.announcements.acknowledged")}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className="text-slate-600 leading-relaxed text-sm mt-5 bg-slate-50 p-4 rounded-2xl border border-slate-100/60 font-medium prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: announcement.content }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          {t("staffPortal.announcements.feedTitle")}
        </h3>
        <div className="grid grid-cols-1 gap-6">
          {announcements.filter((a) => !a.isPinned).map((announcement) => {
            const isAcknowledged = Boolean(announcement.acknowledgedByMe);
            const busy = acknowledgingId === announcement.id;
            return (
              <div
                key={announcement.id}
                className={`bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-6 md:p-8 transition-all space-y-4 relative ${
                  !isAcknowledged ? "border-l-4 border-l-indigo-500" : ""
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-2xl text-slate-500">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base md:text-lg font-extrabold text-slate-800 leading-snug">
                        {announcement.title}
                      </h4>
                      <p className="text-xs font-semibold text-slate-400 mt-1">
                        {t("staffPortal.announcements.postedBy")}{" "}
                        <span className="font-extrabold text-slate-600">
                          {announcement.author?.name || t("staffPortal.announcements.schoolAdminShort")}
                        </span>{" "}
                        • {formatSafe(announcement.createdAt, "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!isAcknowledged ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onAcknowledge(announcement.id)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 text-indigo-700 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{busy ? t("common:saving") : t("staffPortal.announcements.markAsRead")}</span>
                      </button>
                    ) : (
                      <span className="text-xs font-extrabold text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>{t("staffPortal.announcements.read")}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="text-slate-600 leading-relaxed text-sm pl-0 md:pl-16 font-medium prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: announcement.content }}
                />
              </div>
            );
          })}

          {announcements.length === 0 && (
            <div className="text-center py-16 bg-white rounded-[32px] border border-slate-200">
              <Megaphone className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-bold">{t("staffPortal.announcements.empty")}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
