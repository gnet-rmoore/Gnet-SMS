import React from "react";
import { CheckCircle2, Clock, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../../components/ui";

export function EnrolledStage({
  substep,
  entranceResult,
  setEntranceResult,
  entranceNotes,
  setEntranceNotes,
  documentEligibility,
  docsChecklist,
  handleToggleDoc,
  selectedApp,
  handleUploadAdmissionDoc,
  handleReviewAdmissionDoc,
  uploadingDoc,
  submitting,
  onRefresh,
}: {
  substep: "entrance" | "documents" | "waiting" | null;
  entranceResult: string;
  setEntranceResult: (v: string) => void;
  entranceNotes: string;
  setEntranceNotes: (v: string) => void;
  documentEligibility?: { eligible?: boolean; reason?: string } | null;
  docsChecklist?: any;
  handleToggleDoc?: (k: string) => void;
  selectedApp?: any;
  handleUploadAdmissionDoc?: (docType: string, file: File) => Promise<void>;
  handleReviewAdmissionDoc?: (docId: string, status: "APPROVED" | "REJECTED") => Promise<void>;
  uploadingDoc?: boolean;
  submitting?: boolean;
  onRefresh?: () => void;
}) {
  const { t } = useTranslation(["pages"]);
  const fileDocs = Array.isArray(selectedApp?.admissionDocuments) ? selectedApp.admissionDocuments : [];

  if (substep === "entrance") {
    return (
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5 space-y-3">
        <p className="text-xs font-black uppercase tracking-wider text-indigo-700">{t("admissions.review.entranceCompletionTitle")}</p>
        <p className="text-sm text-slate-600">{t("admissions.review.entranceCompletionHint")}</p>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{t("admissions.review.stage.enrolled.entranceTitle")}</span>
          <select value={entranceResult} onChange={(e) => setEntranceResult(e.target.value)} className="w-full rounded-xl border border-indigo-100 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            <option value="SAT">SAT</option>
            <option value="EXEMPT">EXEMPT</option>
            <option value="PASSED">PASSED</option>
            <option value="NOT_PASSED">NOT PASSED</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{t("admissions.review.entranceNotes")}</span>
          <input type="text" value={entranceNotes} onChange={(e) => setEntranceNotes(e.target.value)} className="w-full rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
        </label>
      </div>
    );
  }

  if (substep === "waiting") {
    const reason = documentEligibility?.reason || "fallback";
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 space-y-3">
        <p className="text-xs font-black uppercase tracking-wider text-amber-700">{t("admissions.review.stage.enrolled.waitingTitle")}</p>
        <p className="text-sm text-amber-900">{t(`admissions.review.documentReason.${reason}`, { defaultValue: t("admissions.review.documentReason.fallback") })}</p>
        <Button type="button" variant="secondary" onClick={onRefresh} disabled={submitting}>{t("admissions.review.stage.refresh")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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