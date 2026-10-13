import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Megaphone,
  Plus,
  Pin,
  Pencil,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { useAuthStore } from "../../store/authStore";
import { RichTextEditor } from "../../components/RichTextEditor";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
  cardShell,
} from "../academics-shared/FeatureModalShell";
import { FriendlyDateField } from "../academic-calendar/components/FriendlyDateField";
import { confirmAction } from "../../lib/swal";
import { announcementsApi } from "./api";
import { useTranslation } from "react-i18next";
import { ListFilterBar, DataTable, dataTableClass, Button } from "../../components/ui";
import { useListFilters, type FilterFieldDef } from "../list-filters";

const ROLE_OPTIONS = [
  "TEACHER",
  "STUDENT",
  "PARENT",
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "ACCOUNTANT",
  "REGISTRAR",
  "LIBRARIAN",
  "SECURITY",
  "MAINTENANCE",
];

type AnnouncementForm = {
  title: string;
  content: string;
  targetRoles: string[];
  isPinned: boolean;
  expiresAt: string;
};

const emptyForm: AnnouncementForm = {
  title: "",
  content: "",
  targetRoles: ["TEACHER", "STUDENT", "PARENT"],
  isPinned: false,
  expiresAt: "",
};

function formatRole(role: string) {
  return role.replace(/_/g, " ");
}

