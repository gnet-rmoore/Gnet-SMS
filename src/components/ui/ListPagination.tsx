import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { Button } from "./Button";
import { canNextPage, canPrevPage, pageRange, totalPages } from "../../features/list-filters/paginate";
import { MAX_PAGE_SIZE } from "../../features/list-filters/types";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export type ListPaginationProps = {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  /** Extra label (e.g. domain-specific total). Defaults to showing range of total. */
  className?: string;
  /** When false, hide even if total ≤ pageSize. Default: hide when a single page. */
  alwaysShow?: boolean;
};

/**
 * Shared table/list pager — Prev/Next, range label, optional page-size select.
 * @see docs/TABLE_PAGINATION_PLAN.md
 */
export function ListPagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className,
  alwaysShow = false,
}: ListPaginationProps) {
  const { t } = useTranslation(["pages", "common"]);
  const pages = totalPages(total, pageSize);
  const { from, to } = pageRange(total, page, pageSize);

  if (!alwaysShow && total <= pageSize) return null;

  const sizeOptions = Array.from(
    new Set([...PAGE_SIZE_OPTIONS, pageSize].filter((n) => n <= MAX_PAGE_SIZE))
  ).sort((a, b) => a - b);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="text-sm font-medium text-slate-500 font-mono">
        {total > 0
          ? t("pages:listFilters.showingRange", {
              from,
              to,
              total,
              defaultValue: `Showing ${from}–${to} of ${total}`,
            })
          : t("pages:listFilters.showing", { count: 0 })}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange ? (
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className="sr-only">{t("pages:listFilters.rowsPerPage", { defaultValue: "Rows per page" })}</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700"
              aria-label={t("pages:listFilters.rowsPerPage", { defaultValue: "Rows per page" })}
            >
              {sizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <span className="text-xs font-medium text-slate-400 font-mono">
          {t("pages:listFilters.pageOf", {
            page,
            pages,
            defaultValue: `Page ${page} of ${pages}`,
          })}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="compact"
          disabled={!canPrevPage(page)}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          {t("pages:listFilters.prev")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="compact"
          disabled={!canNextPage(total, page, pageSize)}
          onClick={() => onPageChange(page + 1)}
        >
          {t("pages:listFilters.next")}
        </Button>
      </div>
    </div>
  );
}
