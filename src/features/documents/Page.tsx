import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  FileText,
  Plus,
  Download,
  Pencil,
  Trash2,
  Upload,
  FolderOpen,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { useAuthStore } from "../../store/authStore";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
  cardShell,
} from "../academics-shared/FeatureModalShell";
import { confirmAction } from "../../lib/swal";
import { documentsApi } from "./api";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_MANAGE_ROLES,
  DOCUMENT_ROLE_OPTIONS,
  MAX_INLINE_UPLOAD_BYTES,
  categoryAccent,
  fileTypeAccent,
  formatCategory,
  formatRole,
} from "./constants";
import { useTranslation } from "react-i18next";
import { ListFilterBar, Button } from "../../components/ui";
import { useListFilters, type FilterFieldDef } from "../list-filters";

type DocumentForm = {
  title: string;
  description: string;
  fileUrl: string;
  fileType: string;
  category: string;
  accessRoles: string[];
};

const emptyForm: DocumentForm = {
  title: "",
  description: "",
  fileUrl: "",
  fileType: "pdf",
  category: "POLICY",
  accessRoles: ["TEACHER", "STUDENT", "PARENT"],
};

function extensionFromName(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "pdf";
}

export function DocumentsPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { school, user } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<DocumentForm>(emptyForm);
  const [pickedFileSize, setPickedFileSize] = useState<number | null>(null);

  const canManage = DOCUMENT_MANAGE_ROLES.has(user?.role || "");

  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "category",
        label: t("documents.form.category"),
        type: "enum",
        primary: true,
        allLabel: t("documents.all"),
        options: DOCUMENT_CATEGORIES.map((cat) => ({
          value: cat,
          label: formatCategory(cat, (key) => t(key)),
        })),
      },
    ],
    [t]
  );

  const filters = useListFilters({ fields: filterFields, syncUrl: true });

  const fetchDocuments = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const data = await documentsApi.list(school.id);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err?.message || t("documents.toast.loadFailed"), "error");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [school?.id]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setPickedFileSize(null);
    setShowModal(true);
  };

  const openEdit = (doc: any) => {
    setEditing(doc);
    setPickedFileSize(typeof doc.fileSizeBytes === "number" ? doc.fileSizeBytes : null);
    setForm({
      title: doc.title || "",
      description: doc.description || "",
      fileUrl: doc.fileUrl || "",
      fileType: doc.fileType || "pdf",
      category: doc.category || "POLICY",
      accessRoles: Array.isArray(doc.accessRoles) ? doc.accessRoles : [],
    });
    setShowModal(true);
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_INLINE_UPLOAD_BYTES) {
      showToast(t("documents.toast.fileTooLarge"), "error");
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsDataURL(file);
      });
      setForm((prev) => ({
        ...prev,
        fileUrl: dataUrl,
        fileType: extensionFromName(file.name) || file.type.split("/")[1] || "pdf",
        title: prev.title || file.name.replace(/\.[^.]+$/, ""),
      }));
      setPickedFileSize(file.size);
      showToast(t("documents.toast.fileReady"), "success");
    } catch (err: any) {
      showToast(err?.message || t("documents.toast.fileReadFailed"), "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !user?.id) return;

    if (!form.title.trim()) {
      showToast(t("documents.toast.titleRequired"), "error");
      return;
    }
    if (!form.fileUrl.trim()) {
      showToast(t("documents.toast.fileRequired"), "error");
      return;
    }
    if (form.accessRoles.length === 0) {
      showToast(t("documents.toast.selectRole"), "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        fileUrl: form.fileUrl.trim(),
        fileType: form.fileType || "pdf",
        category: form.category,
        accessRoles: form.accessRoles,
        fileSizeBytes: pickedFileSize,
      };
      if (editing) {
        await documentsApi.update(editing.id, payload);
        showToast(t("documents.toast.updated"), "success");
      } else {
        await documentsApi.create(school.id, {
          ...payload,
          uploadedBy: user.id,
        });
        showToast(t("documents.toast.published"), "success");
      }
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
      setPickedFileSize(null);
      fetchDocuments();
    } catch (err: any) {
      if (err?.code === "QUOTA_EXCEEDED") {
        showToast(t("documents.toast.storageQuotaExceeded"), "error");
      } else {
        showToast(err?.message || t("documents.toast.saveFailed"), "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmAction({
      title: t("documents.confirm.deleteTitle"),
      text: t("documents.confirm.deleteText"),
      confirmText: t("common:delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await documentsApi.remove(id);
      showToast(t("documents.toast.deleted"), "info");
      fetchDocuments();
    } catch (err: any) {
      showToast(err?.message || t("documents.toast.deleteFailed"), "error");
    }
  };

  const filtered = useMemo(() => {
    const q = filters.committedQ.trim().toLowerCase();
    return documents.filter((doc) => {
      const roles = Array.isArray(doc.accessRoles) ? doc.accessRoles : [];
      const uploader = doc.uploader?.name || "";
      const matchesSearch =
        !q ||
        doc.title?.toLowerCase().includes(q) ||
        (doc.description || "").toLowerCase().includes(q) ||
        uploader.toLowerCase().includes(q) ||
        roles.some((r: string) => formatRole(r).toLowerCase().includes(q));
      const matchesCategory = !filters.values.category || doc.category === filters.values.category;
      return matchesSearch && matchesCategory;
    });
  }, [documents, filters.committedQ, filters.values.category]);

  const stats = useMemo(() => {
    const byCat = (cat: string) =>
      documents.filter((d) => d.category === cat).length;
    return {
      total: documents.length,
      policy: byCat("POLICY"),
      form: byCat("FORM"),
      materials: byCat("TEACHING_MATERIAL"),
    };
  }, [documents]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            {t("documents.eyebrow")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 font-dashboard">
            {t("documents.title")}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {t("documents.subtitle")}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t("documents.uploadDocument")}
          </button>
        )}
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t("documents.stats.total"), value: stats.total, icon: FolderOpen, tone: "bg-indigo-50 text-indigo-600" },
          { label: t("documents.stats.policies"), value: stats.policy, icon: FileText, tone: "bg-slate-100 text-slate-600" },
          { label: t("documents.stats.forms"), value: stats.form, icon: FileText, tone: "bg-emerald-50 text-emerald-600" },
          { label: t("documents.stats.materials"), value: stats.materials, icon: FileText, tone: "bg-sky-50 text-sky-600" },
        ].map((tile) => (
          <div
            key={tile.label}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${tile.tone}`}
            >
              <tile.icon className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {tile.label}
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
              {loading ? "—" : tile.value}
            </p>
          </div>
        ))}
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
            searchPlaceholder={t("documents.searchPlaceholder")}
            shownCount={filtered.length}
          />
        </div>

        {loading ? (
          <div className="h-64 bg-slate-50 animate-pulse" />
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center px-6">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
              {filters.hasActiveFilters ? t("pages:listFilters.noMatches") : "No documents yet"}
            </h3>
            <p className="text-slate-500 font-medium mt-2 max-w-sm mx-auto">
              {filters.hasActiveFilters
                ? t("pages:listFilters.noMatchesHint")
                : canManage
                  ? "Upload a policy, form, or teaching resource to get started."
                  : "Nothing has been shared with your role yet."}
            </p>
            {filters.hasActiveFilters ? (
              <Button type="button" variant="secondary" size="compact" className="mt-4" onClick={filters.clear}>
                {t("pages:listFilters.clearAll")}
              </Button>
            ) : canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold"
              >
                <Upload className="w-4 h-4" />
                Upload document
              </button>
            ) : null}
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((doc, index) => {
              const roles = Array.isArray(doc.accessRoles) ? doc.accessRoles : [];
              return (
                <motion.article
                  key={doc.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] hover:border-indigo-100 transition-colors flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${fileTypeAccent(doc.fileType)}`}
                    >
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${categoryAccent(doc.category)}`}
                      >
                        {formatCategory(doc.category)}
                      </span>
                      <span className="px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-50 text-slate-400 border border-slate-100 font-mono">
                        {(doc.fileType || "DOC").toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <h3 className="font-extrabold tracking-tight text-slate-900 leading-snug">
                      {doc.title}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium line-clamp-2">
                      {doc.description || "No description provided."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {roles.slice(0, 4).map((role: string) => (
                      <span
                        key={role}
                        className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-600 rounded-lg text-xs font-bold"
                      >
                        {formatRole(role)}
                      </span>
                    ))}
                    {roles.length > 4 && (
                      <span className="px-2 py-0.5 text-xs font-bold text-slate-500">
                        +{roles.length - 4}
                      </span>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-50 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">
                        {doc.uploader?.name || "School staff"}
                      </p>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                        {doc.createdAt
                          ? format(new Date(doc.createdAt), "MMM dd, yyyy")
                          : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={doc.fileUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Open
                      </a>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(doc)}
                            className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors"
                            aria-label="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(doc.id)}
                            className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <FeatureModalShell
          eyebrow="Communications"
          title={editing ? "Edit document" : "Upload document"}
          subtitle="Share a file URL or attach a small file, then choose who can access it."
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
                form="document-form"
                disabled={submitting || uploading}
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
          <form id="document-form" onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
            <div className="space-y-1.5">
              <label className={fieldLabel}>
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={fieldInput}
                placeholder="e.g. Parent handbook 2026"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className={fieldLabel}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={`${fieldInput} min-h-[88px] resize-y`}
                placeholder="Short note about what this file covers"
              />
            </div>

            <div className="space-y-2">
              <label className={fieldLabel}>File</label>
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors cursor-pointer">
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-indigo-600">Reading file…</span>
                  </div>
                ) : form.fileUrl ? (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    <p className="text-sm font-bold text-slate-800">File attached</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                      {form.fileType} · click to replace
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className="w-8 h-8 text-slate-400" />
                    <p className="text-sm font-bold text-slate-700">Click to attach a file</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      PDF, DOC, JPG, PNG · max 1.5 MB
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif"
                  onChange={handleFilePick}
                  disabled={uploading}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={fieldLabel}>
                  Or file URL <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={
                      form.fileUrl.startsWith("data:")
                        ? ""
                        : form.fileUrl
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        fileUrl: e.target.value,
                        fileType:
                          form.fileType ||
                          extensionFromName(e.target.value) ||
                          "pdf",
                      })
                    }
                    className={`${fieldInput} pl-10`}
                    placeholder="https://…"
                  />
                </div>
                {form.fileUrl.startsWith("data:") && (
                  <p className="text-xs text-emerald-600 font-medium">
                    Using attached file (inline). Paste a URL to replace it.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className={fieldLabel}>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={fieldInput}
                  required
                >
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {formatCategory(cat)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className={fieldLabel}>Access roles</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 gap-2">
                {DOCUMENT_ROLE_OPTIONS.map((role) => (
                  <label
                    key={role}
                    className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={form.accessRoles.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({
                            ...form,
                            accessRoles: [...form.accessRoles, role],
                          });
                        } else {
                          setForm({
                            ...form,
                            accessRoles: form.accessRoles.filter((r) => r !== role),
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
          </form>
        </FeatureModalShell>
      )}
    </div>
  );
}
