import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ClipboardCheck,
  Search,
  Layers,
  UserPlus,
  Users,
  UserX,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { confirmAction } from "../../lib/swal";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
  cardShell,
} from "../academics-shared/FeatureModalShell";
import { enrichClassrooms } from "../academics-shared/enrichClassrooms";
import {
  filterHomeroomClassrooms,
  subjectRoomsForClassGroup,
} from "../academics-shared/classGroupLinks";
import { enrollmentApi } from "./api";
import { UserAvatar } from "../../components/UserAvatar";
import { useTranslation } from "react-i18next";
import { ListFilterBar, ListPagination } from "../../components/ui";
import { useListFilters, type FilterFieldDef } from "../list-filters";
import { unwrapItems, unwrapTotal } from "../../lib/apiEnvelope";

type Student = {
  id: string;
  name?: string;
  email?: string;
  photoUrl?: string | null;
  gradeLevel?: { id?: string; name?: string } | null;
  gradeLevelId?: string | null;
};

type Classroom = {
  id: string;
  name: string;
  subjectId?: string | null;
  gradeLevelId?: string | null;
  subject?: { id: string; name: string } | null;
  gradeLevel?: { id: string; name: string } | null;
};

type MemberRow = {
  userId: string;
  role: string;
  classroomId?: string;
  user?: { name?: string; email?: string; photoUrl?: string | null };
};
type BulkAssignmentResult = {
  userId: string;
  success: boolean;
  alreadyMember?: boolean;
  reason?: string;
};

