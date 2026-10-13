import type { NavSection } from "../../constants/navByRole";

export function isNavActive(pathname: string, to: string) {
  if (to === "/super-admin") return pathname === "/super-admin" || pathname === "/super-admin/";
  if (pathname === to) return true;
  return pathname.startsWith(`${to}/`);
}

export function sectionContainsActive(section: NavSection, pathname: string) {
  return section.items.some((item) => isNavActive(pathname, item.to));
}

export function sectionBadgeTotal(
  section: NavSection,
  navBadges: Record<string, number>,
  keyFromPath: (to: string) => string | undefined
) {
  return section.items.reduce((sum, item) => {
    const key = keyFromPath(item.to) || "";
    return sum + (navBadges[key] || 0);
  }, 0);
}
