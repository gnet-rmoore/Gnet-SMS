import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookmarkPlus, Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { Button } from "./Button";
import { fieldControlClass } from "./tokens";
import type { FilterFieldDef, ListFilterValues } from "../../features/list-filters/types";
import { isFilterValueActive } from "../../features/list-filters/types";
import {
  deleteSavedFilterView,
  loadSavedFilterViews,
  saveFilterView,
  type SavedFilterView,
} from "../../features/list-filters/savedViews";

export type ListFilterBarProps = {
  fields: FilterFieldDef[];
  q: string;
  onSearchChange: (q: string) => void;
  values: ListFilterValues;
  onValueChange: (key: string, value: string) => void;
  onClear: () => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  /** Shown count (e.g. page length). */
  shownCount?: number;
  /** Total matching rows when known. */
  totalCount?: number;
  className?: string;
  /** Extra actions on the right (export, etc.). */
  actions?: ReactNode;
  /** Live-apply primary filters (default true). */
  dense?: boolean;
  /** Optional scope key enabling localStorage saved views (e.g. schoolId:fees-history). */
  savedViewsScope?: string;
  onApplySavedView?: (view: { q: string; values: ListFilterValues }) => void;
};

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FilterFieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const controlClass = cn(fieldControlClass.compact, "w-full bg-white");

  if (field.type === "enum") {
    return (
      <select
        id={`list-filter-${field.key}`}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={controlClass}
        aria-label={field.label}
      >
        <option value="">{field.allLabel || field.label}</option>
        {(field.options || []).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "date") {
    return (
      <input
        id={`list-filter-${field.key}`}
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={controlClass}
        aria-label={field.label}
      />
    );
  }

  return (
    <input
      id={`list-filter-${field.key}`}
      type="text"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className={controlClass}
      aria-label={field.label}
    />
  );
}

/**
 * Schema-driven list filter toolbar: search, primary fields, advanced panel, chips, result meta.
 */
export function ListFilterBar({
  fields,
  q,
  onSearchChange,
  values,
  onValueChange,
  onClear,
  searchPlaceholder,
  searchLabel,
  shownCount,
  totalCount,
  className,
  actions,
  savedViewsScope,
  onApplySavedView,
}: ListFilterBarProps) {
  const { t } = useTranslation(["pages", "common"]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [views, setViews] = useState<SavedFilterView[]>([]);

  useEffect(() => {
    if (!savedViewsScope) return;
    setViews(loadSavedFilterViews(savedViewsScope));
  }, [savedViewsScope]);

  const primary = useMemo(() => fields.filter((f) => f.primary), [fields]);
  const advanced = useMemo(() => fields.filter((f) => !f.primary), [fields]);

  const chips = useMemo(() => {
    const out: { key: string; label: string; display: string }[] = [];
    if (q.trim()) {
      out.push({
        key: "__q",
        label: searchLabel || t("pages:listFilters.search"),
        display: q.trim(),
      });
    }
    for (const field of fields) {
      const v = values[field.key];
      if (!isFilterValueActive(v)) continue;
      const optLabel = field.options?.find((o) => o.value === v)?.label;
      out.push({
        key: field.key,
        label: field.label,
        display: optLabel || v,
      });
    }
    return out;
  }, [q, values, fields, searchLabel, t]);

  const removeChip = (key: string) => {
    if (key === "__q") onSearchChange("");
    else onValueChange(key, "");
  };

  const showingLabel =
    typeof shownCount === "number" && typeof totalCount === "number"
      ? t("pages:listFilters.showingOf", { shown: shownCount, total: totalCount })
      : typeof totalCount === "number"
        ? t("pages:listFilters.totalCount", { count: totalCount })
        : typeof shownCount === "number"
          ? t("pages:listFilters.showing", { count: shownCount })
          : null;

  const handleSaveView = () => {
    if (!savedViewsScope) return;
    const name = window.prompt(t("pages:listFilters.saveViewPrompt"), t("pages:listFilters.saveViewDefault"));
    if (name == null) return;
    setViews(saveFilterView(savedViewsScope, name, { q, values }));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="list-filter-search" className="sr-only">
            {searchLabel || t("pages:listFilters.search")}
          </label>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            id="list-filter-search"
            type="search"
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder || t("pages:listFilters.searchPlaceholder")}
            className={cn(fieldControlClass.compact, "w-full bg-white ps-9 pe-3")}
          />
        </div>

        {primary.map((field) => (
          <div key={field.key} className="w-full sm:w-40 lg:w-44">
            <label
              htmlFor={`list-filter-${field.key}`}
              className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              {field.label}
            </label>
            <FieldControl
              field={field}
              value={values[field.key] || ""}
              onChange={(v) => onValueChange(field.key, v)}
            />
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          {advanced.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => setPanelOpen((o) => !o)}
              aria-expanded={panelOpen}
              aria-controls="list-filter-panel"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              {t("pages:listFilters.filters")}
              {chips.length > 0 ? (
                <span className="font-mono text-xs text-indigo-600">{chips.length}</span>
              ) : null}
            </Button>
          ) : null}
          {chips.length > 0 ? (
            <Button type="button" variant="ghost" size="compact" onClick={onClear}>
              {t("pages:listFilters.clearAll")}
            </Button>
          ) : null}
          {savedViewsScope ? (
            <Button type="button" variant="ghost" size="compact" onClick={handleSaveView}>
              <BookmarkPlus className="h-4 w-4" aria-hidden />
              {t("pages:listFilters.saveView")}
            </Button>
          ) : null}
          {actions}
        </div>
      </div>

      {savedViewsScope && views.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label={t("pages:listFilters.savedViews")}>
          {views.map((view) => (
            <span
              key={view.id}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50/60 pl-2.5 text-xs font-semibold text-indigo-800"
            >
              <button
                type="button"
                className="py-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40"
                onClick={() => {
                  onApplySavedView?.({ q: view.q, values: view.values });
                  onSearchChange(view.q);
                  for (const [k, v] of Object.entries(view.values)) onValueChange(k, v);
                }}
              >
                {view.name}
              </button>
              <button
                type="button"
                className="rounded-e-lg p-1.5 text-indigo-500 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40"
                aria-label={t("pages:listFilters.deleteView")}
                onClick={() => setViews(deleteSavedFilterView(savedViewsScope, view.id))}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {panelOpen && advanced.length > 0 ? (
        <div
          id="list-filter-panel"
          className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {advanced.map((field) => (
            <div key={field.key}>
              <label
                htmlFor={`list-filter-${field.key}`}
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                {field.label}
              </label>
              <FieldControl
                field={field}
                value={values[field.key] || ""}
                onChange={(v) => onValueChange(field.key, v)}
              />
            </div>
          ))}
        </div>
      ) : null}

      {(chips.length > 0 || showingLabel) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2" aria-label={t("pages:listFilters.activeFilters")}>
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => removeChip(chip.key)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40"
              >
                <span className="text-slate-400">{chip.label}:</span>
                <span>{chip.display}</span>
                <X className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                <span className="sr-only">{t("pages:listFilters.removeFilter")}</span>
              </button>
            ))}
          </div>
          {showingLabel ? (
            <p className="text-xs font-medium text-slate-500" aria-live="polite">
              {showingLabel}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
