import React, { useEffect, useMemo, useState } from "react";
import { Lock, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { ASSIGNABLE_SCHOOL_ROLES, schoolRoleLabel } from "../../lib/roleAccess";
import { fieldInput, fieldLabel } from "../academics-shared/FeatureModalShell";
import { confirmAction } from "../../lib/swal";
import {
  roleAccessApi,
  type CapabilityDef,
  type CapabilityOverride,
  type RoleCapabilityMatrix,
} from "./api";

type Props = {
  showToast: (msg: string, kind?: "success" | "error" | "info") => void;
};

export function CustomizeRolesPanel({ showToast }: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const { school, setAuth, setCapabilities } = useAuthStore();
  const [matrix, setMatrix] = useState<RoleCapabilityMatrix | null>(null);
  const [role, setRole] = useState("PRINCIPAL");
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const m = await roleAccessApi.getCapabilityMatrix(school.id);
      setMatrix(m);
      const effective = m.roles[role]?.effective || [];
      setDraft(new Set(effective));
    } catch (e: any) {
      showToast(e?.message || t("roleAccess.toast.loadCapabilitiesFailed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school?.id]);

  useEffect(() => {
    if (!matrix) return;
    setDraft(new Set(matrix.roles[role]?.effective || []));
  }, [role, matrix]);

  const catalogByCategory = useMemo(() => {
    const map = new Map<string, CapabilityDef[]>();
    for (const c of matrix?.catalog || []) {
      const list = map.get(c.category) || [];
      list.push(c);
      map.set(c.category, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [matrix]);

  const defaults = useMemo(
    () => new Set(matrix?.roles[role]?.defaults || []),
    [matrix, role]
  );

  const locked = useMemo(() => {
    if (role !== "SCHOOL_ADMIN") return new Set<string>();
    return new Set(matrix?.lockedKeysForSchoolAdmin || []);
  }, [matrix, role]);

  const dirty = useMemo(() => {
    if (!matrix) return false;
    const effective = new Set(matrix.roles[role]?.effective || []);
    if (effective.size !== draft.size) return true;
    for (const k of draft) if (!effective.has(k)) return true;
    return false;
  }, [matrix, role, draft]);

  const toggle = (key: string) => {
    if (locked.has(key)) return;
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const resetToDefaults = async () => {
    const ok = await confirmAction({
      title: t("roleAccess.confirm.resetDefaultsTitle"),
      text: t("roleAccess.confirm.resetDefaultsText", { role: schoolRoleLabel(role) }),
      confirmText: t("common:reset"),
    });
    if (!ok) return;
    setDraft(new Set(defaults));
  };

  const save = async () => {
    if (!school?.id || !matrix) return;
    const ok = await confirmAction({
      title: t("roleAccess.confirm.saveCapabilitiesTitle", { role: schoolRoleLabel(role) }),
      text: t("roleAccess.confirm.saveCapabilitiesText"),
      confirmText: t("roleAccess.confirm.saveCapabilitiesConfirm"),
    });
    if (!ok) return;

    setSaving(true);
    try {
      const overrides: CapabilityOverride[] = [];
      for (const c of matrix.catalog) {
        const on = draft.has(c.key);
        const wasDefault = defaults.has(c.key);
        if (on !== wasDefault) {
          overrides.push({ capabilityKey: c.key, allowed: on });
        }
      }
      const next = await roleAccessApi.saveRoleCapabilities(school.id, role, overrides);
      setMatrix(next);
      showToast(t("roleAccess.toast.capabilitiesUpdated", { role: schoolRoleLabel(role) }));

      try {
        const session = await roleAccessApi.refreshSession();
        setAuth(session.user as any, session.accessToken, session.school as any, session.capabilities);
        setCapabilities(session.capabilities);
      } catch {
        /* non-fatal */
      }
    } catch (e: any) {
      showToast(e?.message || t("roleAccess.toast.saveCapabilitiesFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Customize staff roles
            </h2>
          </div>
          <p className="text-sm text-slate-500 font-medium max-w-2xl">
            Every account type starts with platform defaults. Turn capabilities off or on for this
            school — for example, remove Admissions approval or Lesson plan approval from Principal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void resetToDefaults()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:border-slate-300"
          >
            <RotateCcw className="w-4 h-4" />
            Reset defaults
          </button>
          <button
            type="button"
            disabled={saving || loading || !dirty}
            onClick={() => void save()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="max-w-sm">
        <label className={fieldLabel}>Role to edit</label>
        <select
          className={`${fieldInput} mt-1.5`}
          value={role}
          disabled={loading || saving}
          onChange={(e) => setRole(e.target.value)}
        >
          {ASSIGNABLE_SCHOOL_ROLES.map((r) => (
            <option key={r} value={r}>
              {schoolRoleLabel(r)}
            </option>
          ))}
        </select>
      </div>

      {loading || !matrix ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {catalogByCategory.map(([category, items]) => (
            <div key={category} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 sm:p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                {category}
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {items.map((c) => {
                  const on = draft.has(c.key);
                  const isDefault = defaults.has(c.key);
                  const isLocked = locked.has(c.key);
                  return (
                    <li key={c.key}>
                      <label
                        className={`flex items-start gap-3 rounded-2xl border bg-white px-3 py-3 ${
                          isLocked
                            ? "border-slate-100 opacity-80 cursor-not-allowed"
                            : "border-slate-100 hover:border-indigo-200 cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={on}
                          disabled={isLocked || saving}
                          onChange={() => toggle(c.key)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                            {c.label}
                            {isLocked ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : null}
                          </span>
                          {!isDefault && on ? (
                            <span className="inline-flex mt-1 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                              Added
                            </span>
                          ) : null}
                          {isDefault && !on ? (
                            <span className="inline-flex mt-1 text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-full">
                              Removed
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
