import React from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  Link2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageShell, PageHeader, Surface, Button } from "../../components/ui";
import { cn } from "../../lib/cn";
import {
  HELP_CATEGORIES,
  getHelpEntryById,
  getHelpEntrySections,
  getRelatedHelpEntries,
} from "./glossary";

export default function SuperAdminHelpEntryPage() {
  const { entryId = "" } = useParams<{ entryId: string }>();
  const { t } = useTranslation(["pages", "common"]);
  const entry = getHelpEntryById(entryId);
  const categoryLabel = HELP_CATEGORIES.find((c) => c.id === entry?.category)?.label;

  if (!entry) {
    return (
      <PageShell>
        <PageHeader
          title={t("pages:superAdmin.helpPage.notFoundTitle", { defaultValue: "Term not found" })}
          subtitle={t("pages:superAdmin.helpPage.notFoundSubtitle", {
            defaultValue: "That glossary entry does not exist or was removed.",
          })}
        />
        <Surface variant="primary" className="p-8 text-center">
          <p className="text-sm text-slate-600 font-mono">{entryId || "—"}</p>
          <Link to="/super-admin/help" className="mt-6 inline-block">
            <Button type="button" variant="secondary">
              {t("pages:superAdmin.helpPage.backToGlossary", { defaultValue: "Back to glossary" })}
            </Button>
          </Link>
        </Surface>
      </PageShell>
    );
  }

  const sections = getHelpEntrySections(entry);
  const related = getRelatedHelpEntries(entry);

  return (
    <PageShell>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/super-admin/help"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("pages:superAdmin.helpPage.backToGlossary", { defaultValue: "Back to glossary" })}
        </Link>
      </div>

      <PageHeader
        title={entry.term}
        subtitle={categoryLabel}
        actions={
          entry.relatedPath ? (
            <Link to={entry.relatedPath}>
              <Button type="button" variant="primary" className="inline-flex items-center gap-2">
                {t("pages:superAdmin.helpPage.openConsole", { defaultValue: "Open in console" })}
                <ExternalLink className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          ) : undefined
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Surface
          variant="banner"
          className="p-8 bg-gradient-to-br from-slate-950 to-slate-900 text-white border-0"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-300">
            {categoryLabel}
          </p>
          <p className="mt-3 text-base font-medium leading-relaxed text-slate-100">{entry.shortDef}</p>
          {entry.aliases?.length ? (
            <p className="mt-4 text-xs font-mono text-slate-400">
              {t("pages:superAdmin.helpPage.alsoKnownAs", { defaultValue: "Also known as" })}:{" "}
              {entry.aliases.join(" · ")}
            </p>
          ) : null}
        </Surface>
      </motion.div>

      <div className="grid gap-4">
        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(i, 6) * 0.03 }}
          >
            <Surface variant="primary" className="p-8 space-y-3">
              <h2 className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-500 shrink-0" aria-hidden />
                {section.title}
              </h2>
              <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">{section.body}</p>
            </Surface>
          </motion.div>
        ))}
      </div>

      {entry.tips?.length ? (
        <Surface variant="primary" className="p-6 border-emerald-200 bg-emerald-50/40 space-y-3">
          <h3 className="text-sm font-extrabold tracking-tight text-emerald-900 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" aria-hidden />
            {t("pages:superAdmin.helpPage.operatorTips", { defaultValue: "Operator tips" })}
          </h3>
          <ul className="space-y-2 text-sm text-emerald-900/90 list-disc ps-5">
            {entry.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </Surface>
      ) : null}

      {related.length > 0 ? (
        <Surface variant="primary" className="p-6 space-y-4">
          <h3 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-slate-400" aria-hidden />
            {t("pages:superAdmin.helpPage.relatedTerms", { defaultValue: "Related terms" })}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {related.map((rel) => (
              <Link
                key={rel.id}
                to={`/super-admin/help/${rel.id}`}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3",
                  "text-sm font-bold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-white hover:text-indigo-700"
                )}
              >
                <span>{rel.term}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              </Link>
            ))}
          </div>
        </Surface>
      ) : null}

      {entry.detail && !entry.sections?.some((s) => s.body === entry.detail) ? (
        <Surface variant="primary" className="p-6 space-y-2">
          <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
            {t("pages:superAdmin.helpPage.referenceNote", { defaultValue: "Reference note" })}
          </h3>
          <p className="text-sm leading-relaxed text-slate-600">{entry.detail}</p>
        </Surface>
      ) : null}
    </PageShell>
  );
}
