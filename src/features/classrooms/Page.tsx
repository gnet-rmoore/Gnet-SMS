import React, { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import {
  Plus,
  BookOpen,
  Sparkles,
  HelpCircle,
  Layers,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useClassroomsQuery } from "./hooks/useClassroomsQuery";
import { classroomsApi } from "./api";
import { ClassroomWizardModal } from "./components/ClassroomWizardModal";
import { CreateClassroomModal } from "./components/CreateClassroomModal";
import { ManageStudentsModal } from "./components/ManageStudentsModal";
import { EditClassroomModal } from "./components/EditClassroomModal";
import { AssignSubjectModal } from "./components/AssignSubjectModal";
import { ClassGroupCard } from "./components/ClassGroupCard";
import { ConceptGuide } from "./components/ConceptGuide";
import { StandaloneSubjectsSection } from "./components/StandaloneSubjectsSection";
import { enrichClassrooms } from "../academics-shared/enrichClassrooms";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { confirmAction } from "../../lib/swal";
import { useTranslation } from "react-i18next";
import { ListFilterBar } from "../../components/ui";
import { useListFilters, type FilterFieldDef } from "../list-filters";
import { resolveOrganizationType, type OrganizationType } from "./utils";

export const Classrooms = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { slug } = useParams();
  const { school, accessToken, user } = useAuthStore();
  const {
    classrooms: rawClassrooms,
    gradeLevels,
    staff,
    subjects,
    loading,
    invalidate: refetchClassrooms,
  } = useClassroomsQuery();
  const { toast, showToast } = usePageToast();

  const classrooms = useMemo(
    () => enrichClassrooms(rawClassrooms || [], { subjects, gradeLevels, staff }),
    [rawClassrooms, subjects, gradeLevels, staff]
  );

  const [showModal, setShowModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showManageStudentsModal, setShowManageStudentsModal] = useState(false);
  const [selectedClassGroup, setSelectedClassGroup] = useState<any>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showConceptGuide, setShowConceptGuide] = useState(false);

  const [showWizardModal, setShowWizardModal] = useState(false);
  const [wizardMode, setWizardMode] = useState<"SUBJECT_TO_CLASSES" | "CLASS_TO_SUBJECTS">(
    "CLASS_TO_SUBJECTS"
  );
  const [wizardSubjectId, setWizardSubjectId] = useState("");
  const [wizardSelectedClassIds, setWizardSelectedClassIds] = useState<string[]>([]);
  const [wizardClassTeachers, setWizardClassTeachers] = useState<Record<string, string>>({});
  const [wizardClassGroupId, setWizardClassGroupId] = useState("");
  const [wizardSelectedSubjectIds, setWizardSelectedSubjectIds] = useState<string[]>([]);
  const [wizardSubjectTeachers, setWizardSubjectTeachers] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: "",
    gradeLevelId: "",
    ownerTeacherId: "",
    teacherIds: [] as string[],
    assistantIds: [] as string[],
    organizationType: "SELF_CONTAINED" as OrganizationType,
    bannerColor: "bg-indigo-600",
  });
  const [subjectAssignment, setSubjectAssignment] = useState({ subjectId: "", teacherId: "" });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<any>(null);

  const canManageStudents = ["SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR"].includes(user?.role || "");
  const canCreate = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(user?.role || "");
  const isAdmin = ["SCHOOL_ADMIN", "PRINCIPAL", "SUPER_ADMIN"].includes(user?.role || "");
  const needsCurriculumSetup = gradeLevels.length === 0 || subjects.length === 0;

  const filterFields: FilterFieldDef[] = useMemo(
    () => {
      const fields: FilterFieldDef[] = [];
      if (gradeLevels.length > 0) {
        fields.push({
          key: "gradeLevelId",
          label: t("common:gradeLevel", { defaultValue: "Grade level" }),
          type: "enum",
          primary: true,
          allLabel: t("common:all"),
          options: gradeLevels.map((g: any) => ({ value: g.id, label: g.name })),
        });
      }
      fields.push({
        key: "organizationType",
        label: t("classroomModals.organizationType"),
        type: "enum",
        primary: true,
        allLabel: t("common:all"),
        options: [
          { value: "SELF_CONTAINED", label: t("classroomModals.orgSelfContained") },
          { value: "DEPARTMENTALIZED", label: t("classroomModals.orgDepartmentalized") },
          { value: "MIXED", label: t("classroomModals.orgMixed") },
        ],
      });
      return fields;
    },
    [gradeLevels, t]
  );

  const filters = useListFilters({ fields: filterFields, syncUrl: true });

  const fetchData = () => {
    refetchClassrooms();
  };

  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) return;
    setSubmitting(true);
    try {
      if (wizardMode === "SUBJECT_TO_CLASSES") {
        if (!wizardSubjectId) {
          showToast(t("classrooms.toast.selectSubject"), "error");
          return;
        }
        if (wizardSelectedClassIds.length === 0) {
          showToast(t("classrooms.toast.selectClassGroups"), "error");
          return;
        }

        const subject = subjects.find((s) => s.id === wizardSubjectId);
        const requests = wizardSelectedClassIds.map(async (classId) => {
          const classGroup = classrooms.find((c) => c.id === classId);
          if (!classGroup) return null;
          const teacherId = wizardClassTeachers[classId] || classGroup.ownerTeacherId;
          if (!teacherId) {
            throw new Error(t("classrooms.toast.assignTeacherFor", { name: classGroup.name }));
          }
          return fetch(`/api/schools/${school.id}/classrooms`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              name: `${classGroup.name} - ${subject?.name}`,
              subjectId: wizardSubjectId,
              gradeLevelId: classGroup.gradeLevelId,
              ownerTeacherId: teacherId,
              bannerColor: classGroup.bannerColor || "bg-indigo-600",
              sourceClassroomId: classGroup.id,
            }),
          });
        });

        const responses = await Promise.all(requests);
        const errors: string[] = [];
        for (let i = 0; i < responses.length; i++) {
          const res = responses[i];
          if (res && !res.ok) {
            const data = await res.json();
            const classGroup = classrooms.find((c) => c.id === wizardSelectedClassIds[i]);
            errors.push(`${classGroup?.name || t("classrooms.toast.classLabel")}: ${data.error || t("classrooms.toast.classFailed")}`);
          }
        }

        if (errors.length > 0) {
          showToast(errors[0], "error");
        } else {
          setShowWizardModal(false);
          setWizardSubjectId("");
          setWizardSelectedClassIds([]);
          setWizardClassTeachers({});
          showToast(t("classrooms.toast.subjectsAssignedGroups"));
        }
        fetchData();
      } else {
        if (!wizardClassGroupId) {
          showToast(t("classrooms.toast.selectClassGroup"), "error");
          return;
        }
        if (wizardSelectedSubjectIds.length === 0) {
          showToast(t("classrooms.toast.selectSubjects"), "error");
          return;
        }

        const classGroup = classrooms.find((c) => c.id === wizardClassGroupId);
        if (!classGroup) return;

        const requests = wizardSelectedSubjectIds.map(async (subId) => {
          const subject = subjects.find((s) => s.id === subId);
          const teacherId = wizardSubjectTeachers[subId] || classGroup.ownerTeacherId;
          if (!teacherId) {
            throw new Error(t("classrooms.toast.assignTeacherFor", { name: subject?.name || t("classrooms.toast.subjectLabel") }));
          }
          return fetch(`/api/schools/${school.id}/classrooms`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              name: `${classGroup.name} - ${subject?.name}`,
              subjectId: subId,
              gradeLevelId: classGroup.gradeLevelId,
              ownerTeacherId: teacherId,
              bannerColor: classGroup.bannerColor || "bg-indigo-600",
              sourceClassroomId: classGroup.id,
            }),
          });
        });

        const responses = await Promise.all(requests);
        const errors: string[] = [];
        for (let i = 0; i < responses.length; i++) {
          const res = responses[i];
          if (res && !res.ok) {
            const data = await res.json();
            const subject = subjects.find((s) => s.id === wizardSelectedSubjectIds[i]);
            errors.push(`${subject?.name || t("classrooms.toast.subjectLabel")}: ${data.error || t("classrooms.toast.classFailed")}`);
          }
        }

        if (errors.length > 0) {
          showToast(errors[0], "error");
        } else {
          setShowWizardModal(false);
          setWizardClassGroupId("");
          setWizardSelectedSubjectIds([]);
          setWizardSubjectTeachers({});
          showToast(t("classrooms.toast.subjectsAssignedGroup"));
        }
        fetchData();
      }
    } catch (error: any) {
      showToast(error.message || t("classrooms.toast.assignmentFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleManageStudents = (classroom: any) => {
    setSelectedClassGroup(classroom);
    setShowManageStudentsModal(true);
    setActiveDropdown(null);
    setStudentSearchQuery("");
  };

  const handleAddStudentToClass = async (studentId: string) => {
    if (!selectedClassGroup) return;
    try {
      const response = await fetch(`/api/classrooms/${selectedClassGroup.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId: studentId, role: "STUDENT" }),
      });
      if (response.ok) {
        fetchData();
        const newMember = await response.json();
        setSelectedClassGroup({
          ...selectedClassGroup,
          members: [...(selectedClassGroup.members || []), newMember],
        });
        showToast(t("classrooms.toast.studentAdded"));
      } else {
        const data = await response.json();
        showToast(data.error || t("classrooms.toast.studentAddFailed"), "error");
      }
    } catch {
      showToast(t("classrooms.toast.studentAddFailed"), "error");
    }
  };

  const handleRemoveStudentFromClass = async (studentId: string) => {
    if (!selectedClassGroup) return;
    const ok = await confirmAction({
      title: t("classrooms.confirm.removeStudentTitle"),
      text: t("classrooms.confirm.removeStudentText"),
      confirmText: t("classrooms.confirm.removeStudentConfirm"),
      danger: true,
    });
    if (!ok) return;

    const response = await fetch(
      `/api/classrooms/${selectedClassGroup.id}/members/${studentId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (response.ok) {
      fetchData();
      setSelectedClassGroup({
        ...selectedClassGroup,
        members: (selectedClassGroup.members || []).filter((m: any) => m.userId !== studentId),
      });
      showToast(t("classrooms.toast.studentRemoved"), "info");
    } else {
      const data = await response.json();
      showToast(data.error || t("classrooms.toast.studentRemoveFailed"), "error");
    }
  };

  const handleAssignSubject = (classroom: any) => {
    setSelectedClassGroup(classroom);
    setSubjectAssignment({
      subjectId: "",
      teacherId: classroom.ownerTeacherId || "",
    });
    setShowSubjectModal(true);
    setActiveDropdown(null);
  };

  const handleCreateSubjectClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassGroup || !subjectAssignment.subjectId) return;
    setSubmitting(true);
    try {
      const subject = subjects.find((s) => s.id === subjectAssignment.subjectId);
      await classroomsApi.createClassroom(school!.id, {
        name: `${selectedClassGroup.name} - ${subject?.name}`,
        subjectId: subjectAssignment.subjectId,
        gradeLevelId: selectedClassGroup.gradeLevelId,
        ownerTeacherId: subjectAssignment.teacherId,
        bannerColor: selectedClassGroup.bannerColor || "bg-indigo-600",
        sourceClassroomId: selectedClassGroup.id,
      });
      setShowSubjectModal(false);
      fetchData();
      showToast(t("classrooms.toast.subjectClassroomCreated"));
    } catch (error: any) {
      showToast(error.message || t("classrooms.toast.assignSubjectFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClassroom = (classroom: any) => {
    setEditingClassroom(classroom);
    setFormData({
      name: classroom.name,
      gradeLevelId: classroom.gradeLevelId || "",
      ownerTeacherId: classroom.ownerTeacherId || "",
      teacherIds: [],
      assistantIds: [],
      organizationType: resolveOrganizationType(classroom, classrooms.filter((c) => c.subjectId)),
      bannerColor: classroom.bannerColor || "bg-indigo-600",
    });
    setShowEditModal(true);
    setActiveDropdown(null);
  };

  const handleUpdateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClassroom) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/classrooms/${editingClassroom.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setShowEditModal(false);
        fetchData();
        showToast(t("classrooms.toast.classGroupUpdated"));
      } else {
        const data = await response.json();
        showToast(data.error || t("classrooms.toast.updateFailed"), "error");
      }
    } catch {
      showToast(t("classrooms.toast.updateFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClassroom = async (classroomId: string) => {
    const ok = await confirmAction({
      title: t("classrooms.confirm.deleteClassroomTitle"),
      text: t("classrooms.confirm.deleteClassroomText"),
      confirmText: t("common:delete"),
      danger: true,
    });
    if (!ok) return;

    const response = await fetch(`/api/classrooms/${classroomId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.ok) {
      fetchData();
      showToast(t("classrooms.toast.classroomDeleted"), "info");
    } else {
      const data = await response.json();
      showToast(data.error || t("classrooms.toast.deleteFailed"), "error");
    }
  };

  const handlePropagateRoster = async (classroom: any) => {
    const ok = await confirmAction({
      title: t("classrooms.confirm.syncRosterTitle"),
      text: t("classrooms.confirm.syncRosterText", { name: classroom.name }),
      confirmText: t("classrooms.confirm.syncRosterConfirm"),
    });
    if (!ok) return;
    setActiveDropdown(null);
    try {
      const result = await classroomsApi.propagateRoster(classroom.id);
      fetchData();
      showToast(
        t("classrooms.toast.rosterSynced", {
          added: result?.membershipsAdded ?? 0,
          rooms: result?.subjectRooms ?? 0,
        })
      );
    } catch (e: any) {
      showToast(e?.message || t("classrooms.toast.rosterSyncFailed"), "error");
    }
  };

  const handleDuplicateClassroom = async (classroom: any) => {
    const ok = await confirmAction({
      title: t("classrooms.confirm.duplicateTitle"),
      text: t("classrooms.confirm.duplicateText", { name: classroom.name }),
      confirmText: t("classrooms.confirm.duplicateConfirm"),
    });
    if (!ok) return;

    const response = await fetch(`/api/schools/${school?.id}/classrooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: `${classroom.name} (Copy)`,
        subjectId: classroom.subjectId,
        gradeLevelId: classroom.gradeLevelId,
        ownerTeacherId: classroom.ownerTeacherId,
        bannerColor: classroom.bannerColor,
        organizationType: classroom.organizationType || undefined,
        sourceClassroomId: classroom.id,
      }),
    });
    if (response.ok) {
      fetchData();
      showToast(t("classrooms.toast.classGroupDuplicated"));
    } else {
      const data = await response.json();
      showToast(data.error || t("classrooms.toast.duplicateFailed"), "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) {
      showToast(t("classrooms.toast.schoolNotFound"), "error");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/schools/${school.id}/classrooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        setShowModal(false);
        setFormData({
          name: "",
          gradeLevelId: "",
          ownerTeacherId: "",
          teacherIds: [],
          assistantIds: [],
          organizationType: "SELF_CONTAINED",
          bannerColor: "bg-indigo-600",
        });
        fetchData();
        showToast(t("classrooms.toast.classGroupCreated"));
      } else {
        showToast(data.error || t("classrooms.toast.classGroupCreateFailed"), "error");
      }
    } catch {
      showToast(t("classrooms.toast.classGroupCreateFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const gradeFilterId = filters.values.gradeLevelId;
  const orgFilter = filters.values.organizationType;
  const classroomsInGrade = gradeFilterId
    ? classrooms.filter((c) => c.gradeLevelId === gradeFilterId)
    : classrooms;
  const allClassGroups = classroomsInGrade.filter((c) => !c.subjectId);
  const allSubjectClassrooms = classroomsInGrade.filter((c) => c.subjectId);
  const q = filters.committedQ.toLowerCase();

  const searchedClassrooms = classroomsInGrade.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (c.subject?.name || "").toLowerCase().includes(q) ||
      (c.subject?.code || "").toLowerCase().includes(q) ||
      (c.gradeLevel?.name || "").toLowerCase().includes(q)
  );

  const classGroupsToDisplay = allClassGroups.filter((cg) => {
    if (orgFilter) {
      const resolved = resolveOrganizationType(cg, allSubjectClassrooms);
      if (resolved !== orgFilter) return false;
    }
    if (!filters.committedQ.trim()) return true;
    const matchesGroup = cg.name.toLowerCase().includes(q);
    const matchesSubject = allSubjectClassrooms.some(
      (sc) =>
        (sc.parentClassroomId === cg.id || sc.name.startsWith(`${cg.name} - `)) &&
        (sc.name.toLowerCase().includes(q) ||
          (sc.subject?.name || "").toLowerCase().includes(q) ||
          (sc.subject?.code || "").toLowerCase().includes(q))
    );
    return matchesGroup || matchesSubject;
  });

  const standaloneSubjectsToDisplay = searchedClassrooms.filter((sc) => {
    if (!sc.subjectId) return false;
    if (sc.parentClassroomId && allClassGroups.some((cg) => cg.id === sc.parentClassroomId)) {
      return false;
    }
    const belongsToGroup = allClassGroups.some((cg) => sc.name.startsWith(`${cg.name} - `));
    return !belongsToGroup;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
              {t("classrooms.title")}
            </h1>
            <button
              type="button"
              onClick={() => setShowConceptGuide(!showConceptGuide)}
              className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{showConceptGuide ? t("classrooms.hideGuide") : t("classrooms.needHelp")}</span>
            </button>
          </div>
          <p className="text-slate-500 font-medium mt-1">
            {t("classrooms.subtitle")}
          </p>
        </div>
        {canCreate && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setShowWizardModal(true);
                const defaultClassGroup = classrooms.find((c) => !c.subjectId);
                if (defaultClassGroup) setWizardClassGroupId(defaultClassGroup.id);
                if (subjects[0]) setWizardSubjectId(subjects[0].id);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl transition-colors flex items-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4" />
              {t("classrooms.quickAssign")}
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl transition-colors flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              {t("classrooms.createClassGroup")}
            </button>
          </div>
        )}
      </div>

      {needsCurriculumSetup && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Layers className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">{t("classrooms.setupTitle")}</p>
              <p className="text-sm text-amber-800 font-medium">
                {t("classrooms.setupHint")}
              </p>
            </div>
          </div>
          <Link
            to={`/${slug}/curriculum`}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-amber-200 text-amber-900 rounded-xl text-sm font-bold hover:bg-amber-50"
          >
            {t("classrooms.openCurriculum")}
          </Link>
        </div>
      )}

      <ConceptGuide setShowConceptGuide={setShowConceptGuide} showConceptGuide={showConceptGuide} />

      <AnimatePresence>
        {showModal && (
          <CreateClassroomModal
            formData={formData}
            gradeLevels={gradeLevels}
            handleSubmit={handleSubmit}
            isAdmin={isAdmin}
            school={school}
            setFormData={setFormData}
            setShowModal={setShowModal}
            staff={staff}
            submitting={submitting}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSubjectModal && selectedClassGroup && (
          <AssignSubjectModal
            selectedClassGroup={selectedClassGroup}
            subjectAssignment={subjectAssignment}
            setSubjectAssignment={setSubjectAssignment}
            subjects={subjects}
            staff={staff}
            submitting={submitting}
            setShowSubjectModal={setShowSubjectModal}
            handleCreateSubjectClassroom={handleCreateSubjectClassroom}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && editingClassroom && (
          <EditClassroomModal
            formData={formData}
            gradeLevels={gradeLevels}
            handleUpdateClassroom={handleUpdateClassroom}
            setFormData={setFormData}
            setShowEditModal={setShowEditModal}
            staff={staff}
            submitting={submitting}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showManageStudentsModal && selectedClassGroup && (
          <ManageStudentsModal
            handleAddStudentToClass={handleAddStudentToClass}
            handleRemoveStudentFromClass={handleRemoveStudentFromClass}
            selectedClassGroup={selectedClassGroup}
            setShowManageStudentsModal={setShowManageStudentsModal}
            setStudentSearchQuery={setStudentSearchQuery}
            studentSearchQuery={studentSearchQuery}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWizardModal && (
          <ClassroomWizardModal
            classrooms={classrooms}
            handleWizardSubmit={handleWizardSubmit}
            setShowWizardModal={setShowWizardModal}
            setWizardClassGroupId={setWizardClassGroupId}
            setWizardClassTeachers={setWizardClassTeachers}
            setWizardMode={setWizardMode}
            setWizardSelectedClassIds={setWizardSelectedClassIds}
            setWizardSelectedSubjectIds={setWizardSelectedSubjectIds}
            setWizardSubjectId={setWizardSubjectId}
            setWizardSubjectTeachers={setWizardSubjectTeachers}
            staff={staff}
            subjects={subjects}
            submitting={submitting}
            wizardClassGroupId={wizardClassGroupId}
            wizardClassTeachers={wizardClassTeachers}
            wizardMode={wizardMode}
            wizardSelectedClassIds={wizardSelectedClassIds}
            wizardSelectedSubjectIds={wizardSelectedSubjectIds}
            wizardSubjectId={wizardSubjectId}
            wizardSubjectTeachers={wizardSubjectTeachers}
          />
        )}
      </AnimatePresence>

      <ListFilterBar
        fields={filterFields}
        q={filters.q}
        onSearchChange={filters.setQ}
        values={filters.values}
        onValueChange={filters.setValue}
        onClear={filters.clear}
        searchPlaceholder={t("classrooms.searchPlaceholder")}
        shownCount={classGroupsToDisplay.length + standaloneSubjectsToDisplay.length}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-[32px]" />
          ))}
        </div>
      ) : classGroupsToDisplay.length > 0 || standaloneSubjectsToDisplay.length > 0 ? (
        <div className="space-y-12">
          {classGroupsToDisplay.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("classrooms.sectionClassGroups")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classGroupsToDisplay.map((classGroup, index) => (
                  <ClassGroupCard
                    key={classGroup.id}
                    classGroup={classGroup}
                    index={index}
                    slug={slug}
                    allSubjectClassrooms={allSubjectClassrooms}
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    canManageStudents={canManageStudents}
                    handleAssignSubject={handleAssignSubject}
                    handleManageStudents={handleManageStudents}
                    handleEditClassroom={handleEditClassroom}
                    handleDuplicateClassroom={handleDuplicateClassroom}
                    handlePropagateRoster={handlePropagateRoster}
                    handleDeleteClassroom={handleDeleteClassroom}
                  />
                ))}
              </div>
            </div>
          )}

          {standaloneSubjectsToDisplay.length > 0 && (
            <StandaloneSubjectsSection
              handleDeleteClassroom={handleDeleteClassroom}
              standaloneSubjectsToDisplay={standaloneSubjectsToDisplay}
            />
          )}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-[32px] border border-dashed border-slate-200 px-6">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
            {filters.hasActiveFilters ? t("pages:listFilters.noMatches") : t("classrooms.emptyTitle")}
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm">
            {filters.hasActiveFilters ? t("pages:listFilters.noMatchesHint") : t("classrooms.emptyHint")}
          </p>
          {filters.hasActiveFilters ? (
            <button
              type="button"
              onClick={filters.clear}
              className="mt-4 text-sm font-bold text-indigo-600 hover:underline"
            >
              {t("pages:listFilters.clearAll")}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};
