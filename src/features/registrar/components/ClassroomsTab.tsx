import React from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Users, UserPlus, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui";

export type ClassroomsTabProps = {
  classAllocationStudentId: string;
  setClassAllocationStudentId: (v: string) => void;
  classrooms: any[];
  classroomRoster: any[];
  gradeLevels: any[];
  handleAssignStudentToClass: (e: React.FormEvent) => void;
  handleRemoveStudentFromClass: (memberUserId: string) => void;
  handleSelectClassroom: (classroom: any) => void;
  rosterLoading: boolean;
  selectedClassroom: any | null;
  students: any[];
};

export function ClassroomsTab({
  classAllocationStudentId,
  setClassAllocationStudentId,
  classrooms,
  classroomRoster,
  gradeLevels,
  handleAssignStudentToClass,
  handleRemoveStudentFromClass,
  handleSelectClassroom,
  rosterLoading,
  selectedClassroom,
  students,
}: ClassroomsTabProps) {
  const { t } = useTranslation(["pages", "common"]);
  const homerooms = classrooms.filter((c) => !c.subjectId);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1 space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight px-1">{t("admissions.classroomsTab.classGroups")}</h3>
        <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
          {homerooms.map((c) => {
            const gl = gradeLevels.find((g) => g.id === c.gradeLevelId);
            const isSelected = selectedClassroom?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectClassroom(c)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  isSelected
                    ? "bg-indigo-50 border-indigo-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
                    : "bg-white border-slate-100 hover:border-slate-200"
                }`}
              >
                <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{gl?.name || t("admissions.classroomsTab.noGrade")}</p>
              </button>
            );
          })}
          {homerooms.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm font-semibold">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-200" />
              {t("admissions.classroomsTab.noClassGroups")}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        {!selectedClassroom ? (
          <div className="rounded-[32px] border border-dashed border-slate-200 bg-white py-20 text-center text-sm font-semibold text-slate-400">
            {t("admissions.classroomsTab.selectClassGroup")}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 tracking-tight">{selectedClassroom.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{t("admissions.classroomsTab.assignStudents")}</p>
                </div>
                <Users className="w-5 h-5 text-slate-300" />
              </div>
              <form onSubmit={handleAssignStudentToClass} className="flex min-w-0 flex-col gap-3 sm:flex-row">
                <select
                  value={classAllocationStudentId}
                  onChange={(e) => setClassAllocationStudentId(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">{t("admissions.classroomsTab.selectStudent")}</option>
                  {students.map((s) => {
                    const isAlreadyIn = classroomRoster.some((m) => m.userId === s.id || m.user?.id === s.id);
                    return (
                      <option key={s.id} value={s.id} disabled={isAlreadyIn}>
                        {s.name}
                        {isAlreadyIn ? t("admissions.classroomsTab.alreadyEnrolled") : ""}
                      </option>
                    );
                  })}
                </select>
                <Button type="submit" variant="primary" size="compact">
                  <UserPlus className="w-4 h-4" /> {t("admissions.classroomsTab.assign")}
                </Button>
              </form>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm">{t("admissions.classroomsTab.roster")}</h4>
              </div>
              {rosterLoading ? (
                <div role="status" aria-label={t("admissions.classroomsTab.loadingRoster")} className="divide-y divide-slate-50">
                  {[0, 1, 2].map((row) => (
                    <div key={row} aria-hidden="true" className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 w-2/5 animate-pulse rounded bg-slate-100" />
                        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                      </div>
                      <div className="h-8 w-8 animate-pulse rounded-xl bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {classroomRoster.map((m) => (
                    <div key={m.id || m.userId} className="px-5 py-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-bold text-slate-800">{m.user?.name || m.name}</p>
                        <p className="break-all text-xs font-medium text-slate-500">{m.user?.email || ""}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="compact"
                        aria-label={t("common:remove")}
                        onClick={() => handleRemoveStudentFromClass(m.userId || m.user?.id)}
                        className="p-2 min-h-0 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {classroomRoster.length === 0 && (
                    <div className="p-10 text-center text-slate-400 text-sm font-semibold">
                      {t("admissions.classroomsTab.noStudentsInGroup")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
