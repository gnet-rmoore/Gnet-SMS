import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { X, Sparkles, Info, BookOpen, Users } from "lucide-react";
import { motion } from "motion/react";
import { resolveOrganizationType, type OrganizationType } from "../utils";

export type ClassroomWizardModalProps = {
  classrooms: any[];
  handleWizardSubmit: (e: React.FormEvent) => void;
  setShowWizardModal: (v: boolean) => void;
  setWizardClassGroupId: (v: string) => void;
  setWizardClassTeachers: (
    v: Record<string, string> | ((p: Record<string, string>) => Record<string, string>)
  ) => void;
  setWizardMode: (v: "SUBJECT_TO_CLASSES" | "CLASS_TO_SUBJECTS") => void;
  setWizardSelectedClassIds: (v: string[] | ((p: string[]) => string[])) => void;
  setWizardSelectedSubjectIds: (v: string[] | ((p: string[]) => string[])) => void;
  setWizardSubjectId: (v: string) => void;
  setWizardSubjectTeachers: (
    v: Record<string, string> | ((p: Record<string, string>) => Record<string, string>)
  ) => void;
  staff: Array<{ id: string; name: string; role?: string }>;
  subjects: Array<{ id: string; name: string; code?: string }>;
  submitting?: boolean;
  wizardClassGroupId: string;
  wizardClassTeachers: Record<string, string>;
  wizardMode: "SUBJECT_TO_CLASSES" | "CLASS_TO_SUBJECTS";
  wizardSelectedClassIds: string[];
  wizardSelectedSubjectIds: string[];
  wizardSubjectId: string;
  wizardSubjectTeachers: Record<string, string>;
};

