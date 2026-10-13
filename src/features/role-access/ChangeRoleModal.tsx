import React, { useCallback, useMemo, useState } from "react";
import { ArrowRight, Check, Info, KeyRound, Search, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "../../components/UserAvatar";
import { FeatureModalShell } from "../academics-shared/FeatureModalShell";
import {
  ASSIGNABLE_SCHOOL_ROLES,
  getFeaturesForRole,
  schoolRoleLabel,
  type RoleFeature,
} from "../../lib/roleAccess";
import { translateNavLabelKey } from "../../lib/navLabels";
import type { SchoolUserRow } from "./api";

type Props = {
  user: SchoolUserRow;
  draftRole: string;
  saving: boolean;
  onDraftRole: (role: string) => void;
  onClose: () => void;
  onSave: () => void;
};

function groupFeatures(features: RoleFeature[]) {
  const map = new Map<string, RoleFeature[]>();
  for (const f of features) {
    const list = map.get(f.sectionKey) || [];
    list.push(f);
    map.set(f.sectionKey, list);
  }
  return [...map.entries()];
}

export function ChangeRoleModal({
  user,
  draftRole,
  saving,
  onDraftRole,
  onClose,
  onSave,
}: Props) {
  const { t } = useTranslation("nav");
  const translateNavKey = useCallback(
    (key: string, fallbackSegment?: string) => translateNavLabelKey(key, t, fallbackSegment),
    [t]
  );
  const [roleQuery, setRoleQuery] = useState("");
  const features = useMemo(
    () => (draftRole ? getFeaturesForRole(draftRole) : []),
    [draftRole]
  );
  const grouped = useMemo(() => groupFeatures(features), [features]);
  const changed = draftRole !== user.role;

  const roles = useMemo(() => {
    const q = roleQuery.trim().toLowerCase();
    return ASSIGNABLE_SCHOOL_ROLES.map((role) => ({
      role,
      label: schoolRoleLabel(role),
      featureCount: getFeaturesForRole(role).length,
    }))
      .filter((r) => !q || r.label.toLowerCase().includes(q) || r.role.toLowerCase().includes(q))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [roleQuery]);

  return (
    <FeatureModalShell
      title="Change role"
      subtitle="Update this person’s account type and preview the features it unlocks."
      eyebrow="Roles & Access"
      onClose={() => !saving && onClose()}
      wide
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {changed ? (
              <>
                Will change from{" "}
                <span className="font-bold text-slate-700">{schoolRoleLabel(user.role)}</span> to{" "}
                <span className="font-bold text-indigo-700">{schoolRoleLabel(draftRole)}</span>
              </>
            ) : (
              "Select a different role to enable Save."
            )}
          </p>
          <div className="flex justify-end gap-3 shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || !changed}
              onClick={onSave}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold"
            >
              {saving ? "Saving…" : changed ? `Change to ${schoolRoleLabel(draftRole)}` : "Save role"}
            </button>
          </div>
        </div>
      }
    >
      <div className="p-6 sm:p-8 space-y-6">
        {/* Person */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:p-5 flex items-center gap-4">
          <UserAvatar
            userId={user.id}
            name={user.name}
            photoUrl={user.photoUrl}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold tracking-tight text-slate-900 truncate text-lg">
              {user.name}
            </p>
            <p className="text-sm text-slate-500 font-medium truncate">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white border border-slate-200 text-slate-700 px-2.5 py-0.5 text-xs font-bold">
                Current · {schoolRoleLabel(user.role)}
              </span>
              {!user.isActive ? (
                <span className="inline-flex items-center rounded-full bg-rose-50 text-rose-700 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                  Inactive
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Transition strip */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              From
            </p>
            <p className="font-extrabold tracking-tight text-slate-900">
              {schoolRoleLabel(user.role)}
            </p>
            <p className="text-xs text-slate-500 font-mono mt-1">{user.role}</p>
          </div>
          <div className="hidden sm:flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
          <div
            className={`rounded-2xl border p-4 ${
              changed
                ? "border-indigo-200 bg-indigo-50/60"
                : "border-slate-100 bg-white"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              To
            </p>
            <p
              className={`font-extrabold tracking-tight ${
                changed ? "text-indigo-900" : "text-slate-900"
              }`}
            >
              {schoolRoleLabel(draftRole)}
            </p>
            <p className="text-xs text-slate-500 font-mono mt-1">{draftRole}</p>
          </div>
        </div>

        {/* Role picker */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Assignable roles
              </p>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Choose the account type for this user.
              </p>
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Filter roles…"
                value={roleQuery}
                onChange={(e) => setRoleQuery(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white max-h-52 overflow-y-auto divide-y divide-slate-50">
            {roles.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 font-medium text-center">
                No roles match “{roleQuery.trim()}”.
              </p>
            ) : (
              roles.map((r) => {
                const active = draftRole === r.role;
                const isCurrent = user.role === r.role;
                return (
                  <button
                    key={r.role}
                    type="button"
                    disabled={saving}
                    onClick={() => onDraftRole(r.role)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      active
                        ? "bg-indigo-50/80"
                        : "hover:bg-slate-50"
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        active
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {active ? <Check className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{r.label}</span>
                        {isCurrent ? (
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                            Current
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-xs text-slate-500 font-mono mt-0.5">
                        {r.role}
                      </span>
                    </span>
                    <span className="text-xs font-mono text-slate-400 shrink-0">
                      {r.featureCount} features
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Feature preview */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <p className="text-sm font-extrabold tracking-tight text-slate-900">
                  Features for {schoolRoleLabel(draftRole)}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Default sidebar access for this role (school customizations apply after assign).
                </p>
              </div>
            </div>
            <span className="font-mono text-xs text-slate-500 shrink-0 pt-0.5">
              {features.length}
            </span>
          </div>

          {features.length === 0 ? (
            <p className="text-sm text-slate-500 font-medium py-2">
              This role has no school sidebar features.
            </p>
          ) : (
            <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
              {grouped.map(([sectionKey, items]) => (
                <div key={sectionKey}>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {translateNavKey(sectionKey)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((f) => (
                      <span
                        key={f.key}
                        className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        {translateNavKey(f.labelKey, f.key)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            You cannot assign Super Admin, change platform accounts, or demote the last School Admin.
            Changes are audited. Fine-tune what a role can do under{" "}
            <span className="font-bold text-slate-700">Customize roles</span>.
          </p>
        </div>
      </div>
    </FeatureModalShell>
  );
}
