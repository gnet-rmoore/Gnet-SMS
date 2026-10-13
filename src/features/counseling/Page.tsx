import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { HeartPulse, Plus, RefreshCw } from "lucide-react";
import { PageShell, PageHeader, Surface, StatTile, Button } from "../../components/ui";
import { FeatureModalShell, fieldInput, fieldLabel } from "../academics-shared/FeatureModalShell";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useAuthStore } from "../../store/authStore";
import { counselingApi } from "./api";
import { useDirectory, formatDateTime } from "../campus-shared/useDirectory";
import { ExportCsvButton } from "../campus-shared/ExportCsvButton";

type CounselingSession = {
  id: string;
  studentId: string;
  studentName?: string;
  sessionDate: string;
  sessionType: string;
  summary: string;
  confidentialNotes?: string | null;
  followUpAt?: string | null;
};

const COUNSELOR_ROLES = ["COUNSELOR", "SCHOOL_ADMIN", "PRINCIPAL"];

export function Counseling() {
  const { school, user } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const { students } = useDirectory(school?.id);

  const [sessions, setSessions] = useState<CounselingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filterStudentId, setFilterStudentId] = useState("");
  const [form, setForm] = useState({
    studentId: "",
    sessionType: "CHECK_IN",
    summary: "",
    confidentialNotes: "",
    followUpAt: "",
  });

  const canViewConfidential = COUNSELOR_ROLES.includes(user?.role || "");

  const load = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const rows = await counselingApi.fetchSessions(
        school.id,
        filterStudentId || undefined
      );
      setSessions(Array.isArray(rows) ? rows : []);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to load sessions", "error");
    } finally {
      setLoading(false);
    }
  }, [school?.id, filterStudentId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: sessions.length,
      checkIns: sessions.filter((s) => s.sessionType === "CHECK_IN").length,
      followUps: sessions.filter((s) => s.followUpAt).length,
      students: new Set(sessions.map((s) => s.studentId)).size,
    }),
    [sessions]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !form.studentId || !form.summary.trim()) {
      showToast("Student and summary are required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await counselingApi.createSession(school.id, {
        studentId: form.studentId,
        sessionType: form.sessionType,
        summary: form.summary.trim(),
        confidentialNotes: form.confidentialNotes.trim() || undefined,
        followUpAt: form.followUpAt || undefined,
      });
      showToast("Session logged", "success");
      setShowModal(false);
      setForm({ studentId: "", sessionType: "CHECK_IN", summary: "", confidentialNotes: "", followUpAt: "" });
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to log session", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell className="pb-16">
      <PageToast toast={toast} />
      <PageHeader
        title="Counseling"
        subtitle="Session log for student well-being support."
        actions={
          <>
            <ExportCsvButton
              filename={`counseling_sessions_${new Date().toISOString().slice(0, 10)}`}
              headers={["Student", "Date", "Type", "Summary", "Follow-up"]}
              rows={sessions.map((s) => [
                s.studentName || s.studentId,
                formatDateTime(s.sessionDate),
                s.sessionType,
                s.summary,
                s.followUpAt ? formatDateTime(s.followUpAt) : "",
              ])}
              disabled={loading}
            />
            <Button variant="secondary" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" />
              Log session
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Sessions" value={stats.total} icon={<HeartPulse className="w-5 h-5" />} />
        <StatTile label="Check-ins" value={stats.checkIns} />
        <StatTile label="With follow-up" value={stats.followUps} />
        <StatTile label="Students" value={stats.students} />
      </div>

      <Surface variant="nested" className="flex flex-wrap gap-3 items-end">
        <div className="min-w-[200px] flex-1">
          <label className={fieldLabel}>Filter by student</label>
          <select
            className={fieldInput}
            value={filterStudentId}
            onChange={(e) => setFilterStudentId(e.target.value)}
          >
            <option value="">All students</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </Surface>

      <Surface>
        {loading ? (
          <p className="text-slate-500 font-medium py-8 text-center">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-slate-500 font-medium py-8 text-center">No counseling sessions yet.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-bold text-slate-900">{session.studentName || session.studentId}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {session.sessionType} · {formatDateTime(session.sessionDate)}
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-700">{session.summary}</p>
                {canViewConfidential && session.confidentialNotes && (
                  <p className="text-sm text-slate-500 font-medium border-t border-slate-200 pt-2">
                    Confidential: {session.confidentialNotes}
                  </p>
                )}
                {session.followUpAt && (
                  <p className="text-xs text-slate-500 font-medium">Follow-up: {formatDateTime(session.followUpAt)}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </Surface>

      <AnimatePresence>
        {showModal && (
          <FeatureModalShell
            title="Log counseling session"
            onClose={() => setShowModal(false)}
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button loading={submitting} onClick={handleCreate}>Save session</Button>
              </div>
            }
          >
            <form className="p-6 sm:p-8 space-y-4" onSubmit={handleCreate}>
              <div>
                <label className={fieldLabel}>Student</label>
                <select className={fieldInput} value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))} required>
                  <option value="">Select student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={fieldLabel}>Session type</label>
                <select className={fieldInput} value={form.sessionType} onChange={(e) => setForm((f) => ({ ...f, sessionType: e.target.value }))}>
                  <option value="CHECK_IN">Check-in</option>
                  <option value="CRISIS">Crisis</option>
                  <option value="SCHEDULED">Scheduled</option>
                </select>
              </div>
              <div>
                <label className={fieldLabel}>Summary</label>
                <textarea className={fieldInput} rows={3} value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} required />
              </div>
              {canViewConfidential && (
                <div>
                  <label className={fieldLabel}>Confidential notes</label>
                  <textarea className={fieldInput} rows={2} value={form.confidentialNotes} onChange={(e) => setForm((f) => ({ ...f, confidentialNotes: e.target.value }))} />
                </div>
              )}
              <div>
                <label className={fieldLabel}>Follow-up date</label>
                <input type="datetime-local" className={fieldInput} value={form.followUpAt} onChange={(e) => setForm((f) => ({ ...f, followUpAt: e.target.value }))} />
              </div>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
