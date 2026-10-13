import React from "react";
import { format } from "date-fns";
import {
  Filter,
  Plus,
  CheckCircle2,
  Clock,
  UserPlus,
  Edit,
  Trash2,
  Users,
  Upload,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { useStudentsQuery } from "./hooks/useStudentsQuery";
import { studentsApi } from "./api";
import { EnrollStudentModal } from "./components/EnrollStudentModal";
import { EditStudentModal } from "./components/EditStudentModal";
import { ImportRosterModal } from "../bulk-import/ImportRosterModal";
import { bulkImportApi } from "../bulk-import/api";
import { confirmAction } from "../../lib/swal";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { UserAvatar } from "../../components/UserAvatar";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
  cardShell,
} from "../academics-shared/FeatureModalShell";
import { translateApiError } from "../../i18n/apiErrors";
import { ListFilterBar, ListPagination, DataTable, dataTableClass, Button } from "../../components/ui";
import { useListFilters, type FilterFieldDef } from "../list-filters";

const emptyStudent = {
  name: "",
  email: "",
  dob: "",
  gender: "MALE",
  parentName: "",
  parentPhone: "",
  gradeLevelId: "",
  classroomId: "",
  feeCohort: "NEW",
};

export const Students = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { school, user } = useAuthStore();
  const { toast, showToast } = usePageToast();

  const baseFilterFields: FilterFieldDef[] = React.useMemo(
    () => [
      {
        key: "gradeLevelId",
        label: t("pages:students.selectGradeLevel"),
        type: "enum",
        primary: true,
        allLabel: t("common:all"),
        options: [],
      },
      {
        key: "feeCohort",
        label: t("pages:students.feeCohort"),
        type: "enum",
        primary: true,
        allLabel: t("common:all"),
        options: [
          { value: "NEW", label: t("pages:students.newStudent") },
          { value: "RETURNING", label: t("pages:students.returningStudent") },
        ],
      },
    ],
    [t]
  );

  const filters = useListFilters({ fields: baseFilterFields, syncUrl: true });

  const {
    students,
    total,
    page,
    pageSize,
    classrooms,
    gradeLevels,
    loading,
    invalidate: refetchStudents,
  } = useStudentsQuery({
    q: filters.committedQ,
    gradeLevelId: filters.values.gradeLevelId || undefined,
    feeCohort: filters.values.feeCohort || undefined,
    page: filters.page,
    pageSize: filters.pageSize,
  });

  const filterFields: FilterFieldDef[] = React.useMemo(
    () =>
      baseFilterFields.map((f) =>
        f.key === "gradeLevelId"
          ? {
              ...f,
              options: gradeLevels.map((g: any) => ({ value: g.id, label: g.name })),
            }
          : f
      ),
    [baseFilterFields, gradeLevels]
  );

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [showAssignModal, setShowAssignModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<any | null>(
    null
  );
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc" | "none">(
    "none"
  );
  const [newStudent, setNewStudent] = React.useState({ ...emptyStudent });
  const [editStudent, setEditStudent] = React.useState<any>({
    ...emptyStudent,
    isActive: true,
  });
  const [assignData, setAssignData] = React.useState({
    classroomId: "",
    role: "STUDENT",
  });

  const [isEnrolling, setIsEnrolling] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [enrollError, setEnrollError] = React.useState("");
  const [credentials, setCredentials] = React.useState<{
    email: string;
    temporaryPassword: string;
    name: string;
  } | null>(null);

  const canEnroll = ["REGISTRAR", "SCHOOL_ADMIN", "SUPER_ADMIN"].includes(
    user?.role || ""
  );
  const canEdit = ["PRINCIPAL", "SCHOOL_ADMIN", "SUPER_ADMIN", "REGISTRAR"].includes(
    user?.role || ""
  );
  const canManage = ["REGISTRAR", "PRINCIPAL", "SCHOOL_ADMIN", "SUPER_ADMIN"].includes(
    user?.role || ""
  );

  const gradeName = (id?: string) =>
    gradeLevels.find((g: any) => g.id === id)?.name || "—";

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) return;
    setIsEnrolling(true);
    setEnrollError("");
    try {
      const { classroomId, ...payload } = newStudent;
      const data = await studentsApi.createStudent(school.id, payload);
      if (classroomId) {
        try {
          await studentsApi.addClassroomMember(classroomId, {
            userId: data.id,
            role: "STUDENT",
          });
        } catch {
          showToast(
            "Student created, but classroom assign failed — use Assign later.",
            "info"
          );
        }
      }
      setCredentials({
        email: data.email,
        temporaryPassword: data.temporaryPassword,
        name: data.name,
      });
      setNewStudent({ ...emptyStudent });
      refetchStudents();
      showToast(t("pages:students.enrolled"), "success");
    } catch (err: any) {
      setEnrollError(translateApiError(err) || err?.message || t("common:errorGeneric"));
    } finally {
      setIsEnrolling(false);
    }
  };

  const closeEnrollModal = () => {
    setIsModalOpen(false);
    setCredentials(null);
    setEnrollError("");
    setNewStudent({ ...emptyStudent });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSubmitting(true);
    try {
      await studentsApi.updateUser(selectedStudent.id, editStudent);
      await refetchStudents();
      setShowEditModal(false);
      setSelectedStudent(null);
      showToast(t("pages:students.updated"), "success");
    } catch (err: any) {
      showToast(translateApiError(err) || err?.message || t("common:errorGeneric"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    const ok = await confirmAction({
      title: t("pages:students.deleteConfirmTitle"),
      text: t("pages:students.deleteConfirmText"),
      confirmText: t("common:delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await studentsApi.deleteUser(studentId);
      await refetchStudents();
      showToast(t("pages:students.deleted"), "info");
    } catch (err: any) {
      showToast(translateApiError(err) || err?.message || t("common:errorGeneric"), "error");
    }
  };

  const openEditModal = (student: any) => {
    setSelectedStudent(student);
    setEditStudent({
      id: student.id,
      name: student.name || "",
      email: student.email || "",
      photoUrl: student.photoUrl || null,
      dob: student.dob ? String(student.dob).split("T")[0] : "",
      gender: student.gender || "MALE",
      parentName: student.parentName || "",
      parentPhone: student.parentPhone || "",
      gradeLevelId: student.gradeLevelId || "",
      feeCohort: student.feeCohort || "NEW",
      isActive: student.isActive,
    });
    setShowEditModal(true);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !assignData.classroomId) return;
    setSubmitting(true);
    try {
      await studentsApi.addClassroomMember(assignData.classroomId, {
        userId: selectedStudent.id,
        role: assignData.role,
      });
      setShowAssignModal(false);
      setAssignData({ classroomId: "", role: "STUDENT" });
      refetchStudents();
      showToast(t("pages:students.assigned"), "success");
    } catch (err: any) {
      showToast(translateApiError(err) || err?.message || t("common:errorGeneric"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const processedStudents = React.useMemo(() => {
    let result = [...students];
    if (sortOrder !== "none") {
      result = [...result].sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      });
    }
    return result;
  }, [students, sortOrder]);

  const toggleSort = () => {
    setSortOrder((prev) => {
      if (prev === "none") return "desc";
      if (prev === "desc") return "asc";
      return "none";
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            {t("pages:students.directory")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 font-dashboard">
            {t("pages:students.title")}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {t("pages:students.subtitle", { school: school?.name || "" })}
          </p>
        </div>
        {canEnroll ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              {t("pages:students.import")}
            </button>
            <button
              type="button"
              onClick={() => {
                setCredentials(null);
                setEnrollError("");
                setNewStudent({ ...emptyStudent });
                setIsModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              {t("pages:students.enroll")}
            </button>
          </div>
        ) : (
          <div className="text-slate-500 text-xs font-semibold bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            {t("pages:students.onlyRegistrars")}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showImportModal && school?.id ? (
          <ImportRosterModal
            kind="student"
            open={showImportModal}
            onClose={() => setShowImportModal(false)}
            onDownloadTemplate={() => bulkImportApi.downloadStudentTemplate(school.id)}
            onPreview={(rows, sourceFileName) =>
              bulkImportApi.previewStudents(school.id, rows, sourceFileName)
            }
            onImport={(rows, sourceFileName) =>
              bulkImportApi.importStudents(school.id, rows, sourceFileName)
            }
            onImported={() => {
              refetchStudents();
              showToast(t("pages:students.imported"), "success");
            }}
          />
        ) : null}
      </AnimatePresence>

      <div className={`${cardShell} overflow-hidden`}>
        <div className="p-6 border-b border-slate-100 space-y-3">
          <ListFilterBar
            fields={filterFields}
            q={filters.q}
            onSearchChange={filters.setQ}
            values={filters.values}
            onValueChange={filters.setValue}
            onClear={filters.clear}
            searchPlaceholder={t("pages:students.searchPlaceholder")}
            shownCount={processedStudents.length}
            totalCount={total}
            actions={
              <Button
                type="button"
                variant={sortOrder !== "none" ? "secondary" : "ghost"}
                size="compact"
                onClick={toggleSort}
              >
                <Filter className="w-4 h-4" />
                Date{" "}
                {sortOrder === "asc" ? "↑" : sortOrder === "desc" ? "↓" : ""}
              </Button>
            }
          />
        </div>

        {loading ? (
          <div className="h-64 bg-slate-50 animate-pulse" />
        ) : processedStudents.length === 0 ? (
          <div className="py-20 text-center px-6">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
              {filters.hasActiveFilters
                ? t("pages:listFilters.noMatches")
                : t("common:empty")}
            </h3>
            <p className="text-slate-500 font-medium mt-2 max-w-sm mx-auto">
              {filters.hasActiveFilters
                ? t("pages:listFilters.noMatchesHint")
                : t("pages:students.enroll")}
            </p>
            {filters.hasActiveFilters ? (
              <Button type="button" variant="secondary" size="compact" className="mt-4" onClick={filters.clear}>
                {t("pages:listFilters.clearAll")}
              </Button>
            ) : null}
          </div>
        ) : (
          <>
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={dataTableClass.th}>Student</th>
                  <th className={dataTableClass.th}>Grade</th>
                  <th className={dataTableClass.th}>Status</th>
                  <th className={dataTableClass.th}>Enrolled</th>
                  <th className={dataTableClass.thEnd}>Actions</th>
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {processedStudents.map((student: any) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className={dataTableClass.td}>
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          userId={student.id}
                          name={student.name}
                          photoUrl={student.photoUrl}
                          size="md"
                          rounded="2xl"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {student.name}
                          </p>
                          <p className="text-xs text-slate-500 font-medium truncate">
                            {student.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={`${dataTableClass.td} text-sm font-medium text-slate-600`}>
                      <span className="truncate block">{gradeName(student.gradeLevelId)}</span>
                    </td>
                    <td className={dataTableClass.td}>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                          student.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {student.isActive ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {student.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={`${dataTableClass.td} text-sm font-medium text-slate-500`}>
                      {student.createdAt
                        ? format(new Date(student.createdAt), "MMM d, yyyy")
                        : "—"}
                    </td>
                    <td className={dataTableClass.td}>
                      <div className="flex items-center justify-end gap-1">
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => openEditModal(student)}
                            className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        ) : null}
                        {canManage ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowAssignModal(true);
                              }}
                              className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors"
                              title="Assign to class"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(student.id)}
                              className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
          <ListPagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={filters.setPage}
            onPageSizeChange={filters.setPageSize}
          />
          </>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <EnrollStudentModal
            enrollError={enrollError}
            gradeLevels={gradeLevels}
            classrooms={classrooms}
            handleEnroll={handleEnroll}
            isEnrolling={isEnrolling}
            newStudent={newStudent}
            setIsModalOpen={setIsModalOpen}
            setNewStudent={setNewStudent}
            credentials={credentials}
            onDone={closeEnrollModal}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAssignModal && (
          <FeatureModalShell
            eyebrow="Students"
            title="Assign to class"
            subtitle={`Add ${selectedStudent?.name || "student"} to a classroom.`}
            onClose={() => setShowAssignModal(false)}
            footer={
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="assign-student-form"
                  disabled={submitting}
                  className="flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
                >
                  {submitting ? "Assigning…" : "Assign"}
                </button>
              </div>
            }
          >
            <form
              id="assign-student-form"
              onSubmit={handleAssign}
              className="p-6 sm:p-8 space-y-5"
            >
              <div className="space-y-1.5">
                <label className={fieldLabel}>Class group (homeroom)</label>
                <select
                  value={assignData.classroomId}
                  onChange={(e) =>
                    setAssignData({
                      ...assignData,
                      classroomId: e.target.value,
                    })
                  }
                  className={fieldInput}
                  required
                >
                  <option value="">Select a class group…</option>
                  {classrooms
                    .filter((c: any) => !c.subjectId)
                    .map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.gradeLevel?.name ? ` (${c.gradeLevel.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && (
          <EditStudentModal
            editStudent={editStudent}
            gradeLevels={gradeLevels}
            handleUpdate={handleUpdate}
            setEditStudent={setEditStudent}
            setShowEditModal={setShowEditModal}
            submitting={submitting}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
