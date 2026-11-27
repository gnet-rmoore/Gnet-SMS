import React from "react";
import { useTranslation } from "react-i18next";
import { canonicalGradeName } from "../../../../academics-shared/gradeSubjectLabels";

export function EnrolledStage({
  classrooms = [],
  selectedClassroomId,
  setSelectedClassroomId,
  selectedApp,
  blockedBy = [],
}: {
  classrooms?: any[];
  selectedClassroomId?: string;
  setSelectedClassroomId?: (v: string) => void;
  selectedApp?: any;
  blockedBy?: string[];
}) {
  const { t } = useTranslation(["pages"]);
  const value = selectedClassroomId || selectedApp?.classroomId || "";
  const available = (classrooms || [])
    .filter((c: { subjectId?: string | null }) => !c.subjectId)
    .filter((c: any) => {
      const seats = c.seatsLeft ?? (c.capacity == null ? null : Math.max(0, Number(c.capacity) - Number(c.studentCount || 0)));
      return c.capacity == null || c.allowOverfill || (seats ?? 0) > 0;
    });
  return (
    <div className="space-y-4">
      {blockedBy.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-amber-700">{t("admissions.review.stage.waitingOn")}</p>
          <p className="mt-1 text-sm text-amber-900">{blockedBy.map((b) => t(`admissions.review.blocker.${b}`, { defaultValue: t("admissions.review.blocker.fallback") })).join(", ")}</p>
        </div>
      ) : null}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
        <p className="text-xs font-black uppercase tracking-wider text-indigo-600">{t("admissions.review.stage.enrolled.placementTitle", { defaultValue: "Class placement" })}</p>
        <p className="text-sm text-slate-600">{t("admissions.review.stage.enrolled.placementHint", { defaultValue: "This selection was supplied on the public application. Confirm it or choose another class." })}</p>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{t("admissions.review.classGroupLabel")}</span>
          <select value={value} onChange={(e) => setSelectedClassroomId?.(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            <option value="">{t("admissions.review.selectClassGroup")}</option>
            {available.map((c: any) => {
              const seats = c.seatsLeft ?? (c.capacity == null ? null : Math.max(0, Number(c.capacity) - Number(c.studentCount || 0)));
              return <option key={c.id} value={c.id}>{c.name} ({canonicalGradeName(c.gradeLevel?.name) || t("admissions.review.unassignedGrade")}){seats != null ? ` · ${seats}` : ""}</option>;
            })}
          </select>
        </label>
        <p className="text-xs text-slate-500 font-semibold leading-relaxed">{t("admissions.review.classGroupHint")}</p>
        {available.length === 0 ? <p className="text-sm text-slate-600">{t("admissions.review.stage.approved.emptyClass")}</p> : null}
      </div>
    </div>
  );
}
