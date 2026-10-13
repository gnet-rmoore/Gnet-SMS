import React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  X,
  Building2,
  Globe,
  MapPin,
  Mail,
  Phone,
  User,
  Clock,
  Check,
  MessageSquare,
  ExternalLink,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui";
import { cn } from "../../../lib/cn";

export type RegistrationDetail = {
  id: string;
  organizationName: string;
  requestedSlug: string;
  country: string;
  timezone: string;
  address?: string | null;
  estimatedStudents?: number | null;
  message?: string | null;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string | null;
  status: string;
  reviewNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  schoolId?: string | null;
  emailConfirmedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

function statusBadgeClass(status: string) {
  switch (status) {
    case "SUBMITTED":
      return "bg-amber-50 text-amber-800 border-amber-100";
    case "NEEDS_INFO":
      return "bg-sky-50 text-sky-800 border-sky-100";
    case "APPROVED":
      return "bg-emerald-50 text-emerald-800 border-emerald-100";
    case "REJECTED":
    case "WITHDRAWN":
      return "bg-rose-50 text-rose-800 border-rose-100";
    default:
      return "bg-slate-50 text-slate-600 border-slate-100";
  }
}

type DetailRowProps = {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
};

function DetailRow({ label, value, mono }: DetailRowProps) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd
        className={cn(
          "text-sm text-slate-800 break-words",
          mono && "font-mono",
          !value && "text-slate-400 italic"
        )}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

export type RegistrationDetailDrawerProps = {
  open: boolean;
  registration: RegistrationDetail | null;
  notes: string;
  onNotesChange: (value: string) => void;
  busyAction: string;
  onClose: () => void;
  onExitComplete?: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRequestInfo: () => void;
};

export function RegistrationDetailDrawer({
  open,
  registration,
  notes,
  onNotesChange,
  busyAction,
  onClose,
  onExitComplete,
  onApprove,
  onReject,
  onRequestInfo,
}: RegistrationDetailDrawerProps) {
  const { t } = useTranslation(["pages", "common"]);
  if (!registration) return null;

  const canAct = ["SUBMITTED", "NEEDS_INFO"].includes(registration.status);
  const statusLabel = t(`pages:superAdmin.registrationDetail.status.${registration.status}`, {
    defaultValue: registration.status,
  });

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {open ? (
        <>
          <motion.button
            key="registration-drawer-backdrop"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-slate-900/40"
            aria-label={t("common:close")}
            onClick={onClose}
          />
          <motion.aside
            key="registration-drawer-panel"
            role="dialog"
            aria-modal
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.2 }}
            className="fixed inset-y-0 right-0 z-[101] flex w-full max-w-xl flex-col overflow-hidden border-l border-slate-200 bg-slate-50 shadow-2xl"
          >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-br from-slate-950 to-slate-900 p-6 text-white">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("pages:superAdmin.registrationDetail.eyebrow")}
            </p>
            <h2 className="text-xl font-extrabold tracking-tight">{registration.organizationName}</h2>
            <p className="font-mono text-sm text-slate-300">/{registration.requestedSlug}</p>
            <span
              className={cn(
                "inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold",
                statusBadgeClass(registration.status)
              )}
            >
              {statusLabel}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("common:close")}
            className="shrink-0 text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {canAct && !registration.emailConfirmedAt ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t("pages:superAdmin.registrationDetail.emailUnconfirmedWarning")}
            </div>
          ) : null}

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Building2 className="h-4 w-4" />
              {t("pages:superAdmin.registrationDetail.schoolSection")}
            </h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailRow label={t("pages:superAdmin.registrationDetail.organization")} value={registration.organizationName} />
              <DetailRow
                label={t("pages:superAdmin.registrationDetail.urlSlug")}
                value={`/${registration.requestedSlug}`}
                mono
              />
              <DetailRow label={t("pages:superAdmin.registrationDetail.country")} value={registration.country} />
              <DetailRow label={t("pages:superAdmin.registrationDetail.timezone")} value={registration.timezone} mono />
              <DetailRow
                label={t("pages:superAdmin.registrationDetail.estimatedStudents")}
                value={
                  registration.estimatedStudents != null
                    ? registration.estimatedStudents.toLocaleString()
                    : null
                }
                mono
              />
              <div className="sm:col-span-2">
                <DetailRow
                  label={t("pages:superAdmin.registrationDetail.address")}
                  value={registration.address}
                />
              </div>
            </dl>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <User className="h-4 w-4" />
              {t("pages:superAdmin.registrationDetail.contactSection")}
            </h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailRow label={t("pages:superAdmin.registrationDetail.applicantName")} value={registration.applicantName} />
              <DetailRow
                label={t("pages:superAdmin.registrationDetail.applicantEmail")}
                value={
                  <a href={`mailto:${registration.applicantEmail}`} className="text-indigo-600 hover:underline">
                    {registration.applicantEmail}
                  </a>
                }
              />
              <DetailRow label={t("pages:superAdmin.registrationDetail.applicantPhone")} value={registration.applicantPhone} />
              <DetailRow
                label={t("pages:superAdmin.registrationDetail.emailConfirmed")}
                value={
                  registration.emailConfirmedAt
                    ? t("pages:superAdmin.registrationDetail.emailConfirmedYes")
                    : t("pages:superAdmin.registrationDetail.emailConfirmedNo")
                }
              />
            </dl>
          </section>

          {registration.message ? (
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t("pages:superAdmin.registrationDetail.messageSection")}
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{registration.message}</p>
            </section>
          ) : null}

          {registration.reviewNotes ? (
            <section className="space-y-3 rounded-2xl border border-sky-100 bg-sky-50 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700">
                {t("pages:superAdmin.registrationDetail.previousNotes")}
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-sky-900">{registration.reviewNotes}</p>
            </section>
          ) : null}

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Clock className="h-4 w-4" />
              {t("pages:superAdmin.registrationDetail.timelineSection")}
            </h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailRow
                label={t("pages:superAdmin.registrationDetail.submittedAt")}
                value={new Date(registration.createdAt).toLocaleString()}
              />
              <DetailRow
                label={t("pages:superAdmin.registrationDetail.lastUpdated")}
                value={new Date(registration.updatedAt).toLocaleString()}
              />
              {registration.reviewedAt ? (
                <DetailRow
                  label={t("pages:superAdmin.registrationDetail.reviewedAt")}
                  value={new Date(registration.reviewedAt).toLocaleString()}
                />
              ) : null}
              {registration.schoolId ? (
                <DetailRow
                  label={t("pages:superAdmin.registrationDetail.provisionedSchool")}
                  value={
                    <Link
                      to={`/super-admin/schools/${registration.schoolId}`}
                      className="inline-flex items-center gap-1 font-mono text-xs text-indigo-600 hover:underline"
                    >
                      {registration.schoolId.slice(0, 8)}…
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  }
                />
              ) : null}
            </dl>
          </section>

          {canAct ? (
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("pages:superAdmin.registrationDetail.reviewNotesLabel")}
                </span>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder={t("pages:superAdmin.registrationDetail.reviewNotesPlaceholder")}
                />
                <p className="text-xs text-slate-500">{t("pages:superAdmin.registrationDetail.reviewNotesHint")}</p>
              </label>
            </section>
          ) : null}
        </div>

        {canAct ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white p-4">
            <Button
              variant="danger"
              size="compact"
              disabled={!!busyAction}
              loading={busyAction === "reject"}
              onClick={onReject}
            >
              <X className="h-4 w-4" />
              {t("common:reject")}
            </Button>
            <Button
              variant="secondary"
              size="compact"
              disabled={!!busyAction}
              loading={busyAction === "request-info"}
              onClick={onRequestInfo}
            >
              <MessageSquare className="h-4 w-4" />
              {t("pages:superAdmin.registrationDetail.requestInfo")}
            </Button>
            <Button
              size="compact"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!!busyAction}
              loading={busyAction === "approve"}
              onClick={onApprove}
            >
              <Check className="h-4 w-4" />
              {t("common:approve")}
            </Button>
          </div>
        ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export function RegistrationListPreview({
  registration,
  onOpen,
}: {
  registration: RegistrationDetail;
  onOpen: () => void;
}) {
  const { t } = useTranslation(["pages", "common"]);
  const statusLabel = t(`pages:superAdmin.registrationDetail.status.${registration.status}`, {
    defaultValue: registration.status,
  });

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition-colors hover:border-indigo-100 hover:bg-white sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-900">{registration.organizationName}</p>
          <span
            className={cn(
              "inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold",
              statusBadgeClass(registration.status)
            )}
          >
            {statusLabel}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          /{registration.requestedSlug} · {registration.applicantName} · {registration.applicantEmail}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" />
            {registration.country}
          </span>
          {registration.estimatedStudents != null ? (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {registration.estimatedStudents.toLocaleString()} {t("pages:superAdmin.students").toLowerCase()}
            </span>
          ) : null}
          {registration.address ? (
            <span className="inline-flex items-center gap-1 truncate max-w-xs">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {registration.address}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" />
            {registration.emailConfirmedAt
              ? t("pages:superAdmin.registrationDetail.emailConfirmedYes")
              : t("pages:superAdmin.registrationDetail.emailConfirmedNo")}
          </span>
          {registration.applicantPhone ? (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              {registration.applicantPhone}
            </span>
          ) : null}
        </div>
      </div>
      <span className="shrink-0 text-sm font-bold text-indigo-600">
        {t("pages:superAdmin.registrationDetail.viewApplication")}
      </span>
    </button>
  );
}
