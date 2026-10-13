import React from "react";
import { useTranslation } from "react-i18next";
import { Info, Users } from "lucide-react";
import { UserAvatar } from "../../../components/UserAvatar";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";

export type AssignSubjectModalProps = {
  selectedClassGroup: any;
  subjectAssignment: { subjectId: string; teacherId: string };
  setSubjectAssignment: (v: { subjectId: string; teacherId: string }) => void;
  subjects: any[];
  staff: any[];
  submitting: boolean;
  setShowSubjectModal: (v: boolean) => void;
  handleCreateSubjectClassroom: (e: React.FormEvent) => void;
};

export function AssignSubjectModal({
  selectedClassGroup,
  subjectAssignment,
  setSubjectAssignment,
  subjects,
  staff,
  submitting,
  setShowSubjectModal,
  handleCreateSubjectClassroom,
}: AssignSubjectModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const teachers = (staff || []).filter((s) => s.role === "TEACHER");
  const selectedTeacher = teachers.find((s) => s.id === subjectAssignment.teacherId);

  return (
    <FeatureModalShell
      eyebrow={t("classrooms.assignSubject.title")}
      title={t("classrooms.assignSubject.title")}
      subtitle={t("classrooms.assignSubject.subtitle")}
      onClose={() => setShowSubjectModal(false)}
    >
      <form
        id="assign-subject-form"
        onSubmit={handleCreateSubjectClassroom}
        className="p-8 space-y-5"
      >
        <div className="space-y-1.5">
          <label className={fieldLabel}>
            Subject <span className="text-rose-500">*</span>
          </label>
          <select
            value={subjectAssignment.subjectId}
            onChange={(e) =>
              setSubjectAssignment({ ...subjectAssignment, subjectId: e.target.value })
            }
            className={fieldInput}
            required
          >
            <option value="">Select subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.code ? ` (${s.code})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>
            Subject teacher <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <select
              value={subjectAssignment.teacherId}
              onChange={(e) =>
                setSubjectAssignment({ ...subjectAssignment, teacherId: e.target.value })
              }
              className={`${fieldInput} flex-1`}
              required
            >
              <option value="">Select teacher</option>
              {teachers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="w-11 h-11 rounded-xl border border-slate-200 overflow-hidden shrink-0 bg-slate-50 flex items-center justify-center">
              {selectedTeacher ? (
                <UserAvatar
                  userId={selectedTeacher.id}
                  name={selectedTeacher.name}
                  photoUrl={selectedTeacher.photoUrl}
                  size="md"
                  rounded="2xl"
                  className="!w-11 !h-11 !rounded-xl"
                />
              ) : (
                <Users className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
          <p className="font-medium leading-relaxed">
            Creates a subject classroom and enrolls students currently in{" "}
            {selectedClassGroup?.name}.
          </p>
        </div>
      </form>
      <div className="px-8 pb-8 flex gap-3">
        <button
          type="button"
          onClick={() => setShowSubjectModal(false)}
          className="flex-1 px-5 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="assign-subject-form"
          disabled={submitting}
          className="flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
        >
          {submitting ? "Assigning…" : "Assign subject"}
        </button>
      </div>
    </FeatureModalShell>
  );
}
