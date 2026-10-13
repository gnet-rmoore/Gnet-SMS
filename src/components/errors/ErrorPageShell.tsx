import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { LanguageSelect } from "../../i18n/LanguageSelect";
import { getStoredLocale, normalizeLocale } from "../../i18n";
import type { AppLocale } from "../../i18n/locales";
import { useTranslation } from "react-i18next";

export type ErrorPageTone = "rose" | "amber" | "slate" | "indigo";

export type ErrorPageAction = {
  label: string;
  to?: string;
  onClick?: () => void;
  external?: boolean;
};

export type ErrorPageHint = {
  icon: LucideIcon;
  text: string;
};

type Props = {
  langId: string;
  tone?: ErrorPageTone;
  icon: LucideIcon;
  code?: string;
  eyebrow: string;
  title: string;
  body: string;
  hints?: ErrorPageHint[];
  primary?: ErrorPageAction;
  secondary?: ErrorPageAction;
  footerNote?: string;
  /** When true, omit full-screen chrome (use inside Layout outlet). */
  embedded?: boolean;
};

const toneClasses: Record<
  ErrorPageTone,
  { tile: string; eyebrow: string }
> = {
  rose: { tile: "bg-rose-600", eyebrow: "text-rose-600" },
  amber: { tile: "bg-amber-500", eyebrow: "text-amber-700" },
  slate: { tile: "bg-slate-800", eyebrow: "text-slate-600" },
  indigo: { tile: "bg-indigo-600", eyebrow: "text-indigo-600" },
};

function ActionButton({
  action,
  variant,
}: {
  action: ErrorPageAction;
  variant: "primary" | "secondary";
}) {
  const className =
    variant === "primary"
      ? "inline-flex flex-1 items-center justify-center gap-2 min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
      : "inline-flex flex-1 items-center justify-center gap-2 min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors";

  if (action.onClick && !action.to) {
    return (
      <button type="button" onClick={action.onClick} className={className}>
        {action.label}
      </button>
    );
  }

  if (action.external && action.to) {
    return (
      <a href={action.to} className={className} onClick={action.onClick}>
        {action.label}
      </a>
    );
  }

  return (
    <Link to={action.to || "/"} className={className} onClick={action.onClick}>
      {action.label}
    </Link>
  );
}

/**
 * Shared Executive Slate chrome for public / system error pages.
 */
export function ErrorPageShell({
  langId,
  tone = "rose",
  icon: Icon,
  code,
  eyebrow,
  title,
  body,
  hints,
  primary,
  secondary,
  footerNote,
  embedded = false,
}: Props) {
  const { i18n } = useTranslation();
  const [locale, setLocale] = React.useState<AppLocale>(
    () => normalizeLocale(i18n.language) || getStoredLocale() || "en"
  );
  const colors = toneClasses[tone];

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`w-full max-w-lg rounded-[32px] border border-slate-200 bg-white p-8 sm:p-10 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-6 ${
        embedded ? "mx-auto my-8" : ""
      }`}
      role="alert"
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-2xl ${colors.tile} flex items-center justify-center shrink-0`}
        >
          <Icon className="w-6 h-6 text-white" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-xs font-bold uppercase tracking-wider ${colors.eyebrow}`}>
              {eyebrow}
            </p>
            {code ? (
              <span className="font-mono text-xs font-bold text-slate-400">{code}</span>
            ) : null}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mt-1">{title}</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">{body}</p>
        </div>
      </div>

      {hints && hints.length > 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
          {hints.map((hint, i) => {
            const HintIcon = hint.icon;
            return (
              <div key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                <HintIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden />
                <p>{hint.text}</p>
              </div>
            );
          })}
        </div>
      ) : null}

      {(primary || secondary) && (
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          {secondary ? <ActionButton action={secondary} variant="secondary" /> : null}
          {primary ? <ActionButton action={primary} variant="primary" /> : null}
        </div>
      )}

      {footerNote ? (
        <p className="text-center text-xs font-medium text-slate-400">
          Gnet SMS · {footerNote}
        </p>
      ) : null}
    </motion.div>
  );

  if (embedded) {
    return <div className="px-6 sm:px-8">{card}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-6 py-16 relative">
      <div className="absolute top-6 end-6">
        <LanguageSelect
          id={langId}
          value={locale}
          onChange={setLocale}
          applyImmediately
          hint={null}
          className="w-44 shrink-0"
        />
      </div>
      {card}
    </div>
  );
}
