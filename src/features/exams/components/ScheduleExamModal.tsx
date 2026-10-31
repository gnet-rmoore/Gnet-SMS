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
import {
  validateScheduleExamForm,
  type ScheduleExamErrors,
  type ScheduleExamField,
} from "../scheduleExamValidation";

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
  const { calendar, loading, activePeriod } = useAcademicCalendarQuery();
  const [errors, setErrors] = React.useState<ScheduleExamErrors>({});

  const periods: Period[] = Array.isArray(calendar?.periods) ? calendar.periods : [];
  const selectedPeriod =
    periods.find((p) => String(p.id) === formData.periodId) || null;
  const components: ExamComponent[] = selectedPeriod?.examComponents || [];
  const selectedComponent =
    components.find((c) => String(c.id) === formData.examComponentId) || null;

  // Default to the current Academic Calendar period so the user doesn't have
  // to re-select the term the school is already in.
  React.useEffect(() => {
    if (formData.periodId || !activePeriod?.id) return;
    setFormData((prev) => ({ ...prev, periodId: String(activePeriod.id) }));
  }, [activePeriod?.id, formData.periodId, setFormData]);

  const periodMin = toDayBound(selectedPeriod?.startDate);
  const periodMax = toDayBound(selectedPeriod?.endDate, true);

  const onPeriodChange = (periodId: string) => {
    const previousTitle =
      selectedPeriod && selectedComponent
        ? `${selectedPeriod.shortCode}: ${selectedComponent.label}`
        : "";
    setFormData((prev) => ({
      ...prev,
      periodId,
      examComponentId: "",
      startDate: "",
      endDate: "",
      gradeSubmissionDeadline: "",
      title: previousTitle && prev.title === previousTitle ? "" : prev.title,
    }));
    setErrors({});
  };

  const onComponentChange = (componentId: string) => {
    if (!componentId || !selectedPeriod) {
      const previousTitle =
        selectedPeriod && selectedComponent
          ? `${selectedPeriod.shortCode}: ${selectedComponent.label}`
          : "";
      setFormData((prev) => ({
        ...prev,
        examComponentId: "",
        startDate: "",
        endDate: "",
        gradeSubmissionDeadline: "",
        title: previousTitle && prev.title === previousTitle ? "" : prev.title,
      }));
      setErrors({});
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
    const previousTitle =
      selectedPeriod && selectedComponent
        ? `${selectedPeriod.shortCode}: ${selectedComponent.label}`
        : "";

    setFormData((prev) => ({
      ...prev,
      examComponentId: String(component.id),
      title:
        !prev.title.trim() || prev.title === previousTitle
          ? `${selectedPeriod.shortCode}: ${component.label}`
          : prev.title,
      startDate: start,
      endDate: end,
      gradeSubmissionDeadline: deadline,
      duration: prev.duration || "120",
    }));
    setErrors({});
  };

  const updateField = (field: ScheduleExamField, value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const validation = validateScheduleExamForm(
      formData,
      selectedPeriod,
      selectedComponent
    );
    if (Object.keys(validation).length > 0) {
      event.preventDefault();
      setErrors(validation);
      return;
    }
    setErrors({});
    onSubmit(event);
  };

  const errorMessage = (field: ScheduleExamField) =>
    errors[field]
      ? t(`exams.scheduleModal.validation.${field}`, {
          defaultValue: errors[field],
        })
      : undefined;

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
      <form id="schedule-exam-form" onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
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
              aria-invalid={Boolean(errors.periodId)}
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
          {errorMessage("periodId") && (
            <p className="text-xs font-semibold text-rose-600" role="alert">
              {errorMessage("periodId")}
            </p>
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
                  aria-invalid={Boolean(errors.examComponentId)}
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
                {errorMessage("examComponentId") && (
                  <p className="text-xs font-semibold text-rose-600" role="alert">
                    {errorMessage("examComponentId")}
                  </p>
                )}
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
            onChange={(e) => updateField("title", e.target.value)}
            placeholder={t("exams.scheduleModal.titlePlaceholder")}
            className={fieldInput}
            aria-invalid={Boolean(errors.title)}
            required
          />
          {errorMessage("title") && (
            <p className="text-xs font-semibold text-rose-600" role="alert">
              {errorMessage("title")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FriendlyDateTimeField
            id="exam-start"
            label={t("exams.scheduleModal.start")}
            value={formData.startDate}
            onChange={(startDate) => updateField("startDate", startDate)}
            min={periodMin}
            max={periodMax}
            error={errorMessage("startDate")}
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
            onChange={(endDate) => updateField("endDate", endDate)}
            min={formData.startDate || periodMin}
            max={periodMax}
            error={errorMessage("endDate")}
          />
        </div>

        <FriendlyDateTimeField
          id="exam-deadline"
          label={t("exams.scheduleModal.gradeDeadline")}
          value={formData.gradeSubmissionDeadline}
          onChange={(gradeSubmissionDeadline) =>
            updateField("gradeSubmissionDeadline", gradeSubmissionDeadline)
          }
          min={formData.endDate || formData.startDate || periodMin}
          error={errorMessage("gradeSubmissionDeadline")}
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
            onChange={(e) => updateField("duration", e.target.value)}
            placeholder="120"
            className={fieldInput}
            aria-invalid={Boolean(errors.duration)}
            required
          />
          {errorMessage("duration") && (
            <p className="text-xs font-semibold text-rose-600" role="alert">
              {errorMessage("duration")}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="exam-delivery-mode" className={fieldLabel}>
            {t("exams.scheduleModal.deliveryMode")}
          </label>
          <select
            id="exam-delivery-mode"
            value={formData.deliveryMode}
            onChange={(e) =>
              setFormData((previous) => ({
                ...previous,
                deliveryMode: e.target.value,
              }))
            }
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
          onChange={(paperDueAt) => updateField("paperDueAt", paperDueAt)}
          max={formData.startDate || undefined}
          hint={t("exams.scheduleModal.paperDeadlineHint")}
          error={errorMessage("paperDueAt")}
        />
      </form>
    </FeatureModalShell>
  );
}
