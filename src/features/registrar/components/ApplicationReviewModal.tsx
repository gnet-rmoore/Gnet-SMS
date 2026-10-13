import React from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Clock,
  X,
  Phone,
  Mail,
  MapPin,
  UserCheck,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "../../../components/ui";
import { AdmissionApplicantPhoto } from "./AdmissionApplicantPhoto";

const REGISTRY_CHARCOAL =
  "bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 shadow-sm";
const REGISTRY_PILL_ACTION =
  "inline-flex items-center gap-2 px-3 py-2 min-h-0 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100 hover:bg-indigo-100";

export type ApplicationReviewModalProps = {
  classrooms?: any;
  docsChecklist?: any;
  evaluationData?: any;
  handleSaveReview?: any;
  handleToggleDoc?: any;
  selectedApp?: any;
  selectedClassroomId?: any;
  setEvaluationData?: any;
  setSelectedClassroomId?: any;
  setShowAppReviewModal?: any;
  submitting?: any;
  handleUploadAdmissionDoc?: (docType: string, file: File) => Promise<void>;
  handleReviewAdmissionDoc?: (docId: string, status: "APPROVED" | "REJECTED") => Promise<void>;
  uploadingDoc?: boolean;
  waiveFee?: boolean;
  setWaiveFee?: (v: boolean) => void;
  waiveDocs?: boolean;
  setWaiveDocs?: (v: boolean) => void;
  entranceFeeAmount?: string;
  setEntranceFeeAmount?: (v: string) => void;
  handleCreateEntranceFee?: (amount?: number) => Promise<void>;
  students?: Array<{ id: string; photoUrl?: string | null }>;
  onPhotoError?: (message: string) => void;
  onPhotoSuccess?: (message: string) => void;
  [key: string]: any;
};

