import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BrowsableStage } from "../../lib/admissionStage";

export function BrowsePreviousMenu({ browsableStages, onSelect }: { browsableStages: BrowsableStage[]; onSelect: (stage: BrowsableStage) => void; }) {
  const { t } = useTranslation(["pages"]);
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) listRef.current?.querySelector<HTMLButtonElement>("button")?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);
  if (browsableStages.length === 0) return null;
  const labels: Record<BrowsableStage, string> = {
    SUBMITTED: t("admissions.stepper.submitted"),
    REVIEW: t("admissions.stepper.review"),
    ENTRANCE: t("admissions.stepper.entrance"),
    APPROVED: t("admissions.stepper.approved"),
  };
  return (
    <div ref={wrapRef} className="relative" onKeyDown={(e) => { if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); } }}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
        {t("admissions.review.stage.browsePrevious")}
      </button>
      {open ? (
        <ul ref={listRef} role="menu" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } }} className="absolute bottom-full left-0 z-[120] mb-2 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {browsableStages.map((s) => (
            <li key={s} role="none">
              <button type="button" role="menuitem" onClick={() => { setOpen(false); onSelect(s); }} className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:bg-indigo-50">
                {labels[s]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}