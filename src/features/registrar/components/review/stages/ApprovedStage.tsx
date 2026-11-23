import React from "react";
import { CheckCircle2, Clock, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../../components/ui";

export function ApprovedStage({
  documentEligibility,
  docsChecklist,
  handleToggleDoc,
  selectedApp,
  handleUploadAdmissionDoc,
  handleReviewAdmissionDoc,
  uploadingDoc,
  submitting,
  onRefresh,
  blockedBy = [],
}: {
  documentEligibility?: { eligible?: boolean; reason?: string } | null;
  docsChecklist?: any;
  handleToggleDoc?: (k: string) => void;
  selectedApp?: any;
  handleUploadAdmissionDoc?: (docType: string, file: File) => Promise<void>;
  handleReviewAdmissionDoc?: (docId: string, status: "APPROVED" | "REJECTED") => Promise<void>;
  uploadingDoc?: boolean;
  submitting?: boolean;
  onRefresh?: () => void;
  blockedBy?: string[];
}) {
  const { t } = useTranslation(["pages"]);
  const fileDocs = Array.isArray(selectedApp?.admissionDocuments) ? selectedApp.admissionDocuments : [];
  const eligible = documentEligibility?.eligible === true;

  if (!eligible) {
    const reason = documentEligibility?.reason || "fallback";
    return (
      <div className="space-y-4">
        {blockedBy.length > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-amber-700">{t("admissions.review.stage.waitingOn")}</p>
            <p className="mt-1 text-sm text-amber-900">{blockedBy.map((b) => t(`admissions.review.blocker.${b}`, { defaultValue: t("admissions.review.blocker.fallback") })).join(", ")}</p>
          </div>
        ) : null}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-amber-700">{t("admissions.review.stage.approved.waitingTitle", { defaultValue: "Documents become available after approval" })}</p>
          <p className="text-sm text-amber-900">{t(`admissions.review.documentReason.${reason}`, { defaultValue: t("admissions.review.documentReason.fallback") })}</p>
          <Button type="button" variant="secondary" onClick={onRefresh} disabled={submitting}>{t("admissions.review.stage.refresh")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <p className="text-xs font-black uppercase tracking-wider text-slate-600">{t("admissions.review.stage.approved.feeTitle", { defaultValue: "Entrance fee" })}</p>
        <p className="mt-1 text-sm text-slate-600">{t("admissions.review.stage.approved.feeHint", { defaultValue: "Finance applies entrance fees automatically from configured templates." })}</p>
        <p className="mt-2 text-xs font-semibold text-slate-700">{t("admissions.review.feePaymentId")}: <span className="font-mono">{selectedApp?.feePaymentId || t("admissions.review.none")}</span></p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
        <p className="text-xs font-black uppercase tracking-wider text-indigo-600">{t("admissions.review.docsChecklistTitle")}</p>
        {([
          { key: "birthCertificate", labelKey: "birthCertificate" },
          { key: "transcripts", labelKey: "transcripts" },
          { key: "idCopy", labelKey: "idCopy" },
          { key: "medicalRecords", labelKey: "medicalRecords" },
        ] as const).map((doc) => {
          const isChecked = docsChecklist?.[doc.key];
          return (
            <button key={doc.key} type="button" onClick={() => handleToggleDoc?.(doc.key)} className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isChecked ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-white border-slate-100 hover:border-slate-200 text-slate-500"}`}>
              <span className="flex items-center gap-2">{isChecked ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4 text-slate-300" />}{t(`admissions.review.docs.${doc.labelKey}`)}</span>
              <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${isChecked ? "bg-emerald-100/60" : "bg-slate-100"}`}>{isChecked ? t("admissions.review.verified") : t("admissions.review.missing")}</span>
            </button>
          );
        })}
      </div>
      {handleUploadAdmissionDoc ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-indigo-600">{t("admissions.review.uploadedFilesTitle")}</p>
          {fileDocs.length === 0 ? <p className="text-sm text-slate-500">{t("admissions.review.noFilesUploaded")}</p> : null}
          {fileDocs.map((doc: any) => (
            <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">{doc.docType}</p>
                <p className="text-slate-500 truncate">{doc.fileName || doc.fileUrl}</p>
                <p className="text-xs font-black uppercase text-slate-400 mt-1">{doc.status}</p>
              </div>
              {handleReviewAdmissionDoc && doc.status !== "APPROVED" ? (
                <div className="flex gap-2 shrink-0">
                  <Button type="button" variant="ghost" size="compact" disabled={submitting} onClick={() => handleReviewAdmissionDoc(doc.id, "APPROVED")} className="px-2 py-1 min-h-0 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">{t("admissions.review.approveDoc")}</Button>
                  <Button type="button" variant="ghost" size="compact" disabled={submitting} onClick={() => handleReviewAdmissionDoc(doc.id, "REJECTED")} className="px-2 py-1 min-h-0 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{t("admissions.review.rejectDoc")}</Button>
                </div>
              ) : null}
            </div>
          ))}
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100 cursor-pointer hover:bg-indigo-100">
            <Upload className="w-3.5 h-3.5" />
            {uploadingDoc ? t("admissions.review.uploading") : t("admissions.review.uploadDoc")}
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={uploadingDoc || submitting} onChange={async (e) => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; await handleUploadAdmissionDoc("OTHER", file); }} />
          </label>
        </div>
      ) : null}
    </div>
  );
}
