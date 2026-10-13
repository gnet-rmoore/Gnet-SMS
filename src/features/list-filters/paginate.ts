import { DEFAULT_PAGE_SIZE } from "./types";

/** Inclusive 1-based range for the current page within `total` rows. */
export function pageRange(
  total: number,
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE
): { from: number; to: number } {
  if (total <= 0) return { from: 0, to: 0 };
  const size = Math.max(1, pageSize);
  const p = Math.max(1, page);
  const from = (p - 1) * size + 1;
  const to = Math.min(total, p * size);
  return { from, to };
}

export function totalPages(total: number, pageSize: number = DEFAULT_PAGE_SIZE): number {
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

export function canPrevPage(page: number): boolean {
  return page > 1;
}

export function canNextPage(total: number, page: number, pageSize: number): boolean {
  return page * Math.max(1, pageSize) < total;
}

/** Client-only slice — prefer server `page`/`pageSize` for large domains. */
export function slicePage<T>(items: T[], page: number, pageSize: number): T[] {
  const size = Math.max(1, pageSize);
  const start = (Math.max(1, page) - 1) * size;
  return items.slice(start, start + size);
}

/** Convert 1-based page + pageSize → limit/offset for APIs that use that pair. */
export function toLimitOffset(
  page: number,
  pageSize: number
): { limit: number; offset: number } {
  const limit = Math.max(1, pageSize);
  const offset = (Math.max(1, page) - 1) * limit;
  return { limit, offset };
}
