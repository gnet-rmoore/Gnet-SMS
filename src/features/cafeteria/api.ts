import { api } from "../../services/api";

export const cafeteriaApi = {
  fetchMenus: (schoolId: string, from?: string, to?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const q = qs.toString();
    return api.get(`/api/schools/${schoolId}/cafeteria/menus${q ? `?${q}` : ""}`);
  },
  upsertMenu: (schoolId: string, data: unknown) =>
    api.put(`/api/schools/${schoolId}/cafeteria/menus`, data),
  fetchMealCounts: (schoolId: string, from?: string, to?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const q = qs.toString();
    return api.get(`/api/schools/${schoolId}/cafeteria/meal-counts${q ? `?${q}` : ""}`);
  },
  upsertMealCount: (schoolId: string, data: unknown) =>
    api.put(`/api/schools/${schoolId}/cafeteria/meal-counts`, data),
};
