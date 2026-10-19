import { Bell } from "lucide-react";
import { getNavSections, type NavSection } from "../constants/navByRole";
import { hasCapability, navCapabilityKey } from "./capabilities";
import { entitlementForPath } from "./routeEntitlements";
import { hasPlanAccess } from "./entitlements";

/**
 * Role nav sections filtered by session capabilities (same rules as Layout sidebar).
 * Ensures GlobalSearch and the sidebar offer the same pages.
 */
export function getNavSectionsForSession(
  role: string | undefined,
  slug: string | undefined,
  capabilities: string[] | null | undefined,
  entitlements: string[] | null | undefined = null
): NavSection[] {
  const sections = getNavSections(role, slug).map((s) => ({
    ...s,
    items: [...s.items],
  }));
  if (!slug) return sections;

  const filterByCaps = Array.isArray(capabilities);
  const filterByEntitlements = Array.isArray(entitlements);
  const filtered = sections
    .map((s) => ({
      ...s,
      items: s.items.filter((item) => {
        if (filterByEntitlements) {
          const feature = entitlementForPath(item.to, slug);
          if (feature && !hasPlanAccess(entitlements, feature)) return false;
        }
        if (!filterByCaps) return true;
        const parts = item.to.split("/").filter(Boolean);
        const key = parts[0] === slug ? parts.slice(1).join("/") : parts.join("/");
        const pathKey = key.split("?")[0];
        if (!pathKey) return true;
        if (hasCapability(capabilities, navCapabilityKey(pathKey))) return true;
        if (pathKey.startsWith("settings/") && hasCapability(capabilities, "nav.settings")) return true;
        return false;
      }),
    }))
    .filter((s) => s.items.length > 0);

  const hasNotifications = filtered.some((s) =>
    s.items.some((i) => i.to.endsWith("/notifications"))
  );
  if (hasNotifications) return filtered;

  // Only inject when capabilities are absent (legacy) or explicitly granted.
  if (filterByCaps && !hasCapability(capabilities, "nav.notifications")) {
    return filtered;
  }

  const notifItem = {
    to: `/${slug}/notifications`,
    icon: Bell,
    labelKey: "items.notifications",
  };
  const overview = filtered.find((s) => s.id === "overview");
  if (overview) {
    overview.items.push(notifItem);
    return filtered;
  }
  return [{ id: "overview", labelKey: "sections.overview", items: [notifItem] }, ...filtered];
}