export function AnnouncementsPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { school, user } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<AnnouncementForm>(emptyForm);

  const canManage = ["SCHOOL_ADMIN", "PRINCIPAL", "TEACHER", "VPI", "VPA"].includes(
    user?.role || ""
  );
  const isReader = !canManage;

  const filterFields: FilterFieldDef[] = useMemo(
    () =>
      canManage
        ? [
            {
              key: "role",
              label: t("announcements.table.audience"),
              type: "enum",
              primary: true,
              allLabel: t("announcements.allTargetRoles"),
              options: ROLE_OPTIONS.map((r) => ({ value: r, label: formatRole(r) })),
            },
          ]
        : [],
    [canManage, t]
  );

  const filters = useListFilters({ fields: filterFields, syncUrl: true });

  const fetchAnnouncements = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const data = await announcementsApi.list(school.id);
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err?.message || t("announcements.toast.loadFailed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [school?.id]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (announcement: any) => {
    setEditing(announcement);
    setForm({
      title: announcement.title || "",
      content: announcement.content || "",
      targetRoles: Array.isArray(announcement.targetRoles)
        ? announcement.targetRoles
        : [],
      isPinned: Boolean(announcement.isPinned),
      expiresAt: announcement.expiresAt
        ? format(new Date(announcement.expiresAt), "yyyy-MM-dd")
        : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !user?.id) return;
    if (!form.title.trim() || !form.content.trim()) {
      showToast(t("announcements.toast.titleContentRequired"), "error");
      return;
    }
    if (form.targetRoles.length === 0) {
      showToast(t("announcements.toast.selectRole"), "error");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content,
        targetRoles: form.targetRoles,
        isPinned: form.isPinned,
        expiresAt: form.expiresAt || null,
      };
      if (editing) {
        await announcementsApi.update(editing.id, payload);
        showToast(t("announcements.toast.updated"), "success");
      } else {
        await announcementsApi.create(school.id, {
          ...payload,
          authorId: user.id,
        });
        showToast(t("announcements.toast.published"), "success");
      }
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
      fetchAnnouncements();
    } catch (err: any) {
      showToast(err?.message || t("announcements.toast.saveFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmAction({
      title: t("announcements.confirm.deleteTitle"),
      text: t("announcements.confirm.deleteText"),
      confirmText: t("common:delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await announcementsApi.remove(id);
      showToast(t("announcements.toast.deleted"), "info");
      fetchAnnouncements();
    } catch (err: any) {
      showToast(err?.message || t("announcements.toast.deleteFailed"), "error");
    }
  };

  const filtered = announcements.filter((a) => {
    const q = filters.committedQ.toLowerCase();
    const authorName = a.author?.name || "";
    const matchesSearch =
      !q ||
      a.title?.toLowerCase().includes(q) ||
      a.content?.toLowerCase().includes(q) ||
      authorName.toLowerCase().includes(q);
    const roles = Array.isArray(a.targetRoles) ? a.targetRoles : [];
    const matchesRole = !filters.values.role || roles.includes(filters.values.role);
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            {t("announcements.eyebrow")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 font-dashboard">
            {t("announcements.title")}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {t("announcements.subtitle")}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t("announcements.newAnnouncement")}
          </button>
        )}
      </div>

      <div className={`${cardShell} overflow-hidden`}>
        <div className="p-6 border-b border-slate-100">
          <ListFilterBar
            fields={filterFields}
            q={filters.q}
            onSearchChange={filters.setQ}
            values={filters.values}
            onValueChange={filters.setValue}
            onClear={filters.clear}
            searchPlaceholder={t("announcements.searchPlaceholder")}
            shownCount={filtered.length}
          />
        </div>

        {loading ? (
          <div className="h-64 bg-slate-50 animate-pulse" />
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center px-6">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Megaphone className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
              {filters.hasActiveFilters ? t("pages:listFilters.noMatches") : t("announcements.emptyTitle")}
            </h3>
            <p className="text-slate-500 font-medium mt-2 max-w-sm mx-auto">
              {filters.hasActiveFilters
                ? t("pages:listFilters.noMatchesHint")
                : isReader
                  ? t("announcements.emptyReader")
                  : t("announcements.emptyManager")}
            </p>
            {filters.hasActiveFilters ? (
              <Button type="button" variant="secondary" size="compact" className="mt-4" onClick={filters.clear}>
                {t("pages:listFilters.clearAll")}
              </Button>
            ) : null}
          </div>
        ) : isReader ? (
          <div className="divide-y divide-slate-50">
            {filtered.map((announcement, index) => (
              <motion.article
                key={announcement.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
                className="p-6 sm:p-8 space-y-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {announcement.isPinned && (
                    <Pin className="w-4 h-4 text-indigo-600 fill-indigo-600" />
                  )}
                  <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                    {announcement.title}
                  </h2>
                </div>
                <p className="text-xs font-medium text-slate-500">
                  {format(new Date(announcement.createdAt), "MMM dd, yyyy")}
                  {announcement.author?.name ? ` · ${announcement.author.name}` : ""}
                </p>
                <div
                  className="prose prose-sm prose-slate max-w-none text-slate-600"
                  dangerouslySetInnerHTML={{ __html: announcement.content || "" }}
                />
              </motion.article>
            ))}
          </div>
        ) : (
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={dataTableClass.th}>Title</th>
                  <th className={dataTableClass.th}>Audience</th>
                  <th className={dataTableClass.th}>Author</th>
                  <th className={dataTableClass.th}>Date</th>
                  <th className={dataTableClass.th}>Status</th>
                  <th className={dataTableClass.thEnd}>Actions</th>
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {filtered.map((announcement, index) => {
                  const roles = Array.isArray(announcement.targetRoles)
                    ? announcement.targetRoles
                    : [];
                  const expired =
                    announcement.expiresAt &&
                    new Date(announcement.expiresAt) < new Date();
                  return (
                    <motion.tr
                      key={announcement.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
                      className="text-sm hover:bg-slate-50/50 transition-colors"
                    >
                      <td className={dataTableClass.td}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          {announcement.isPinned && (
                            <Pin className="w-4 h-4 text-indigo-600 fill-indigo-600 shrink-0" />
                          )}
                          <span className="font-bold text-slate-900 truncate">
                            {announcement.title}
                          </span>
                        </div>
                      </td>
                      <td className={dataTableClass.td}>
                        <div className="flex flex-wrap gap-1">
                          {roles.slice(0, 3).map((role: string) => (
                            <span
                              key={role}
                              className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold"
                            >
                              {formatRole(role)}
                            </span>
                          ))}
                          {roles.length > 3 && (
                            <span className="px-2 py-0.5 text-xs font-bold text-slate-500">
                              +{roles.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`${dataTableClass.td} text-slate-600 font-medium`}>
                        <span className="truncate block">{announcement.author?.name || "School admin"}</span>
                      </td>
                      <td className={`${dataTableClass.td} text-slate-600 font-medium`}>
                        {format(new Date(announcement.createdAt), "MMM dd, yyyy")}
                      </td>
                      <td className={dataTableClass.td}>
                        {expired ? (
                          <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold uppercase tracking-wider border border-rose-100">
                            Expired
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold uppercase tracking-wider border border-emerald-100">
                            Active
                          </span>
                        )}
                      </td>
                      <td className={dataTableClass.td}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(announcement)}
                            className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors"
                            aria-label="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(announcement.id)}
                            className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </DataTable>
        )}
      </div>

      {canManage && showModal && (
        <FeatureModalShell
          eyebrow="Communications"
          title={editing ? "Edit announcement" : "New announcement"}
          subtitle="Keep notices clear and scoped to the right audience."
          onClose={() => setShowModal(false)}
          wide
          footer={
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-5 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="announcement-form"
                disabled={submitting}
                className="flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
              >
                {submitting
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : "Publish"}
              </button>
            </div>
          }
        >
          <form id="announcement-form" onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
            <div className="space-y-1.5">
              <label className={fieldLabel}>
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={fieldInput}
                placeholder="e.g. Parent-teacher conferences next week"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className={fieldLabel}>
                Content <span className="text-rose-500">*</span>
              </label>
              <RichTextEditor
                value={form.content}
                onChange={(val) => setForm({ ...form, content: val })}
                placeholder="Write your announcement…"
                minHeight="160px"
              />
            </div>

            <div className="space-y-2">
              <label className={fieldLabel}>Target roles</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 gap-2">
                {ROLE_OPTIONS.map((role) => (
                  <label
                    key={role}
                    className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={form.targetRoles.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({
                            ...form,
                            targetRoles: [...form.targetRoles, role],
                          });
                        } else {
                          setForm({
                            ...form,
                            targetRoles: form.targetRoles.filter((r) => r !== role),
                          });
                        }
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-600">
                      {formatRole(role)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <FriendlyDateField
                label="Expiry date (optional)"
                value={form.expiresAt}
                onChange={(expiresAt) => setForm({ ...form, expiresAt })}
              />
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPinned}
                  onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-bold text-slate-700">Pin to top</span>
              </label>
            </div>
          </form>
        </FeatureModalShell>
      )}
    </div>
  );
}
