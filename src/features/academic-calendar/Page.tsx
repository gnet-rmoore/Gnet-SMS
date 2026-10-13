import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  Settings,
  RefreshCw,
  CheckCircle2,
  XCircle,
  CalendarDays,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { useAcademicCalendarQuery } from "./hooks/useAcademicCalendarQuery";
import { academicCalendarApi } from "./api";
import { SetupStep2Periods } from "./components/SetupStep2Periods";
import { SetupStep3Exams } from "./components/SetupStep3Exams";
import { CalendarOverview } from "./components/CalendarOverview";
import { SetupStep1Templates } from "./components/SetupStep1Templates";
import { SetupStep4Review } from "./components/SetupStep4Review";
import type { CalendarTemplate, ExamComponent, Period } from "./types";
import { confirmAction } from "../../lib/swal";
import {
  fieldErrorsList,
  hydrateCalendar,
  seedTemplateDates,
  validateComponentFields,
  validatePeriodFields,
  type FieldErrors,
} from "./utils";

export const AcademicCalendar = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { school, user } = useAuthStore();
  const {
    calendar: calendarFromQuery,
    templates: templatesFromQuery,
    loading,
    invalidate: refetchAcademicCalendar,
    isFetching,
  } = useAcademicCalendarQuery();

  const [step, setStep] = React.useState(1);
  const [templates, setTemplates] = React.useState<CalendarTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = React.useState<CalendarTemplate | null>(null);
  const [config, setConfig] = React.useState<CalendarTemplate | null>(null);
  const [activeCalendar, setActiveCalendar] = React.useState<any>(null);
  const [saving, setSaving] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [mode, setMode] = React.useState<"SETUP" | "VIEW">("SETUP");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [toast, setToast] = React.useState<{ message: string; type: "success" | "error" | "info" } | null>(
    null
  );
  const [hydrated, setHydrated] = React.useState(false);

  const clearValidation = () => {
    setErrors([]);
    setFieldErrors({});
  };

  const canWrite = ["SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR", "VPI", "VPA"].includes(user?.role || "");

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  React.useEffect(() => {
    setTemplates(Array.isArray(templatesFromQuery) ? templatesFromQuery : []);
  }, [templatesFromQuery]);

  React.useEffect(() => {
    if (loading) return;

    if (calendarFromQuery) {
      setActiveCalendar(calendarFromQuery);
      if (mode === "VIEW" || !hydrated) {
        setConfig(hydrateCalendar(calendarFromQuery));
      }
    } else {
      setActiveCalendar(null);
    }

    if (!hydrated) {
      setMode(calendarFromQuery ? "VIEW" : "SETUP");
      setHydrated(true);
    }
  }, [calendarFromQuery, loading, hydrated, mode]);

  const handleSelectTemplate = (template: CalendarTemplate) => {
    const seeded = seedTemplateDates(JSON.parse(JSON.stringify(template)));
    setSelectedTemplate(seeded);
    setConfig(seeded);
    clearValidation();
  };

  const startReplaceSetup = () => {
    setIsEditing(false);
    setSelectedTemplate(null);
    setConfig(null);
    setStep(1);
    clearValidation();
    setMode("SETUP");
  };

  const startEditCurrent = () => {
    if (!activeCalendar) return;
    setConfig(hydrateCalendar(activeCalendar));
    setIsEditing(true);
    setSelectedTemplate(null);
    setStep(2);
    clearValidation();
    setMode("SETUP");
  };

  const cancelSetup = () => {
    clearValidation();
    setIsEditing(false);
    setSelectedTemplate(null);
    if (activeCalendar) {
      setConfig(hydrateCalendar(activeCalendar));
      setMode("VIEW");
      setStep(1);
    } else {
      setConfig(null);
      setMode("SETUP");
      setStep(1);
    }
  };

  const applyFieldValidation = (next: FieldErrors) => {
    setFieldErrors(next);
    const list = fieldErrorsList(next);
    setErrors(
      list.length
        ? [
            t("academicCalendar.validationIssues", { count: list.length }),
          ]
        : []
    );
    return list;
  };

  const handleNext = () => {
    clearValidation();
    if (step === 1) {
      if (!selectedTemplate && !config) {
        setErrors([t("academicCalendar.selectTemplateRequired")]);
        return;
      }
    }
    if (step === 2 && config) {
      const next = validatePeriodFields(config);
      const list = applyFieldValidation(next);
      if (list.length > 0) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    if (step === 3 && config) {
      const next = validateComponentFields(config);
      const list = applyFieldValidation(next);
      if (list.length > 0) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    clearValidation();
    if (isEditing && step === 2) return;
    setStep(step - 1);
  };

  const handleSave = async () => {
    if (!config || !school?.id) return;
    setSaving(true);
    clearValidation();
    try {
      const created = await academicCalendarApi.saveCalendar(school.id, config);
      setActiveCalendar(created);
      setConfig(hydrateCalendar(created));
      setIsEditing(false);
      setSelectedTemplate(null);
      setMode("VIEW");
      setStep(1);
      await refetchAcademicCalendar();
      showToast(t("academicCalendar.toast.applied"));
    } catch (err: any) {
      setErrors([err.message || t("academicCalendar.toast.applyFailed")]);
      showToast(err.message || t("academicCalendar.toast.saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleFinishEditing = async () => {
    if (!config) return;
    setSaving(true);
    clearValidation();

    const next = { ...validatePeriodFields(config), ...validateComponentFields(config) };
    const list = applyFieldValidation(next);
    if (list.length > 0) {
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      await Promise.all(
        config.periods.filter((p) => p.id).map((p) => academicCalendarApi.updatePeriod(p.id!, p))
      );

      await Promise.all(
        config.periods.flatMap((p) =>
          p.examComponents
            .filter((c) => c.id)
            .map((c) => academicCalendarApi.updateExamComponent(c.id!, c))
        )
      );

      setIsEditing(false);
      setMode("VIEW");
      setStep(1);
      await refetchAcademicCalendar();
      showToast(t("academicCalendar.toast.updatesSaved"));
    } catch (err: any) {
      setErrors([err.message || t("academicCalendar.toast.saveChangesFailed")]);
      showToast(t("academicCalendar.toast.saveChangesFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const setPeriods = (periods: Period[]) => {
    if (!config) return;
    setConfig({ ...config, periods });
    setFieldErrors({});
    setErrors([]);
  };

  const addPeriod = () => {
    if (!config) return;
    const nextNum = config.periods.length + 1;
    const lastPeriod = config.periods[config.periods.length - 1];
    let startDate = new Date().toISOString().split("T")[0];
    let endDate = new Date().toISOString().split("T")[0];

    if (lastPeriod?.endDate) {
      const lastEnd = new Date(lastPeriod.endDate);
      const nextStart = new Date(lastEnd);
      nextStart.setDate(nextStart.getDate() + 1);
      startDate = nextStart.toISOString().split("T")[0];
      const nextEnd = new Date(nextStart);
      nextEnd.setMonth(nextEnd.getMonth() + 3);
      endDate = nextEnd.toISOString().split("T")[0];
    }

    const newPeriod: Period = {
      periodNumber: nextNum,
      label: `Term ${nextNum}`,
      shortCode: `T${nextNum}`,
      startDate,
      endDate,
      annualWeightPct: 0,
      examComponents: [],
    };
    setPeriods([...config.periods, newPeriod]);
  };

  const removePeriod = (idx: number) => {
    if (!config) return;
    const indexedPeriods = config.periods
      .filter((_, i) => i !== idx)
      .map((p, i) => ({ ...p, periodNumber: i + 1 }));
    setPeriods(indexedPeriods);
  };

  const updatePeriod = (idx: number, updates: Partial<Period>) => {
    if (!config) return;
    const newPeriods = [...config.periods];
    newPeriods[idx] = { ...newPeriods[idx], ...updates };
    setPeriods(newPeriods);
  };

  const savePeriod = async (idx: number) => {
    if (!config || !isEditing) return;
    const period = config.periods[idx];
    if (!period.id) return;
    setSaving(true);
    try {
      await academicCalendarApi.updatePeriod(period.id, period);
      showToast(t("academicCalendar.toast.periodSaved"));
    } catch (err: any) {
      showToast(err.message || "Failed to save period", "error");
    } finally {
      setSaving(false);
    }
  };

  const addComponent = async (periodIdx: number) => {
    if (!config) return;
    const period = config.periods[periodIdx];
    const isSemester = config.patternType === "SEMESTER";
    const newComponent: ExamComponent = {
      label: isSemester ? "1st Period" : "New Component",
      shortCode: isSemester ? "P1" : "NEW",
      componentType: isSemester ? "FIRST_PERIOD" : "CUSTOM",
      maxScore: 100,
      weightPct: 0,
      isGraded: true,
      examStartDate: "",
      examEndDate: "",
      gradeSubmissionDeadline: "",
    };

    if (isEditing && period.id) {
      setSaving(true);
      try {
        const savedComp = await academicCalendarApi.createExamComponent(period.id, newComponent);
        const newPeriods = [...config.periods];
        newPeriods[periodIdx] = {
          ...period,
          examComponents: [...period.examComponents, savedComp],
        };
        setConfig({ ...config, periods: newPeriods });
      } catch (err: any) {
        showToast(err.message || "Failed to add component", "error");
      } finally {
        setSaving(false);
      }
    } else {
      const newPeriods = [...config.periods];
      newPeriods[periodIdx] = {
        ...period,
        examComponents: [...period.examComponents, newComponent],
      };
      setConfig({ ...config, periods: newPeriods });
    }
  };

  const removeComponent = async (periodIdx: number, compIdx: number) => {
    if (!config) return;
    const component = config.periods[periodIdx].examComponents[compIdx];

    if (isEditing && component.id) {
      const ok = await confirmAction({
        title: t("academicCalendar.confirm.deleteComponentTitle"),
        text: t("academicCalendar.confirm.deleteComponentText"),
        confirmText: t("common:delete"),
        danger: true,
      });
      if (!ok) return;
      setSaving(true);
      try {
        await academicCalendarApi.deleteExamComponent(component.id);
        const newPeriods = [...config.periods];
        newPeriods[periodIdx] = {
          ...newPeriods[periodIdx],
          examComponents: newPeriods[periodIdx].examComponents.filter((_, i) => i !== compIdx),
        };
        setConfig({ ...config, periods: newPeriods });
      } catch (err: any) {
        showToast(err.message || "Failed to delete component", "error");
      } finally {
        setSaving(false);
      }
    } else {
      const newPeriods = [...config.periods];
      newPeriods[periodIdx] = {
        ...newPeriods[periodIdx],
        examComponents: newPeriods[periodIdx].examComponents.filter((_, i) => i !== compIdx),
      };
      setConfig({ ...config, periods: newPeriods });
    }
  };

  const updateComponent = (periodIdx: number, compIdx: number, updates: Partial<ExamComponent>) => {
    if (!config) return;
    const newPeriods = [...config.periods];
    const comps = [...newPeriods[periodIdx].examComponents];
    comps[compIdx] = { ...comps[compIdx], ...updates };
    newPeriods[periodIdx] = { ...newPeriods[periodIdx], examComponents: comps };
    setConfig({ ...config, periods: newPeriods });
    setFieldErrors({});
    setErrors([]);
  };

  const saveComponent = async (periodIdx: number, compIdx: number) => {
    if (!config || !isEditing) return;
    const component = config.periods[periodIdx].examComponents[compIdx];
    if (!component.id) return;
    setSaving(true);
    try {
      await academicCalendarApi.updateExamComponent(component.id, component);
      showToast(t("academicCalendar.toast.componentSaved"));
    } catch (err: any) {
      showToast(err.message || "Failed to save component", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !hydrated) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 py-8">
        <div className="h-10 w-72 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-64 rounded-[32px] bg-slate-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-32 ${mode === "SETUP" ? "" : ""}`}>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className={`fixed top-6 right-6 z-[110] flex items-center gap-3 px-5 py-4 rounded-2xl border text-sm font-bold shadow-[0_4px_20px_rgb(0,0,0,0.08)] ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                : toast.type === "error"
                  ? "bg-rose-50 text-rose-800 border-rose-100"
                  : "bg-indigo-50 text-indigo-800 border-indigo-100"
            }`}
          >
            {toast.type === "error" ? (
              <XCircle className="w-5 h-5 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
            {t("academicCalendar.title")}
          </h1>
          <p className="text-slate-500 font-medium">
            {t("academicCalendar.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {mode === "VIEW" && canWrite && (
            <>
              <button
                type="button"
                onClick={startEditCurrent}
                className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                <Settings className="w-4 h-4" /> {t("academicCalendar.editCalendar")}
              </button>
              <button
                type="button"
                onClick={startReplaceSetup}
                className="inline-flex items-center gap-2 px-5 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-bold transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> {t("academicCalendar.replaceSetup")}
              </button>
            </>
          )}
          {mode === "SETUP" && (
            <>
              {(activeCalendar || isEditing) && (
                <button
                  type="button"
                  onClick={cancelSetup}
                  className="px-4 py-2 text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors"
                >
                  {t("common:cancel")}
                </button>
              )}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      step === s
                        ? "bg-indigo-600 text-white"
                        : step > s
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {step > s ? <Check className="w-4 h-4" /> : s}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {mode === "VIEW" && activeCalendar && <CalendarOverview activeCalendar={activeCalendar} />}

      {mode === "VIEW" && !activeCalendar && (
        <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center space-y-4 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CalendarDays className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">{t("academicCalendar.emptyTitle")}</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">{t("academicCalendar.emptyHint")}</p>
          {canWrite && (
            <button
              type="button"
              onClick={startReplaceSetup}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold"
            >
              {t("academicCalendar.startSetup")}
            </button>
          )}
        </div>
      )}

      {mode === "SETUP" && activeCalendar && !isEditing && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-5 py-4 text-sm text-indigo-900 font-medium">
          {t("academicCalendar.replaceActiveHint", { name: activeCalendar.name })}
        </div>
      )}

      {mode === "SETUP" && errors.length > 0 && (
        <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl flex gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-900">
              {Object.keys(fieldErrors).length > 0
                ? t("academicCalendar.validationCheckFields")
                : t("academicCalendar.validationUnable")}
            </h4>
            {errors.map((err, i) => (
              <p key={i} className="text-sm text-rose-700 font-medium">{err}</p>
            ))}
          </div>
        </div>
      )}

      {mode === "SETUP" && (
        <AnimatePresence mode="wait">
          {step === 1 && (
            <SetupStep1Templates
              handleSelectTemplate={handleSelectTemplate}
              selectedTemplate={selectedTemplate}
              templates={templates}
            />
          )}

          {step === 2 && config && (
            <SetupStep2Periods
              addPeriod={addPeriod}
              config={config}
              isEditing={isEditing}
              removePeriod={removePeriod}
              savePeriod={savePeriod}
              updatePeriod={updatePeriod}
              setPeriods={setPeriods}
              fieldErrors={fieldErrors}
            />
          )}

          {step === 3 && config && (
            <SetupStep3Exams
              addComponent={addComponent}
              config={config}
              isEditing={isEditing}
              removeComponent={removeComponent}
              saveComponent={saveComponent}
              updateComponent={updateComponent}
              setPeriods={setPeriods}
              fieldErrors={fieldErrors}
            />
          )}

          {step === 4 && config && <SetupStep4Review config={config} school={school} />}
        </AnimatePresence>
      )}

      {mode === "SETUP" && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-40 pointer-events-none">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.08)] pointer-events-auto">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1 || (isEditing && step === 2)}
              className="flex items-center gap-2 px-5 py-3 text-slate-500 font-bold hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" /> {t("academicCalendar.back")}
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={step === 1 && !selectedTemplate && !config}
                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {t("academicCalendar.next")} <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={isEditing ? handleFinishEditing : handleSave}
                disabled={saving || isFetching || !canWrite}
                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving
                  ? t("academicCalendar.saving")
                  : isEditing
                    ? t("academicCalendar.saveChanges")
                    : t("academicCalendar.applyToYear")}{" "}
                <Check className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