export function ClassroomWizardModal({
  classrooms,
  handleWizardSubmit,
  setShowWizardModal,
  setWizardClassGroupId,
  setWizardClassTeachers,
  setWizardMode,
  setWizardSelectedClassIds,
  setWizardSelectedSubjectIds,
  setWizardSubjectId,
  setWizardSubjectTeachers,
  staff,
  subjects,
  submitting,
  wizardClassGroupId,
  wizardClassTeachers,
  wizardMode,
  wizardSelectedClassIds,
  wizardSelectedSubjectIds,
  wizardSubjectId,
  wizardSubjectTeachers,
}: ClassroomWizardModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const { slug } = useParams();
  const teachers = (staff || []).filter((s) => s.role === "TEACHER");
  const allClassGroups = (classrooms || []).filter((c) => !c.subjectId);
  const subjectRooms = (classrooms || []).filter((c) => c.subjectId);
  const [orgFilter, setOrgFilter] = React.useState<"" | OrganizationType>("");
  const [platoonTeacherId, setPlatoonTeacherId] = React.useState("");

  const classGroups = React.useMemo(() => {
    if (!orgFilter) return allClassGroups;
    return allClassGroups.filter(
      (cg) => resolveOrganizationType(cg, subjectRooms) === orgFilter
    );
  }, [allClassGroups, orgFilter, subjectRooms]);

  const selectedClassGroup =
    classGroups.find((c) => c.id === wizardClassGroupId) ||
    allClassGroups.find((c) => c.id === wizardClassGroupId);
  const selectedOrg = selectedClassGroup
    ? resolveOrganizationType(selectedClassGroup, subjectRooms)
    : null;

  const alreadyAssignedSubjectIds = React.useMemo(() => {
    if (!selectedClassGroup) return new Set<string>();
    const prefix = `${selectedClassGroup.name} - `;
    return new Set(
      subjectRooms
        .filter(
          (sc) =>
            sc.gradeLevelId === selectedClassGroup.gradeLevelId && sc.name.startsWith(prefix)
        )
        .map((sc) => sc.subjectId)
        .filter(Boolean)
    );
  }, [selectedClassGroup, subjectRooms]);

  const assignableSubjects = subjects.filter((s) => !alreadyAssignedSubjectIds.has(s.id));

  const selectionCount =
    wizardMode === "SUBJECT_TO_CLASSES"
      ? wizardSelectedClassIds.length
      : wizardSelectedSubjectIds.length;

  const orgLabel = (cg: any) => {
    const org = resolveOrganizationType(cg, subjectRooms);
    if (org === "SELF_CONTAINED") return t("classroomModals.orgSelfContained");
    if (org === "DEPARTMENTALIZED") return t("classroomModals.orgDepartmentalized");
    return t("classroomModals.orgMixed");
  };

  const onSelectClassGroup = (id: string) => {
    setWizardClassGroupId(id);
    setWizardSelectedSubjectIds([]);
    setWizardSubjectTeachers({});
  };

  const toggleClass = (classId: string, checked: boolean) => {
    if (checked) {
      setWizardSelectedClassIds([...wizardSelectedClassIds, classId]);
      const cg = allClassGroups.find((c) => c.id === classId);
      const org = cg ? resolveOrganizationType(cg, subjectRooms) : "MIXED";
      if (cg?.ownerTeacherId && org !== "DEPARTMENTALIZED" && !wizardClassTeachers[classId]) {
        setWizardClassTeachers({ ...wizardClassTeachers, [classId]: cg.ownerTeacherId });
      }
    } else {
      setWizardSelectedClassIds(wizardSelectedClassIds.filter((id) => id !== classId));
    }
  };

  const toggleSubject = (subjectId: string, checked: boolean) => {
    if (checked) {
      setWizardSelectedSubjectIds([...wizardSelectedSubjectIds, subjectId]);
      const defaultTeacher =
        selectedOrg === "DEPARTMENTALIZED"
          ? ""
          : selectedClassGroup?.ownerTeacherId || teachers[0]?.id || "";
      if (defaultTeacher && !wizardSubjectTeachers[subjectId]) {
        setWizardSubjectTeachers({ ...wizardSubjectTeachers, [subjectId]: defaultTeacher });
      }
    } else {
      setWizardSelectedSubjectIds(wizardSelectedSubjectIds.filter((id) => id !== subjectId));
    }
  };

  const applyPlatoonSpecialist = () => {
    if (!platoonTeacherId || wizardSelectedClassIds.length === 0) return;
    const next = { ...wizardClassTeachers };
    for (const id of wizardSelectedClassIds) next[id] = platoonTeacherId;
    setWizardClassTeachers(next);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => setShowWizardModal(false)}
        className="absolute inset-0 bg-slate-900/40"
      />
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl bg-white rounded-[32px] border border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.08)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 px-8 py-6 text-white flex items-start justify-between gap-4 shrink-0">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> {t("classrooms.wizard.eyebrow")}
            </p>
            <h2 className="text-xl font-extrabold tracking-tight mt-0.5">
              {t("classrooms.wizard.title")}
            </h2>
            <p className="text-sm text-slate-300 font-medium mt-1">{t("classrooms.wizard.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowWizardModal(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={t("common:close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4 shrink-0 space-y-3">
          <div className="flex gap-2 p-1 rounded-2xl bg-slate-100">
            <button
              type="button"
              onClick={() => setWizardMode("CLASS_TO_SUBJECTS")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                wizardMode === "CLASS_TO_SUBJECTS"
                  ? "bg-white text-indigo-600 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t("classrooms.wizard.modeClassToSubjects")}
            </button>
            <button
              type="button"
              onClick={() => setWizardMode("SUBJECT_TO_CLASSES")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                wizardMode === "SUBJECT_TO_CLASSES"
                  ? "bg-white text-indigo-600 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t("classrooms.wizard.modeSubjectToClasses")}
            </button>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              {t("classrooms.wizard.filterByOrganization")}
            </label>
            <select
              value={orgFilter}
              onChange={(e) => {
                const next = e.target.value as "" | OrganizationType;
                setOrgFilter(next);
                setWizardSelectedClassIds([]);
                if (wizardClassGroupId) {
                  const visible = (
                    next
                      ? allClassGroups.filter(
                          (cg) => resolveOrganizationType(cg, subjectRooms) === next
                        )
                      : allClassGroups
                  ).some((cg) => cg.id === wizardClassGroupId);
                  if (!visible) setWizardClassGroupId("");
                }
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("classrooms.wizard.allOrganizations")}</option>
              <option value="SELF_CONTAINED">{t("classroomModals.orgSelfContained")}</option>
              <option value="DEPARTMENTALIZED">{t("classroomModals.orgDepartmentalized")}</option>
              <option value="MIXED">{t("classroomModals.orgMixed")}</option>
            </select>
          </div>
        </div>

        <form
          id="classroom-wizard-form"
          onSubmit={handleWizardSubmit}
          className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6"
        >
          {wizardMode === "SUBJECT_TO_CLASSES" ? (
            <>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600 font-medium leading-relaxed flex gap-2">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p>{t("classrooms.wizard.platoonHint")}</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("classrooms.wizard.subject")} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={wizardSubjectId}
                    onChange={(e) => setWizardSubjectId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">{t("classrooms.assignSubject.selectSubject")}</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                        {sub.code ? ` (${sub.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {subjects.length === 0 && (
                  <p className="text-xs font-semibold text-rose-600">
                    {t("classrooms.wizard.noSubjects")}{" "}
                    <Link to={`/${slug}/curriculum`} className="underline">
                      {t("classroomModals.curriculum")}
                    </Link>
                    .
                  </p>
                )}
              </div>

              {wizardSelectedClassIds.length > 0 && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                    {t("classrooms.wizard.applySpecialist")}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={platoonTeacherId}
                      onChange={(e) => setPlatoonTeacherId(e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">{t("classroomModals.selectTeacher")}</option>
                      {teachers.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={applyPlatoonSpecialist}
                      disabled={!platoonTeacherId}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50"
                    >
                      {t("classrooms.wizard.applyToSelected")}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t("classrooms.wizard.classGroups")} <span className="text-rose-500">*</span>
                  </label>
                  {classGroups.length > 0 && (
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          const ids = classGroups.map((c) => c.id);
                          setWizardSelectedClassIds(ids);
                          const teachersMap: Record<string, string> = { ...wizardClassTeachers };
                          classGroups.forEach((cg) => {
                            const org = resolveOrganizationType(cg, subjectRooms);
                            if (
                              org !== "DEPARTMENTALIZED" &&
                              !teachersMap[cg.id] &&
                              cg.ownerTeacherId
                            ) {
                              teachersMap[cg.id] = cg.ownerTeacherId;
                            }
                          });
                          setWizardClassTeachers(teachersMap);
                        }}
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        {t("classrooms.wizard.selectAll")}
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() => setWizardSelectedClassIds([])}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        {t("classrooms.wizard.clearAll")}
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50 max-h-72 overflow-y-auto">
                  {classGroups.map((classGroup) => {
                    const isChecked = wizardSelectedClassIds.includes(classGroup.id);
                    return (
                      <div
                        key={classGroup.id}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isChecked ? "bg-indigo-50/40" : "bg-white"
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => toggleClass(classGroup.id, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{classGroup.name}</p>
                            <p className="text-xs text-slate-500 font-medium">
                              {classGroup.gradeLevel?.name || t("classrooms.wizard.noGrade")} ·{" "}
                              {orgLabel(classGroup)}
                            </p>
                          </div>
                        </label>
                        {isChecked && (
                          <div className="sm:w-56 pl-7 sm:pl-0">
                            <select
                              value={wizardClassTeachers[classGroup.id] || ""}
                              onChange={(e) =>
                                setWizardClassTeachers({
                                  ...wizardClassTeachers,
                                  [classGroup.id]: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            >
                              <option value="">{t("classrooms.assignSubject.teacher")}</option>
                              {teachers.map((person) => (
                                <option key={person.id} value={person.id}>
                                  {person.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {classGroups.length === 0 && (
                    <div className="p-10 text-center text-sm text-slate-500 font-medium bg-slate-50">
                      {t("classrooms.wizard.noClassGroupsMatch")}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {selectedOrg === "DEPARTMENTALIZED" && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600 font-medium leading-relaxed flex gap-2">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <p>{t("classrooms.wizard.departmentalizedSubjectHint")}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("classrooms.wizard.classGroup")} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={wizardClassGroupId}
                    onChange={(e) => onSelectClassGroup(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">{t("classrooms.wizard.classGroup")}</option>
                    {classGroups.map((classGroup) => (
                      <option key={classGroup.id} value={classGroup.id}>
                        {classGroup.name}
                        {classGroup.gradeLevel?.name ? ` · ${classGroup.gradeLevel.name}` : ""} ·{" "}
                        {orgLabel(classGroup)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t("classrooms.wizard.subjects")} <span className="text-rose-500">*</span>
                  </label>
                  {assignableSubjects.length > 0 && (
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          const ids = assignableSubjects.map((s) => s.id);
                          setWizardSelectedSubjectIds(ids);
                          const map: Record<string, string> = { ...wizardSubjectTeachers };
                          const defaultTeacher =
                            selectedOrg === "DEPARTMENTALIZED"
                              ? ""
                              : selectedClassGroup?.ownerTeacherId || "";
                          if (defaultTeacher) {
                            ids.forEach((id) => {
                              if (!map[id]) map[id] = defaultTeacher;
                            });
                          }
                          setWizardSubjectTeachers(map);
                        }}
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        {t("classrooms.wizard.selectAll")}
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() => setWizardSelectedSubjectIds([])}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        {t("classrooms.wizard.clearAll")}
                      </button>
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50 max-h-72 overflow-y-auto">
                  {assignableSubjects.map((subject) => {
                    const isChecked = wizardSelectedSubjectIds.includes(subject.id);
                    return (
                      <div
                        key={subject.id}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isChecked ? "bg-indigo-50/40" : "bg-white"
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => toggleSubject(subject.id, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{subject.name}</p>
                            {subject.code && (
                              <p className="text-xs text-slate-500 font-mono">{subject.code}</p>
                            )}
                          </div>
                        </label>
                        {isChecked && (
                          <div className="sm:w-56 pl-7 sm:pl-0">
                            <select
                              value={wizardSubjectTeachers[subject.id] || ""}
                              onChange={(e) =>
                                setWizardSubjectTeachers({
                                  ...wizardSubjectTeachers,
                                  [subject.id]: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            >
                              <option value="">{t("classrooms.assignSubject.teacher")}</option>
                              {teachers.map((person) => (
                                <option key={person.id} value={person.id}>
                                  {person.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {assignableSubjects.length === 0 && (
                    <div className="p-10 text-center text-sm text-slate-500 font-medium bg-slate-50">
                      {t("classrooms.wizard.noSubjectsMatch")}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </form>

        <div className="px-6 sm:px-8 py-5 border-t border-slate-100 flex flex-col sm:flex-row gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowWizardModal(false)}
            className="flex-1 px-5 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm"
          >
            {t("common:cancel")}
          </button>
          <button
            type="submit"
            form="classroom-wizard-form"
            disabled={submitting || selectionCount === 0}
            className="flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
          >
            {submitting
              ? t("classrooms.wizard.assigning")
              : t("classrooms.wizard.applyAssignments")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
