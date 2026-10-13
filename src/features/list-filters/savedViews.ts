import type { ListFilterValues } from "./types";

export type SavedFilterView = {
  id: string;
  name: string;
  q: string;
  values: ListFilterValues;
  createdAt: string;
};

const PREFIX = "sms.listFilters.views:";

function storageKey(scope: string): string {
  return `${PREFIX}${scope}`;
}

export function loadSavedFilterViews(scope: string): SavedFilterView[] {
  try {
    const raw = localStorage.getItem(storageKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFilterView(
  scope: string,
  name: string,
  state: { q: string; values: ListFilterValues }
): SavedFilterView[] {
  const views = loadSavedFilterViews(scope);
  const next: SavedFilterView = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || "Saved view",
    q: state.q || "",
    values: { ...state.values },
    createdAt: new Date().toISOString(),
  };
  const updated = [next, ...views].slice(0, 12);
  localStorage.setItem(storageKey(scope), JSON.stringify(updated));
  return updated;
}

export function deleteSavedFilterView(scope: string, id: string): SavedFilterView[] {
  const updated = loadSavedFilterViews(scope).filter((v) => v.id !== id);
  localStorage.setItem(storageKey(scope), JSON.stringify(updated));
  return updated;
}
