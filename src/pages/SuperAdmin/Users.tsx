import React from "react";
import { useAuthStore } from "../../store/authStore";
import {
  KeyRound,
  Shield,
  School as SchoolIcon,
  Calendar,
  CheckCircle2,
  XCircle,
  Download,
  Ban,
  Unlock,
} from "lucide-react";
import { PageShell, PageHeader, Surface, Button, ListFilterBar, ListPagination, DataTable, dataTableClass } from "../../components/ui";
import { useListFilters, type FilterFieldDef } from "../../features/list-filters";
import { UserAvatar } from "../../components/UserAvatar";
import { useTranslation } from "react-i18next";
import { toast } from "../../lib/swal";
import {
  SuperAdminResetPasswordModal,
  type ResetPasswordTarget,
} from "./SuperAdminResetPasswordModal";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive?: boolean;
  createdAt: string;
  photoUrl?: string | null;
  school?: {
    name: string;
    slug: string;
  } | null;
}

export const Users = () => {
  const { t } = useTranslation(["pages", "common"]);
  const u = (key: string) => t(`superAdmin.usersUi.${key}`);
  const [users, setUsers] = React.useState<User[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [resetUser, setResetUser] = React.useState<ResetPasswordTarget | null>(null);
  const accessToken = useAuthStore((state) => state.accessToken);

  const fields: FilterFieldDef[] = React.useMemo(
    () => [
      {
        key: "role",
        label: u("colRole"),
        type: "enum",
        primary: true,
        allLabel: t("common:all"),
        options: ["SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT", "ACCOUNTANT", "IT_ADMIN"].map((r) => ({
          value: r,
          label: r.replace(/_/g, " "),
        })),
      },
      {
        key: "isActive",
        label: u("colStatus"),
        type: "enum",
        primary: true,
        allLabel: t("common:all"),
        options: [
          { value: "true", label: u("active") },
          { value: "false", label: t("common:inactive") },
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );

  const filters = useListFilters({ fields, syncUrl: true, defaultPageSize: 50 });

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters.apiParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v) !== "") params.set(k, String(v));
      });
      const response = await fetch(`/api/super-admin/users?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setUsers(data);
        setTotal(data.length);
      } else if (data && Array.isArray(data.items)) {
        setUsers(data.items);
        setTotal(Number(data.total) || data.items.length);
      } else {
        setUsers([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, filters.apiParams]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      void fetchUsers();
    }, 50);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const toggleActive = async (user: User) => {
    const res = await fetch(`/api/super-admin/users/${user.id}/active`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      await toast.fire({ icon: "error", title: data.error || "Update failed" });
      return;
    }
    await toast.fire({
      icon: "success",
      title: data.isActive ? "User unlocked" : "User disabled",
    });
    void fetchUsers();
  };

  const exportCsv = async () => {
    const res = await fetch("/api/super-admin/users/export.csv", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      await toast.fire({ icon: "error", title: data.error || "Export failed" });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell width="wide">
      <PageHeader
        title={t("pages:superAdmin.users")}
        subtitle={t("pages:superAdmin.usersSubtitle")}
        actions={
          <Button variant="secondary" onClick={() => void exportCsv()}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        }
      />

      <Surface variant="primary" className="p-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <ListFilterBar
            fields={fields}
            q={filters.q}
            onSearchChange={filters.setQ}
            values={filters.values}
            onValueChange={filters.setValue}
            onClear={filters.clear}
            searchPlaceholder={u("searchPlaceholder")}
            shownCount={users.length}
            totalCount={total}
            savedViewsScope="platform:users"
          />
        </div>

        <DataTable>
          <table className={dataTableClass.table}>
            <thead className={dataTableClass.thead}>
              <tr>
                <th className={`${dataTableClass.th} w-[28%]`}>{u("colUser")}</th>
                <th className={`${dataTableClass.th} w-[14%]`}>{u("colRole")}</th>
                <th className={`${dataTableClass.th} w-[22%]`}>{u("colSchool")}</th>
                <th className={`${dataTableClass.th} w-[12%]`}>{u("colJoined")}</th>
                <th className={`${dataTableClass.th} w-[12%]`}>{u("colStatus")}</th>
                <th className={`${dataTableClass.thEnd} w-[12%]`}>{u("colActions")}</th>
              </tr>
            </thead>
            <tbody className={dataTableClass.tbody}>
              {loading ? (
                <tr>
                  <td colSpan={6} className={`${dataTableClass.tdEmpty} italic`}>
                    {u("loading")}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className={dataTableClass.tdEmpty}>
                    {filters.hasActiveFilters ? t("pages:listFilters.noMatches") : u("empty")}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                    <td className={dataTableClass.td}>
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          userId={user.id}
                          name={user.name}
                          photoUrl={user.photoUrl}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{user.name}</p>
                          <p className="text-xs text-slate-500 font-medium truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={dataTableClass.td}>
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold inline-flex items-center gap-1.5 max-w-full">
                        <Shield className="w-3 h-3 shrink-0" />
                        <span className="truncate">{user.role.replace(/_/g, " ")}</span>
                      </span>
                    </td>
                    <td className={dataTableClass.td}>
                      {user.school ? (
                        <div className="flex items-center gap-2 min-w-0 text-slate-600 font-medium">
                          <SchoolIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="truncate">{user.school.name}</p>
                            <p className="text-xs text-slate-400 font-mono truncate">/{user.school.slug}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-sm">{u("systemLevel")}</span>
                      )}
                    </td>
                    <td className={`${dataTableClass.td} text-slate-500 font-medium text-sm`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="w-4 h-4 text-slate-300 shrink-0" />
                        <span className="truncate">{new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className={dataTableClass.td}>
                      {user.isActive === false ? (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold inline-flex items-center gap-1.5 max-w-full">
                          <XCircle className="w-3 h-3 shrink-0" />
                          <span className="truncate">Inactive</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold inline-flex items-center gap-1.5 max-w-full">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{u("active")}</span>
                        </span>
                      )}
                    </td>
                    <td className={dataTableClass.td}>
                      {user.role === "SUPER_ADMIN" ? (
                        <span className="text-xs text-slate-400 italic">—</span>
                      ) : (
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="compact"
                            aria-label="Reset password"
                            title="Reset password"
                            className="px-2 min-w-8"
                            onClick={() =>
                              setResetUser({
                                id: user.id,
                                name: user.name,
                                email: user.email,
                                role: user.role,
                              })
                            }
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="compact"
                            aria-label={user.isActive === false ? "Unlock user" : "Disable user"}
                            title={user.isActive === false ? "Unlock user" : "Disable user"}
                            className="px-2 min-w-8"
                            onClick={() => void toggleActive(user)}
                          >
                            {user.isActive === false ? (
                              <Unlock className="w-4 h-4" />
                            ) : (
                              <Ban className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTable>
        <ListPagination
          total={total}
          page={filters.page}
          pageSize={filters.pageSize}
          onPageChange={filters.setPage}
          onPageSizeChange={filters.setPageSize}
        />
      </Surface>

      <SuperAdminResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />
    </PageShell>
  );
};
