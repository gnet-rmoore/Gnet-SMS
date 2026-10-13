import React, { useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Search, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { staffService } from "../../services/staffService";
import { api } from "../../services/api";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { formatSafe } from "../staff-portal/utils/dateHelpers";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
  fieldSelect,
  cardShell,
} from "../academics-shared/FeatureModalShell";
import { Button, DataTable, dataTableClass } from "../../components/ui";
import { staffRoleLabel } from "../../constants/roles";

type TaskRow = {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  dueDate?: string | null;
  assignedTo: string;
  creator?: { name?: string };
  assignee?: { name?: string };
};

type StaffRef = { id: string; name: string; role: string };

const PRIORITY_KEYS: Record<string, string> = {
  URGENT: "urgent",
  HIGH: "high",
  NORMAL: "normal",
};

export function StaffTasksPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { school, user } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [staff, setStaff] = useState<StaffRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "NORMAL",
    assignedTo: "",
    dueDate: "",
  });

  const canManage = ["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "VPI"].includes(user?.role || "");

  const fetchAll = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const [taskRows, staffRows] = await Promise.all([
        staffService.getTasks(school.id),
        api.get(`/api/schools/${school.id}/staff`),
      ]);
      setTasks(Array.isArray(taskRows) ? taskRows : []);
      setStaff(Array.isArray(staffRows) ? staffRows : []);
    } catch (err: any) {
      showToast(err?.message || t("staffTasks.toast.loadFailed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
  }, [school?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (statusFilter !== "ALL" && task.status !== statusFilter) return false;
      if (!q) return true;
      return (
        task.title.toLowerCase().includes(q) ||
        (task.description && task.description.toLowerCase().includes(q)) ||
        (task.assignee?.name && task.assignee.name.toLowerCase().includes(q))
      );
    });
  }, [tasks, search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) return;
    setSubmitting(true);
    try {
      await staffService.createTask(school.id, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        assignedTo: form.assignedTo,
        dueDate: form.dueDate || undefined,
        status: "TODO",
      });
      setShowModal(false);
      setForm({ title: "", description: "", priority: "NORMAL", assignedTo: "", dueDate: "" });
      showToast(t("staffTasks.toast.created"), "success");
      await fetchAll();
    } catch (err: any) {
      showToast(err?.message || t("staffTasks.toast.createFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManage) {
    return (
      <div className={`max-w-6xl mx-auto ${cardShell} p-8 text-center text-slate-500`}>
        {t("staffTasks.unauthorized")}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0">
      <PageToast toast={toast} />

      <div className={`${cardShell} p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-dashboard">
            {t("staffTasks.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t("staffTasks.subtitle")}</p>
        </div>
        <Button type="button" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          {t("staffTasks.assignTask")}
        </Button>
      </div>

      <div className={`${cardShell} p-6 space-y-4`}>
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("staffTasks.searchPlaceholder")}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["ALL", "TODO", "IN_PROGRESS", "COMPLETED"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-xl text-xs font-bold ${
                  statusFilter === status
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 text-slate-500 border border-slate-100"
                }`}
              >
                {status === "ALL" ? t("common:all") : t(`staffPortal.tasks.status${status === "TODO" ? "Todo" : status === "IN_PROGRESS" ? "Progress" : "Completed"}`)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500">{t("common:loading")}</div>
        ) : (
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={dataTableClass.th}>{t("staffTasks.colTask")}</th>
                  <th className={dataTableClass.th}>{t("staffTasks.colAssignee")}</th>
                  <th className={dataTableClass.th}>{t("staffPortal.tasks.priority")}</th>
                  <th className={dataTableClass.th}>{t("staffPortal.tasks.due")}</th>
                  <th className={dataTableClass.th}>{t("staffTasks.colStatus")}</th>
                  <th className={dataTableClass.thEnd}>{t("staffTasks.colAssignedBy")}</th>
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {filtered.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/50">
                    <td className={dataTableClass.td}>
                      <p className="font-bold text-slate-800">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{task.description}</p>
                      )}
                    </td>
                    <td className={dataTableClass.td}>
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {task.assignee?.name || "—"}
                      </span>
                    </td>
                    <td className={dataTableClass.td}>
                      <span className="text-xs font-bold uppercase">
                        {t(`staffPortal.tasks.${PRIORITY_KEYS[task.priority] || "normal"}`)}
                      </span>
                    </td>
                    <td className={`${dataTableClass.td} font-mono text-xs`}>
                      {task.dueDate
                        ? formatSafe(task.dueDate, "MMM dd, yyyy")
                        : t("staffPortal.tasks.noLimit")}
                    </td>
                    <td className={dataTableClass.td}>
                      <span className="text-xs font-bold uppercase">{task.status.replace("_", " ")}</span>
                    </td>
                    <td className={`${dataTableClass.td} text-end text-xs text-slate-500`}>
                      {task.creator?.name || "—"}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className={dataTableClass.tdEmpty}>
                      <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      {t("staffTasks.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </DataTable>
        )}
      </div>

      {showModal && (
        <FeatureModalShell
          title={t("staffTasks.modalTitle")}
          subtitle={t("staffTasks.modalSubtitle")}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleCreate} className="p-6 sm:p-8 space-y-5">
            <div className="space-y-1.5">
              <label className={fieldLabel}>{t("staffTasks.fieldTitle")}</label>
              <input
                className={fieldInput}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className={fieldLabel}>{t("staffTasks.fieldDescription")}</label>
              <textarea
                className={`${fieldInput} h-24 resize-none`}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={fieldLabel}>{t("staffTasks.fieldAssignee")}</label>
                <select
                  className={fieldSelect}
                  value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                  required
                >
                  <option value="">{t("staffTasks.selectAssignee")}</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({staffRoleLabel(s.role)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={fieldLabel}>{t("staffPortal.tasks.priority")}</label>
                <select
                  className={fieldSelect}
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="NORMAL">{t("staffPortal.tasks.normal")}</option>
                  <option value="HIGH">{t("staffPortal.tasks.high")}</option>
                  <option value="URGENT">{t("staffPortal.tasks.urgent")}</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={fieldLabel}>{t("staffPortal.tasks.due")}</label>
              <input
                type="date"
                className={fieldInput}
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full justify-center">
              {submitting ? t("common:saving") : t("staffTasks.assignTask")}
            </Button>
          </form>
        </FeatureModalShell>
      )}
    </div>
  );
}
