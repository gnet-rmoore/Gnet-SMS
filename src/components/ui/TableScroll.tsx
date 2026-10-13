import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type TableScrollProps = {
  children: ReactNode;
  /** Optional tip shown above the scroll region on narrow viewports */
  hint?: string;
} & HTMLAttributes<HTMLDivElement>;

/**
 * Horizontal scroll wrapper for **matrix** tables (gradebook, schedules, wide ledgers).
 * List / directory tables should use `DataTable` instead.
 */
export function TableScroll({ children, hint, className, ...rest }: TableScrollProps) {
  return (
    <div className={cn("min-w-0", className)} {...rest}>
      {hint ? (
        <p className="mb-2 text-xs font-medium text-slate-500 lg:hidden">{hint}</p>
      ) : null}
      <div className="overflow-x-auto max-lg:overflow-x-auto lg:overflow-x-visible">{children}</div>
    </div>
  );
}
