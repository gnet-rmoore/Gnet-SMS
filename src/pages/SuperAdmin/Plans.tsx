import React from "react";
import { useAuthStore } from "../../store/authStore";
import { PageShell, PageHeader, Surface, Button, StatTile, Field, DataTable, dataTableClass } from "../../components/ui";
import { CreditCard, Check, Pencil, Plus } from "lucide-react";
import { toast } from "../../lib/swal";
import { Link } from "react-router-dom";
import { FeatureModalShell } from "../../features/academics-shared/FeatureModalShell";
import {
  featuresByGroup,
  featureLabel,
  PLATFORM_FEATURE_KEYS,
} from "../../constants/platformFeatures";

type Plan = {
  code: string;
  label: string;
  description: string;
  maxStudents: number | null;
  maxStaff: number | null;
  maxStorageMb?: number | null;
  features: string[];
  monthlyPriceUsd?: number;
  trialDays?: number;
  isActive?: boolean;
};

type SchoolRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  planCode?: string | null;
  billingStatus?: string | null;
  studentCount?: number;
  entitlementsOverride?: string | null;
  quotaOverrides?: string | null;
  entitlements?: string[];
  quotas?: { maxStudents: number | null; maxStaff: number | null; maxStorageMb: number | null };
};

type PlanForm = {
  label: string;
  description: string;
  monthlyPriceUsd: string;
  maxStudents: string;
  maxStaff: string;
  maxStorageMb: string;
  trialDays: string;
  features: string[];
  isActive: boolean;
};

function emptyPlanForm(p?: Plan): PlanForm {
  return {
    label: p?.label || "",
    description: p?.description || "",
    monthlyPriceUsd: String(p?.monthlyPriceUsd ?? 0),
    maxStudents: p?.maxStudents == null ? "" : String(p.maxStudents),
    maxStaff: p?.maxStaff == null ? "" : String(p.maxStaff),
    maxStorageMb: p?.maxStorageMb == null ? "" : String(p.maxStorageMb),
    trialDays: p?.trialDays == null ? "" : String(p.trialDays),
    features: [...(p?.features || ["core"])],
    isActive: p?.isActive !== false,
  };
}

