import { api } from "../services/api";
import { changeAppLocale, normalizeLocale, type AppLocale } from "./index";
import { useAuthStore } from "../store/authStore";

/**
 * Persist the signed-in user's preferred UI language and apply it immediately.
 * Survives logout/login because it is stored on the user record.
 */
export async function persistPreferredLocale(locale: AppLocale): Promise<AppLocale> {
  const user = useAuthStore.getState().user;
  if (!user?.id) {
    await changeAppLocale(locale);
    return locale;
  }

  const updated = await api.patch(`/api/users/${user.id}`, { preferredLocale: locale });
  const next = (normalizeLocale(updated.preferredLocale) || locale) as AppLocale;
  useAuthStore.getState().updateUser({ preferredLocale: next });
  await changeAppLocale(next);
  return next;
}
