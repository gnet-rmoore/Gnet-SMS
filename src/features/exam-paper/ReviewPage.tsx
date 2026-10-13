import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, RotateCcw, Loader2, FileText } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { examPaperApi } from "./api";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { alertError, confirmAction } from "../../lib/swal";
import { format } from "date-fns";

export default function ExamPaperReviewPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { school } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<any[]>([]);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const data = await examPaperApi.listPending(school.id);
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      await alertError(t("examPaper.loadFailed"), err?.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [school?.id, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const approve = async (pkg: any) => {
    const ok = await confirmAction({
      title: t("examPaper.confirm.approveTitle"),
      text: t("examPaper.confirm.approveText", {
        examTitle: pkg.exam?.title || t("examPaper.examFallback"),
        deliveryMode: pkg.deliveryMode,
      }),
      confirmText: t("examPaper.confirm.approveConfirm"),
    });
    if (!ok) return;
    setBusyId(pkg.id);
    try {
      await examPaperApi.review(pkg.id, {
        action: "APPROVE",
        deliveryMode: pkg.deliveryMode,
      });
      showToast(t("examPaper.toast.paperApproved"));
      await load();
    } catch (err: any) {
      await alertError(t("examPaper.approveFailed"), err?.message);
    } finally {
      setBusyId(null);
    }
  };

  const returnPaper = async (pkg: any) => {
    const { showSwal } = await import("../../lib/swal");
    const result = await showSwal.fire({
      title: t("examPaper.confirm.returnTitle"),
      input: "textarea",
      inputLabel: t("examPaper.confirm.returnFeedbackLabel"),
      inputPlaceholder: t("examPaper.confirm.returnFeedbackPlaceholder"),
      showCancelButton: true,
      cancelButtonText: t("common:cancel"),
      confirmButtonText: t("examPaper.confirm.returnConfirm"),
      inputValidator: (v) =>
        !v?.trim() ? t("examPaper.confirm.returnFeedbackRequired") : undefined,
    });
    if (!result.isConfirmed || !result.value?.trim()) return;
    setBusyId(pkg.id);
    try {
      await examPaperApi.review(pkg.id, {
        action: "RETURN",
        feedback: String(result.value).trim(),
      });
      showToast(t("examPaper.toast.paperReturned"));
      await load();
    } catch (err: any) {
      await alertError(t("examPaper.returnFailed"), err?.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
          {t("examPaper.reviewEyebrow")}
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 font-dashboard">
          {t("examPaper.reviewTitle")}
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          {t("examPaper.reviewSubtitle")}
        </p>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" /> {t("examPaper.loading")}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
          {t("examPaper.emptyReview")}
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold tracking-tight text-slate-900">
                      {pkg.exam?.title || t("examPaper.examFallback")}
                    </h2>
                    <p className="text-sm text-slate-500 font-mono">
                      {t("examPaper.questionsMeta", {
                        mode: pkg.deliveryMode,
                        revision: pkg.revision,
                        count: pkg.questionCount ?? "?",
                      })}
                      {pkg.pdfFileName ? ` · ${pkg.pdfFileName}` : ""}
                    </p>
                  </div>
                </div>
                {pkg.submittedAt && (
                  <p className="text-xs text-slate-500">
                    {t("examPaper.submittedAt", {
                      when: format(new Date(pkg.submittedAt), "MMM d, yyyy · p"),
                    })}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link
                  to={`/${school?.slug}/exams/${pkg.examId}/paper`}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  {t("examPaper.openPaper")}
                </Link>
                <button
                  type="button"
                  disabled={busyId === pkg.id}
                  onClick={() => void approve(pkg)}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" /> {t("examPaper.approve")}
                </button>
                <button
                  type="button"
                  disabled={busyId === pkg.id}
                  onClick={() => void returnPaper(pkg)}
                  className="inline-flex items-center gap-2 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold px-4 py-2.5 rounded-xl text-sm disabled:opacity-60"
                >
                  <RotateCcw className="w-4 h-4" /> {t("examPaper.returnAction")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
