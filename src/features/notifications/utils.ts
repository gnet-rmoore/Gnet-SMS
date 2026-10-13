/** Resolve stored href (path without slug) to a school-scoped SPA path. */
export function resolveNotificationHref(
  href: string | null | undefined,
  slug?: string | null,
  fallback = "/dashboard"
): string {
  if (!href) return slug ? `/${slug}${fallback.startsWith("/") ? fallback : `/${fallback}`}` : fallback;
  if (href.startsWith("http")) return href;
  if (href.startsWith("/") && slug && !href.startsWith(`/${slug}/`) && href !== `/${slug}`) {
    return `/${slug}${href}`;
  }
  return href;
}

/** Last path segment of a nav `to` → navKey for badge lookup. */
export function navKeyFromPath(to: string): string | null {
  const parts = to.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  return parts[parts.length - 1] || null;
}

export function formatBadgeCount(n: number): string {
  if (n <= 0) return "";
  return n > 99 ? "99+" : String(n);
}
