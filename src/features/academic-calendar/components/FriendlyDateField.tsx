import React from "react";
import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatFriendlyDate } from "../utils";

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  error?: string;
  hint?: string;
  min?: string;
  max?: string;
  required?: boolean;
};

/**
 * Native date picker with a human-readable display (e.g. Feb. 12, 2026).
 * The visible control opens the browser calendar via showPicker().
 */
export function FriendlyDateField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  min,
  max,
  required,
}: Props) {
  const { t } = useTranslation("pages");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const display = formatFriendlyDate(value) || t("academicCalendar.setup.selectDate");

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === "function") {
        el.showPicker();
        return;
      }
    } catch {
      // Fall through — older browsers / restricted contexts
    }
    el.focus();
    el.click();
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={openPicker}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-white text-left transition-colors cursor-pointer ${
            error
              ? "border-rose-300 ring-2 ring-rose-100"
              : "border-slate-200 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          }`}
          aria-label={`${label}: ${display}. ${t("academicCalendar.setup.openDatePicker")}`}
          aria-invalid={Boolean(error)}
          aria-haspopup="dialog"
        >
          <Calendar className={`w-4 h-4 shrink-0 ${error ? "text-rose-400" : "text-indigo-500"}`} />
          <span className={`text-sm font-bold truncate ${value ? "text-slate-900" : "text-slate-400"}`}>
            {display}
          </span>
        </button>

        {/* Visually hidden native input — holds value + drives the OS/browser picker */}
        <input
          ref={inputRef}
          id={id}
          type="date"
          value={value ? value.slice(0, 10) : ""}
          min={min}
          max={max}
          required={required}
          tabIndex={-1}
          onChange={(e) => onChange(e.target.value)}
          className="absolute left-0 top-0 h-px w-px opacity-0 overflow-hidden"
          aria-hidden="true"
        />
      </div>

      {error ? (
        <p className="text-xs font-semibold text-rose-600 leading-snug">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500 leading-snug">{hint}</p>
      ) : null}
    </div>
  );
}
