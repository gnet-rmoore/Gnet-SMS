import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import { FriendlyDateTimeField } from "../../academic-calendar/components/FriendlyDateTimeField";
import { useAcademicCalendarQuery } from "../../academic-calendar/hooks/useAcademicCalendarQuery";
import { formatDisplayDate } from "../../academic-calendar/utils";
import type { ExamComponent, Period } from "../../academic-calendar/types";
import type { ScheduleExamFormData } from "../types";

type Props = {
  formData: ScheduleExamFormData;
  setFormData: React.Dispatch<React.SetStateAction<ScheduleExamFormData>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
};

function toDateTimeLocal(value?: string | null, fallbackTime = "09:00"): string {
  if (!value) return "";
  if (value.includes("T")) return value.substring(0, 16);
  return `${value.substring(0, 10)}T${fallbackTime}`;
}

function toDayBound(value?: string | null, endOfDay = false): string | undefined {
  if (!value) return undefined;
  const day = value.substring(0, 10);
  return endOfDay ? `${day}T23:59` : `${day}T00:00`;
}

export function ScheduleExamModal({
  formData,
  setFormData,
  onClose,
  onSubmit,
  submitting,
}: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const { slug } = useParams();
  const { calendar, loading } = useAcademicCalendarQuery();

  const periods: Period[] = Array.isArray(calendar?.periods) ? calendar.periods : [];
  const selectedPeriod =
    periods.find((p) => String(p.id) === formData.periodId) || null;
  const components: ExamComponent[] = selectedPeriod?.examComponents || [];
  const selectedComponent =
    components.find((c) => String(c.id) === formData.examComponentId) || null;

  const periodMin = toDayBound(selectedPeriod?.startDate);
  const periodMax = toDayBound(selectedPeriod?.endDate, true);

  const onPeriodChange = (periodId: string) => {
    setFormData((prev) => ({
      ...prev,
      periodId,
      examComponentId: "",
    }));
  };

  const onComponentChange = (componentId: string) => {
    if (!componentId || !selectedPeriod) {
      setFormData((prev) => ({ ...prev, examComponentId: "" }));
      return;
    }
    const component = components.find((c) => String(c.id) === componentId);
    if (!component) return;
    const start =
      toDateTimeLocal(component.examStartDate, "09:00") ||
      toDateTimeLocal(selectedPeriod.startDate, "09:00");
    const end =
      toDateTimeLocal(component.examEndDate, "17:00") ||
      toDateTimeLocal(component.examStartDate, "17:00") ||
      toDateTimeLocal(selectedPeriod.endDate, "17:00");
    const deadline =
      toDateTimeLocal(component.gradeSubmissionDeadline, "23:59") ||
      (end ? `${end.substring(0, 10)}T23:59` : "");

    setFormData((prev) => ({
      ...prev,
      examComponentId: String(component.id),
      title: prev.title.trim()
        ? prev.title
        : `${selectedPeriod.shortCode}: ${component.label}`,
      startDate: start,
      endDate: end,
      gradeSubmissionDeadline: deadline,
      duration: prev.duration || "120",
    }));
  };

  return (
    <FeatureModalShell
      title={t("exams.scheduleModal.title")}
      subtitle={t("exams.scheduleModal.subtitle")}
      eyebrow={t("exams.scheduleModal.eyebrow")}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            {t("common:cancel")}
          </button>
          <button
            type="submit"
            form="schedule-exam-form"
            disabled={submitting}
            className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {submitting ? t("exams.scheduleModal.scheduling") : t("exams.scheduleExam")}
          </button>
        </div>
      }
    >
      <form id="schedule-exam-form" onSubmit={onSubmit} className="p-6 sm:p-8 space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="exam-period" className={fieldLabel}>
            {t("exams.scheduleModal.academicPeriod")}
          </label>
          {loading ? (
            <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
          ) : periods.length > 0 ? (
            <select
              id="exam-period"
              value={formData.periodId}
              onChange={(e) => onPeriodChange(e.target.value)}
              className={fieldInput}
              required
            >
              <option value="">{t("exams.scheduleModal.selectPeriod")}</option>
              {periods.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {p.label} ({formatDisplayDate(p.startDate)} – {formatDisplayDate(p.endDate)})
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
              <p className="text-sm font-medium text-slate-600 flex items-start gap-2">
                <CalendarDays className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                {t("exams.scheduleModal.noCalendar")}
              </p>
              {slug && (
                <Link
                  to={`/${slug}/settings/academic-calendar`}
                  className="text-sm font-bold text-indigo-600 hover:underline"
                >
                  {t("exams.scheduleModal.openCalendar")}
                </Link>
              )}
            </div>
          )}
        </div>

        {selectedPeriod && (
          <div className="space-y-1.5">
            <label htmlFor="exam-component" className={fieldLabel}>
              {t("exams.scheduleModal.assessmentComponent")}
            </label>
            {components.length > 0 ? (
              <>
                <select
                  id="exam-component"
                  value={formData.examComponentId}
                  onChange={(e) => onComponentChange(e.target.value)}
                  className={fieldInput}
                  required
                >
                  <option value="">{t("exams.scheduleModal.selectComponent")}</option>
                  {components.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.label}
                      {c.examStartDate
                        ? ` · ${String(c.examStartDate).substring(0, 10)}`
                        : t("exams.scheduleModal.datesNotSet")}
                    </option>
                  ))}
                </select>
                <p className="text-xs font-medium text-slate-500">
                  {t("exams.scheduleModal.datesHint")}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500 font-medium rounded-2xl border border-slate-100 bg-slate-50 p-4">
                {t("exams.scheduleModal.noComponents")}
              </p>
            )}
          </div>
        )}

        {selectedComponent && selectedPeriod && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-xs text-indigo-800 font-medium space-y-0.5">
            <p className="font-bold text-indigo-900">
              {selectedPeriod.shortCode} · {selectedComponent.label}
            </p>
            <p>
              {t("exams.scheduleModal.periodWindow", {
                start: formatDisplayDate(selectedPeriod.startDate),
                end: formatDisplayDate(selectedPeriod.endDate),
              })}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="exam-title" className={fieldLabel}>
            {t("exams.scheduleModal.examTitle")}
          </label>
          <input
            id="exam-title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder={t("exams.scheduleModal.titlePlaceholder")}
            className={fieldInput}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FriendlyDateTimeField
            id="exam-start"
            label={t("exams.scheduleModal.start")}
            value={formData.startDate}
            onChange={(startDate) => setFormData({ ...formData, startDate })}
            min={periodMin}
            max={periodMax}
            hint={
              selectedPeriod
                ? t("exams.scheduleModal.withinPeriod", { label: selectedPeriod.label })
                : undefined
            }
          />
          <FriendlyDateTimeField
            id="exam-end"
            label={t("exams.scheduleModal.end")}
            value={formData.endDate}
            onChange={(endDate) => setFormData({ ...formData, endDate })}
            min={formData.startDate || periodMin}
            max={periodMax}
          />
        </div>

        <FriendlyDateTimeField
          id="exam-deadline"
          label={t("exams.scheduleModal.gradeDeadline")}
          value={formData.gradeSubmissionDeadline}
          onChange={(gradeSubmissionDeadline) =>
            setFormData({ ...formData, gradeSubmissionDeadline })
          }
          min={formData.endDate || formData.startDate || periodMin}
        />

        <div className="space-y-1.5">
          <label htmlFor="exam-duration" className={fieldLabel}>
            {t("exams.scheduleModal.durationMinutes")}
          </label>
          <input
            id="exam-duration"
            type="number"
            min={1}
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            placeholder="120"
            className={fieldInput}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="exam-delivery-mode" className={fieldLabel}>
            {t("exams.scheduleModal.deliveryMode")}
          </label>
          <select
            id="exam-delivery-mode"
            value={formData.deliveryMode}
            onChange={(e) => setFormData({ ...formData, deliveryMode: e.target.value })}
            className={fieldInput}
          >
            <option value="ONLINE">{t("exams.scheduleModal.deliveryModeOnline")}</option>
            <option value="OFFLINE">{t("exams.scheduleModal.deliveryModeOffline")}</option>
            <option value="HYBRID">{t("exams.scheduleModal.deliveryModeHybrid")}</option>
          </select>
          <p className="text-xs font-medium text-slate-500">
            {t("exams.scheduleModal.deliveryModeHint")}
          </p>
        </div>

        <FriendlyDateTimeField
          id="exam-paper-due"
          label={t("exams.scheduleModal.paperDeadline")}
          value={formData.paperDueAt}
          onChange={(paperDueAt) => setFormData({ ...formData, paperDueAt })}
          max={formData.startDate || undefined}
          hint={t("exams.scheduleModal.paperDeadlineHint")}
        />
      </form>
    </FeatureModalShell>
  );
}
