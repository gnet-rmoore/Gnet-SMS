import React from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, Loader2, Plus, Trash2, Clock } from "lucide-react";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import { FriendlyDateTimeField } from "../../academic-calendar/components/FriendlyDateTimeField";
import { useAuthStore } from "../../../store/authStore";
import { api } from "../../../services/api";
import { confirmAction } from "../../../lib/swal";
import { examsApi } from "../api";
import { usePageToast, PageToast } from "../../academics-shared/PageToast";

type Classroom = { id: string; name: string; grade?: string; subject?: string };

type ScheduleRow = {
  id: string;
  examId: string;
  classId: string | null;
  room: string | null;
  session: string | null;
  invigilatorId: string | null;
  startAt: string;
  endAt: string;
  note: string | null;
  synthetic?: boolean;
};

type Props = {
  examId: string;
  examTitle: string;
  onClose: () => void;
  onChanged?: () => void;
};

const emptyForm = () => ({
  classId: "",
  room: "",
  session: "",
  startAt: "",
  endAt: "",
  note: "",
});

function datetimeLocal(value?: string | null): string {
  if (!value) return "";
  if (value.includes("T")) return value.substring(0, 16);
  return value.substring(0, 10);
}

export function ExamScheduleModal({ examId, examTitle, onClose, onChanged }: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const { school } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const [rows, setRows] = React.useState<ScheduleRow[]>([]);
  const [classrooms, setClassrooms] = React.useState<Classroom[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm());

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await examsApi.listSchedules(examId);
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err?.message || t("exams.schedule.loadFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [examId, showToast, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!school?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const cls = await api.get(`/api/schools/${school.id}/classrooms`);
        if (!cancelled) setClassrooms(Array.isArray(cls) ? cls : []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [school?.id]);

  const classLabel = (classId: string | null) => {
    if (!classId) return t("exams.schedule.classAll");
    const c = classrooms.find((x) => x.id === classId);
    if (!c) return classId;
    return `${c.name}${c.grade ? ` (${c.grade})` : ""}${c.subject ? ` — ${c.subject}` : ""}`;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startAt || !form.endAt) {
      showToast(t("exams.schedule.setWindow"), "error");
      return;
    }
    if (new Date(form.endAt) <= new Date(form.startAt)) {
      showToast(t("exams.schedule.windowInvalid"), "error");
      return;
    }
    setSaving(true);
    try {
      await examsApi.createSchedule(examId, {
        classId: form.classId || null,
        room: form.room.trim() || null,
        session: form.session.trim() || null,
        startAt: form.startAt,
        endAt: form.endAt,
        note: form.note.trim() || null,
      });
      setForm(emptyForm());
      showToast(t("exams.schedule.created"), "success");
      await load();
      onChanged?.();
    } catch (err: any) {
      showToast(err?.message || t("exams.schedule.createFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: ScheduleRow) => {
    const ok = await confirmAction({
      title: t("exams.schedule.confirmDeleteTitle"),
      text: t("exams.schedule.confirmDeleteText"),
      confirmText: t("common:delete"),
      icon: "warning",
    });
    if (!ok) return;
    try {
      await examsApi.deleteSchedule(row.id);
      showToast(t("exams.schedule.deleted"), "success");
      await load();
      onChanged?.();
    } catch (err: any) {
      showToast(err?.message || t("exams.schedule.deleteFailed"), "error");
    }
  };

  return (
    <FeatureModalShell
      title={t("exams.schedule.title")}
      subtitle={examTitle}
      eyebrow={t("exams.schedule.eyebrow")}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            {t("common:close")}
          </button>
        </div>
      }
    >
      <PageToast toast={toast} />
      <div className="p-6 sm:p-8 space-y-6">
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> {t("common:loading")}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500">{t("exams.schedule.empty")}</p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 space-y-1.5">
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-indigo-500" />
                    {classLabel(row.classId)}
                  </p>
                  <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {datetimeLocal(row.startAt)} → {datetimeLocal(row.endAt)}
                  </p>
                  {(row.room || row.session) && (
                    <p className="text-xs text-slate-500">
                      {[row.room, row.session].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {row.note && <p className="text-xs text-slate-500">{row.note}</p>}
                  {row.synthetic && (
                    <p className="text-xs text-amber-600 font-semibold">
                      {t("exams.schedule.syntheticNote")}
                    </p>
                  )}
                </div>
                {!row.synthetic && (
                  <button
                    type="button"
                    onClick={() => handleDelete(row)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
                    aria-label={t("exams.schedule.delete")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAdd} className="space-y-4 border-t border-slate-100 pt-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="sched-class" className={fieldLabel}>
                {t("exams.schedule.class")}
              </label>
              <select
                id="sched-class"
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
                className={`mt-2 ${fieldInput}`}
              >
                <option value="">{t("exams.schedule.classAll")}</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.grade ? `(${c.grade})` : ""} {c.subject ? `— ${c.subject}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sched-room" className={fieldLabel}>
                {t("exams.schedule.room")}
              </label>
              <input
                id="sched-room"
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                placeholder={t("exams.schedule.roomPlaceholder")}
                className={`mt-2 ${fieldInput}`}
              />
            </div>
            <div>
              <label htmlFor="sched-session" className={fieldLabel}>
                {t("exams.schedule.session")}
              </label>
              <input
                id="sched-session"
                value={form.session}
                onChange={(e) => setForm({ ...form, session: e.target.value })}
                placeholder={t("exams.schedule.sessionPlaceholder")}
                className={`mt-2 ${fieldInput}`}
              />
            </div>
            <FriendlyDateTimeField
              id="sched-start"
              label={t("exams.schedule.startAt")}
              value={form.startAt}
              onChange={(v) => setForm((prev) => ({ ...prev, startAt: v }))}
            />
            <FriendlyDateTimeField
              id="sched-end"
              label={t("exams.schedule.endAt")}
              value={form.endAt}
              min={form.startAt || undefined}
              onChange={(v) => setForm((prev) => ({ ...prev, endAt: v }))}
            />
            <div className="sm:col-span-2">
              <label htmlFor="sched-note" className={fieldLabel}>
                {t("exams.schedule.note")}
              </label>
              <input
                id="sched-note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className={`mt-2 ${fieldInput}`}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? t("exams.schedule.saving") : t("exams.schedule.add")}
          </button>
        </form>
      </div>
    </FeatureModalShell>
  );
}
