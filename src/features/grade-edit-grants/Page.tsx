import React from "react";
import { KeyRound, Plus, Ban } from "lucide-react";
import { motion } from "motion/react";
import { PageShell, PageHeader, Surface, Button } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import { toast, confirmAction } from "../../lib/swal";

type Grant = {
  id: string;
  teacherId: string;
  scope: string;
  reason: string;
  expiresAt: string;
  startsAt: string;
  revokedAt?: string | null;
  classId?: string | null;
};

type Teacher = { id: string; name: string; email: string; role: string };

const SCOPES = [
  { value: "CA", label: "Continuous Assessment only" },
  { value: "INCOMPLETE", label: "Incomplete grades only" },
  { value: "CA_AND_INCOMPLETE", label: "CA + Incomplete" },
];

export function GradeEditAccessPage() {
  const { school, accessToken } = useAuthStore();
  const schoolId = school?.id;
  const [grants, setGrants] = React.useState<Grant[]>([]);
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [teacherId, setTeacherId] = React.useState("");
  const [scope, setScope] = React.useState("CA_AND_INCOMPLETE");
  const [reason, setReason] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [saving, setSaving] = React.useState(false);

  const reload = React.useCallback(async () => {
    if (!schoolId || !accessToken) return;
    setLoading(true);
    try {
      const [g, users] = await Promise.all([
        api.get(`/api/schools/${schoolId}/grades/edit-grants`),
        api.get(`/api/schools/${schoolId}/users?role=TEACHER`),
      ]);
      setGrants(Array.isArray(g) ? g : []);
      const list = Array.isArray(users) ? users : users?.users || [];
      setTeachers(
        list.filter((u: Teacher) => u.role === "TEACHER" || !u.role)
      );
    } catch (err: any) {
      await toast.fire({ icon: "error", title: err?.message || "Failed to load" });
    } finally {
      setLoading(false);
    }
  }, [schoolId, accessToken]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const teacherName = (id: string) =>
    teachers.find((t) => t.id === id)?.name || id.slice(0, 8);

  const create = async () => {
    if (!schoolId) return;
    if (!teacherId || reason.trim().length < 5) {
      await toast.fire({ icon: "warning", title: "Teacher and reason (min 5 chars) required" });
      return;
    }
    setSaving(true);
    try {
      await api.post(`/api/schools/${schoolId}/grades/edit-grants`, {
        teacherId,
        scope,
        reason: reason.trim(),
        expiresAt: new Date(`${expiresAt}T23:59:59`).toISOString(),
      });
      setShowForm(false);
      setReason("");
      await toast.fire({ icon: "success", title: "Grant created" });
      await reload();
    } catch (err: any) {
      await toast.fire({ icon: "error", title: err?.message || "Create failed" });
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (id: string) => {
    if (!schoolId) return;
    const ok = await confirmAction({
      title: "Revoke grant?",
      text: "The teacher will immediately lose special edit access.",
      confirmText: "Revoke",
    });
    if (!ok) return;
    try {
      await api.post(`/api/schools/${schoolId}/grades/edit-grants/${id}/revoke`, {});
      await toast.fire({ icon: "success", title: "Grant revoked" });
      await reload();
    } catch (err: any) {
      await toast.fire({ icon: "error", title: err?.message || "Revoke failed" });
    }
  };

  const active = grants.filter((g) => !g.revokedAt && new Date(g.expiresAt) > new Date());

  return (
    <PageShell>
      <PageHeader
        title="Grade edit access"
        subtitle="Grant teachers time-boxed access to update Continuous Assessment or Incomplete grades after deadlines or locks. Max 30 days."
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            New grant
          </Button>
        }
      />

      {showForm && (
        <Surface variant="primary" className="p-6 space-y-4">
          <h3 className="font-extrabold tracking-tight text-slate-900">Create grant</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1 text-sm">
              <span className="font-bold text-slate-700">Teacher</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
              >
                <option value="">Select…</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-bold text-slate-700">Scope</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              >
                {SCOPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-bold text-slate-700">Expires</span>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-bold text-slate-700">Reason</span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Fix CA marks for Period 2 after deadline"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <Button disabled={saving} onClick={() => void create()}>
              Create
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </Surface>
      )}

      <Surface variant="primary" className="p-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold tracking-tight text-slate-900">Active grants</h3>
            <p className="text-sm text-slate-500 font-mono">{active.length} active</p>
          </div>
        </div>
        {loading ? (
          <div className="p-8 h-32 bg-slate-50 animate-pulse" />
        ) : grants.length === 0 ? (
          <p className="p-8 text-sm text-slate-400 italic">No grants yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {grants.map((g) => {
              const isActive = !g.revokedAt && new Date(g.expiresAt) > new Date();
              return (
                <motion.li
                  key={g.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-bold text-slate-900">{teacherName(g.teacherId)}</p>
                    <p className="text-xs text-slate-500">
                      <span className="font-mono">{g.scope}</span>
                      {" · "}
                      expires {new Date(g.expiresAt).toLocaleDateString()}
                      {g.revokedAt ? " · revoked" : !isActive ? " · expired" : ""}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">{g.reason}</p>
                  </div>
                  {isActive && (
                    <Button size="compact" variant="secondary" onClick={() => void revoke(g.id)}>
                      <Ban className="w-4 h-4" />
                      Revoke
                    </Button>
                  )}
                </motion.li>
              );
            })}
          </ul>
        )}
      </Surface>
    </PageShell>
  );
}
