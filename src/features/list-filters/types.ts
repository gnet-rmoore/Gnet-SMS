/**
 * Shared list-filter types for schema-driven toolbars.
 * @see docs/ADVANCED_TABLE_FILTERS_PLAN.md
 */

export type FilterFieldType = "enum" | "date" | "text";

export type FilterOption = {
  value: string;
  label: string;
};

export type FilterFieldDef = {
  /** Query / state key (e.g. status, method, from). */
  key: string;
  label: string;
  type: FilterFieldType;
  /** Show in the always-visible primary row (not only the panel). */
  primary?: boolean;
  options?: FilterOption[];
  placeholder?: string;
  /** Label for the empty / “all” option on enum fields. */
  allLabel?: string;
};

export type ListFilterValues = Record<string, string>;

export type ListQueryState = {
  q: string;
  values: ListFilterValues;
  page: number;
  pageSize: number;
  sort?: string;
  order?: "asc" | "desc";
};

export type ListQueryEnvelope<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Record<string, number>>;
};

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export function isFilterValueActive(value: string | undefined | null): boolean {
  return Boolean(value && String(value).trim() !== "" && String(value) !== "ALL");
}

export function countActiveFilters(values: ListFilterValues, q = ""): number {
  let n = q.trim() ? 1 : 0;
  for (const v of Object.values(values)) {
    if (isFilterValueActive(v)) n += 1;
  }
  return n;
}
