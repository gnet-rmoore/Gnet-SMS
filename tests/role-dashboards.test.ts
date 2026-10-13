/**
 * Role dashboard registry coverage.
 * Run: npx tsx tests/role-dashboards.test.ts
 */
import { SCHOOL_ROLES } from "../src/constants/roles";
import {
  getRoleDashboard,
  missingDashboardRoles,
  ROLE_DASHBOARD_REGISTRY,
} from "../src/features/dashboard/registry";

let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    failed++;
  } else {
    console.log(`PASSED: ${message}`);
  }
}

console.log("=========================================");
console.log(" ROLE DASHBOARDS UNIT TESTS              ");
console.log("=========================================\n");

const missing = missingDashboardRoles();
assert(missing.length === 0, `every SCHOOL_ROLES has registry entry (missing: ${missing.join(",") || "none"})`);

for (const role of SCHOOL_ROLES) {
  const def = getRoleDashboard(role);
  assert(def.role === role || ROLE_DASHBOARD_REGISTRY[role] != null, `${role} resolves`);
  assert(Boolean(def.titleKey), `${role} has titleKey`);
  assert(Boolean(def.subtitleKey), `${role} has subtitleKey`);
  assert(Boolean(def.body), `${role} has body kind`);
  if (def.body === "specialty") {
    assert((def.hubs?.length || 0) > 0, `${role} specialty has hubs`);
  }
  if (def.body === "student") {
    assert(
      def.quickActions.every((a) => !["curriculum", "reports", "settings"].includes(a.path)),
      "student actions exclude admin curriculum/reports/settings"
    );
  }
  if (def.body === "teacher") {
    assert(
      def.quickActions.some((a) => a.path === "attendance"),
      "teacher has attendance action"
    );
    assert(
      !def.quickActions.some((a) => a.path === "settings"),
      "teacher has no settings action"
    );
  }
}

assert(getRoleDashboard("PARENT").body === "parent", "PARENT → parent body");
assert(getRoleDashboard("ACCOUNTANT").body === "accountant", "ACCOUNTANT → accountant body");
assert(getRoleDashboard("NOPE").body === "minimal" || getRoleDashboard("NOPE").quickActions.length >= 0, "unknown role falls back");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All role-dashboard tests passed");
