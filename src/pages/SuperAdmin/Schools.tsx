import React from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit,
  Trash2,
  X,
  Download
} from "lucide-react";
import { CountryTimezoneFields } from "../../components/CountryTimezoneFields";
import { DEFAULT_COUNTRY, DEFAULT_TIMEZONE, resolveTimezoneForCountry } from "../../lib/countryTimezones";
import { confirmAction, toast } from "../../lib/swal";
import { PageShell, PageHeader, Surface, Button, ListFilterBar, ListPagination, DataTable, dataTableClass } from "../../components/ui";
import { useListFilters, type FilterFieldDef } from "../../features/list-filters";
import { useTranslation } from "react-i18next";

interface School {
  id: string;
  name: string;
  slug: string;
  schoolCode: string;
  status: string;
  country: string;
  timezone?: string;
  contactEmail: string;
  logoUrl?: string | null;
  planCode?: string | null;
  studentCount?: number;
  staffCount?: number;
  parentCount?: number;
  userCount?: number;
  _count?: { users: number };
}

export const Schools = () => {
  const { t } = useTranslation(["pages", "common"]);
  const [schools, setSchools] = React.useState<School[]>([]);
  const [total, setTotal] = React.useState(0);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const fields: FilterFieldDef[] = React.useMemo(
    () => [
      {
        key: "status",
        label: t("common:status"),
        type: "enum",
        primary: true,
        allLabel: t("common:all"),
        options: ["ACTIVE", "TRIAL", "SUSPENDED", "PENDING_REVIEW", "CLOSED"].map((s) => ({
          value: s,
          label: s,
        })),
      },
    ],
    [t]
  );

  const filters = useListFilters({ fields, syncUrl: true, defaultPageSize: 50 });

  const accessToken = useAuthStore((state) => state.accessToken);

  const fetchSchools = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters.apiParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v) !== "") params.set(k, String(v));
      });
      const response = await fetch(`/api/super-admin/schools?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setSchools(data);
        setTotal(data.length);
      } else if (data && Array.isArray(data.items)) {
        setSchools(data.items);
        setTotal(Number(data.total) || data.items.length);
      } else {
        setSchools([]);
        setTotal(0);
        console.error("Expected schools envelope, got:", data);
      }
    } catch (err) {
      console.error(err);
      setSchools([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [accessToken, filters.apiParams]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      void fetchSchools();
    }, 50);
    return () => clearTimeout(timer);
  }, [fetchSchools]);

  const studentCountOf = (school: School) =>
    school.studentCount ?? 0;
  const staffCountOf = (school: School) => school.staffCount ?? 0;

  const [selectedSchool, setSelectedSchool] = React.useState<School | null>(null);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    name: "",
    contactEmail: "",
    slug: "",
    country: DEFAULT_COUNTRY,
    timezone: DEFAULT_TIMEZONE,
  });

  const handleDeleteSchool = async (schoolId: string) => {
    const ok = await confirmAction({
      title: t("superAdmin.deleteSchoolTitle"),
      text: t("superAdmin.deleteSchoolText"),
      confirmText: t("superAdmin.deleteSchoolConfirm"),
      danger: true,
    });
    if (!ok) return;
    try {
      const response = await fetch(`/api/super-admin/schools/${schoolId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        fetchSchools();
      }
    } catch (err) {
      console.error("Failed to delete school:", err);
    }
  };

  const handleOpenEdit = (school: School) => {
    setSelectedSchool(school);
    const country = school.country || DEFAULT_COUNTRY;
    setEditForm({
      name: school.name,
      contactEmail: school.contactEmail,
      slug: school.slug,
      country,
      timezone: resolveTimezoneForCountry(country, school.timezone),
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;
    try {
      const response = await fetch(`/api/super-admin/schools/${selectedSchool.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(editForm),
      });
      if (response.ok) {
        setShowEditModal(false);
        setSelectedSchool(null);
        fetchSchools();
      }
    } catch (err) {
      console.error("Failed to save school edit:", err);
    }
  };

  const [newSchool, setNewSchool] = React.useState({
    name: "",
    slug: "",
    country: DEFAULT_COUNTRY,
    timezone: DEFAULT_TIMEZONE,
    contactEmail: "",
  });

  const [createdCredentials, setCreatedCredentials] = React.useState<{
    email: string;
    tempPassword: string;
    inviteUrl?: string;
  } | null>(null);

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/super-admin/schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(newSchool),
      });
      
      const data = await response.json();

      if (response.ok) {
        setIsModalOpen(false);
        fetchSchools();
        setNewSchool({ name: "", slug: "", country: DEFAULT_COUNTRY, timezone: DEFAULT_TIMEZONE, contactEmail: "" });
        if (data.tempPassword && data.admin?.email) {
          setCreatedCredentials({
            email: data.admin.email,
            tempPassword: data.tempPassword,
            inviteUrl: data.inviteUrl,
          });
        }
      } else {
        setError(data.error || "Failed to create school");
      }
    } catch (err: any) {
      console.error(err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (schoolId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/super-admin/schools/${schoolId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        fetchSchools();
      }
    } catch (err) {
      console.error("Failed to update school status:", err);
    }
  };

  return (
    <PageShell width="wide">
      <PageHeader
        title={t("pages:superAdmin.schools")}
        subtitle={t("pages:superAdmin.schoolsSubtitle")}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={async () => {
                const res = await fetch("/api/super-admin/schools/export.csv", {
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
                a.download = "schools.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-5 h-5" />
              {t("common:add")}
            </Button>
          </>
        }
      />

      {createdCredentials && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 space-y-2">
          <p className="font-semibold text-emerald-900">School created — copy credentials once (not shown again)</p>
          <p className="text-sm font-mono text-emerald-900">Email: {createdCredentials.email}</p>
          <p className="text-sm font-mono text-emerald-900">Temp password: {createdCredentials.tempPassword}</p>
          {createdCredentials.inviteUrl && (
            <p className="text-sm break-all text-emerald-800">Invite: {createdCredentials.inviteUrl}</p>
          )}
          <button
            type="button"
            className="text-sm text-emerald-700 underline"
            onClick={() => setCreatedCredentials(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <Surface variant="primary" className="p-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <ListFilterBar
            fields={fields}
            q={filters.q}
            onSearchChange={filters.setQ}
            values={filters.values}
            onValueChange={filters.setValue}
            onClear={filters.clear}
            searchPlaceholder="Search schools by name, slug, email, or plan…"
            shownCount={schools.length}
            totalCount={total}
            savedViewsScope="platform:schools"
          />
        </div>

        <DataTable>
          <table className={dataTableClass.table}>
            <thead className={dataTableClass.thead}>
              <tr>
                <th className={`${dataTableClass.th} w-[34%]`}>School</th>
                <th className={`${dataTableClass.th} w-[12%]`}>Status</th>
                <th className={`${dataTableClass.th} w-[10%]`}>Plan</th>
                <th className={`${dataTableClass.th} w-[12%]`}>Members</th>
                <th className={`${dataTableClass.th} w-[12%]`}>Country</th>
                <th className={`${dataTableClass.thEnd} w-[20%]`}>Actions</th>
              </tr>
            </thead>
            <tbody className={dataTableClass.tbody}>
              {loading ? (
                <tr>
                  <td colSpan={6} className={`${dataTableClass.tdEmpty} italic`}>
                    Loading schools...
                  </td>
                </tr>
              ) : schools.length === 0 ? (
                <tr>
                  <td colSpan={6} className={dataTableClass.tdEmpty}>
                    {filters.hasActiveFilters
                      ? t("pages:listFilters.noMatches")
                      : "No schools registered yet."}
                  </td>
                </tr>
              ) : (
                schools.map((school) => (
                  <tr key={school.id} className="hover:bg-slate-50 transition-colors group">
                    <td className={dataTableClass.td}>
                      <Link
                        to={`/super-admin/schools/${school.id}`}
                        className="flex items-center gap-3 min-w-0 hover:opacity-90"
                      >
                        {school.logoUrl ? (
                          <img
                            src={school.logoUrl}
                            alt={school.name}
                            className="w-9 h-9 shrink-0 rounded-xl object-cover shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-9 h-9 shrink-0 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-sm">
                            {school.name[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {school.name}
                          </p>
                          <p className="text-xs text-slate-500 font-medium truncate">{school.contactEmail}</p>
                          <p className="text-xs text-slate-400 font-mono truncate">
                            /{school.slug}
                            {school.schoolCode ? ` · ${school.schoolCode}` : ""}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className={dataTableClass.td}>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 max-w-full ${
                          school.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-600"
                            : school.status === "SUSPENDED"
                              ? "bg-red-50 text-red-600"
                              : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {school.status === "ACTIVE" ? (
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                        ) : school.status === "SUSPENDED" ? (
                          <AlertCircle className="w-3 h-3 shrink-0" />
                        ) : (
                          <Clock className="w-3 h-3 shrink-0" />
                        )}
                        <span className="truncate">{school.status.replace(/_/g, " ")}</span>
                      </span>
                    </td>
                    <td className={`${dataTableClass.td} font-mono text-xs font-bold text-slate-600 truncate`}>
                      {school.planCode || "—"}
                    </td>
                    <td className={`${dataTableClass.td} text-sm text-slate-700`}>
                      <div className="font-mono font-medium leading-snug">
                        <span title="Students">{studentCountOf(school)}</span>
                        <span className="text-slate-300 mx-1">/</span>
                        <span title="Staff">{staffCountOf(school)}</span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">students / staff</p>
                    </td>
                    <td className={`${dataTableClass.td} text-sm text-slate-500 font-medium truncate`} title={school.country}>
                      {school.country}
                    </td>
                    <td className={dataTableClass.td}>
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="compact"
                          aria-label="Edit School"
                          onClick={() => handleOpenEdit(school)}
                          title="Edit School"
                          className="px-2 min-w-8"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {school.status === "ACTIVE" ? (
                          <Button
                            variant="ghost"
                            size="compact"
                            aria-label="Suspend School"
                            onClick={() => handleUpdateStatus(school.id, "SUSPENDED")}
                            title="Suspend School"
                            className="px-2 min-w-8"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="compact"
                            aria-label="Activate School"
                            onClick={() => handleUpdateStatus(school.id, "ACTIVE")}
                            title="Activate School"
                            className="px-2 min-w-8"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Link to={`/super-admin/schools/${school.id}`}>
                          <Button
                            variant="ghost"
                            size="compact"
                            aria-label="View School"
                            title="View directory"
                            className="px-2 min-w-8"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="compact"
                          aria-label="Delete School"
                          onClick={() => handleDeleteSchool(school.id)}
                          title="Delete School"
                          className="px-2 min-w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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

      {/* Register School Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <div>
                  <h2 className="text-2xl font-bold">Register New School</h2>
                  <p className="text-indigo-100 text-sm font-medium">Step 1: Basic Information</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close"
                  className="text-white hover:bg-white/10"
                  onClick={() => setIsModalOpen(false)}
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </Button>
              </div>

              <form onSubmit={handleCreateSchool} className="p-8 space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Legal School Name</label>
                    <input
                      type="text"
                      required
                      value={newSchool.name}
                      onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="Greenfield Academy"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">URL Slug</label>
                    <input
                      type="text"
                      required
                      value={newSchool.slug}
                      onChange={(e) => setNewSchool({ ...newSchool, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="greenfield"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Contact Email (Onboarding)</label>
                  <input
                    type="email"
                    required
                    value={newSchool.contactEmail}
                    onChange={(e) => setNewSchool({ ...newSchool, contactEmail: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="admin@greenfield.com"
                  />
                </div>

                <CountryTimezoneFields
                  country={newSchool.country}
                  timezone={newSchool.timezone}
                  onCountryChange={(country) => setNewSchool((s) => ({ ...s, country }))}
                  onTimezoneChange={(timezone) => setNewSchool((s) => ({ ...s, timezone }))}
                  required
                />

                <div className="pt-4 flex items-center gap-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-[2]">
                    Register School & Invite Admin
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit School Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[32px] shadow-xl w-full max-w-xl overflow-hidden z-10"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Edit School</h3>
                  <p className="text-xs text-slate-500 font-medium">Update institution details</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close"
                  onClick={() => setShowEditModal(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">School Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">URL Slug</label>
                    <input
                      type="text"
                      required
                      value={editForm.slug}
                      onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Contact Email</label>
                  <input
                    type="email"
                    required
                    value={editForm.contactEmail}
                    onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <CountryTimezoneFields
                  country={editForm.country}
                  timezone={editForm.timezone}
                  onCountryChange={(country) => setEditForm((f) => ({ ...f, country }))}
                  onTimezoneChange={(timezone) => setEditForm((f) => ({ ...f, timezone }))}
                  required
                />

                <div className="pt-4 flex items-center gap-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-[2]">
                    Save Changes
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};
