import type { ListFilterValues, ListQueryState } from "./types";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./types";

const RESERVED = new Set(["q", "page", "pageSize", "sort", "order", "tab"]);

/**
 * Read list-filter state from URLSearchParams.
 * Filter field keys are stored as flat query params (same keys as the API).
 */
export function parseListQueryFromSearchParams(
  params: URLSearchParams,
  fieldKeys: string[],
  defaults: Partial<ListQueryState> = {}
): ListQueryState {
  const values: ListFilterValues = {};
  for (const key of fieldKeys) {
    values[key] = params.get(key) ?? defaults.values?.[key] ?? "";
  }
  const page = Math.max(1, Number(params.get("page") || defaults.page || 1) || 1);
  const rawSize = Number(params.get("pageSize") || defaults.pageSize || DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawSize));
  const sort = params.get("sort") || defaults.sort || undefined;
  const orderRaw = params.get("order") || defaults.order || undefined;
  const order = orderRaw === "asc" || orderRaw === "desc" ? orderRaw : defaults.order;

  return {
    q: params.get("q") ?? defaults.q ?? "",
    values,
    page,
    pageSize,
    sort,
    order,
  };
}

/**
 * Write list-filter state into URLSearchParams (mutates and returns same instance).
 * Preserves unrelated keys (e.g. `tab`) unless they collide with filter keys.
 */
export function applyListQueryToSearchParams(
  params: URLSearchParams,
  state: ListQueryState,
  fieldKeys: string[],
  opts: { defaultPageSize?: number } = {}
): URLSearchParams {
  const defaultPageSize = opts.defaultPageSize ?? DEFAULT_PAGE_SIZE;

  if (state.q.trim()) params.set("q", state.q.trim());
  else params.delete("q");

  for (const key of fieldKeys) {
    const v = state.values[key];
    if (v && v.trim() && v !== "ALL") params.set(key, v);
    else params.delete(key);
  }

  if (state.page > 1) params.set("page", String(state.page));
  else params.delete("page");

  if (state.pageSize !== defaultPageSize) params.set("pageSize", String(state.pageSize));
  else params.delete("pageSize");

  if (state.sort) params.set("sort", state.sort);
  else params.delete("sort");

  if (state.order) params.set("order", state.order);
  else params.delete("order");

  return params;
}

/** Build a plain params object suitable for API query strings. */
export function toApiParams(
  state: ListQueryState,
  fieldKeys: string[]
): Record<string, string | number | undefined> {
  const out: Record<string, string | number | undefined> = {
    q: state.q.trim() || undefined,
    page: state.page,
    pageSize: state.pageSize,
    sort: state.sort,
    order: state.order,
  };
  for (const key of fieldKeys) {
    const v = state.values[key];
    if (v && v.trim() && v !== "ALL") out[key] = v;
  }
  return out;
}

export function stripReservedFilterKeys(params: URLSearchParams, fieldKeys: string[]): void {
  for (const key of [...RESERVED, ...fieldKeys]) {
    if (key === "tab") continue;
    params.delete(key);
  }
}
