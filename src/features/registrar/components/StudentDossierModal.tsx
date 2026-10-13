import React from "react";
import { useTranslation } from "react-i18next";
import { Award, X } from "lucide-react";
import { Button } from "../../../components/ui";
import { StudentPhotoEditor } from "../../../components/StudentPhotoEditor";
import { PageToast, usePageToast } from "../../academics-shared/PageToast";
import {
  StudentProfileView,
  type StudentProfileStudent,
} from "../../students/components/StudentProfileView";

export type StudentDossierModalProps = {
  dossierTab?: "profile" | "transcript";
  gradeLevels?: Array<{ id: string; name?: string }>;
  isPrintTranscriptMode?: boolean;
  selectedStudent?: StudentProfileStudent | null;
  setDossierTab?: (tab: "profile" | "transcript") => void;
  setIsPrintTranscriptMode?: (v: boolean) => void;
  setSelectedStudent?: (v: StudentProfileStudent | null) => void;
  onStudentPatch?: (patch: Partial<StudentProfileStudent>) => void;
};

export function StudentDossierModal({
  dossierTab = "profile",
  gradeLevels = [],
  selectedStudent,
  setDossierTab,
  setIsPrintTranscriptMode,
  setSelectedStudent,
  onStudentPatch,
}: StudentDossierModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const { toast, showToast } = usePageToast();

  if (!selectedStudent?.id) return null;

  const gradeLabel =
    gradeLevels.find((g) => g.id === selectedStudent.gradeLevelId)?.name ||
    t("studentProfile.unassignedGrade");

  const patchStudent = (patch: Partial<StudentProfileStudent>) => {
    onStudentPatch?.(patch);
    setSelectedStudent?.({ ...selectedStudent, ...patch });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4 md:p-6">
      <PageToast toast={toast} />
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => setSelectedStudent?.(null)}
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.08)]">
        <div className="flex-shrink-0 border-b border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-6 text-white md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <StudentPhotoEditor
                userId={selectedStudent.id}
                name={selectedStudent.name}
                photoUrl={selectedStudent.photoUrl}
                variant="dark"
                size="xl"
                onPhotoChange={(photoUrl) => patchStudent({ photoUrl })}
                onSuccess={(msg) => showToast(msg, "success")}
                onError={(msg) => showToast(msg, "error")}
              />
              <div className="min-w-0 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h3 className="text-xl font-extrabold tracking-tight md:text-2xl">
                    {selectedStudent.name}
                  </h3>
                  <span
                    className={`rounded-lg px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                      selectedStudent.isActive !== false
                        ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                        : "border border-rose-500/30 bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {selectedStudent.isActive !== false
                      ? t("studentProfile.active")
                      : t("studentProfile.inactive")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {t("studentProfile.studentId")}{" "}
                  <span className="font-mono font-bold text-slate-200">
                    {selectedStudent.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="mx-2 text-slate-600">·</span>
                  {gradeLabel}
                </p>
                {selectedStudent.email ? (
                  <p className="mt-1 truncate text-sm font-medium text-slate-400">
                    {selectedStudent.email}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex w-full items-center justify-end gap-2 md:w-auto">
              <div className="flex rounded-xl border border-slate-800 bg-slate-900/80 p-1">
                <Button
                  type="button"
                  variant={dossierTab === "profile" ? "primary" : "ghost"}
                  size="compact"
                  onClick={() => {
                    setDossierTab?.("profile");
                    setIsPrintTranscriptMode?.(false);
                  }}
                  className={
                    dossierTab === "profile"
                      ? ""
                      : "text-slate-400 hover:bg-transparent hover:text-white"
                  }
                >
                  {t("studentProfile.tabProfile")}
                </Button>
                <Button
                  type="button"
                  variant={dossierTab === "transcript" ? "primary" : "ghost"}
                  size="compact"
                  onClick={() => setDossierTab?.("transcript")}
                  className={
                    dossierTab === "transcript"
                      ? ""
                      : "text-slate-400 hover:bg-transparent hover:text-white"
                  }
                >
                  {t("studentProfile.tabTranscript")}
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSelectedStudent?.(null)}
                className="border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
                title={t("common:close")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100 p-6 md:p-8">
          {dossierTab === "profile" ? (
            <StudentProfileView
              student={selectedStudent}
              gradeLabel={gradeLabel}
              showTimeline
            />
          ) : (
            <div className="space-y-4 rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] sm:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                <Award className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-lg font-extrabold tracking-tight text-slate-900">
                  {t("studentProfile.noTranscript")}
                </h4>
                <p className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500">
                  {t("studentProfile.noTranscriptHint")}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-end border-t border-slate-100 bg-white p-5">
          <Button type="button" variant="primary" onClick={() => setSelectedStudent?.(null)}>
            {t("common:close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
