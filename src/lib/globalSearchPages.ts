import type { LucideIcon } from "lucide-react";
import type { NavSection } from "../constants/navByRole";

export type SearchPageItem = {
  id: string;
  type: "page";
  label: string;
  subtitle: string;
  path: string;
  icon: LucideIcon;
  meta: {
    segment: string;
    sectionId: string;
    sectionLabel: string;
    labelKey: string;
  };
};

export function pathSegment(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || path;
}

export function humanizeSegment(segment: string): string {
  return segment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Build labeled page results from nav sections (labelKey → translated title). */
export function navSectionsToSearchPages(
  sections: NavSection[],
  translateNavKey: (key: string) => string,
  pageFallbackLabel: string
): SearchPageItem[] {
  const out: SearchPageItem[] = [];
  const seen = new Set<string>();

  for (const section of sections) {
    const sectionLabel = translateNavKey(section.labelKey).trim() || pageFallbackLabel;
    for (const item of section.items) {
      if (seen.has(item.to)) continue;
      seen.add(item.to);
      const segment = pathSegment(item.to);
      const label =
        translateNavKey(item.labelKey).trim() ||
        humanizeSegment(segment) ||
        pageFallbackLabel;
      out.push({
        id: `page-${item.to}`,
        type: "page",
        label,
        subtitle: sectionLabel,
        path: item.to,
        icon: item.icon,
        meta: {
          segment,
          sectionId: section.id,
          sectionLabel,
          labelKey: item.labelKey,
        },
      });
    }
  }
  return out;
}
