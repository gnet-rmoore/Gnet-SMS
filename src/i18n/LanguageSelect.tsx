import React from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LOCALES, type AppLocale } from "./locales";
import { changeAppLocale } from "./index";

type Props = {
  value: AppLocale | string;
  onChange: (locale: AppLocale) => void | Promise<void>;
  id?: string;
  className?: string;
  /** Override the default `common:language` label */
  label?: string;
  /** Override the default `common:languageHint` hint; pass `null` to hide */
  hint?: string | null;
  /** When true, also calls changeAppLocale immediately */
  applyImmediately?: boolean;
  /** `glass` = translucent chip for dark marketing surfaces (login, etc.) */
  variant?: "default" | "glass";
  /** Show only the native language name in options (cleaner on marketing) */
  compactOptions?: boolean;
};

const selectClassDefault =
  "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

const selectClassGlass =
  "w-full appearance-none rounded-full border border-white/25 bg-white/10 py-2 ps-3.5 pe-8 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] outline-none backdrop-blur-md transition-colors hover:bg-white/15 focus:ring-2 focus:ring-white/40 focus:border-white/40";

export function LanguageSelect({
  value,
  onChange,
  id = "language-select",
  className,
  label,
  hint,
  applyImmediately = true,
  variant = "default",
  compactOptions = false,
}: Props) {
  const { t } = useTranslation("common");
  const hintText = hint === null ? null : hint ?? t("languageHint");
  const isGlass = variant === "glass";
  const selectClass = isGlass ? selectClassGlass : selectClassDefault;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={
          isGlass
            ? "sr-only"
            : "mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500"
        }
      >
        {label ?? t("language")}
      </label>
      <div className={isGlass ? "relative" : undefined}>
        <select
          id={id}
          value={value}
          aria-label={label ?? t("language")}
          className={selectClass}
          onChange={async (e) => {
            const next = e.target.value as AppLocale;
            if (applyImmediately) await changeAppLocale(next);
            await onChange(next);
          }}
        >
          {SUPPORTED_LOCALES.map((loc) => (
            <option key={loc.code} value={loc.code} className="bg-slate-900 text-white">
              {compactOptions
                ? `${loc.nativeLabel}${loc.complete ? "" : " (beta)"}`
                : `${loc.nativeLabel} — ${loc.englishLabel}${loc.complete ? "" : " (beta)"}`}
            </option>
          ))}
        </select>
        {isGlass ? (
          <span
            aria-hidden
            className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-white/80"
          >
            ▾
          </span>
        ) : null}
      </div>
      {hintText ? (
        <p className="mt-1.5 text-xs font-medium text-slate-500">{hintText}</p>
      ) : null}
    </div>
  );
}
