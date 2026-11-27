import React from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Mail, MapPin, Phone } from "lucide-react";
import { AdmissionApplicantPhoto } from "../../AdmissionApplicantPhoto";
import { canonicalGradeName } from "../../../../academics-shared/gradeSubjectLabels";

export function SubmittedStage({
  selectedApp,
  evaluationData,
  setEvaluationData,
  students = [],
  onPhotoError,
  onPhotoSuccess,
}: {
  selectedApp: any;
  evaluationData: any;
  setEvaluationData?: any;
  students?: Array<{ id: string; photoUrl?: string | null }>;
  onPhotoError?: (m: string) => void;
  onPhotoSuccess?: (m: string) => void;
}) {
  const { t } = useTranslation(["pages", "common"]);
  const linkedUserId = selectedApp?.studentUserId || evaluationData?.existingStudentUserId || null;
  const linkedStudent = linkedUserId ? students.find((s) => s.id === linkedUserId) : undefined;
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <AdmissionApplicantPhoto
          studentName={selectedApp?.studentName || ""}
          linkedUserId={linkedUserId}
          linkedPhotoUrl={linkedStudent?.photoUrl}
          pendingPhotoUrl={evaluationData?.pendingPhotoUrl || null}
          onPendingPhotoChange={(pendingPhotoUrl) => setEvaluationData?.({ ...evaluationData, pendingPhotoUrl })}
          onError={onPhotoError}
          onSuccess={onPhotoSuccess}
        />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><p className="text-xs font-bold uppercase text-slate-500">{t("admissions.review.gender")}</p><p className="mt-1 font-semibold text-slate-900">{selectedApp?.gender || t("common:male")}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-500">{t("admissions.review.dateOfBirth")}</p><p className="mt-1 font-semibold text-slate-900">{selectedApp?.dob ? format(new Date(selectedApp.dob), "MMMM d, yyyy") : t("admissions.review.unspecified")}</p></div>
        </div>
        <div><p className="text-xs font-bold uppercase text-slate-500">{t("admissions.review.appliedGrade")}</p><p className="mt-1 font-semibold text-slate-900">{canonicalGradeName(selectedApp?.gradeLevel?.name || selectedApp?.gradeLevelName) || t("admissions.review.none")}</p></div>
        {selectedApp?.address ? <div><p className="text-xs font-bold uppercase text-slate-500">{t("admissions.review.homeAddress")}</p><p className="mt-1 font-semibold text-slate-900 flex items-start gap-1"><MapPin className="w-4 h-4 mt-0.5 text-slate-400" />{selectedApp.address}</p></div> : null}
        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs font-bold uppercase text-slate-500">{t("admissions.review.guardianDetails")}</p>
          <p className="mt-1 font-semibold text-slate-900">{selectedApp?.parentName}</p>
          <p className="mt-1 text-xs text-slate-600 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" />{selectedApp?.parentEmail || t("admissions.review.noEmail")}</span>
            <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" />{selectedApp?.parentPhone}</span>
          </p>
        </div>
      </div>
    </div>
  );
}