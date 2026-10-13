import React from "react";
import { Link } from "react-router-dom";
import { Plus, HelpCircle, LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader as UiPageHeader, Button } from "../../../components/ui";

export type PageHeaderProps = {
  canManage?: boolean;
  setShowConceptGuide?: (v: boolean) => void;
  setShowGradeModal?: (v: boolean) => void;
  setShowSubjectModal?: (v: boolean) => void;
  showConceptGuide?: boolean;
  slug?: string;
  title?: string;
  subtitle?: string;
};

export function PageHeader({
  canManage,
  setShowConceptGuide,
  setShowGradeModal,
  setShowSubjectModal,
  showConceptGuide,
  slug,
  title,
  subtitle,
}: PageHeaderProps) {
  const { t } = useTranslation("pages");
  const pageTitle = title ?? t("curriculum.title");
  const pageSubtitle = subtitle ?? t("curriculum.subtitle");

  return (
    <UiPageHeader
      title={
        <span className="flex items-center gap-3 flex-wrap">
          {pageTitle}
          <Button
            type="button"
            variant="ghost"
            size="compact"
            onClick={() => setShowConceptGuide?.(!showConceptGuide)}
            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs"
            title={t("curriculum.header.explainTerms")}
          >
            <HelpCircle className="w-4 h-4" />
            {showConceptGuide ? t("curriculum.header.hideGuide") : t("curriculum.header.needHelp")}
          </Button>
        </span>
      }
      subtitle={pageSubtitle}
      actions={
        <>
          {slug && (
            <Link
              to={`/${slug}/classrooms`}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              <LayoutGrid className="w-4 h-4" />
              {t("curriculum.header.classroomsLink")}
            </Link>
          )}
          {canManage && (
            <>
              <Button type="button" variant="secondary" onClick={() => setShowGradeModal?.(true)}>
                <Plus className="w-4 h-4" />
                {t("curriculum.header.addGradeLevel")}
              </Button>
              <Button type="button" variant="primary" onClick={() => setShowSubjectModal?.(true)}>
                <Plus className="w-4 h-4" />
                {t("curriculum.header.addSubject")}
              </Button>
            </>
          )}
        </>
      }
    />
  );
}
