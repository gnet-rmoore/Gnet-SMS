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

type MemberRow = { userId: string; role: string; classroomId?: string };

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
  const [loading, setLoading] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Paged student fetching
  const studentFilterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "gradeLevelId",
        label: t("common:gradeLevel"),
        type: "enum",
        primary: true,
        allLabel: t("common:allGradeLevels"),
        options: gradeLevels.map((g) => ({ value: g.id, label: g.name })),
      },
    ],
    [t, gradeLevels]
  );

  const studentFilters = useListFilters({ fields: studentFilterFields, syncUrl: true, defaultPageSize: 50 });
  const [totalStudents, setTotalStudents] = useState(0);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [bulkIds, setBulkIds] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [activeClassroomId, setActiveClassroomId] = useState<string | null>(null);
  const [filterUnassignedOnly, setFilterUnassignedOnly] = useState(true);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState("ALL");
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
      return;
    }
    const results = await Promise.all(
      list.map(async (c) => {
        try {
          const members = (await enrollmentApi.fetchMembers(c.id)) as MemberRow[];
          const studentIds = (Array.isArray(members) ? members : [])
            .filter((m) => m.role === "STUDENT")
            .map((m) => m.userId);
          return [c.id, studentIds] as const;
        } catch {
          return [c.id, [] as string[]] as const;
        }
      })
    );
    const next: Record<string, string[]> = {};
    for (const [id, ids] of results) next[id] = ids;
    setRosterByClass(next);
  }, []);

  const fetchData = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const [studentsRaw, classroomsRaw, gradesRaw, subjectsRaw] = await Promise.all([
        enrollmentApi.fetchStudents(school.id, studentFilters.page, studentFilters.pageSize),
        enrollmentApi.fetchClassrooms(school.id),
        enrollmentApi.fetchGradeLevels(school.id),
        enrollmentApi.fetchSubjects(school.id),
      ]);

      let studentList: Student[] = [];
      let total = 0;
      if (studentsRaw && typeof studentsRaw === "object" && "items" in (studentsRaw as object)) {
        const env = studentsRaw as { items: Student[]; total: number; page: number; pageSize: number };
        studentList = Array.isArray(env.items) ? env.items : [];
        total = env.total;
      } else {
        studentList = Array.isArray(studentsRaw) ? studentsRaw : [];
        total = studentList.length;
      }

      const gradeList = Array.isArray(gradesRaw) ? gradesRaw : [];
      const subjectList = Array.isArray(subjectsRaw) ? subjectsRaw : [];
      const enriched = enrichClassrooms(
        Array.isArray(classroomsRaw) ? classroomsRaw : [],
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
  }, [school?.id, loadMemberships, showToast, studentFilters.page, studentFilters.pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const classroomRoster = useMemo(() => {
    if (!activeClassroomId) return [];
    const ids = rosterByClass[activeClassroomId] || [];
    return ids
      .map((id) => students.find((s) => s.id === id))
      .filter(Boolean) as Student[];
  }, [activeClassroomId, rosterByClass, students]);

  useEffect(() => {
    if (!activeClassroomId) return;
    setLoadingRoster(true);
    const t = window.setTimeout(() => setLoadingRoster(false), 150);
    return () => window.clearTimeout(t);
  }, [activeClassroomId, rosterByClass]);

  const pendingAssignmentCount = useMemo(
    () => students.filter((s) => !(classroomsByStudent[s.id]?.length > 0)).length,
    [students, classroomsByStudent]
  );

  const assignedCount = students.length - pendingAssignmentCount;

  const filteredStudents = useMemo(() => {
    const q = studentFilters.committedQ.trim().toLowerCase();
    return students.filter((student) => {
      const name = (student.name || "").toLowerCase();
      const email = (student.email || "").toLowerCase();
      const matchesSearch = !q || name.includes(q) || email.includes(q);
      const isUnassigned = !(classroomsByStudent[student.id]?.length > 0);
      const matchesAssignment = !filterUnassignedOnly || isUnassigned;
      const gradeName = student.gradeLevel?.name || "";
      const matchesGrade =
        selectedGradeFilter === "ALL" || gradeName === selectedGradeFilter;
      return matchesSearch && matchesAssignment && matchesGrade;
    });
  }, [
    students,
    studentFilters.committedQ,
    filterUnassignedOnly,
    selectedGradeFilter,
    classroomsByStudent,
  ]);

  const availableGrades = useMemo(() => {
    const fromStudents = students.map((s) => s.gradeLevel?.name).filter(Boolean) as string[];
    const fromCatalog = gradeLevels.map((g) => g.name);
    return Array.from(new Set([...fromCatalog, ...fromStudents])).sort();
  }, [students, gradeLevels]);

  const handleAssign = async (classroomId: string, studentIds: string[]) => {
    if (studentIds.length === 0) return;
    setAssigning(true);
    let ok = 0;
    let failed = 0;
    try {
      for (const userId of studentIds) {
        const already = (rosterByClass[classroomId] || []).includes(userId);
        if (already) {
          ok += 1;
          continue;
        }
        try {
          await enrollmentApi.addMember(classroomId, userId);
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      await loadMemberships(classGroups);
      setBulkIds(new Set());
      if (failed === 0) {
        showToast(
          studentIds.length === 1
            ? t("enrollment.toast.assigned")
            : t("enrollment.toast.assignedBulk", { count: ok })
        );
      } else {
        showToast(`Assigned ${ok}, failed ${failed}`, failed === studentIds.length ? "error" : "info");
      }
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
      showToast(`Removed ${studentName} from ${activeClassroom.name}`);
    } catch (err: any) {
      showToast(err?.message || "Could not remove student", "error");
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

  const openBulkModal = () => {
    if (!activeClassroom) {
      showToast(t("enrollment.toast.selectClassroom"), "error");
      return;
    }
    if (bulkIds.size === 0) {
      showToast(t("enrollment.toast.selectStudents"), "error");
      return;
    }
    setBulkModalOpen(true);
  };

  const confirmBulkAssign = async () => {
    if (!activeClassroom) return;
    setBulkModalOpen(false);
    await handleAssign(activeClassroom.id, Array.from(bulkIds));
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
              Placement
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
            Enroll new student
          </Link>
          <button
            type="button"
            onClick={openBulkModal}
            disabled={assigning || bulkIds.size === 0 || !activeClassroom}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Assign selected{bulkIds.size > 0 ? ` (${bulkIds.size})` : ""}
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`${cardShell} p-6 flex items-center gap-4`}>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Students</p>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
              {students.length}
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
              {t("enrollment.stats.unplaced")}
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
              {pendingAssignmentCount}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {t("enrollment.stats.alreadyPlaced", { count: assignedCount })}
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
              Students
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select a student to place, or check several for bulk assign.
            </p>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
            <ListFilterBar
              fields={studentFilterFields}
              q={studentFilters.q}
              onSearchChange={studentFilters.setQ}
              values={studentFilters.values}
              onValueChange={studentFilters.setValue}
              onClear={studentFilters.clear}
              searchPlaceholder={t("enrollment.searchPlaceholder")}
              shownCount={totalStudents}
            />
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-center text-sm text-slate-400 py-12">Loading students…</p>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-sm text-slate-400 font-medium">No students match these filters.</p>
                {students.length === 0 && (
                  <Link
                    to={`/${slug}/students`}
                    className="text-sm font-bold text-indigo-600 hover:underline inline-block"
                  >
                    Enroll a student first
                  </Link>
                )}
              </div>
            ) : (
              filteredStudents.map((student) => {
                const placed = (classroomsByStudent[student.id]?.length || 0) > 0;
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
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBulk(student.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 rounded border-slate-200 text-indigo-600 focus:ring-indigo-500/20 w-4 h-4 shrink-0"
                        aria-label={`Select ${student.name || "student"}`}
                      />
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
                              <p className="font-bold text-sm truncate">{student.name || "Unnamed"}</p>
                              <p
                                className={`text-xs font-medium truncate ${
                                  isSelected ? "text-indigo-200" : "text-slate-400"
                                }`}
                              >
                                {student.email || "No email"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold uppercase ${
                                isSelected
                                  ? "bg-indigo-500/50 text-white"
                                  : placed
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {placed ? "Placed" : "Unplaced"}
                            </span>
                            <p
                              className={`text-xs font-bold mt-1 ${
                                isSelected ? "text-indigo-200" : "text-slate-400"
                              }`}
                            >
                              {student.gradeLevel?.name || "No grade"}
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
                        {studentCount} student{studentCount === 1 ? "" : "s"}
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
                      Roster: {activeClassroom.name}
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
                      Place {selectedStudent.name?.split(" ")[0] || "student"} here
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
                    <p className="text-center text-xs text-slate-500 py-12">Loading roster…</p>
                  ) : classroomRoster.length === 0 ? (
                    <div className="py-12 text-center space-y-2 px-4">
                      <p className="text-sm text-slate-400 font-medium">
                        No students in this section yet.
                      </p>
                      {selectedStudent && (
                        <button
                          type="button"
                          onClick={() => handleAssign(activeClassroom.id, [selectedStudent.id])}
                          className="text-sm font-bold text-indigo-600 hover:underline"
                        >
                          Place {selectedStudent.name} here
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
                                {rosterStudent.name || "Unnamed"}
                              </p>
                              <p className="text-xs text-slate-500 font-medium truncate">
                                {rosterStudent.email || "No email"}
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
                                  rosterStudent.name || "Student"
                                )
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Remove from classroom"
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
            eyebrow="Bulk assign"
            title="Assign selected students"
            subtitle={`Add ${bulkIds.size} student${bulkIds.size === 1 ? "" : "s"} to ${activeClassroom.name}.`}
            onClose={() => setBulkModalOpen(false)}
            footer={
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmBulkAssign}
                  disabled={assigning}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm"
                >
                  Confirm assign
                </button>
              </div>
            }
          >
            <div className="px-8 py-6 space-y-3 max-h-[40vh] overflow-y-auto">
              <p className={fieldLabel}>Students to assign</p>
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
                        {s?.name || "Unnamed"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{s?.email}</p>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-slate-500 pt-2">
                Classroom: <span className="font-bold text-slate-700">{activeClassroom.name}</span>
              </p>
            </div>
          </FeatureModalShell>
        )}
      </AnimatePresence>
    </div>
  );
}