function parseOptionalInt(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

export const Plans = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [schools, setSchools] = React.useState<SchoolRow[]>([]);
  const [assigning, setAssigning] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<Plan | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState<PlanForm>(emptyPlanForm());
  const [createCode, setCreateCode] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [overrideSchool, setOverrideSchool] = React.useState<SchoolRow | null>(null);
  const [overrideFeatures, setOverrideFeatures] = React.useState<string[]>([]);
  const [overrideQuotas, setOverrideQuotas] = React.useState({
    maxStudents: "",
    maxStaff: "",
    maxStorageMb: "",
  });
  const [useOverride, setUseOverride] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!accessToken) return;
    const [p, s] = await Promise.all([
      fetch("/api/super-admin/plans", { headers: { Authorization: `Bearer ${accessToken}` } }).then(
        (r) => r.json()
      ),
      fetch("/api/super-admin/schools", { headers: { Authorization: `Bearer ${accessToken}` } }).then(
        (r) => r.json()
      ),
    ]);
    setPlans(Array.isArray(p) ? p : []);
    setSchools(Array.isArray(s) ? s : []);
  }, [accessToken]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const assign = async (schoolId: string, planCode: string) => {
    setAssigning(schoolId);
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/plan`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        await toast.fire({ icon: "error", title: data.error || "Assign failed" });
        return;
      }
      setSchools((prev) => prev.map((row) => (row.id === schoolId ? { ...row, planCode } : row)));
      await toast.fire({ icon: "success", title: `Plan set to ${planCode}` });
    } finally {
      setAssigning(null);
    }
  };

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setForm(emptyPlanForm(plan));
  };

  const openCreate = () => {
    setCreating(true);
    setCreateCode("");
    setForm(emptyPlanForm());
  };

  const savePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        description: form.description.trim(),
        monthlyPriceUsd: Number(form.monthlyPriceUsd) || 0,
        maxStudents: parseOptionalInt(form.maxStudents),
        maxStaff: parseOptionalInt(form.maxStaff),
        maxStorageMb: parseOptionalInt(form.maxStorageMb),
        trialDays: parseOptionalInt(form.trialDays),
        features: form.features,
        isActive: form.isActive,
      };
      let res: Response;
      if (creating) {
        res = await fetch("/api/super-admin/plans", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...payload, code: createCode }),
        });
      } else if (editing) {
        res = await fetch(`/api/super-admin/plans/${editing.code}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } else {
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        await toast.fire({ icon: "error", title: data.error || "Save failed" });
        return;
      }
      await toast.fire({ icon: "success", title: creating ? "Plan created" : "Plan updated" });
      setEditing(null);
      setCreating(false);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const openOverrides = async (school: SchoolRow) => {
    if (!accessToken) return;
    const res = await fetch(`/api/super-admin/schools/${school.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      await toast.fire({ icon: "error", title: data.error || "Load school failed" });
      return;
    }
    const hasOverride = Boolean(data.entitlementsOverride);
    setOverrideSchool({ ...school, ...data });
    setUseOverride(hasOverride);
    setOverrideFeatures(
      hasOverride
        ? Array.isArray(data.entitlements)
          ? data.entitlements
          : []
        : [...(data.plan?.features || [])]
    );
    const q = data.quotas || {};
    const qo = data.quotaOverrides ? (() => {
      try {
        return JSON.parse(data.quotaOverrides);
      } catch {
        return {};
      }
    })() : {};
    setOverrideQuotas({
      maxStudents: qo.maxStudents != null ? String(qo.maxStudents) : q.maxStudents != null ? String(q.maxStudents) : "",
      maxStaff: qo.maxStaff != null ? String(qo.maxStaff) : q.maxStaff != null ? String(q.maxStaff) : "",
      maxStorageMb:
        qo.maxStorageMb != null ? String(qo.maxStorageMb) : q.maxStorageMb != null ? String(q.maxStorageMb) : "",
    });
  };

  const saveOverrides = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideSchool) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        planCode: overrideSchool.planCode || "STANDARD",
        entitlementsOverride: useOverride ? overrideFeatures : null,
        quotaOverrides: useOverride
          ? {
              maxStudents: parseOptionalInt(overrideQuotas.maxStudents),
              maxStaff: parseOptionalInt(overrideQuotas.maxStaff),
              maxStorageMb: parseOptionalInt(overrideQuotas.maxStorageMb),
            }
          : null,
      };
      const res = await fetch(`/api/super-admin/schools/${overrideSchool.id}/plan`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        await toast.fire({ icon: "error", title: data.error || "Override save failed" });
        return;
      }
      await toast.fire({ icon: "success", title: useOverride ? "Overrides saved" : "Overrides cleared" });
      setOverrideSchool(null);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (key: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  };

  const planFormModal = (title: string, onClose: () => void) => (
    <FeatureModalShell
      title={title}
      subtitle="Changing list price updates reported MRR for ACTIVE_PAID schools. Feature overrides on schools are separate."
      onClose={onClose}
      wide
      maxWidthClass="max-w-2xl"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button form="plan-edit-form" type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      }
    >
      <form
        id="plan-edit-form"
        className="space-y-8 p-6 sm:p-8"
        onSubmit={(e) => void savePlan(e)}
      >
        <section className="space-y-4">
          <h3 className="text-sm font-extrabold tracking-tight text-slate-900">Basics</h3>
          {creating && (
            <Field label="Plan code" hint="Uppercase letters, numbers, underscore" required>
              {({ id, controlClassName, describedBy }) => (
                <input
                  id={id}
                  required
                  aria-describedby={describedBy}
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                  className={`${controlClassName} font-mono`}
                  placeholder="CUSTOM_PRO"
                />
              )}
            </Field>
          )}
          <Field label="Label" required>
            {({ id, controlClassName }) => (
              <input
                id={id}
                required
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className={controlClassName}
              />
            )}
          </Field>
          <Field label="Description">
            {({ id, controlClassName }) => (
              <textarea
                id={id}
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={`${controlClassName} min-h-[5.5rem] resize-y`}
              />
            )}
          </Field>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-extrabold tracking-tight text-slate-900">Pricing & limits</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Monthly price (USD)">
              {({ id, controlClassName }) => (
                <input
                  id={id}
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.monthlyPriceUsd}
                  onChange={(e) => setForm((f) => ({ ...f, monthlyPriceUsd: e.target.value }))}
                  className={`${controlClassName} font-mono`}
                />
              )}
            </Field>
            <Field label="Trial days" hint="Blank = none">
              {({ id, controlClassName, describedBy }) => (
                <input
                  id={id}
                  type="number"
                  min={0}
                  aria-describedby={describedBy}
                  value={form.trialDays}
                  onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value }))}
                  className={`${controlClassName} font-mono`}
                />
              )}
            </Field>
            <Field label="Max students" hint="Blank = unlimited">
              {({ id, controlClassName, describedBy }) => (
                <input
                  id={id}
                  type="number"
                  min={0}
                  aria-describedby={describedBy}
                  value={form.maxStudents}
                  onChange={(e) => setForm((f) => ({ ...f, maxStudents: e.target.value }))}
                  className={`${controlClassName} font-mono`}
                />
              )}
            </Field>
            <Field label="Max staff" hint="Blank = unlimited">
              {({ id, controlClassName, describedBy }) => (
                <input
                  id={id}
                  type="number"
                  min={0}
                  aria-describedby={describedBy}
                  value={form.maxStaff}
                  onChange={(e) => setForm((f) => ({ ...f, maxStaff: e.target.value }))}
                  className={`${controlClassName} font-mono`}
                />
              )}
            </Field>
            <Field label="Max storage (MB)" hint="Blank = unlimited" className="sm:col-span-2">
              {({ id, controlClassName, describedBy }) => (
                <input
                  id={id}
                  type="number"
                  min={0}
                  aria-describedby={describedBy}
                  value={form.maxStorageMb}
                  onChange={(e) => setForm((f) => ({ ...f, maxStorageMb: e.target.value }))}
                  className={`${controlClassName} font-mono`}
                />
              )}
            </Field>
          </div>
        </section>

        <section className="space-y-5">
          <div>
            <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
              Features ({PLATFORM_FEATURE_KEYS.length})
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              All major platform modules. Check what this plan includes. Per-school overrides are set separately.
            </p>
          </div>
          <div className="space-y-5">
            {featuresByGroup().map(({ group, items }) => (
              <div key={group} className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{group}</p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {items.map(({ key, label }) => {
                    const checked = form.features.includes(key);
                    return (
                      <label
                        key={key}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors ${
                          checked
                            ? "border-indigo-200 bg-indigo-50/70"
                            : "border-slate-100 bg-slate-50 hover:border-slate-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={checked}
                          onChange={() =>
                            toggleFeature(key, form.features, (features) =>
                              setForm((f) => ({ ...f, features }))
                            )
                          }
                        />
                        <span>
                          <span className="block font-semibold text-slate-800">{label}</span>
                          <span className="mt-0.5 block font-mono text-[11px] text-slate-400">{key}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {!creating && (
          <section className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
            <label className="flex items-start gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              <span>
                <span className="block font-semibold text-slate-900">Plan active</span>
                <span className="mt-0.5 block text-slate-500">
                  Uncheck to retire — only allowed when no schools are still assigned.
                </span>
              </span>
            </label>
          </section>
        )}
      </form>
    </FeatureModalShell>
  );

  return (
    <PageShell width="wide">
      <PageHeader
        title="Plans & entitlements"
        subtitle="Edit SaaS catalog prices and entitlements across all major platform modules. Assign plans and set per-school overrides. Ledger MRR counts ACTIVE_PAID only."
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            New plan
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Surface key={plan.code} variant="primary" className="p-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold tracking-tight text-slate-900 truncate">{plan.label}</h3>
                  <p className="text-xs font-mono text-slate-400">{plan.code}</p>
                </div>
              </div>
              <Button size="compact" variant="secondary" onClick={() => openEdit(plan)}>
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
            </div>
            {plan.isActive === false && (
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Retired</p>
            )}
            <p className="text-sm text-slate-500">{plan.description}</p>
            <p className="text-sm font-medium text-slate-700">
              Students: <span className="font-mono">{plan.maxStudents ?? "∞"}</span>
              {" · "}
              Staff: <span className="font-mono">{plan.maxStaff ?? "∞"}</span>
              {" · "}
              <span className="font-mono">${plan.monthlyPriceUsd ?? 0}/mo</span>
            </p>
            <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {plan.features.slice(0, 8).map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{featureLabel(f)}</span>
                </li>
              ))}
              {plan.features.length > 8 && (
                <li className="text-xs font-semibold text-slate-400 ps-5">
                  +{plan.features.length - 8} more modules
                </li>
              )}
              {plan.features.length === 0 && (
                <li className="text-xs text-slate-400">No modules selected</li>
              )}
            </ul>
            <StatTile
              label="Schools on plan"
              value={schools.filter((s) => (s.planCode || "STANDARD") === plan.code).length}
            />
          </Surface>
        ))}
      </div>

      <Surface variant="primary" className="p-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 tracking-tight">Assign by school</h3>
          <Link to="/super-admin/schools" className="text-sm font-bold text-indigo-600">
            Open schools
          </Link>
        </div>
        <DataTable>
          <table className={dataTableClass.table}>
            <thead className={dataTableClass.thead}>
              <tr>
                <th className={`${dataTableClass.th} w-[28%]`}>School</th>
                <th className={`${dataTableClass.th} w-[12%]`}>Status</th>
                <th className={`${dataTableClass.th} w-[10%]`}>Students</th>
                <th className={`${dataTableClass.th} w-[12%]`}>Billing</th>
                <th className={`${dataTableClass.th} w-[22%]`}>Plan</th>
                <th className={`${dataTableClass.thEnd} w-[16%]`}>Overrides</th>
              </tr>
            </thead>
            <tbody className={dataTableClass.tbody}>
              {schools.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className={dataTableClass.td}>
                    <Link
                      to={`/super-admin/schools/${s.id}`}
                      className="block min-w-0 hover:text-indigo-600"
                    >
                      <p className="font-bold text-slate-900 truncate">{s.name}</p>
                      <p className="text-xs text-slate-400 font-mono truncate">/{s.slug}</p>
                    </Link>
                  </td>
                  <td className={`${dataTableClass.td} text-sm font-medium text-slate-600 truncate`}>{s.status}</td>
                  <td className={`${dataTableClass.td} font-mono text-sm`}>{s.studentCount ?? 0}</td>
                  <td className={`${dataTableClass.td} text-xs font-mono text-slate-500 truncate`}>
                    {s.billingStatus || "TRIAL"}
                  </td>
                  <td className={dataTableClass.td}>
                    <select
                      className="w-full max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium"
                      value={s.planCode || "STANDARD"}
                      disabled={assigning === s.id}
                      onChange={(e) => void assign(s.id, e.target.value)}
                    >
                      {plans
                        .filter((p) => p.isActive !== false || p.code === (s.planCode || "STANDARD"))
                        .map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.label}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className={dataTableClass.td}>
                    <div className="flex justify-end">
                      <Button
                        size="compact"
                        variant="secondary"
                        className="px-2 min-w-8"
                        onClick={() => void openOverrides(s)}
                      >
                        Entitlements
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      </Surface>

      {editing && planFormModal(`Edit ${editing.code}`, () => setEditing(null))}
      {creating && planFormModal("New plan", () => setCreating(false))}

      {overrideSchool && (
        <FeatureModalShell
          title={`Overrides · ${overrideSchool.name}`}
          subtitle="Custom feature set and quotas for this school. Clear overrides to use the assigned plan defaults."
          onClose={() => setOverrideSchool(null)}
          wide
          maxWidthClass="max-w-2xl"
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => setOverrideSchool(null)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button form="override-form" type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? "Saving…" : "Save overrides"}
              </Button>
            </div>
          }
        >
          <form
            id="override-form"
            className="space-y-8 p-6 sm:p-8"
            onSubmit={(e) => void saveOverrides(e)}
          >
            <label className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 sm:px-5">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={useOverride}
                onChange={(e) => setUseOverride(e.target.checked)}
              />
              <span>
                <span className="block font-semibold text-slate-900">Use custom entitlements & quotas</span>
                <span className="mt-0.5 block text-slate-500">
                  Uncheck to clear overrides and fall back to the assigned plan.
                </span>
              </span>
            </label>

            <div className={`space-y-8 ${useOverride ? "" : "pointer-events-none opacity-50"}`}>
              <section className="space-y-5">
                <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
                  Features ({PLATFORM_FEATURE_KEYS.length})
                </h3>
                <div className="space-y-5">
                  {featuresByGroup().map(({ group, items }) => (
                    <div key={group} className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{group}</p>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {items.map(({ key, label }) => {
                          const checked = overrideFeatures.includes(key);
                          return (
                            <label
                              key={key}
                              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors ${
                                checked
                                  ? "border-indigo-200 bg-indigo-50/70"
                                  : "border-slate-100 bg-slate-50 hover:border-slate-200"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                checked={checked}
                                onChange={() => toggleFeature(key, overrideFeatures, setOverrideFeatures)}
                              />
                              <span>
                                <span className="block font-semibold text-slate-800">{label}</span>
                                <span className="mt-0.5 block font-mono text-[11px] text-slate-400">
                                  {key}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-extrabold tracking-tight text-slate-900">Quota overrides</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Max students">
                    {({ id, controlClassName }) => (
                      <input
                        id={id}
                        value={overrideQuotas.maxStudents}
                        onChange={(e) =>
                          setOverrideQuotas((q) => ({ ...q, maxStudents: e.target.value }))
                        }
                        className={`${controlClassName} font-mono`}
                      />
                    )}
                  </Field>
                  <Field label="Max staff">
                    {({ id, controlClassName }) => (
                      <input
                        id={id}
                        value={overrideQuotas.maxStaff}
                        onChange={(e) =>
                          setOverrideQuotas((q) => ({ ...q, maxStaff: e.target.value }))
                        }
                        className={`${controlClassName} font-mono`}
                      />
                    )}
                  </Field>
                  <Field label="Max storage MB">
                    {({ id, controlClassName }) => (
                      <input
                        id={id}
                        value={overrideQuotas.maxStorageMb}
                        onChange={(e) =>
                          setOverrideQuotas((q) => ({ ...q, maxStorageMb: e.target.value }))
                        }
                        className={`${controlClassName} font-mono`}
                      />
                    )}
                  </Field>
                </div>
              </section>
            </div>
          </form>
        </FeatureModalShell>
      )}
    </PageShell>
  );
};
