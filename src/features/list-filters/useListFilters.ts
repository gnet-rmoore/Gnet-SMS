import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { FilterFieldDef, ListFilterValues, ListQueryState } from "./types";
import { DEFAULT_PAGE_SIZE, countActiveFilters } from "./types";
import {
  applyListQueryToSearchParams,
  parseListQueryFromSearchParams,
  toApiParams,
} from "./urlState";

export type UseListFiltersOptions = {
  fields: FilterFieldDef[];
  /** Debounce ms for `q` → committed state. Default 350. */
  debounceMs?: number;
  defaultPageSize?: number;
  defaultSort?: string;
  defaultOrder?: "asc" | "desc";
  /** When false, do not sync to the URL. Default true. */
  syncUrl?: boolean;
};

export type UseListFiltersResult = {
  q: string;
  setQ: (q: string) => void;
  /** Debounced search string for fetching. */
  committedQ: string;
  values: ListFilterValues;
  setValue: (key: string, value: string) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  sort?: string;
  order?: "asc" | "desc";
  setSort: (sort: string, order?: "asc" | "desc") => void;
  clear: () => void;
  activeCount: number;
  hasActiveFilters: boolean;
  apiParams: Record<string, string | number | undefined>;
  fieldKeys: string[];
  state: ListQueryState;
};

export function useListFilters(options: UseListFiltersOptions): UseListFiltersResult {
  const {
    fields,
    debounceMs = 350,
    defaultPageSize = DEFAULT_PAGE_SIZE,
    defaultSort,
    defaultOrder,
    syncUrl = true,
  } = options;

  const fieldKeys = useMemo(() => fields.map((f) => f.key), [fields]);
  const [searchParams, setSearchParams] = useSearchParams();

  const initial = useMemo(
    () =>
      parseListQueryFromSearchParams(searchParams, fieldKeys, {
        pageSize: defaultPageSize,
        sort: defaultSort,
        order: defaultOrder,
        values: Object.fromEntries(fieldKeys.map((k) => [k, ""])),
      }),
    // Hydrate once from the URL on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [q, setQState] = useState(initial.q);
  const [committedQ, setCommittedQ] = useState(initial.q);
  const [values, setValues] = useState<ListFilterValues>(initial.values);
  const [page, setPageState] = useState(initial.page);
  const [pageSize, setPageSizeState] = useState(initial.pageSize);
  const [sort, setSortState] = useState(initial.sort);
  const [order, setOrderState] = useState(initial.order);
  const qBootstrapped = useRef(false);

  useEffect(() => {
    if (!qBootstrapped.current) {
      qBootstrapped.current = true;
      return;
    }
    const t = window.setTimeout(() => {
      setCommittedQ(q);
      setPageState(1);
    }, debounceMs);
    return () => window.clearTimeout(t);
  }, [q, debounceMs]);

  const state: ListQueryState = useMemo(
    () => ({
      q: committedQ,
      values,
      page,
      pageSize,
      sort,
      order,
    }),
    [committedQ, values, page, pageSize, sort, order]
  );

  useEffect(() => {
    if (!syncUrl) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        applyListQueryToSearchParams(next, state, fieldKeys, { defaultPageSize });
        return next;
      },
      { replace: true }
    );
  }, [state, syncUrl, fieldKeys, defaultPageSize, setSearchParams]);

  const setQ = useCallback((next: string) => {
    setQState(next);
  }, []);

  const setValue = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setPageState(1);
  }, []);

  const setPage = useCallback((p: number) => {
    setPageState(Math.max(1, p));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  const setSort = useCallback((nextSort: string, nextOrder: "asc" | "desc" = "asc") => {
    setSortState(nextSort);
    setOrderState(nextOrder);
    setPageState(1);
  }, []);

  const clear = useCallback(() => {
    setQState("");
    setCommittedQ("");
    setValues(Object.fromEntries(fieldKeys.map((k) => [k, ""])));
    setPageState(1);
    setSortState(defaultSort);
    setOrderState(defaultOrder);
  }, [fieldKeys, defaultSort, defaultOrder]);

  const activeCount = countActiveFilters(values, committedQ);

  const apiParams = useMemo(() => toApiParams(state, fieldKeys), [state, fieldKeys]);

  return {
    q,
    setQ,
    committedQ,
    values,
    setValue,
    page,
    setPage,
    pageSize,
    setPageSize,
    sort,
    order,
    setSort,
    clear,
    activeCount,
    hasActiveFilters: activeCount > 0,
    apiParams,
    fieldKeys,
    state,
  };
}