/** Presentational extract from Page.tsx lines 2298-2522. */
export function ApplicationReviewModal({
  classrooms,
  docsChecklist,
  evaluationData,
  handleSaveReview,
  handleToggleDoc,
  selectedApp,
  selectedClassroomId,
  setEvaluationData,
  setSelectedClassroomId,
  setShowAppReviewModal,
  submitting,
  handleUploadAdmissionDoc,
  handleReviewAdmissionDoc,
  uploadingDoc,
  waiveFee = false,
  setWaiveFee,
  waiveDocs = false,
  setWaiveDocs,
  entranceFeeAmount = "",
  setEntranceFeeAmount,
  handleCreateEntranceFee,
  students = [],
  onPhotoError,
  onPhotoSuccess,
}: ApplicationReviewModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const linkedUserId =
    selectedApp?.studentUserId || evaluationData?.existingStudentUserId || null;
  const linkedStudent = linkedUserId
    ? students.find((s) => s.id === linkedUserId)
    : undefined;
  const fileDocs = Array.isArray(selectedApp?.admissionDocuments)
    ? selectedApp.admissionDocuments
    : [];

  const interviewOptions = (["1", "2", "3", "4", "5"] as const).map((n) => ({
    value: n,
    label: t(`admissions.review.interview.${n}`, { defaultValue: `${n} / 5` }),
  }));

  return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAppReviewModal(false)} />
              <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 to-slate-900 text-white flex-shrink-0">
                  <div>
                    <span className="text-xs font-black tracking-widest uppercase bg-white/10 px-2 py-0.5 rounded text-white mr-2">
                      {t("admissions.review.hubBadge")}
                    </span>
                    {(() => {
                      let applicantType = "NEW";
                      try {
                        const n = selectedApp?.notes ? JSON.parse(selectedApp.notes) : null;
                        if (n?.applicantType === "RETURNING") applicantType = "RETURNING";
                      } catch {
                        /* ignore */
                      }
                      return (
                        <span
                          className={`ml-2 text-xs font-black tracking-wider uppercase px-2 py-0.5 rounded ${
                            applicantType === "RETURNING"
                              ? "bg-emerald-400/20 text-emerald-50"
                              : "bg-white/10 text-slate-100"
                          }`}
                        >
                          {applicantType === "RETURNING"
                            ? t("admissions.review.returningStudent")
                            : t("admissions.review.newStudent")}
                          {selectedApp?.source === "PUBLIC" ? t("admissions.review.onlineSuffix") : ""}
                        </span>
                      );
                    })()}
                    <h3 className="font-extrabold text-lg mt-1">
                      {t("admissions.review.evaluating", { name: selectedApp.studentName })}
                    </h3>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAppReviewModal(false)}
                    className="text-white hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black uppercase text-indigo-600 tracking-wider mb-3">{t("admissions.review.demographicsTitle")}</h4>
                      <div className="bg-slate-50 p-4 rounded-2xl space-y-3.5 text-sm">
                        <AdmissionApplicantPhoto
                          studentName={selectedApp.studentName}
                          linkedUserId={linkedUserId}
                          linkedPhotoUrl={linkedStudent?.photoUrl}
                          pendingPhotoUrl={evaluationData?.pendingPhotoUrl || null}
                          onPendingPhotoChange={(pendingPhotoUrl) =>
                            setEvaluationData({ ...evaluationData, pendingPhotoUrl })
                          }
                          onError={onPhotoError}
                          onSuccess={onPhotoSuccess}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-slate-400 font-bold">{t("admissions.review.gender")}</p>
                            <p className="font-extrabold text-slate-800 mt-0.5">{selectedApp.gender || t("common:male")}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold">{t("admissions.review.dateOfBirth")}</p>
                            <p className="font-extrabold text-slate-800 mt-0.5">
                              {selectedApp.dob ? format(new Date(selectedApp.dob), "MMMM d, yyyy") : t("admissions.review.unspecified")}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs font-bold">{t("admissions.review.appliedGrade")}</p>
                          <p className="font-black text-slate-800 mt-0.5 text-sm">{selectedApp.gradeLevel?.name || selectedApp.gradeLevelName || t("admissions.review.none")}</p>
                        </div>
                        {selectedApp.address && (
                          <div>
                            <p className="text-slate-500 text-xs font-bold">{t("admissions.review.homeAddress")}</p>
                            <p className="font-semibold text-slate-800 mt-0.5 flex items-start gap-1">
                              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                              {selectedApp.address}
                            </p>
                          </div>
                        )}
                        <div className="border-t border-slate-200/50 pt-3">
                          <p className="text-slate-500 text-xs font-bold">{t("admissions.review.guardianDetails")}</p>
                          <p className="font-extrabold text-slate-850 mt-1">{selectedApp.parentName}</p>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-2">
                            <span><Mail className="w-3.5 h-3.5 inline mr-1 text-slate-400" />{selectedApp.parentEmail || t("admissions.review.noEmail")}</span>
                            <span><Phone className="w-3.5 h-3.5 inline mr-1 text-slate-400" />{selectedApp.parentPhone}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-black uppercase text-indigo-600 tracking-wider mb-3">{t("admissions.review.docsChecklistTitle")}</h4>
                      <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                        {(
                          [
                            { key: "birthCertificate" as const, labelKey: "birthCertificate" },
                            { key: "transcripts" as const, labelKey: "transcripts" },
                            { key: "idCopy" as const, labelKey: "idCopy" },
                            { key: "medicalRecords" as const, labelKey: "medicalRecords" },
                          ] as const
                        ).map((doc) => {
                          const isChecked = docsChecklist[doc.key];
                          return (
                            <div 
                              key={doc.key}
                              onClick={() => handleToggleDoc(doc.key)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs font-bold ${
                                isChecked 
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                                  : "bg-white border-slate-100 hover:border-slate-200 text-slate-500"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                {isChecked ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4 text-slate-300" />}
                                {t(`admissions.review.docs.${doc.labelKey}`)}
                              </span>
                              <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${
                                isChecked ? "bg-emerald-100/60" : "bg-slate-100"
                              }`}>
                                {isChecked ? t("admissions.review.verified") : t("admissions.review.missing")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {handleUploadAdmissionDoc && (
                      <div>
                        <h4 className="text-xs font-black uppercase text-indigo-600 tracking-wider mb-3">{t("admissions.review.uploadedFilesTitle")}</h4>
                        <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                          {fileDocs.length === 0 && (
                            <p className="text-xs text-slate-500 font-medium">{t("admissions.review.noFilesUploaded")}</p>
                          )}
                          {fileDocs.map((doc: any) => (
                            <div
                              key={doc.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-white border border-slate-200 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 truncate">{doc.docType}</p>
                                <p className="text-slate-500 truncate">{doc.fileName || doc.fileUrl}</p>
                                <p className="text-xs font-black uppercase text-slate-400 mt-1">{doc.status}</p>
                              </div>
                              {handleReviewAdmissionDoc && doc.status !== "APPROVED" && (
                                <div className="flex gap-2 shrink-0">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="compact"
                                    disabled={submitting}
                                    onClick={() => handleReviewAdmissionDoc(doc.id, "APPROVED")}
                                    className="px-2 py-1 min-h-0 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  >
                                    {t("admissions.review.approveDoc")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="compact"
                                    disabled={submitting}
                                    onClick={() => handleReviewAdmissionDoc(doc.id, "REJECTED")}
                                    className="px-2 py-1 min-h-0 rounded-lg bg-rose-50 text-rose-700 border border-rose-100"
                                  >
                                    {t("admissions.review.rejectDoc")}
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100 cursor-pointer hover:bg-indigo-100">
                            <Upload className="w-3.5 h-3.5" />
                            {uploadingDoc ? t("admissions.review.uploading") : t("admissions.review.uploadDoc")}
                            <input
                              type="file"
                              accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                              className="hidden"
                              disabled={uploadingDoc || submitting}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                if (!file) return;
                                await handleUploadAdmissionDoc("OTHER", file);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black uppercase text-indigo-600 tracking-wider mb-3">{t("admissions.review.placementTitle")}</h4>
                      <div className="bg-slate-50 p-4 rounded-2xl space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-wider">{t("admissions.review.placementScore")}</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="100"
                            value={evaluationData.testScore}
                            onChange={(e) => setEvaluationData({...evaluationData, testScore: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold"
                            placeholder={t("admissions.review.scorePlaceholder")}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-wider">{t("admissions.review.interviewRating")}</label>
                          <select 
                            value={evaluationData.interviewRating}
                            onChange={(e) => setEvaluationData({...evaluationData, interviewRating: e.target.value})}
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-slate-400 text-sm font-semibold"
                          >
                            {interviewOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-wider">{t("admissions.review.evaluationComments")}</label>
                          <textarea
                            rows={3}
                            value={evaluationData.comments}
                            onChange={(e) => setEvaluationData({...evaluationData, comments: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium"
                            placeholder={t("admissions.review.commentsPlaceholder")}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-indigo-600 tracking-wider">{t("admissions.review.registryActions")}</h4>
                      
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                        <label className="text-xs font-black text-indigo-600 uppercase tracking-wider block">
                          {t("admissions.review.classGroupLabel")}
                        </label>
                        <select
                          value={selectedClassroomId}
                          onChange={(e) => setSelectedClassroomId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">{t("admissions.review.selectClassGroup")}</option>
                          {classrooms
                            .filter((c: { subjectId?: string | null }) => !c.subjectId)
                            .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.gradeLevel?.name || t("admissions.review.unassignedGrade")})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                          {t("admissions.review.classGroupHint")}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                        <p className="text-xs font-black text-indigo-600 uppercase tracking-wider">
                          {t("admissions.review.entranceFeeTitle")}
                        </p>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          {t("admissions.review.entranceFeeHint")}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {t("admissions.review.feePaymentId")}{" "}
                          <span className="font-mono text-slate-700">
                            {selectedApp.feePaymentId || t("admissions.review.none")}
                          </span>
                          {" · "}{t("admissions.review.feeStatus")} {selectedApp.status}
                        </p>
                        <div className="flex flex-wrap gap-2 items-center">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={entranceFeeAmount}
                            onChange={(e) => setEntranceFeeAmount?.(e.target.value)}
                            placeholder={t("admissions.review.amountPlaceholder")}
                            className="w-28 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="compact"
                            disabled={submitting || !handleCreateEntranceFee}
                            onClick={() =>
                              handleCreateEntranceFee?.(Number(entranceFeeAmount))
                            }
                            className={REGISTRY_PILL_ACTION}
                          >
                            {t("admissions.review.createEntranceFee")}
                          </Button>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={waiveFee}
                            onChange={(e) => setWaiveFee?.(e.target.checked)}
                            className="rounded border-slate-300"
                          />
                          {t("admissions.review.waiveFee")}
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={waiveDocs}
                            onChange={(e) => setWaiveDocs?.(e.target.checked)}
                            className="rounded border-slate-300"
                          />
                          {t("admissions.review.waiveDocs")}
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="compact"
                          onClick={() => handleSaveReview("UNDER_REVIEW")}
                          className={REGISTRY_PILL_ACTION}
                          disabled={submitting}
                        >
                          {t("admissions.review.markInReview")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleSaveReview("APPROVED")}
                          className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold"
                          disabled={submitting}
                        >
                          {t("admissions.review.approveCandidate")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleSaveReview("REJECTED")}
                          className="bg-red-50 hover:bg-red-150 border border-red-200 text-red-700 text-xs"
                          disabled={submitting}
                        >
                          {t("admissions.review.rejectApplication")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleSaveReview("WAITLISTED")}
                          className="bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-xs"
                          disabled={submitting}
                        >
                          {t("admissions.review.moveWaitlist")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleSaveReview("ENROLLED")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-100 col-span-2"
                          disabled={submitting}
                        >
                          <UserCheck className="w-4 h-4" /> {t("admissions.review.finalizeEnrollment")}
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                        {t("admissions.review.enrollHint")}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-full border-t border-slate-100 pt-4 flex justify-between items-center flex-shrink-0">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => handleSaveReview()}
                      className={`text-xs ${REGISTRY_CHARCOAL}`}
                      disabled={submitting}
                    >
                      {t("admissions.review.saveWithoutStatus")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowAppReviewModal(false)}
                      className="text-xs text-slate-500"
                    >
                      {t("common:close")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
  );
}
