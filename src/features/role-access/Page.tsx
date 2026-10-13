import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Shield, History, Users, SlidersHorizontal } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { UserAvatar } from "../../components/UserAvatar";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { fieldInput, fieldLabel } from "../academics-shared/FeatureModalShell";
import { confirmAction } from "../../lib/swal";
import {
  ASSIGNABLE_SCHOOL_ROLES,
  buildRoleCatalog,
  getFeaturesForRole,
  schoolRoleLabel,
} from "../../lib/roleAccess";
import { roleAccessApi, type RoleAuditRow, type SchoolUserRow } from "./api";
import { CustomizeRolesPanel } from "./CustomizeRolesPanel";
import { ChangeRoleModal } from "./ChangeRoleModal";
import { useTranslation } from "react-i18next";
import { ListFilterBar, ListPagination } from "../../components/ui";
import { useListFilters, toLimitOffset, type FilterFieldDef } from "../list-filters";
import { translateNavLabelKey } from "../../lib/navLabels";

type Tab = "users" | "customize";

export function RoleAccessPage() {
  const { t } = useTranslation(["pages", "common", "nav"]);
  const { school, user, updateUser } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<SchoolUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SchoolUserRow | null>(null);
  const [draftRole, setDraftRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [audit, setAudit] = useState<RoleAuditRow[]>([]);
  const [catalogRole, setCatalogRole] = useState("TEACHER");

  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "role",
        label: t("common:role"),
        type: "enum",
        primary: true,
        allLabel: t("common:all"),
        options: ASSIGNABLE_SCHOOL_ROLES.map((r) => ({
          value: r,
          label: schoolRoleLabel(r),
        })),
      },
    ],
    [t]
  );

  const filters = useListFilters({
    fields: filterFields,
    syncUrl: tab === "users",
    defaultPageSize: 50,
  });

  const catalog = useMemo(() => buildRoleCatalog(), []);
  const catalogFeatures = useMemo(() => getFeaturesForRole(catalogRole), [catalogRole]);

  const translateNavKey = useCallback(
    (key: string, fallbackSegment?: string) => translateNavLabelKey(key, t, fallbackSegment),
    [t]
  );

  const roleCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of users) {
      map.set(u.role, (map.get(u.role) || 0) + 1);
    }
    return [...map.entries()]
      .map(([role, count]) => ({ role, count, label: schoolRoleLabel(role) }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [users]);

  const load = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const { limit, offset } = toLimitOffset(filters.page, filters.pageSize);
      const [list, auditRows] = await Promise.all([
        roleAccessApi.listUsers(school.id, {
          q: filters.committedQ || undefined,
          role: filters.values.role || undefined,
          limit,
          offset,
        }),
        roleAccessApi.listAudit(school.id, 30).catch(() => []),
      ]);
      setUsers(Array.isArray(list?.users) ? list.users : []);
      setTotal(list?.total ?? 0);
      setAudit(Array.isArray(auditRows) ? auditRows : []);
    } catch (e: any) {
      showToast(e?.message || "Could not load users", "error");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "users") return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    school?.id,
    filters.committedQ,
    filters.values.role,
    filters.page,
    filters.pageSize,
    tab,
  ]);

  const openEdit = (row: SchoolUserRow) => {
    setSelected(row);
    setDraftRole(row.role);
  };

  const saveRole = async () => {
    if (!selected || !draftRole) return;
    if (draftRole === selected.role) {
      setSelected(null);
      return;
    }
    const ok = await confirmAction({
      title: t("roleAccess.confirm.changeRoleTitle"),
      text: t("roleAccess.confirm.changeRoleText", {
        name: selected.name,
        fromRole: schoolRoleLabel(selected.role),
        toRole: schoolRoleLabel(draftRole),
      }),
      confirmText: t("roleAccess.confirm.changeRoleConfirm"),
    });
    if (!ok) return;

    setSaving(true);
    try {
      const targetId = selected.id;
      const updated = await roleAccessApi.changeRole(targetId, draftRole);
      showToast(t("roleAccess.toast.roleUpdated", { role: schoolRoleLabel(updated.role) }));
      if (user?.id === targetId) {
        updateUser({ role: updated.role });
      }
      setSelected(null);
      await load();
    } catch (e: any) {
      showToast(e?.message || t("roleAccess.toast.changeRoleFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const canManageRoles = user?.role === "SCHOOL_ADMIN";
  const canViewRoles = ["SCHOOL_ADMIN", "IT_ADMIN"].includes(user?.role || "");

  if (!canViewRoles) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
        <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-500 text-sm font-medium">{t("roleAccess.viewDenied")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
            {t("roleAccess.title")}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {canManageRoles ? t("roleAccess.subtitle") : t("roleAccess.subtitleReadOnly")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <Users className="w-4 h-4" />
          <span className="font-mono text-slate-900">{total}</span> users
        </div>
      </motion.div>

      <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
        <button
          type="button"
          onClick={() => setTab("users")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${
            tab === "users" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-4 h-4" />
          {canManageRoles ? t("roleAccess.tabs.assignUsers") : t("roleAccess.tabs.users")}
        </button>
        {canManageRoles ? (
          <button
            type="button"
            onClick={() => setTab("customize")}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${
              tab === "customize" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {t("roleAccess.tabs.customizeRoles")}
          </button>
        ) : null}
      </div>

      {tab === "customize" && canManageRoles ? (
        <CustomizeRolesPanel showToast={showToast} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-6">
            <div className="space-y-3">
              <ListFilterBar
                fields={filterFields}
                q={filters.q}
                onSearchChange={filters.setQ}
                values={filters.values}
                onValueChange={filters.setValue}
                onClear={filters.clear}
                searchPlaceholder="Search name or email"
                shownCount={users.length}
                totalCount={total}
              />
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-slate-50 animate-pulse" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                <p className="text-sm text-slate-500 font-medium">No users match this filter.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {users.map((row) => {
                  const features = getFeaturesForRole(row.role);
                  const preview = features.slice(0, 4);
                  const extra = features.length - preview.length;
                  return (
                    <li
                      key={row.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <UserAvatar
                          userId={row.id}
                          name={row.name}
                          photoUrl={row.photoUrl}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="font-extrabold tracking-tight text-slate-900 truncate">
                            {row.name}
                          </p>
                          <p className="text-xs text-slate-500 font-medium truncate">{row.email}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                              {schoolRoleLabel(row.role)}
                            </span>
                            {!row.isActive ? (
                              <span className="inline-flex items-center rounded-full bg-rose-50 text-rose-700 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                                Inactive
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Features ({features.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {preview.map((f) => (
                            <span
                              key={f.key}
                              className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600"
                            >
                              {translateNavKey(f.labelKey, f.key)}
                            </span>
                          ))}
                          {extra > 0 ? (
                            <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-mono text-slate-500">
                              +{extra}
                            </span>
                          ) : null}
                          {features.length === 0 ? (
                            <span className="text-xs text-slate-500">No sidebar features</span>
                          ) : null}
                        </div>
                      </div>
                      {canManageRoles ? (
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="shrink-0 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 hover:border-indigo-300 hover:text-indigo-700"
                        >
                          {t("roleAccess.changeRole")}
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            <ListPagination
              total={total}
              page={filters.page}
              pageSize={filters.pageSize}
              onPageChange={filters.setPage}
              onPageSizeChange={filters.setPageSize}
              className="px-0 border-t-0 sm:border-t sm:border-slate-100 sm:px-0"
            />
          </section>

          <div className="space-y-6">
            {!filters.values.role && roleCounts.length > 0 ? (
              <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900">In this list</h2>
                <ul className="space-y-1.5">
                  {roleCounts.slice(0, 8).map((r) => (
                    <li key={r.role} className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        className="font-medium text-slate-700 hover:text-indigo-700 text-left"
                        onClick={() => filters.setValue("role", r.role)}
                      >
                        {r.label}
                      </button>
                      <span className="font-mono text-slate-500">{r.count}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Role catalog</h2>
              </div>
              <p className="text-sm text-slate-500 font-medium">
                Preview default features for any assignable role before you apply it. Use{" "}
                <span className="font-bold text-slate-700">Customize roles</span> to change what a
                role can do at this school.
              </p>
              <div>
                <label className={fieldLabel}>Role</label>
                <select
                  className={`${fieldInput} mt-1.5`}
                  value={catalogRole}
                  onChange={(e) => setCatalogRole(e.target.value)}
                >
                  {catalog.map((c) => (
                    <option key={c.role} value={c.role}>
                      {c.label} ({c.featureCount})
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 max-h-64 overflow-y-auto space-y-2">
                {catalogFeatures.length === 0 ? (
                  <p className="text-xs text-slate-500">No features listed for this role.</p>
                ) : (
                  catalogFeatures.map((f) => (
                    <div key={f.key} className="flex justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-700">
                        {translateNavKey(f.labelKey, f.key)}
                      </span>
                      <span className="text-slate-400 shrink-0">
                        {translateNavKey(f.sectionKey)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-500" />
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Recent changes</h2>
              </div>
              {audit.length === 0 ? (
                <p className="text-sm text-slate-400 font-medium">No role changes recorded yet.</p>
              ) : (
                <ul className="space-y-2 max-h-56 overflow-y-auto">
                  {audit.map((a) => (
                    <li key={a.id} className="text-xs text-slate-600 border-b border-slate-50 pb-2">
                      <span className="font-mono text-slate-400">
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                      <p className="mt-0.5 font-medium text-slate-800 truncate">
                        {a.targetName || "User"}
                      </p>
                      <p className="mt-0.5 font-medium">
                        {schoolRoleLabel(a.fromRole)} → {schoolRoleLabel(a.toRole)}
                      </p>
                      {a.actorName ? (
                        <p className="text-slate-400 mt-0.5">by {a.actorName}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {selected && canManageRoles ? (
        <ChangeRoleModal
          user={selected}
          draftRole={draftRole}
          saving={saving}
          onDraftRole={setDraftRole}
          onClose={() => setSelected(null)}
          onSave={() => void saveRole()}
        />
      ) : null}
    </div>
  );
}
