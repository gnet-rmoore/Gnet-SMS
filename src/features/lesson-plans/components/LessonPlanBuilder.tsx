import React, { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FeatureModalShell } from "../../academics-shared/FeatureModalShell";
import {
  normalizeCalendarPeriods,
  periodContainingDate,
  type ActiveCalendar,
} from "../../academics-shared/syllabusCalendar";
import type { LessonPlanForm } from "../types";

type Subject = { id: string; name: string; gradeLevelId?: string };
type GradeLevel = { id: string; name: string };
type Classroom = {
  id: string;
  name: string;
  subjectId?: string | null;
  gradeLevelId?: string | null;
};

type SchedulePeriodOption = {
  id: string;
  label: string;
  shortCode: string;
  startTime: string;
  endTime: string;
};

type Props = {
  open: boolean;
  form: LessonPlanForm;
  setForm: React.Dispatch<React.SetStateAction<LessonPlanForm>>;
  subjects: Subject[];
  gradeLevels: GradeLevel[];
  classrooms: Classroom[];
  schedulePeriods: SchedulePeriodOption[];
  calendar?: ActiveCalendar | null;
  submitting: boolean;
  editingId: string | null;
  onClose: () => void;
  onSave: () => void;
  onSaveAndSubmit: () => void;
};

const field =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400";
const label = "block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5";