export function EnrollmentPage() {
  const { t } = useTranslation(["pages", "nav"]);
  const { school } = useAuthStore();
  const slug = school?.slug || "";
  const { toast, showToast } = usePageToast();

  const [students, setStudents] = useState<Student[]>([]);
  /** Full classroom list (homerooms + subject rooms) for subject-room counts */
  const [allClassrooms, setAllClassrooms] = useState<Classroom[]>([]);
  const [gradeLevels, setGradeLevels] = useState<{ id: string; name: string }[]>([]);
  /** classroomId → student userIds */
  const [rosterByClass, setRosterByClass] = useState<Record<string, string[]>>({});
  const [rosterStudentsByClass, setRosterStudentsByClass] = useState<
    Record<string, Student[]>
  >({});
  const [membershipErrors, setMembershipErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkAssignmentResult[]>([]);

  const availableGrades = useMemo(() => {
    const byId = new Map(gradeLevels.map((grade) => [grade.id, grade]));
    for (const student of students) {
      const id = student.gradeLevel?.id || student.gradeLevelId;
      const name = student.gradeLevel?.name;
      if (id && name && !byId.has(id)) byId.set(id, { id, name });
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, gradeLevels]);

  // Paged student fetching
  const studentFilterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "gradeLevelId",
        label: t("common:gradeLevel"),
        type: "enum",
        primary: true,
        allLabel: t("common:allGradeLevels"),
        options: availableGrades.map((g) => ({ value: g.id, label: g.name })),
      },
    ],
    [t, availableGrades]
  );

  const studentFilters = useListFilters({ fields: studentFilterFields, syncUrl: true, defaultPageSize: 50 });
  const [totalStudents, setTotalStudents] = useState(0);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [bulkIds, setBulkIds] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [activeClassroomId, setActiveClassroomId] = useState<string | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const classGroups = useMemo(
    () => filterHomeroomClassrooms(allClassrooms),
    [allClassrooms]
  );

  const activeClassroom = useMemo(
    () => classGroups.find((c) => c.id === activeClassroomId) || null,
    [classGroups, activeClassroomId]
  );

  const linkedSubjectCountByGroup = useMemo(() => {
    const subjectRooms = allClassrooms.filter((c) => c.subjectId);
    const map: Record<string, number> = {};
    for (const group of classGroups) {
      map[group.id] = subjectRoomsForClassGroup(group, subjectRooms).length;
    }
    return map;
  }, [allClassrooms, classGroups]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  /** studentId → classroom ids they belong to */
  const classroomsByStudent = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const [classId, userIds] of Object.entries(rosterByClass)) {
      for (const uid of userIds) {
        if (!map[uid]) map[uid] = [];
        map[uid].push(classId);
      }
    }
    return map;
  }, [rosterByClass]);

  const studentCountByClass = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [classId, userIds] of Object.entries(rosterByClass)) {
      map[classId] = userIds.length;
    }
    return map;
  }, [rosterByClass]);

  const loadMemberships = useCallback(async (list: Classroom[]) => {
    if (list.length === 0) {
      setRosterByClass({});
      setRosterStudentsByClass({});
      setMembershipErrors([]);
      return;
    }
    setLoadingRoster(true);
    try {
      const results = await Promise.all(
        list.map(async (classroom) => {
          try {
            const raw = await enrollmentApi.fetchMembers(classroom.id);
            const members = unwrapItems<MemberRow>(raw).filter(
              (member) => member.role === "STUDENT"
            );
            return {
              id: classroom.id,
              ids: members.map((member) => member.userId),
              students: members.map((member) => ({
                id: member.userId,
                name: member.user?.name,
                email: member.user?.email,
                photoUrl: member.user?.photoUrl,
              })),
            };
          } catch {
            return { id: classroom.id, error: true as const };
          }
        })
      );
      const next: Record<string, string[]> = {};
      const nextStudents: Record<string, Student[]> = {};
      const failedIds: string[] = [];
      for (const result of results) {
        if ("error" in result) {
          failedIds.push(result.id);
          continue;
        }
        next[result.id] = result.ids;
        nextStudents[result.id] = result.students;
      }
      setRosterByClass((previous) => ({ ...previous, ...next }));
      setRosterStudentsByClass((previous) => ({ ...previous, ...nextStudents }));
      setMembershipErrors(failedIds);
    } finally {
      setLoadingRoster(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const [studentsRaw, classroomsRaw, gradesRaw, subjectsRaw] = await Promise.all([
        enrollmentApi.fetchStudents(school.id, {
          q: studentFilters.committedQ,
          gradeLevelId: studentFilters.values.gradeLevelId,
          page: studentFilters.page,
          pageSize: studentFilters.pageSize,
        }),
        enrollmentApi.fetchClassrooms(school.id),
        enrollmentApi.fetchGradeLevels(school.id),
        enrollmentApi.fetchSubjects(school.id),
      ]);

      const studentList = unwrapItems<Student>(studentsRaw);
      const total = unwrapTotal(studentsRaw, studentList.length);
      const gradeList = unwrapItems<{ id: string; name: string }>(gradesRaw);
      const subjectList = unwrapItems<{
        id: string;
        name: string;
        code?: string;
      }>(subjectsRaw);
      const enriched = enrichClassrooms(
        unwrapItems<Classroom>(classroomsRaw),
        { subjects: subjectList, gradeLevels: gradeList, staff: [] }
      );

      const homerooms = filterHomeroomClassrooms(enriched);

      setStudents(studentList);
      setTotalStudents(total);
      setGradeLevels(gradeList);
      setAllClassrooms(enriched);
      await loadMemberships(homerooms);

      setActiveClassroomId((prev) => {
        if (prev && homerooms.some((c) => c.id === prev)) return prev;
        return homerooms[0]?.id || null;
      });
    } catch (err: any) {
      showToast(err?.message || "Failed to load enrollment data", "error");
    } finally {
      setLoading(false);
    }
  }, [
    school?.id,
    loadMemberships,
    showToast,
    studentFilters.committedQ,
    studentFilters.values.gradeLevelId,
    studentFilters.page,
    studentFilters.pageSize,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const classroomRoster = useMemo(() => {
    if (!activeClassroomId) return [];
    return rosterStudentsByClass[activeClassroomId] || [];
  }, [activeClassroomId, rosterStudentsByClass]);

  const pendingAssignmentCount = useMemo(
    () =>
      membershipErrors.length > 0
        ? null
        : students.filter((s) => !(classroomsByStudent[s.id]?.length > 0)).length,
    [students, classroomsByStudent, membershipErrors]
  );

  const assignedCount =
    pendingAssignmentCount === null ? null : students.length - pendingAssignmentCount;
  const filteredStudents = students;

  useEffect(() => {
    setBulkIds(new Set());
  }, [
    studentFilters.committedQ,
    studentFilters.values.gradeLevelId,
    studentFilters.page,
    studentFilters.pageSize,
  ]);

  const handleAssign = async (
    classroomId: string,
    studentIds: string[],
    keepBulkModalOpen = false
  ) => {
    if (studentIds.length === 0) return;
    setAssigning(true);
    try {
      const response = (await enrollmentApi.addMembersBulk(classroomId, studentIds)) as {
        results?: BulkAssignmentResult[];
      };
      if (!Array.isArray(response?.results)) throw new Error(t("common:errorGeneric"));
      const results = response.results;
      const successfulIds = results.filter((result) => result.success).map((result) => result.userId);
      const failedResults = results.filter((result) => !result.success);
      const failedIds = failedResults.map((result) => result.userId);
      setBulkResults(results);
      if (successfulIds.length > 0) {
        setRosterByClass((previous) => ({
          ...previous,
          [classroomId]: Array.from(
            new Set([...(previous[classroomId] || []), ...successfulIds])
          ),
        }));
      }
      await loadMemberships(classGroups);
      setBulkIds(keepBulkModalOpen ? new Set(failedIds) : new Set());
      if (failedResults.length === 0) {
        if (keepBulkModalOpen) setBulkModalOpen(false);
        showToast(
          successfulIds.length === 1
            ? t("enrollment.toast.assigned")
            : t("enrollment.toast.assignedBulk", { count: successfulIds.length })
        );
      } else {
        const firstFailure = failedResults[0];
        const failedStudent = students.find((student) => student.id === firstFailure.userId);
        const reason = t(`enrollment.bulkReasons.${firstFailure.reason || "assignment_failed"}`);
        showToast(
          keepBulkModalOpen
            ? t("enrollment.toast.assignmentPartial", {
                assigned: successfulIds.length,
                failed: failedResults.length,
              })
            : t("enrollment.toast.assignmentFailedForStudent", {
                name: failedStudent?.name || failedStudent?.email || firstFailure.userId,
                reason,
              }),
          successfulIds.length === 0 ? "error" : "info"
        );
      }
    } catch (err: any) {
      showToast(err?.message || t("enrollment.toast.assignmentFailed"), "error");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveFromClass = async (studentId: string, studentName: string) => {
    if (!activeClassroom) return;
    const ok = await confirmAction({
      title: t("enrollment.confirm.removeTitle"),
      text: t("enrollment.confirm.removeText", {
        name: studentName,
        classroom: activeClassroom.name,
      }),
      confirmText: t("common:remove"),
      danger: true,
    });
    if (!ok) return;

    try {
      await enrollmentApi.removeMember(activeClassroom.id, studentId);
      setRosterByClass((prev) => ({
        ...prev,
        [activeClassroom.id]: (prev[activeClassroom.id] || []).filter((id) => id !== studentId),
      }));
      setRosterStudentsByClass((prev) => ({
        ...prev,
        [activeClassroom.id]: (prev[activeClassroom.id] || []).filter(
          (student) => student.id !== studentId
        ),
      }));
      showToast(
        t("enrollment.toast.removed", {
          name: studentName,
          classroom: activeClassroom.name,
        })
      );
    } catch (err: any) {
      showToast(err?.message || t("enrollment.toast.removeFailed"), "error");
    }
  };

  const toggleBulk = (id: string) => {
    setBulkIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected =
    filteredStudents.length > 0 && filteredStudents.every((student) => bulkIds.has(student.id));
  const toggleAllVisible = () => {
    setBulkIds((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) filteredStudents.forEach((student) => next.delete(student.id));
      else filteredStudents.forEach((student) => next.add(student.id));
      return next;
    });
  };

  const openBulkModal = () => {
    if (!activeClassroom) {
      showToast(t("enrollment.toast.selectClassroom"), "error");
      return;
    }
    if (bulkIds.size === 0) {
      showToast(t("enrollment.toast.selectStudents"), "error");
      return;
    }
    setBulkResults([]);
    setBulkModalOpen(true);
  };

  const confirmBulkAssign = async () => {
    if (!activeClassroom || assigning) return;
    await handleAssign(activeClassroom.id, Array.from(bulkIds), true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0">
      <PageToast toast={toast} />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              {t("enrollment.headerEyebrow")}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
            {t("enrollment.title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-xl">
            {t("enrollment.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to={`/${slug}/students`}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
          >
            {t("enrollment.enrollStudent")}
          </Link>
          <button
            type="button"
            onClick={openBulkModal}
            disabled={assigning || bulkIds.size === 0 || !activeClassroom}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {t("enrollment.assignSelected", { count: bulkIds.size })}
          </button>
          <p className="w-full text-xs text-slate-500 md:text-right" aria-live="polite">
            {activeClassroom
              ? t("enrollment.assignDestination", { classroom: activeClassroom.name })
              : t("enrollment.assignDestinationMissing")}
            {!activeClassroom || bulkIds.size === 0
              ? ` · ${t(
                  activeClassroom
                    ? "enrollment.selectStudentsHint"
                    : "enrollment.selectClassroomHint"
                )}`
              : ""}
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`${cardShell} p-6 flex items-center gap-4`}>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("enrollment.stats.studentsPage")}
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
              {totalStudents === 0 ? 0 : students.length}
            </p>
          </div>
        </div>
        <div className={`${cardShell} p-6 flex items-center gap-4`}>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("enrollment.stats.classGroups")}
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
              {classGroups.length}
            </p>
          </div>
        </div>
        <div className={`${cardShell} p-6 flex items-center gap-4`}>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("enrollment.stats.unplacedPage")}
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
              {pendingAssignmentCount ?? "—"}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {assignedCount === null
                ? t("enrollment.stats.rosterUnavailable")
                : t("enrollment.stats.alreadyPlacedPage", { count: assignedCount })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Student directory */}
        <div className={`lg:col-span-5 ${cardShell} p-6 space-y-4`}>
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              {t("enrollment.studentsHeading")}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {t("enrollment.studentsHint")}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
            <ListFilterBar
              fields={[]}
              q={studentFilters.q}
              onSearchChange={studentFilters.setQ}
              values={studentFilters.values}
              onValueChange={studentFilters.setValue}
              onClear={studentFilters.clear}
              searchPlaceholder={t("enrollment.searchPlaceholder")}
              shownCount={students.length}
              totalCount={totalStudents}
            />
            <div className="w-full">
              <label
                htmlFor="enrollment-grade-filter"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                {t("common:gradeLevel")}
              </label>
              <select
                id="enrollment-grade-filter"
                value={studentFilters.values.gradeLevelId || ""}
                onChange={(event) =>
                  studentFilters.setValue("gradeLevelId", event.target.value)
                }
                className={`${fieldInput} w-full sm:max-w-sm`}
              >
                <option value="">{t("common:allGradeLevels")}</option>
                {availableGrades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </div>
            {gradeLevels.length === 0 && (
              <p className="text-xs text-amber-700 font-medium" role="status">
                {t("enrollment.noGradeLevels")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2">
            <p className="px-2 text-sm font-bold text-slate-700" aria-live="polite">
              {t("enrollment.selectedCount", { count: bulkIds.size })}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleAllVisible}
                disabled={filteredStudents.length === 0 || assigning}
                className="min-h-11 rounded-xl px-3 text-xs font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
              >
                {allVisibleSelected
                  ? t("enrollment.clearVisibleSelection")
                  : t("enrollment.selectAllVisible")}
              </button>
              <button
                type="button"
                onClick={() => setBulkIds(new Set())}
                disabled={bulkIds.size === 0 || assigning}
                className="min-h-11 rounded-xl px-3 text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-50"
              >
                {t("enrollment.clearSelection")}
              </button>
            </div>
          </div>

          {membershipErrors.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" role="alert">
              {t("enrollment.membershipLoadFailed")}
            </div>
          )}

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-center text-sm text-slate-400 py-12">
                {t("enrollment.loadingStudents")}
              </p>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-sm text-slate-400 font-medium">
                  {t("enrollment.noStudentsMatch")}
                </p>
                {students.length === 0 && (
                  <Link
                    to={`/${slug}/students`}
                    className="text-sm font-bold text-indigo-600 hover:underline inline-block"
                  >
                    {t("enrollment.enrollFirst")}
                  </Link>
                )}
              </div>
            ) : (
              filteredStudents.map((student) => {
                const placed =
                  membershipErrors.length > 0
                    ? null
                    : (classroomsByStudent[student.id]?.length || 0) > 0;
                const isSelected = selectedStudentId === student.id;
                const checked = bulkIds.has(student.id);

                return (
                  <div
                    key={student.id}
                    className={`p-3.5 border rounded-2xl transition-colors ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-white border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <label className="min-w-11 min-h-11 flex items-center justify-center shrink-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBulk(student.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 w-5 h-5"
                          aria-label={t("enrollment.selectStudent", {
                            name: student.name || t("enrollment.unnamedStudent"),
                          })}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentId(student.id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar
                              userId={student.id}
                              name={student.name}
                              photoUrl={student.photoUrl}
                              size="sm"
                              rounded="2xl"
                              className={isSelected ? "ring-2 ring-white/40" : undefined}
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-sm truncate">
                                {student.name || t("enrollment.unnamedStudent")}
                              </p>
                              <p
                                className={`text-xs font-medium truncate ${
                                  isSelected ? "text-indigo-200" : "text-slate-400"
                                }`}
                              >
                                {student.email || t("enrollment.noEmail")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold uppercase ${
                                isSelected
                                  ? "bg-indigo-500/50 text-white"
                                  : placed === null
                                    ? "bg-slate-100 text-slate-600"
                                  : placed
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {placed === null
                                  ? t("enrollment.placementUnknown")
                                  : placed
                                    ? t("enrollment.placed")
                                    : t("enrollment.unplaced")}
                            </span>
                            <p
                              className={`text-xs font-bold mt-1 ${
                                isSelected ? "text-indigo-200" : "text-slate-400"
                              }`}
                            >
                              {student.gradeLevel?.name || t("enrollment.noGrade")}
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!loading && totalStudents > 0 ? (
            <ListPagination
              total={totalStudents}
              page={studentFilters.page}
              pageSize={studentFilters.pageSize}
              onPageChange={studentFilters.setPage}
              onPageSizeChange={studentFilters.setPageSize}
              className="rounded-2xl border border-slate-200 bg-white"
            />
          ) : null}

        </div>

        {/* Classrooms + roster */}
        <div className="lg:col-span-7 space-y-6">
          <div className={`${cardShell} p-6 space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                {t("enrollment.classGroups.title")}
              </h3>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {classGroups.length}
              </span>
            </div>

            {classGroups.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">
                {t("enrollment.classGroups.empty")}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {classGroups.map((c) => {
                  const isActive = activeClassroomId === c.id;
                  const studentCount = studentCountByClass[c.id] || 0;
                  const subjectCount = linkedSubjectCountByGroup[c.id] || 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveClassroomId(c.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-colors ${
                        isActive
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-white border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <p className="font-bold text-xs truncate">{c.name}</p>
                      <p
                        className={`text-xs font-semibold mt-0.5 truncate ${
                          isActive ? "text-slate-300" : "text-slate-400"
                        }`}
                      >
                        {c.gradeLevel?.name || t("enrollment.classGroups.noGrade")}
                      </p>
                      {subjectCount > 0 && (
                        <p
                          className={`text-xs font-medium mt-0.5 truncate ${
                            isActive ? "text-slate-400" : "text-slate-400"
                          }`}
                        >
                          {t("enrollment.classGroups.subjectsLinked", { count: subjectCount })}
                        </p>
                      )}
                      <p
                        className={`text-xs font-bold mt-2 font-mono ${
                          isActive ? "text-slate-200" : "text-slate-500"
                        }`}
                      >
                        {t("enrollment.classGroups.studentCount", { count: studentCount })}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {activeClassroom && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold tracking-tight text-slate-900 text-sm">
                      {t("enrollment.classGroups.rosterTitle", {
                        classroom: activeClassroom.name,
                      })}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {activeClassroom.gradeLevel?.name || t("enrollment.classGroups.noGrade")}
                      {(linkedSubjectCountByGroup[activeClassroom.id] || 0) > 0 &&
                        ` · ${t("enrollment.classGroups.subjectsLinked", {
                          count: linkedSubjectCountByGroup[activeClassroom.id],
                        })}`}
                    </p>
                  </div>

                  {selectedStudent && (
                    <button
                      type="button"
                      onClick={() => handleAssign(activeClassroom.id, [selectedStudent.id])}
                      disabled={assigning}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      {t("enrollment.placeStudent", {
                        name:
                          selectedStudent.name?.split(" ")[0] ||
                          t("enrollment.unnamedStudent"),
                      })}
                    </button>
                  )}
                </div>

                {selectedStudent &&
                  selectedStudent.gradeLevel?.name &&
                  activeClassroom.gradeLevel?.name &&
                  selectedStudent.gradeLevel.name !== activeClassroom.gradeLevel.name && (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-xs text-amber-800 font-medium flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      {t("enrollment.gradeMismatch", {
                        studentGrade: selectedStudent.gradeLevel.name,
                        classGrade: activeClassroom.gradeLevel.name,
                      })}
                    </div>
                  )}

                <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                  {loadingRoster ? (
                    <p className="text-center text-xs text-slate-500 py-12">
                      {t("enrollment.loadingRoster")}
                    </p>
                  ) : membershipErrors.includes(activeClassroom.id) ? (
                    <p className="text-center text-sm text-amber-800 py-12 px-4">
                      {t("enrollment.membershipLoadFailed")}
                    </p>
                  ) : classroomRoster.length === 0 ? (
                    <div className="py-12 text-center space-y-2 px-4">
                      <p className="text-sm text-slate-400 font-medium">
                        {t("enrollment.classGroups.rosterEmpty")}
                      </p>
                      {selectedStudent && (
                        <button
                          type="button"
                          onClick={() => handleAssign(activeClassroom.id, [selectedStudent.id])}
                          className="text-sm font-bold text-indigo-600 hover:underline"
                        >
                          {t("enrollment.placeStudent", {
                            name: selectedStudent.name || t("enrollment.unnamedStudent"),
                          })}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                      {classroomRoster.map((rosterStudent) => (
                        <div
                          key={rosterStudent.id}
                          className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/60 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar
                              userId={rosterStudent.id}
                              name={rosterStudent.name}
                              photoUrl={rosterStudent.photoUrl}
                              size="sm"
                              rounded="2xl"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">
                                {rosterStudent.name || t("enrollment.unnamedStudent")}
                              </p>
                              <p className="text-xs text-slate-500 font-medium truncate">
                                {rosterStudent.email || t("enrollment.noEmail")}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {rosterStudent.gradeLevel?.name && (
                              <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-lg mr-1">
                                {rosterStudent.gradeLevel.name}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveFromClass(
                                  rosterStudent.id,
                                  rosterStudent.name || t("enrollment.unnamedStudent")
                                )
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title={t("enrollment.removeFromClass")}
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm text-slate-500 space-y-2">
            <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {t("enrollment.help.title")}
            </h4>
            <p>{t("enrollment.help.step1")}</p>
            <p>{t("enrollment.help.step2")}</p>
            <p>
              {t("enrollment.help.step3Prefix")}{" "}
              <Link to={`/${slug}/students`} className="text-indigo-600 font-bold hover:underline">
                {t("nav:students")}
              </Link>
              {t("enrollment.help.step3Suffix")}
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {bulkModalOpen && activeClassroom && (
          <FeatureModalShell
            eyebrow={t("enrollment.bulk.eyebrow")}
            title={t("enrollment.bulk.title")}
            subtitle={t("enrollment.bulk.subtitle", {
              count: bulkIds.size,
              classroom: activeClassroom.name,
            })}
            onClose={() => {
              if (!assigning) setBulkModalOpen(false);
            }}
            footer={
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  disabled={assigning}
                  className="min-h-11 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  {t("common:cancel")}
                </button>
                <button
                  type="button"
                  onClick={confirmBulkAssign}
                  disabled={assigning || bulkIds.size === 0}
                  className="min-h-11 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm"
                >
                  {assigning
                    ? t("enrollment.bulk.assigning")
                    : bulkResults.some((result) => !result.success)
                      ? t("enrollment.bulk.retryFailed", { count: bulkIds.size })
                      : t("enrollment.bulk.confirm")}
                </button>
              </div>
            }
          >
            <div className="px-8 py-6 space-y-3 max-h-[40vh] overflow-y-auto">
              <p className={fieldLabel}>{t("enrollment.bulk.studentsToAssign")}</p>
              {Array.from(bulkIds).map((id) => {
                const s = students.find((st) => st.id === id);
                return (
                  <div
                    key={id}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50"
                  >
                    <UserAvatar
                      userId={id}
                      name={s?.name}
                      photoUrl={s?.photoUrl}
                      size="sm"
                      rounded="2xl"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {s?.name || t("enrollment.unnamedStudent")}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{s?.email}</p>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-slate-500 pt-2">
                {t("enrollment.bulk.destination")}{" "}
                <span className="font-bold text-slate-700">{activeClassroom.name}</span>
              </p>
              {bulkResults.length > 0 && (
                <div className="border-t border-slate-200 pt-3 space-y-2" aria-live="polite">
                  <p className={fieldLabel}>{t("enrollment.bulk.resultsTitle")}</p>
                  {bulkResults.map((result) => {
                    const student = students.find((item) => item.id === result.userId);
                    return (
                      <div
                        key={`${result.userId}-${result.success}`}
                        className={`rounded-xl border p-3 text-xs ${
                          result.success
                            ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                            : "border-rose-100 bg-rose-50 text-rose-800"
                        }`}
                      >
                        <span className="font-bold">
                          {student?.name || student?.email || result.userId}
                        </span>
                        {" · "}
                        {result.success
                          ? result.alreadyMember
                            ? t("enrollment.bulk.alreadyAssigned")
                            : t("enrollment.bulk.assigned")
                          : t(
                              `enrollment.bulkReasons.${result.reason || "assignment_failed"}`
                            )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </FeatureModalShell>
        )}
      </AnimatePresence>
    </div>
  );
}
