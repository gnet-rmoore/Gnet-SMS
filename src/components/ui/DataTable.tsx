import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { dataTableClass } from "./tokens";

type DataTableProps = {
  children: ReactNode;
  hint?: string;
} & HTMLAttributes<HTMLDivElement>;

/**
 * Wrapper for list / directory tables. Uses `table-fixed` + compact cells so rows
 * fit the page width without a horizontal scrollbar on desktop.
 *
 * For wide matrix grids (gradebook, schedules), use `TableScroll` instead.
 */
export function DataTable({ children, hint, className, ...rest }: DataTableProps) {
  return (
    <div className={cn(dataTableClass.wrap, className)} {...rest}>
      {hint ? (
        <p className="mb-2 text-xs font-medium text-slate-500 lg:hidden">{hint}</p>
      ) : null}
      {children}
    </div>
  );
}

export { dataTableClass };