export function LessonPlanBuilder({
  open,
  form,
  setForm,
  subjects,
  gradeLevels,
  classrooms,
  schedulePeriods,
  calendar = null,
  submitting,
  editingId,
  onClose,
  onSave,
  onSaveAndSubmit,
}: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const b = (key: string, opts?: Record<string, unknown>) =>
    t(`lessonPlans.components.builder.${key}`, opts as any) as string;

  const calendarPeriods = useMemo(
    () => normalizeCalendarPeriods(calendar?.periods),
    [calendar]
  );

  const lessonDateWarning = useMemo(() => {
    if (!form.lessonDate || calendarPeriods.length === 0) return null;
    const period = periodContainingDate(calendarPeriods, form.lessonDate);
    if (!period) return t("lessonPlans.components.builder.outsideAcademicPeriod");
    return null;
  }, [form.lessonDate, calendarPeriods, t]);

  if (!open) return null;

  const subjectRooms = classrooms.filter(
    (c) => c.subjectId && (!form.subjectId || c.subjectId === form.subjectId)
  );

  const updateObjective = (idx: number, value: string) => {
    setForm((f) => {
      const objectives = [...f.objectives];
      objectives[idx] = value;
      return { ...f, objectives };
    });
  };

  const updateActivity = (
    idx: number,
    patch: Partial<{ title: string; minutes: number | null; description: string }>
  ) => {
    setForm((f) => {
      const activities = [...f.activities];
      activities[idx] = { ...activities[idx], ...patch };
      return { ...f, activities };
    });
  };

  return (
    <FeatureModalShell
      eyebrow={editingId ? b("editEyebrow") : b("newEyebrow")}
      title={form.title.trim() || b("untitled")}
      subtitle={b("subtitle")}
      onClose={onClose}
      wide
      maxWidthClass="max-w-3xl"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm"
            disabled={submitting}
          >
            {t("common:cancel")}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={submitting || !form.subjectId}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-bold text-sm disabled:opacity-50"
          >
            {submitting ? t("common:saving") : b("saveDraft")}
          </button>
          <button
            type="button"
            onClick={onSaveAndSubmit}
            disabled={submitting || !form.subjectId}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm disabled:opacity-50"
          >
            {submitting ? b("working") : b("saveAndSubmit")}
          </button>
        </div>
      }
    >
      <div className="p-6 sm:p-8 space-y-8 overflow-y-auto">
        <section className="space-y-4">
          <h3 className="text-sm font-extrabold tracking-tight text-slate-900">{b("basics")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={label}>{b("title")}</label>
              <input
                className={field}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={b("titlePlaceholder")}
              />
            </div>
            <div>
              <label className={label}>{b("lessonDate")}</label>
              <input
                type="date"
                className={field}
                value={form.lessonDate}
                onChange={(e) => setForm((f) => ({ ...f, lessonDate: e.target.value }))}
              />
              {lessonDateWarning ? (
                <p className="mt-1.5 text-xs font-medium text-amber-700">{lessonDateWarning}</p>
              ) : null}
            </div>
            <div>
              <label className={label}>{b("duration")}</label>
              <input
                type="number"
                min={5}
                className={field}
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) || 45 }))
                }
              />
            </div>
            <div>
              <label className={label}>{b("bellPeriod")}</label>
              {schedulePeriods.length > 0 ? (
                <select
                  className={field}
                  value={form.schedulePeriodId}
                  onChange={(e) => {
                    const period = schedulePeriods.find((p) => p.id === e.target.value);
                    setForm((f) => ({
                      ...f,
                      schedulePeriodId: e.target.value,
                      periodLabel: period
                        ? `${period.shortCode} (${period.startTime}–${period.endTime})`
                        : "",
                      durationMinutes: period
                        ? Math.max(
                            5,
                            (() => {
                              const [sh, sm] = period.startTime.split(":").map(Number);
                              const [eh, em] = period.endTime.split(":").map(Number);
                              return eh * 60 + em - (sh * 60 + sm);
                            })()
                          )
                        : f.durationMinutes,
                    }));
                  }}
                >
                  <option value="">{b("bellNone")}</option>
                  {schedulePeriods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.shortCode} · {p.label} ({p.startTime}–{p.endTime})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={field}
                  value={form.periodLabel}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      periodLabel: e.target.value,
                      schedulePeriodId: "",
                    }))
                  }
                  placeholder={b("periodPlaceholder")}
                />
              )}
              {schedulePeriods.length > 0 && (
                <input
                  className={`${field} mt-2`}
                  value={form.periodLabel}
                  onChange={(e) => setForm((f) => ({ ...f, periodLabel: e.target.value }))}
                  placeholder={b("periodLabelHint")}
                />
              )}
            </div>
            <div>
              <label className={label}>{b("subject")}</label>
              <select
                className={field}
                value={form.subjectId}
                onChange={(e) => {
                  const sub = subjects.find((s) => s.id === e.target.value);
                  const gl = gradeLevels.find((g) => g.id === sub?.gradeLevelId);
                  setForm((f) => ({
                    ...f,
                    subjectId: e.target.value,
                    subjectName: sub?.name || "",
                    gradeLevelId: sub?.gradeLevelId || f.gradeLevelId,
                    gradeLevelName: gl?.name || f.gradeLevelName,
                    classroomId: "",
                    classroomName: "",
                  }));
                }}
              >
                <option value="">{b("selectSubject")}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>{b("gradeLevel")}</label>
              <select
                className={field}
                value={form.gradeLevelId}
                onChange={(e) => {
                  const gl = gradeLevels.find((g) => g.id === e.target.value);
                  setForm((f) => ({
                    ...f,
                    gradeLevelId: e.target.value,
                    gradeLevelName: gl?.name || "",
                  }));
                }}
              >
                <option value="">{b("none")}</option>
                {gradeLevels.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={label}>{b("classroom")}</label>
              <select
                className={field}
                value={form.classroomId}
                onChange={(e) => {
                  const room = classrooms.find((c) => c.id === e.target.value);
                  setForm((f) => ({
                    ...f,
                    classroomId: e.target.value,
                    classroomName: room?.name || "",
                  }));
                }}
              >
                <option value="">{b("none")}</option>
                {subjectRooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
              {b("objectives")}
            </h3>
            <button
              type="button"
              className="text-xs font-bold text-indigo-600 inline-flex items-center gap-1"
              onClick={() => setForm((f) => ({ ...f, objectives: [...f.objectives, ""] }))}
            >
              <Plus className="w-3.5 h-3.5" /> {b("add")}
            </button>
          </div>
          {form.objectives.map((obj, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                className={field}
                value={obj}
                onChange={(e) => updateObjective(idx, e.target.value)}
                placeholder={b("objectiveN", { n: idx + 1 })}
              />
              {form.objectives.length > 1 && (
                <button
                  type="button"
                  className="p-3 rounded-2xl border border-slate-100 text-slate-400 hover:text-rose-500"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      objectives: f.objectives.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <div>
            <label className={label}>{b("standards")}</label>
            <input
              className={field}
              value={form.standards}
              onChange={(e) => setForm((f) => ({ ...f, standards: e.target.value }))}
              placeholder={b("standardsPlaceholder")}
            />
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <label className={label}>{b("warmUp")}</label>
            <textarea
              className={`${field} min-h-[72px]`}
              value={form.warmUp}
              onChange={(e) => setForm((f) => ({ ...f, warmUp: e.target.value }))}
              placeholder={b("warmUpPlaceholder")}
            />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold tracking-tight text-slate-900">{b("activities")}</h3>
            <button
              type="button"
              className="text-xs font-bold text-indigo-600 inline-flex items-center gap-1"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  activities: [...f.activities, { title: "", minutes: 10, description: "" }],
                }))
              }
            >
              <Plus className="w-3.5 h-3.5" /> {b("addStep")}
            </button>
          </div>
          {form.activities.map((act, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-3"
            >
              <div className="flex gap-2">
                <input
                  className={field}
                  value={act.title}
                  onChange={(e) => updateActivity(idx, { title: e.target.value })}
                  placeholder={b("stepTitle", { n: idx + 1 })}
                />
                <input
                  type="number"
                  min={0}
                  className={`${field} w-24 shrink-0`}
                  value={act.minutes ?? ""}
                  onChange={(e) =>
                    updateActivity(idx, {
                      minutes: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  placeholder={t("lessonPlans.components.list.min")}
                  title={b("minutes")}
                />
                {form.activities.length > 1 && (
                  <button
                    type="button"
                    className="p-3 rounded-2xl border border-slate-100 text-slate-400 hover:text-rose-500 bg-white"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        activities: f.activities.filter((_, i) => i !== idx),
                      }))
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <textarea
                className={`${field} min-h-[64px]`}
                value={act.description || ""}
                onChange={(e) => updateActivity(idx, { description: e.target.value })}
                placeholder={b("stepDesc")}
              />
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
            {b("closeSupport")}
          </h3>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={label + " mb-0"}>{b("materials")}</label>
              <button
                type="button"
                className="text-xs font-bold text-indigo-600"
                onClick={() => setForm((f) => ({ ...f, materials: [...f.materials, ""] }))}
              >
                + {b("add")}
              </button>
            </div>
            {form.materials.map((m, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  className={field}
                  value={m}
                  onChange={(e) =>
                    setForm((f) => {
                      const materials = [...f.materials];
                      materials[idx] = e.target.value;
                      return { ...f, materials };
                    })
                  }
                  placeholder={b("materialPlaceholder")}
                />
                {form.materials.length > 1 && (
                  <button
                    type="button"
                    className="p-3 rounded-2xl border border-slate-100 text-slate-400"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        materials: f.materials.filter((_, i) => i !== idx),
                      }))
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div>
            <label className={label}>{b("assessment")}</label>
            <textarea
              className={`${field} min-h-[72px]`}
              value={form.assessment}
              onChange={(e) => setForm((f) => ({ ...f, assessment: e.target.value }))}
            />
          </div>
          <div>
            <label className={label}>{b("differentiation")}</label>
            <textarea
              className={`${field} min-h-[64px]`}
              value={form.differentiation}
              onChange={(e) => setForm((f) => ({ ...f, differentiation: e.target.value }))}
              placeholder={b("diffPlaceholder")}
            />
          </div>
          <div>
            <label className={label}>{b("homework")}</label>
            <textarea
              className={`${field} min-h-[64px]`}
              value={form.homework}
              onChange={(e) => setForm((f) => ({ ...f, homework: e.target.value }))}
            />
          </div>
        </section>
      </div>
    </FeatureModalShell>
  );
}
