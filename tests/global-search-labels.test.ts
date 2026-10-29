/**
 * Global search page labels must resolve from nav labelKey (not removed `label`).
 */
import assert from "node:assert/strict";
import { LayoutDashboard, Users } from "lucide-react";
import { navSectionsToSearchPages } from "../src/lib/globalSearchPages";
import { pageMetaForPath } from "../src/lib/globalSearchPageMeta";
import { getNavSections, type NavSection } from "../src/constants/navByRole";
import { ROLES } from "../src/constants/roles";
import { getNavSectionsForSession } from "../src/lib/navSectionsForSession";

const sections: NavSection[] = [
  {
    id: "overview",
    labelKey: "sections.overview",
    items: [
      { to: "/demo/dashboard", icon: LayoutDashboard, labelKey: "items.dashboard" },
      { to: "/demo/students", icon: Users, labelKey: "items.students" },
    ],
  },
];

const labels: Record<string, string> = {
  "sections.overview": "Overview",
  "items.dashboard": "Dashboard",
  "items.students": "Students",
};

const pages = navSectionsToSearchPages(sections, (key) => labels[key] || key, "Page");

assert.equal(pages.length, 2);
assert.equal(pages[0].label, "Dashboard");
assert.equal(pages[0].subtitle, "Overview");
assert.equal(pages[1].label, "Students");
assert.ok(pages.every((p) => p.label && !p.label.includes("items.")));

// Regression: empty translator must still show a humanized path segment, never blank.
const blank = navSectionsToSearchPages(sections, () => "", "Page");
assert.equal(blank[0].label, "Dashboard");
assert.equal(blank[1].label, "Students");

const schoolAdmin = getNavSectionsForSession("SCHOOL_ADMIN", "demo", null);
assert.ok(schoolAdmin.length > 0);
assert.ok(schoolAdmin.some((s) => s.items.some((i) => i.labelKey === "items.dashboard")));

// Page titles, tabs, and labels are indexed alongside the sidebar label.
assert.equal(pageMetaForPath("/super-admin/operators")?.title, "Operators & dual-control");
assert.ok(pageMetaForPath("/super-admin/operators")?.keywords.includes("dual control"));
assert.equal(pageMetaForPath("/super-admin/settings")?.title, "Platform settings");
assert.equal(pageMetaForPath("/demo/settings?tab=SECURITY")?.title, "Settings");
assert.equal(pageMetaForPath("/demo/settings/academic-calendar")?.title, "Academic calendar");
assert.equal(pageMetaForPath("/demo/grades")?.title, "Student grades");
assert.ok(pageMetaForPath("/demo/fees")?.keywords.includes("receipts"));

// Every sidebar page must have searchable metadata; query-string tabs inherit their page title.
for (const role of ROLES) {
  const slug = role === "SUPER_ADMIN" ? undefined : "demo";
  for (const section of getNavSections(role, slug)) {
    for (const item of section.items) {
      assert.ok(pageMetaForPath(item.to), `Missing search metadata for ${role} ${item.to}`);
    }
  }
}

const securitySections: NavSection[] = [
  {
    id: "settings",
    labelKey: "sections.settings",
    items: [
      {
        to: "/demo/settings?tab=SECURITY",
        icon: LayoutDashboard,
        labelKey: "items.securitySettings",
      },
    ],
  },
];
const securityTab = navSectionsToSearchPages(securitySections, (key) => labels[key] || key, "Page");
assert.equal(securityTab[0].meta.title, "Settings");
assert.equal(navSectionsToSearchPages(securitySections, () => "", "Page")[0].label, "Settings");

console.log("global-search-labels: ok");
