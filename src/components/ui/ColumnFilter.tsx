import { useEffect, useRef, useState } from "react";
import { Filter } from "lucide-react";
import { cn } from "../../lib/cn";

export type ColumnFilterOption = {
  value: string;
  label: string;
};

export type ColumnFilterButtonProps = {
  /** Accessible label for the column being filtered (e.g. "Status"). */
  label: string;
  options: ColumnFilterOption[];
  /** Current value; empty string means "all". */
  value: string;
  onChange: (value: string) => void;
  allLabel?: string;
  className?: string;
};

/**
 * Compact funnel-icon popover for filtering a single table column from its header.
 * Pairs with a plain `<th>` when a full `ListFilterBar` toolbar entry is overkill.
 */
export function ColumnFilterButton({
  label,
  options,
  value,
  onChange,
  allLabel = "All",
  className,
}: ColumnFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = Boolean(value);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative inline-block normal-case", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Filter by ${label}`}
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40",
          active ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        )}
      >
        <Filter className="h-3.5 w-3.5" aria-hidden />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={`Filter by ${label}`}
          className="absolute start-0 top-full z-20 mt-1 min-w-[9rem] rounded-xl border border-slate-200 bg-white p-1 text-start font-medium tracking-normal shadow-lg"
        >
          <button
            type="button"
            role="option"
            aria-selected={!active}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={cn(
              "block w-full rounded-lg px-3 py-1.5 text-start text-xs font-semibold",
              !active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            {allLabel}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "block w-full rounded-lg px-3 py-1.5 text-start text-xs font-semibold",
                value === opt.value ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
