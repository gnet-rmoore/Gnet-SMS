import React from "react";
import { useTranslation } from "react-i18next";
import { Award } from "lucide-react";
import { Button, DetailDrawerShell } from "../../../components/ui";
import { StudentPhotoEditor } from "../../../components/StudentPhotoEditor";
import { PageToast, usePageToast } from "../../academics-shared/PageToast";
import {
  StudentProfileView,
  type StudentProfileStudent,
} from "../../students/components/StudentProfileView";

export type StudentDossierModalProps = {
  open?: boolean;
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
  open = false,
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

  const student = selectedStudent as StudentProfileStudent;
  const gradeLabel =
    gradeLevels.find((g) => g.id === student?.gradeLevelId)?.name ||
    t("studentProfile.unassignedGrade");

  const patchStudent = (patch: Partial<StudentProfileStudent>) => {
    if (!open || !student?.id) return;
    onStudentPatch?.(patch);
    setSelectedStudent?.({ ...student, ...patch });
  };

  const close = () => setSelectedStudent?.(null);

  return (
    <>
      <PageToast toast={toast} />
      <DetailDrawerShell
        open={open && Boolean(student?.id)}
        onClose={close}
        eyebrow={`${t("studentProfile.studentId")} ${String(student?.id || "").slice(0, 8).toUpperCase()}`}
        title={student?.name || ""}
        subtitle={[student?.email, gradeLabel].filter(Boolean).join(" · ")}
        badge={
          <span
            className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
              student?.isActive !== false
                ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                : "border border-rose-500/30 bg-rose-500/20 text-rose-300"
            }`}
          >
            {student?.isActive !== false
              ? t("studentProfile.active")
              : t("studentProfile.inactive")}
          </span>
        }
        headerLead={student?.id ? (
          <StudentPhotoEditor
            userId={student.id}
            name={student.name}
            photoUrl={student.photoUrl}
            variant="dark"
            size="xl"
            onPhotoChange={(photoUrl) => patchStudent({ photoUrl })}
            onSuccess={(msg) => showToast(msg, "success")}
            onError={(msg) => showToast(msg, "error")}
          />
        ) : null}
        headerActions={
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
        }
        bodyClassName="bg-slate-50 p-5 sm:p-7"
        footer={
          <Button type="button" variant="primary" onClick={close}>
            {t("common:close")}
          </Button>
        }
      >
        {dossierTab === "profile" ? (
          <StudentProfileView
            student={student}
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
      </DetailDrawerShell>
    </>
  );
}
