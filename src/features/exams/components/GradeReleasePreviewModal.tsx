import React from "react";
import { useTranslation } from "react-i18next";
import { FeatureModalShell } from "../../academics-shared/FeatureModalShell";
import {
  GRADE_SHEET_TEMPLATES,
  GradeSheetView,
  getGradeSheetTemplateDef,
  resolveGradeSheetTemplateKey,
  sampleGradeSheetData,
} from "../../gradesheets";

type Props = {
  open: boolean;
  onClose: () => void;
  schoolName?: string;
  address?: string;
  /** Template configured for the school. */
  templateId?: string | null;
  examTitle?: string;
  examDate?: string;
};

export function GradeReleasePreviewModal({
  open,
  onClose,
  schoolName,
  address,
  templateId,
  examTitle,
  examDate,
}: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const [activeId, setActiveId] = React.useState(() =>
    resolveGradeSheetTemplateKey(templateId)
  );

  React.useEffect(() => {
    if (open) setActiveId(resolveGradeSheetTemplateKey(templateId));
  }, [open, templateId]);

  if (!open) return null;

  const def = getGradeSheetTemplateDef(activeId);
  const sizeLabel =
    def.pageSize === "legal" ? "Legal · 8.5 × 14 in" : "A4 · 210 × 297 mm";

  return (
    <FeatureModalShell
      eyebrow={t("exams.previewEyebrow", { defaultValue: "Grade release test" })}
      title={t("exams.previewTitle", { defaultValue: "Preview gradesheet" })}
      subtitle={t("exams.previewSubtitle", {
        defaultValue:
          "This is exactly how released grades will be rendered with the school's gradesheet template. Sample data is used.",
      })}
      onClose={onClose}
      fullscreen
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {GRADE_SHEET_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setActiveId(tpl.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  activeId === tpl.id
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tpl.name}
              </button>
            ))}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700"
            >
              {t("common:close", { defaultValue: "Close" })}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 bg-slate-100 p-4 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {def.name} · {sizeLabel}
        </p>
        <div className="overflow-x-auto pb-6">
          <div className="mx-auto min-w-min">
            <GradeSheetView
              templateId={activeId}
              studentName="Sample Student"
              examTitle={examTitle || "End-of-Term Examination"}
              examDate={examDate || new Date().toISOString()}
              grades={[]}
              school={{ name: schoolName, address }}
              compact
              data={sampleGradeSheetData(
                schoolName || "School",
                address || ""
              )}
            />
          </div>
        </div>
      </div>
    </FeatureModalShell>
  );
}
