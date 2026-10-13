import React, { useEffect, useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";

export type ManageSubjectsModalProps = {
  classrooms?: any[];
  handleCreateClassGroupInline?: (e: React.FormEvent) => void;
  handleToggleOffering?: (subjectId: string, enabled: boolean) => Promise<void> | void;
  handleSyncOfferingsToRooms?: (
    assignments: Array<{
      classGroupId: string;
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      teacherId: string;
      gradeLevelId: string;
    }>
  ) => Promise<void> | void;
  newClassGroupName?: string;
  newClassGroupTeacherId?: string;
  offerings?: Array<{ id: string; subjectId: string; gradeLevelId: string }>;
  selectedGradeLevel?: { id: string; name: string } | null;
  setNewClassGroupName?: (v: string) => void;
  setNewClassGroupTeacherId?: (v: string) => void;
  setShowManageSubjectsModal?: (v: boolean) => void;
  subjects?: Array<{ id: string; name: string; code: string }>;
  submitting?: boolean;
  teachers?: Array<{ id: string; name: string }>;
  [key: string]: any;
};

type TeacherKey = string; // `${classGroupId}:${subjectId}`

export function ManageSubjectsModal({
  classrooms = [],
  handleCreateClassGroupInline,
  handleToggleOffering,
  handleSyncOfferingsToRooms,
  newClassGroupName = "",
  newClassGroupTeacherId = "",
  offerings = [],
  selectedGradeLevel,
  setNewClassGroupName,
  setNewClassGroupTeacherId,
  setShowManageSubjectsModal,
  subjects = [],
  submitting,
  teachers = [],
}: ManageSubjectsModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const gradeLabel = selectedGradeLevel?.name || "this grade";
  const gradeId = selectedGradeLevel?.id || "";
  const gradeClassGroups = useMemo(
    () => classrooms.filter((c: any) => c.gradeLevelId === gradeId && !c.subjectId),
    [classrooms, gradeId]
  );
  const offeredSubjectIds = useMemo(
    () =>
      new Set(
        offerings
          .filter((o) => o.gradeLevelId === gradeId)
          .map((o) => o.subjectId)
      ),
    [offerings, gradeId]
  );

  const [teacherByKey, setTeacherByKey] = useState<Record<TeacherKey, string>>({});

  useEffect(() => {
    const next: Record<TeacherKey, string> = {};
    for (const subject of subjects) {
      if (!offeredSubjectIds.has(subject.id)) continue;
      for (const cg of gradeClassGroups) {
        const key = `${cg.id}:${subject.id}`;
        const existingRoom = classrooms.find(
          (c: any) =>
            c.subjectId === subject.id &&
            (c.parentClassroomId === cg.id ||
              (c.gradeLevelId === gradeId && c.name?.startsWith(`${cg.name} - `)))
        );
        const org = cg.organizationType as string | null | undefined;
        if (existingRoom?.ownerTeacherId) {
          next[key] = existingRoom.ownerTeacherId;
        } else if (org === "DEPARTMENTALIZED") {
          next[key] = "";
        } else {
          // SELF_CONTAINED, MIXED, or unset → prefer class teacher
          next[key] = cg.ownerTeacherId || teachers[0]?.id || "";
        }
      }
    }
    setTeacherByKey(next);
  }, [subjects, offeredSubjectIds, gradeClassGroups, classrooms, gradeId, teachers]);

  const setTeacher = (classGroupId: string, subjectId: string, teacherId: string) => {
    setTeacherByKey((prev) => ({ ...prev, [`${classGroupId}:${subjectId}`]: teacherId }));
  };

  const fillSelfContained = (classGroupId: string, teacherId: string) => {
    if (!teacherId) return;
    setTeacherByKey((prev) => {
      const next = { ...prev };
      for (const subject of subjects) {
        if (!offeredSubjectIds.has(subject.id)) continue;
        next[`${classGroupId}:${subject.id}`] = teacherId;
      }
      return next;
    });
  };

  const fillSpecialist = (subjectId: string, teacherId: string) => {
    if (!teacherId) return;
    setTeacherByKey((prev) => {
      const next = { ...prev };
      for (const cg of gradeClassGroups) {
        next[`${cg.id}:${subjectId}`] = teacherId;
      }
      return next;
    });
  };

  const syncRooms = async () => {
    if (!handleSyncOfferingsToRooms || !selectedGradeLevel) return;
    const assignments: Array<{
      classGroupId: string;
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      teacherId: string;
      gradeLevelId: string;
    }> = [];
    for (const subject of subjects) {
      if (!offeredSubjectIds.has(subject.id)) continue;
      for (const cg of gradeClassGroups) {
        const teacherId = teacherByKey[`${cg.id}:${subject.id}`];
        if (!teacherId) continue;
        assignments.push({
          classGroupId: cg.id,
          subjectId: subject.id,
          subjectName: subject.name,
          subjectCode: subject.code,
          teacherId,
          gradeLevelId: selectedGradeLevel.id,
        });
      }
    }
    await handleSyncOfferingsToRooms(assignments);
  };

  return (
    <FeatureModalShell
      eyebrow={t("curriculum.manageSubjects.eyebrow")}
      title={t("curriculum.manageSubjects.title")}
      subtitle={t("curriculum.manageSubjects.subtitle", { grade: gradeLabel })}
      onClose={() => setShowManageSubjectsModal?.(false)}
      wide
    >
      <div className="p-8 space-y-6">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
              {t("curriculum.manageSubjects.quickCreate")}
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            {t("curriculum.manageSubjects.quickCreateHint", { grade: gradeLabel })}
          </p>
          <form onSubmit={handleCreateClassGroupInline} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={fieldLabel}>{t("curriculum.manageSubjects.className")}</label>
                <input
                  type="text"
                  value={newClassGroupName}
                  onChange={(e) => setNewClassGroupName?.(e.target.value)}
                  placeholder={t("curriculum.manageSubjects.classNamePlaceholder")}
                  className={fieldInput}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className={fieldLabel}>{t("curriculum.manageSubjects.homeroomTeacher")}</label>
                <select
                  value={newClassGroupTeacherId}
                  onChange={(e) => setNewClassGroupTeacherId?.(e.target.value)}
                  className={fieldInput}
                  required
                >
                  <option value="">{t("curriculum.subjectModal.selectTeacher")}</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              {submitting ? t("curriculum.manageSubjects.creating") : t("curriculum.manageSubjects.createClassGroup")}
            </button>
          </form>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t("curriculum.manageSubjects.offeredHeading")}
          </h3>

          {subjects.length === 0 ? (
            <div className="text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <p className="text-xs font-bold text-slate-600">{t("curriculum.manageSubjects.noSubjectsDefined")}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {t("curriculum.manageSubjects.createSubjectsFirst")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subjects.map((subject) => {
                const enabled = offeredSubjectIds.has(subject.id);
                return (
                  <label
                    key={subject.id}
                    className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer ${
                      enabled
                        ? "border-indigo-200 bg-indigo-50/40"
                        : "border-slate-100 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 rounded text-indigo-600 border-slate-300"
                      checked={enabled}
                      disabled={submitting}
                      onChange={(e) =>
                        void handleToggleOffering?.(subject.id, e.target.checked)
                      }
                    />
                    <span>
                      <span className="block font-bold text-slate-900 text-sm">{subject.name}</span>
                      <span className="block text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                        {subject.code}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {offeredSubjectIds.size > 0 && (
          <div className="border-t border-slate-100 pt-4 space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("curriculum.manageSubjects.teachersMatrix")}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {t("curriculum.manageSubjects.teachersMatrixHint")}
              </p>
            </div>

            {gradeClassGroups.length === 0 ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl font-medium">
                {t("curriculum.manageSubjects.createGroupBeforeSync")}
              </p>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {gradeClassGroups.map((cg: any) => (
                  <div
                    key={cg.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-slate-900 text-sm">{cg.name}</p>
                      <div className="flex items-center gap-2">
                        <select
                          className={`${fieldInput} py-1.5 text-xs w-auto`}
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) fillSelfContained(cg.id, e.target.value);
                            e.target.value = "";
                          }}
                        >
                          <option value="">{t("curriculum.manageSubjects.fillAllSubjects")}</option>
                          {teachers.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {subjects
                        .filter((s) => offeredSubjectIds.has(s.id))
                        .map((subject) => (
                          <div
                            key={subject.id}
                            className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl border border-slate-100 px-3 py-2"
                          >
                            <span className="text-xs font-bold text-slate-700">{subject.name}</span>
                            <select
                              value={teacherByKey[`${cg.id}:${subject.id}`] || ""}
                              onChange={(e) => setTeacher(cg.id, subject.id, e.target.value)}
                              className={`${fieldInput} py-1.5 text-xs w-full sm:w-48`}
                            >
                              <option value="">{t("curriculum.subjectModal.selectTeacher")}</option>
                              {teachers.map((teacher) => (
                                <option key={teacher.id} value={teacher.id}>
                                  {teacher.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}

                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {t("curriculum.manageSubjects.specialistFill")}
                  </p>
                  {subjects
                    .filter((s) => offeredSubjectIds.has(s.id))
                    .map((subject) => (
                      <div
                        key={subject.id}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <span className="text-xs font-bold text-slate-700">{subject.name}</span>
                        <select
                          className={`${fieldInput} py-1.5 text-xs w-full sm:w-48`}
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) fillSpecialist(subject.id, e.target.value);
                            e.target.value = "";
                          }}
                        >
                          <option value="">{t("curriculum.manageSubjects.applyTeacherAllSections")}</option>
                          {teachers.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={submitting || gradeClassGroups.length === 0}
              onClick={() => void syncRooms()}
              className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl disabled:opacity-50"
            >
              {submitting ? t("curriculum.manageSubjects.syncing") : t("curriculum.manageSubjects.syncClassrooms")}
            </button>
          </div>
        )}
      </div>

      <div className="px-8 pb-8">
        <button
          type="button"
          onClick={() => setShowManageSubjectsModal?.(false)}
          className="w-full px-5 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm"
        >
          {t("common:done")}
        </button>
      </div>
    </FeatureModalShell>
  );
}
