export type PagedItems<T> = {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
};

export function unwrapItems<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const items = (value as { items?: unknown }).items;
  return Array.isArray(items) ? (items as T[]) : [];
}

export function unwrapTotal(value: unknown, fallback = 0): number {
  if (!value || typeof value !== "object") return fallback;
  const total = (value as { total?: unknown }).total;
  return typeof total === "number" && Number.isFinite(total) ? total : fallback;
}

export async function fetchAllItems<T>(
  fetchPage: (page: number, pageSize: number) => Promise<unknown>,
  pageSize = 100
): Promise<T[]> {
  const first = await fetchPage(1, pageSize);
  const items = unwrapItems<T>(first);
  const total = unwrapTotal(first, items.length);
  if (Array.isArray(first) || items.length >= total) return items;

  const allItems = [...items];
  for (let page = 2; allItems.length < total; page += 1) {
    const response = await fetchPage(page, pageSize);
    const pageItems = unwrapItems<T>(response);
    if (pageItems.length === 0) {
      throw new Error("Paged API returned fewer items than its reported total");
    }
    allItems.push(...pageItems);
  }
  return allItems;
}
