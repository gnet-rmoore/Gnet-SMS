import React, { useState, useEffect, useMemo } from "react";
import {
  UserPlus,
  Plus,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
  Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { motion, AnimatePresence } from "motion/react";
import { AddStaffModal } from "../../features/staff-management/components/AddStaffModal";
import { StaffPhotoField } from "../../features/staff-management/components/StaffPhotoField";
import { ImportRosterModal } from "../../features/bulk-import/ImportRosterModal";
import { bulkImportApi } from "../../features/bulk-import/api";
import { STAFF_CREATE_ROLES, staffRoleLabel } from "../../constants/roles";
import { confirmAction } from "../../lib/swal";
import { UserAvatar } from "../../components/UserAvatar";
import { canAdminResetPassword } from "../../lib/passwordResetPolicy";
import { translateApiError } from "../../i18n/apiErrors";
import { ListFilterBar, ListPagination, DataTable, dataTableClass, Button } from "../../components/ui";
import { useListFilters, type FilterFieldDef } from "../../features/list-filters";

export const StaffManagement = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { school, accessToken, user } = useAuthStore();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffTotal, setStaffTotal] = useState(0);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [assignData, setAssignData] = useState({
    classroomId: "",
    role: "TEACHER",
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(
    null
  );

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: "",
    name: "",
    email: "",
    role: "TEACHER",
    phone: "",
    address: "",
    dob: "",
    gender: "",
    joiningDate: "",
    isActive: true,
    photoUrl: "",
    newPassword: "",
    confirmPassword: "",
    mustChangePassword: true,
  });

  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "role",
        label: t("common:role"),
        type: "enum",
        primary: true,
        allLabel: t("common:all"),
        options: STAFF_CREATE_ROLES.map((r) => ({ value: r, label: staffRoleLabel(r) })),
      },
      {
        key: "isActive",
        label: t("pages:staff.directory.colStatus"),
        type: "enum",
        primary: true,
        allLabel: t("common:all"),
        options: [
          { value: "true", label: t("common:active") },
          { value: "false", label: t("common:inactive") },
        ],
      },
    ],
    [t]
  );

  const filters = useListFilters({ fields: filterFields, syncUrl: true });

  const canManage =
    user?.role === "SCHOOL_ADMIN" ||
    user?.role === "PRINCIPAL" ||
    user?.role === "VPA" ||
    user?.role === "IT_ADMIN";
  const canImportStaff =
    user?.role === "SCHOOL_ADMIN" ||
    user?.role === "PRINCIPAL" ||
    user?.role === "VPA";
  const canChangeRoles = user?.role === "SCHOOL_ADMIN";
  const canResetPasswords = user?.role === "SCHOOL_ADMIN" || user?.role === "IT_ADMIN";
  const showPasswordReset =
    canResetPasswords &&
    canAdminResetPassword(
      user ? { id: user.id, role: user.role, schoolId: school?.id } : null,
      { id: editFormData.id, role: editFormData.role }
    );

  const assignmentsByStaff = useMemo(() => {
    const map = new Map<string, Array<{ classroomId: string; classroomName: string; role: string }>>();
    for (const room of classrooms) {
      const members = Array.isArray(room?.members) ? room.members : [];
      for (const member of members) {
        const staffId = member?.userId;
        if (!staffId) continue;
        const list = map.get(staffId) || [];
        if (!list.some((item) => item.classroomId === room.id)) {
          list.push({
            classroomId: room.id,
            classroomName: room.name || "",
            role: member.role || "TEACHER",
          });
        }
        map.set(staffId, list);
      }
    }
    return map;
  }, [classrooms]);

  const classroomRoleLabel = (role: string) =>
    role === "CO_TEACHER"
      ? t("pages:staff.directory.coTeacher")
      : role === "ASSISTANT"
        ? t("pages:staff.directory.assistant")
        : t("pages:staff.directory.leadTeacher");

  const selectedAssignments = selectedStaff
    ? assignmentsByStaff.get(selectedStaff.id) || []
    : [];
  const assignedClassroomIds = new Set(selectedAssignments.map((item) => item.classroomId));
  const assignableClassrooms = classrooms.filter((room) => !assignedClassroomIds.has(room.id));

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleOpenEdit = (staff: any) => {
    setEditFormData({
      id: staff.id,
      name: staff.name || "",
      email: staff.email || "",
      role: staff.role || "TEACHER",
      phone: staff.phone || "",
      address: staff.address || "",
      dob: staff.dob ? String(staff.dob).slice(0, 10) : "",
      gender: staff.gender || "",
      joiningDate: staff.joiningDate ? String(staff.joiningDate).slice(0, 10) : "",
      isActive: staff.isActive !== undefined ? staff.isActive : true,
      photoUrl: staff.photoUrl || "",
      newPassword: "",
      confirmPassword: "",
      mustChangePassword: true,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resetting =
      canAdminResetPassword(
        user ? { id: user.id, role: user.role, schoolId: school?.id } : null,
        { id: editFormData.id, role: editFormData.role }
      ) && editFormData.newPassword.trim().length > 0;

    if (resetting) {
      if (editFormData.newPassword.trim().length < 8) {
        showToast(t("pages:staff.passwordMinLength"), "error");
        return;
      }
      if (editFormData.newPassword !== editFormData.confirmPassword) {
        showToast(t("pages:staff.passwordsMismatch"), "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/users/${editFormData.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: editFormData.name,
          email: editFormData.email,
          ...(canChangeRoles ? { role: editFormData.role } : {}),
          phone: editFormData.phone || undefined,
          address: editFormData.address || undefined,
          dob: editFormData.dob || undefined,
          gender: editFormData.gender || undefined,
          joiningDate: editFormData.joiningDate || undefined,
          isActive: editFormData.isActive,
          photoUrl: editFormData.photoUrl || null,
          ...(resetting
            ? {
                password: editFormData.newPassword.trim(),
                mustChangePassword: editFormData.mustChangePassword,
              }
            : {}),
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        showToast(t("pages:staff.toast.updated"));
        fetchData();
      } else {
        const data = await response.json();
        showToast(translateApiError(data) || data.error || t("pages:staff.toast.updateFailed"), "error");
      }
    } catch (error) {
      console.error("Failed to update staff:", error);
      showToast(t("pages:staff.toast.updateError"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    const ok = await confirmAction({
      title: t("pages:staff.confirm.deleteTitle"),
      text: t("pages:staff.confirm.deleteText"),
      confirmText: t("common:delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      const response = await fetch(`/api/users/${staffId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        showToast(t("pages:staff.toast.removed"), "info");
        fetchData();
      } else {
        const data = await response.json();
        showToast(data.error || t("pages:staff.toast.deleteFailed"), "error");
      }
    } catch (error) {
      console.error("Failed to delete staff:", error);
      showToast(t("pages:staff.toast.deleteError"), "error");
    }
  };

  const fetchData = async () => {
    try {
      const staffParams = new URLSearchParams();
      if (filters.committedQ) staffParams.set("q", filters.committedQ);
      if (filters.values.role) staffParams.set("role", filters.values.role);
      if (filters.values.isActive) staffParams.set("isActive", filters.values.isActive);
      staffParams.set("page", String(filters.page));
      staffParams.set("pageSize", String(filters.pageSize));
      const staffQuery = staffParams.toString();

      const [staffRes, classRes] = await Promise.all([
        fetch(`/api/schools/${school?.id}/staff${staffQuery ? `?${staffQuery}` : ""}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`/api/schools/${school?.id}/classrooms`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      if (staffRes.ok) {
        const data = await staffRes.json();
        const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setStaffList(items);
        setStaffTotal(Array.isArray(data) ? data.length : Number(data?.total) || items.length);
      }
      if (classRes.ok) setClassrooms(await classRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
      showToast(t("pages:staff.toast.loadFailed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (school?.id) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school?.id, filters.committedQ, filters.values.role, filters.values.isActive, filters.page, filters.pageSize]);

  const handleAddStaff = async (payload: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/schools/${school?.id}/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || t("pages:staff.addFailed"));
      }
      await fetchData();
      showToast(t("pages:staff.toast.added"));
      return data as { temporaryPassword?: string };
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !assignData.classroomId) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/classrooms/${assignData.classroomId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: selectedStaff.id,
          role: assignData.role,
        }),
      });

      if (response.ok) {
        const previousAssignments = (assignmentsByStaff.get(selectedStaff.id) || []).filter(
          (item) => item.role === assignData.role && item.classroomId !== assignData.classroomId
        );

        let removalFailed = false;
        for (const item of previousAssignments) {
          const removeResponse = await fetch(
            `/api/classrooms/${item.classroomId}/members/${selectedStaff.id}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          if (!removeResponse.ok) removalFailed = true;
        }

        setShowAssignModal(false);
        fetchData();
        setAssignData({ classroomId: "", role: "TEACHER" });

        if (removalFailed) {
          showToast(t("pages:staff.toast.reassignFailed"), "error");
        } else {
          showToast(
            previousAssignments.length > 0
              ? t("pages:staff.toast.reassigned")
              : t("pages:staff.toast.assigned")
          );
        }
      } else {
        const data = await response.json();
        showToast(data.error || t("pages:staff.toast.assignFailed"), "error");
      }
    } catch (error: any) {
      console.error("Failed to assign staff:", error);
      showToast(t("pages:staff.toast.assignError"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStaff = staffList;

  const fieldClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium";

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className={`fixed top-6 right-6 z-[110] flex items-center gap-3 px-5 py-4 rounded-2xl border text-sm font-bold shadow-[0_4px_20px_rgb(0,0,0,0.08)] ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                : toast.type === "error"
                  ? "bg-rose-50 text-rose-800 border-rose-100"
                  : "bg-indigo-50 text-indigo-800 border-indigo-100"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : toast.type === "error" ? (
              <XCircle className="w-5 h-5 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
            {user?.role === "SECURITY"
              ? t("pages:staff.titleDirectory")
              : user?.role === "ATHLETICS_DIRECTOR"
                ? t("pages:staff.titleCoaches")
                : t("pages:staff.title")}
          </h1>
          <p className="text-slate-500 font-medium">
            {user?.role === "SECURITY"
              ? t("pages:staff.subtitleView")
              : user?.role === "ATHLETICS_DIRECTOR"
                ? t("pages:staff.subtitleCoaches")
                : t("pages:staff.subtitle")}
          </p>
        </div>
        {(canManage || canImportStaff) && (
          <div className="flex flex-col sm:flex-row gap-2">
            {canImportStaff && (
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-sm font-bold transition-colors"
              >
                <Upload className="w-5 h-5" />
                {t("pages:staff.import")}
              </button>
            )}
            {canManage && (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                {t("pages:staff.add")}
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showImportModal && school?.id ? (
          <ImportRosterModal
            kind="staff"
            open={showImportModal}
            onClose={() => setShowImportModal(false)}
            onDownloadTemplate={() => bulkImportApi.downloadStaffTemplate(school.id)}
            onPreview={(rows, sourceFileName) =>
              bulkImportApi.previewStaff(school.id, rows, sourceFileName)
            }
            onImport={(rows, sourceFileName) =>
              bulkImportApi.importStaff(school.id, rows, sourceFileName)
            }
            onImported={() => {
              fetchData();
              showToast(t("pages:staff.imported"));
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <AddStaffModal
            open={showModal}
            submitting={submitting}
            onClose={() => setShowModal(false)}
            onSubmit={handleAddStaff}
          />
        )}
      </AnimatePresence>

      {showAssignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAssignModal(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-br from-slate-950 to-slate-900 text-white">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">{t("pages:staff.directory.assignToClass")}</h2>
                <p className="text-slate-300 text-sm font-medium">{t("pages:staff.directory.assignSubtitle")}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssign} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("pages:staff.directory.colStaff")}</label>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-900">
                  {selectedStaff?.name}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("pages:staff.directory.currentAssignment")}</label>
                {selectedAssignments.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm font-medium text-slate-500">
                    {t("pages:staff.directory.notAssigned")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {selectedAssignments.map((item) => (
                        <span
                          key={item.classroomId}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700"
                        >
                          <span>{item.classroomName}</span>
                          <span className="text-indigo-400">•</span>
                          <span>{classroomRoleLabel(item.role)}</span>
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{t("pages:staff.directory.reassignHint")}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("pages:staff.directory.classroom")}</label>
                <select
                  value={assignData.classroomId}
                  onChange={(e) => setAssignData({ ...assignData, classroomId: e.target.value })}
                  className={fieldClass}
                  required
                  disabled={assignableClassrooms.length === 0}
                >
                  <option value="">{t("pages:staff.directory.selectClassroom")}</option>
                  {assignableClassrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.subject?.name ? ` - ${c.subject.name}` : ""}
                      {c.gradeLevel?.name ? ` (${c.gradeLevel.name})` : ""}
                    </option>
                  ))}
                </select>
                {assignableClassrooms.length === 0 ? (
                  <p className="text-xs text-slate-500 font-medium">{t("pages:staff.directory.noOtherClassrooms")}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("pages:staff.directory.roleInClass")}</label>
                <select
                  value={assignData.role}
                  onChange={(e) => setAssignData({ ...assignData, role: e.target.value })}
                  className={fieldClass}
                  required
                >
                  <option value="TEACHER">{t("pages:staff.directory.leadTeacher")}</option>
                  <option value="CO_TEACHER">{t("pages:staff.directory.coTeacher")}</option>
                  <option value="ASSISTANT">{t("pages:staff.directory.assistant")}</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  {t("common:cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting || assignableClassrooms.length === 0}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {submitting ? t("pages:staff.directory.assigning") : t("pages:staff.directory.assign")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="bg-white rounded-[32px] shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <ListFilterBar
            fields={filterFields}
            q={filters.q}
            onSearchChange={filters.setQ}
            values={filters.values}
            onValueChange={filters.setValue}
            onClear={filters.clear}
            searchPlaceholder={t("pages:staff.directory.searchPlaceholder")}
            shownCount={filteredStaff.length}
            totalCount={staffTotal}
            savedViewsScope={school?.id ? `${school.id}:staff` : undefined}
          />
        </div>

        <DataTable>
          <table className={dataTableClass.table}>
            <thead className={dataTableClass.thead}>
              <tr>
                <th className={`${dataTableClass.th} w-[26%]`}>
                  {t("pages:staff.directory.colStaff")}
                </th>
                <th className={`${dataTableClass.th} w-[12%]`}>
                  {t("common:role")}
                </th>
                <th className={`${dataTableClass.th} w-[16%]`}>
                  {t("pages:staff.directory.colContact")}
                </th>
                <th className={`${dataTableClass.th} w-[20%]`}>
                  {t("pages:staff.directory.colClass")}
                </th>
                <th className={`${dataTableClass.th} w-[10%]`}>
                  {t("pages:staff.directory.colStatus")}
                </th>
                {canManage && (
                  <th className={`${dataTableClass.thEnd} w-[16%]`}>
                    {t("pages:staff.directory.colActions")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className={dataTableClass.tbody}>
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={canManage ? 6 : 5} className={`${dataTableClass.td} animate-pulse bg-slate-50/50 h-16`} />
                  </tr>
                ))
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className={dataTableClass.tdEmpty}>
                    <div className="mx-auto max-w-sm rounded-2xl border border-dashed border-slate-200 p-8 space-y-2">
                      <p className="font-extrabold tracking-tight text-slate-900">{t("pages:staff.directory.noStaffTitle")}</p>
                      <p className="text-sm text-slate-500">
                        {filters.hasActiveFilters
                          ? t("pages:staff.directory.noStaffSearch")
                          : canManage
                            ? t("pages:staff.directory.noStaffEmptyManage")
                            : t("pages:staff.directory.noStaffEmptyView")}
                      </p>
                      {canManage && !filters.hasActiveFilters && (
                        <button
                          type="button"
                          onClick={() => setShowModal(true)}
                          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold"
                        >
                          <UserPlus className="w-4 h-4" />
                          {t("pages:staff.add")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const staffAssignments = assignmentsByStaff.get(staff.id) || [];
                  return (
                  <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className={dataTableClass.td}>
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          userId={staff.id}
                          name={staff.name}
                          photoUrl={staff.photoUrl}
                          size="md"
                          rounded="2xl"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{staff.name}</p>
                          <p className="text-xs text-slate-500 truncate">{staff.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={dataTableClass.td}>
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-black uppercase tracking-widest">
                        {staffRoleLabel(staff.role)}
                      </span>
                    </td>
                    <td className={`${dataTableClass.td} text-sm text-slate-600 font-medium`}>
                      <span className="truncate block">
                        {staff.phone || <span className="text-slate-400 italic">{t("pages:staff.directory.noPhone")}</span>}
                      </span>
                    </td>
                    <td className={dataTableClass.td}>
                      {staffAssignments.length === 0 ? (
                        <span className="text-xs text-slate-400 font-medium italic">
                          {t("pages:staff.directory.notAssigned")}
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {staffAssignments.slice(0, 2).map((item) => (
                            <span
                              key={item.classroomId}
                              title={`${item.classroomName} • ${classroomRoleLabel(item.role)}`}
                              className="inline-flex max-w-full items-center px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] font-bold text-indigo-700"
                            >
                              <span className="truncate">{item.classroomName}</span>
                            </span>
                          ))}
                          {staffAssignments.length > 2 ? (
                            <span
                              title={staffAssignments
                                .slice(2)
                                .map((item) => `${item.classroomName} • ${classroomRoleLabel(item.role)}`)
                                .join(", ")}
                              className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 text-[11px] font-bold text-slate-600"
                            >
                              +{staffAssignments.length - 2}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className={dataTableClass.td}>
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest ${
                          staff.isActive !== false
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {staff.isActive !== false ? t("common:active") : t("common:inactive")}
                      </span>
                    </td>
                    {canManage && (
                      <td className={dataTableClass.td}>
                        <div className="flex items-center justify-end gap-1">
                          {staff.role === "TEACHER" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="compact"
                              onClick={() => {
                                setSelectedStaff(staff);
                                setShowAssignModal(true);
                              }}
                              title={
                                staffAssignments.length > 0
                                  ? t("pages:staff.directory.reassignClass")
                                  : t("pages:staff.directory.assignToClass")
                              }
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="compact"
                            onClick={() => handleOpenEdit(staff)}
                            title={t("pages:staff.directory.editTitle")}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="compact"
                            onClick={() => handleDeleteStaff(staff.id)}
                            title={t("pages:staff.confirm.deleteTitle")}
                            className="hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </DataTable>
        <ListPagination
          total={staffTotal}
          page={filters.page}
          pageSize={filters.pageSize}
          onPageChange={filters.setPage}
          onPageSizeChange={filters.setPageSize}
        />
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden z-10 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-br from-slate-950 to-slate-900 text-white shrink-0">
              <div>
                <h3 className="font-extrabold tracking-tight text-lg">{t("pages:staff.directory.editTitle")}</h3>
                <p className="text-xs text-slate-300">{t("pages:staff.directory.editSubtitle")}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto">
              <StaffPhotoField
                name={editFormData.name}
                photoUrl={editFormData.photoUrl || null}
                onChange={(photoUrl) =>
                  setEditFormData({ ...editFormData, photoUrl: photoUrl || "" })
                }
                onError={(message) => showToast(message, "error")}
                disabled={submitting}
              />
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("common:fullName")}</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className={fieldClass}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("common:email")}</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className={fieldClass}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("common:role")}</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className={fieldClass}
                    disabled={!canChangeRoles}
                  >
                    {STAFF_CREATE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {staffRoleLabel(r)}
                      </option>
                    ))}
                  </select>
                  {!canChangeRoles ? (
                    <p className="text-xs text-slate-500 mt-1">
                      {t("pages:staff.directory.roleChangeHint")}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("common:phone")}</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("common:dateOfBirth")}</label>
                  <input
                    type="date"
                    value={editFormData.dob}
                    onChange={(e) => setEditFormData({ ...editFormData, dob: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("common:gender")}</label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    className={fieldClass}
                  >
                    <option value="">{t("pages:staff.preferNotToSay")}</option>
                    <option value="MALE">{t("common:male")}</option>
                    <option value="FEMALE">{t("common:female")}</option>
                    <option value="OTHER">{t("common:other")}</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("common:address")}</label>
                <textarea
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className={`${fieldClass} min-h-[72px]`}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("pages:staff.directory.joined")}</label>
                  <input
                    type="date"
                    value={editFormData.joiningDate}
                    onChange={(e) => setEditFormData({ ...editFormData, joiningDate: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.isActive}
                      onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                    />
                    <span className="text-sm font-semibold text-slate-800">{t("common:active")}</span>
                  </label>
                </div>
              </div>

              {showPasswordReset ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-extrabold tracking-tight text-slate-900">
                      {t("pages:staff.resetPassword")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      {t("pages:staff.resetPasswordHint")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {t("pages:staff.newPassword")}
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={editFormData.newPassword}
                      onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })}
                      className={fieldClass}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {t("pages:staff.confirmPassword")}
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={editFormData.confirmPassword}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, confirmPassword: e.target.value })
                      }
                      className={fieldClass}
                      placeholder="••••••••"
                    />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.mustChangePassword}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, mustChangePassword: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                    />
                    <span className="text-sm font-semibold text-slate-800">
                      {t("pages:staff.requirePasswordChange")}
                    </span>
                  </label>
                </div>
              ) : canResetPasswords && editFormData.role === "SCHOOL_ADMIN" ? (
                <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800 leading-relaxed">
                  {t("pages:staff.schoolAdminPasswordLocked")}
                </p>
              ) : null}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all"
                >
                  {t("common:cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all"
                  disabled={submitting}
                >
                  {submitting ? t("common:saving") : t("common:saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
