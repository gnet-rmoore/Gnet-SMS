/**
 * Global search page labels must resolve from nav labelKey (not removed `label`).
 */
import assert from "node:assert/strict";
import { LayoutDashboard, Users } from "lucide-react";
import { navSectionsToSearchPages } from "../src/lib/globalSearchPages";
import type { NavSection } from "../src/constants/navByRole";
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

console.log("global-search-labels: ok");
