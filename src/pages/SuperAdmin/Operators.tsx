import React from "react";
import { useAuthStore } from "../../store/authStore";
import { PageShell, PageHeader, Surface, Button, Field, DataTable, dataTableClass } from "../../components/ui";
import { toast, confirmAction } from "../../lib/swal";
import { Shield, UserPlus, Ban, Unlock, KeyRound } from "lucide-react";
import { FeatureModalShell } from "../../features/academics-shared/FeatureModalShell";

type Operator = {
  id: string;
  name: string;
  email: string;
  platformRole: string;
  isActive: boolean;
  capabilities: string[];
};

const ROLES = ["OWNER", "SUPPORT", "BILLING", "ANALYST"];

export const Operators = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const me = useAuthStore((s) => s.user);
  const [ops, setOps] = React.useState<Operator[]>([]);
  const [pending, setPending] = React.useState<any[]>([]);
  const [error, setError] = React.useState("");
  const [showAdd, setShowAdd] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", email: "", platformRole: "SUPPORT" });
  const [createdTemp, setCreatedTemp] = React.useState<{ email: string; password: string } | null>(
    null
  );

  const load = React.useCallback(async () => {
    if (!accessToken) return;
    try {
      const [o, d] = await Promise.all([
        fetch("/api/super-admin/operators", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then(async (r) => ({ ok: r.ok, data: await r.json() })),
        fetch("/api/super-admin/delete-requests", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then(async (r) => ({ ok: r.ok, data: await r.json() })),
      ]);
      if (!o.ok) {
        setError(o.data.error || "Cannot load operators (need operators.manage)");
        setOps([]);
      } else {
        setError("");
        setOps(Array.isArray(o.data) ? o.data : []);
      }
      setPending(d.ok && Array.isArray(d.data) ? d.data : []);
    } catch (err: any) {
      setError(err.message);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const setRole = async (id: string, platformRole: string) => {
    const res = await fetch(`/api/super-admin/operators/${id}/role`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ platformRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      await toast.fire({ icon: "error", title: data.error || "Update failed" });
      return;
    }
    await toast.fire({ icon: "success", title: "Operator role updated" });
    void load();
  };

  const setActive = async (id: string, isActive: boolean) => {
    if (!isActive) {
      const ok = await confirmAction({
        title: "Deactivate operator?",
        text: "They will not be able to sign in to the Super Admin console.",
        confirmText: "Deactivate",
        danger: true,
      });
      if (!ok) return;
    }
    const res = await fetch(`/api/super-admin/operators/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      await toast.fire({ icon: "error", title: data.error || "Update failed" });
      return;
    }
    await toast.fire({ icon: "success", title: isActive ? "Operator reactivated" : "Operator deactivated" });
    void load();
  };

  const resetPassword = async (id: string) => {
    const ok = await confirmAction({
      title: "Reset operator password?",
      text: "A temporary password will be shown once. They must change it on next login.",
      confirmText: "Reset",
    });
    if (!ok) return;
    const res = await fetch(`/api/super-admin/operators/${id}/reset-password`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      await toast.fire({ icon: "error", title: data.error || "Reset failed" });
      return;
    }
    setCreatedTemp({ email: data.email, password: data.tempPassword });
  };

  const createOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/super-admin/operators", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        await toast.fire({ icon: "error", title: data.error || "Create failed" });
        return;
      }
      setShowAdd(false);
      setForm({ name: "", email: "", platformRole: "SUPPORT" });
      setCreatedTemp({ email: data.email, password: data.tempPassword });
      void load();
    } finally {
      setSaving(false);
    }
  };

  const approveDelete = async (requestId: string, force = false) => {
    const res = await fetch(`/api/super-admin/delete-requests/${requestId}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ forceSelfApprove: force }),
    });
    const data = await res.json();
    if (!res.ok) {
      await toast.fire({ icon: "error", title: data.error || "Approve failed" });
      return;
    }
    await toast.fire({ icon: "success", title: "School deleted" });
    void load();
  };

  return (
    <PageShell width="wide">
      <PageHeader
        title="Operators & dual-control"
        subtitle="Invite global Super Admins (OWNER / SUPPORT / BILLING / ANALYST) and approve pending school deletes."
        actions={
          !error ? (
            <Button onClick={() => setShowAdd(true)}>
              <UserPlus className="w-4 h-4" />
              Add operator
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 font-medium">
          {error}
        </div>
      )}

      <Surface variant="primary" className="p-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h3 className="font-extrabold tracking-tight text-slate-900">Platform operators</h3>
        </div>
        <DataTable>
          <table className={dataTableClass.table}>
            <thead className={dataTableClass.thead}>
              <tr>
                <th className={`${dataTableClass.th} w-[24%]`}>Operator</th>
                <th className={`${dataTableClass.th} w-[12%]`}>Status</th>
                <th className={`${dataTableClass.th} w-[18%]`}>Role</th>
                <th className={`${dataTableClass.th} w-[30%]`}>Capabilities</th>
                <th className={`${dataTableClass.thEnd} w-[16%]`}>Actions</th>
              </tr>
            </thead>
            <tbody className={dataTableClass.tbody}>
              {ops.map((op) => (
                <tr key={op.id}>
                  <td className={dataTableClass.td}>
                    <p className="font-bold text-slate-900 truncate">{op.name}</p>
                    <p className="text-xs text-slate-500 truncate">{op.email}</p>
                  </td>
                  <td className={dataTableClass.td}>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        op.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {op.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className={dataTableClass.td}>
                    <select
                      className="w-full max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium"
                      value={op.platformRole}
                      disabled={op.id === me?.id || !op.isActive}
                      onChange={(e) => void setRole(op.id, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`${dataTableClass.td} text-xs text-slate-500 font-mono`}>
                    <span className="block truncate">
                      {op.capabilities.slice(0, 6).join(", ")}
                      {op.capabilities.length > 6 ? "…" : ""}
                    </span>
                  </td>
                  <td className={dataTableClass.td}>
                    {op.id !== me?.id ? (
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          size="compact"
                          variant="ghost"
                          className="px-2 min-w-8"
                          title={op.isActive ? "Deactivate" : "Reactivate"}
                          aria-label={op.isActive ? "Deactivate" : "Reactivate"}
                          onClick={() => void setActive(op.id, !op.isActive)}
                        >
                          {op.isActive ? <Ban className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </Button>
                        {op.isActive && (
                          <Button
                            size="compact"
                            variant="ghost"
                            className="px-2 min-w-8"
                            title="Reset password"
                            aria-label="Reset password"
                            onClick={() => void resetPassword(op.id)}
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      </Surface>

      <Surface variant="primary" className="p-6 space-y-4">
        <h3 className="font-extrabold tracking-tight text-slate-900">Pending school deletes</h3>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500">No pending dual-control delete requests.</p>
        ) : (
          pending.map((row) => (
            <div
              key={row.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4"
            >
              <div>
                <p className="font-bold text-slate-900">{row.school?.name || row.schoolId}</p>
                <p className="text-xs text-slate-500">{row.reason}</p>
                <p className="text-xs font-mono text-slate-400">
                  expires {new Date(row.expiresAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="danger" size="compact" onClick={() => void approveDelete(row.id)}>
                  Approve delete
                </Button>
                {row.requestedById === me?.id && (
                  <Button
                    variant="secondary"
                    size="compact"
                    onClick={() => void approveDelete(row.id, true)}
                  >
                    Force (solo OWNER)
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </Surface>

      {showAdd && (
        <FeatureModalShell
          title="Add platform operator"
          subtitle="Creates a Super Admin account. A temporary password is shown once — they must change it on first login."
          onClose={() => setShowAdd(false)}
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setShowAdd(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button form="add-operator-form" type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? "Creating…" : "Create operator"}
              </Button>
            </div>
          }
        >
          <form id="add-operator-form" className="space-y-5 p-6 sm:p-8" onSubmit={(e) => void createOperator(e)}>
            <Field label="Name" required>
              {({ id, controlClassName }) => (
                <input
                  id={id}
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={controlClassName}
                />
              )}
            </Field>
            <Field label="Email" required>
              {({ id, controlClassName }) => (
                <input
                  id={id}
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={controlClassName}
                />
              )}
            </Field>
            <Field label="Platform role">
              {({ id, controlClassName }) => (
                <select
                  id={id}
                  value={form.platformRole}
                  onChange={(e) => setForm((f) => ({ ...f, platformRole: e.target.value }))}
                  className={controlClassName}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </form>
        </FeatureModalShell>
      )}

      {createdTemp && (
        <FeatureModalShell
          title="Temporary password"
          subtitle="Copy this now — it will not be shown again."
          onClose={() => setCreatedTemp(null)}
          footer={
            <div className="flex justify-end">
              <Button onClick={() => setCreatedTemp(null)}>Done</Button>
            </div>
          }
        >
          <div className="space-y-4 p-6 sm:p-8">
            <p className="text-sm text-slate-600">
              Account: <span className="font-mono font-bold text-slate-900">{createdTemp.email}</span>
            </p>
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 font-mono text-sm break-all text-slate-900">
              {createdTemp.password}
            </p>
            <Button
              variant="secondary"
              className="w-full"
              onClick={async () => {
                await navigator.clipboard.writeText(createdTemp.password);
                await toast.fire({ icon: "success", title: "Copied" });
              }}
            >
              Copy password
            </Button>
          </div>
        </FeatureModalShell>
      )}
    </PageShell>
  );
};
