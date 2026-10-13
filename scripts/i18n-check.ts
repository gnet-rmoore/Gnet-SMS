/**
 * Assert each locale catalog matches English namespaces/leaves.
 * For locales marked `complete` in `SUPPORTED_LOCALES`, missing leaves and
 * unexpected English leftovers on critical paths are hard failures.
 *
 * Usage: npx tsx scripts/i18n-check.ts  |  npm run i18n:check
 */
import { enResources } from "../src/i18n/catalogs/en.ts";
import { localeResources } from "../src/i18n/catalogs/translations.ts";
import { SUPPORTED_LOCALES, type AppLocale } from "../src/i18n/locales.ts";

const REQUIRED_NS = ["common", "nav", "auth", "errors", "roles", "pages", "public"] as const;

/** Technical tokens / examples that stay Latin across locales by design. */
const EN_ALLOWLIST =
  /^(YourSMS|Gnet SMS|Gnet|Liberia|Liberian|USD|QR|PTA|VPI|VPA|HR|IT|HVAC|IB|OK|ID|URL|SMS|API|PDF|CSV|Excel|MoE|LR|GPA|BUS_DELAY|NEW|RETURNING|ACTIVE|PENDING|PAID|CASH|ONLINE|OFFLINE|HYBRID|IBAN|SWIFT|SWIFT \/ BIC|https:\/\/…|FAQ|Min|Max)$/i;

const EXAMPLE_PLACEHOLDER =
  /@school\.edu|\+1 \(555\)|jane\.doe|https:\/\/…|^[A-Z][A-Z0-9_]{2,}$/;

/** Latin-script cognates identical in FR/ES/DE by design (not English leftovers). */
const LATIN_COGNATE_LOCALES = new Set(["fr", "es", "de"]);
const LATIN_COGNATES =
  /^(Actions|Date|Notes|Description|Type|Total|Code|Finance|General|Profile|Status|Email|Role|Name|Optional|Student|Teacher|Class|Grade|Filter|Import|Export|Logo|Normal|Maximum|Minimum|Base|Index|Version|Admin|Super Admin|Portal|No|Yes|OK|Error|Info|Details|Document|Documents|Calendar|Report|Reports|Communication|Admissions|Notifications|Parent|Maintenance|Administration|Contact|Modules|FAQ|Dashboard|Registrar|Min|Max)$/i;

/** Print layouts stay English until report-card / gradesheet epics finalize (I18N_LOCALE_PARITY_PLAN). */
const PRINT_LAYOUT_PREFIXES = [
  "pages.reportCard.print.",
  "pages.gradeSheet.print.",
  "pages.certificates.print.",
  "pages.fees.receiptPrint.",
];

const CRITICAL_ONLY = process.env.I18N_CHECK_CRITICAL_ONLY === "1";

function isPrintLayoutKey(path: string): boolean {
  return PRINT_LAYOUT_PREFIXES.some((p) => path.startsWith(p));
}

/** High-traffic surfaces required for production-complete locales (I18N plan §10). */
const CRITICAL_PREFIXES = [
  "common.",
  "nav.",
  "auth.",
  "errors.",
  "roles.",
  "pages.students.",
  "pages.fees.title",
  "pages.fees.subtitle",
  "pages.fees.tabs.",
  "pages.fees.toast.",
  "pages.fees.confirm.",
  "pages.fees.status.",
  "pages.settings.",
  "pages.profile.",
  "public.apply",
  "public.register",
  "public.invite",
  "public.landing.hero",
  "public.landing.nav",
  "public.landing.cta",
  "public.landing.signIn",
];

type Tree = Record<string, unknown>;

function leafPaths(obj: Tree, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj || {})) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out.push(...leafPaths(v as Tree, path));
    } else {
      out.push(path);
    }
  }
  return out;
}

function leafEntries(obj: Tree, prefix = ""): Array<{ path: string; value: string }> {
  const out: Array<{ path: string; value: string }> = [];
  for (const [k, v] of Object.entries(obj || {})) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out.push(...leafEntries(v as Tree, path));
    } else if (typeof v === "string") {
      out.push({ path, value: v });
    }
  }
  return out;
}

function getPath(obj: Tree, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Tree)[key];
    return undefined;
  }, obj);
}

function isCritical(path: string): boolean {
  return CRITICAL_PREFIXES.some(
    (p) => path === p.replace(/\.$/, "") || path.startsWith(p) || p.startsWith(path + ".")
  );
}

function isAllowedEnglish(enVal: string, localeCode?: string): boolean {
  const t = enVal.trim();
  if (!t) return true;
  if (EN_ALLOWLIST.test(t)) return true;
  if (EXAMPLE_PLACEHOLDER.test(t)) return true;
  if (localeCode && LATIN_COGNATE_LOCALES.has(localeCode) && LATIN_COGNATES.test(t)) {
    return true;
  }
  return false;
}

let failed = 0;
let warnings = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

function warn(msg: string) {
  console.warn(`WARN: ${msg}`);
  warnings++;
}

const completeByCode = new Map(
  SUPPORTED_LOCALES.filter((l) => l.code !== "en").map((l) => [l.code, l.complete])
);

console.log("=========================================");
console.log(" I18N CATALOG CHECK");
if (CRITICAL_ONLY) console.log(" Mode: critical-path only (I18N_CHECK_CRITICAL_ONLY=1)");
console.log("=========================================\n");

for (const ns of REQUIRED_NS) {
  assert(!!(enResources as any)[ns], `en has namespace ${ns}`);
}

const localeCodes = Object.keys(localeResources).sort();
assert(localeCodes.length > 0, "at least one non-en locale pack");

for (const code of localeCodes) {
  const catalog = (localeResources as any)[code] as Tree;
  const isComplete = completeByCode.get(code as AppLocale) === true;

  for (const ns of REQUIRED_NS) {
    assert(!!catalog?.[ns], `${code} has namespace ${ns}`);
  }

  for (const ns of REQUIRED_NS) {
    const enLeaves = leafPaths((enResources as any)[ns] as Tree).filter(
      (p) => !isPrintLayoutKey(`${ns}.${p}`)
    );
    const locLeaves = new Set(leafPaths((catalog[ns] as Tree) || {}));
    const missing = enLeaves.filter((p) => !locLeaves.has(p));
    if (missing.length > 0) {
      const sample = missing.slice(0, 8).join(", ");
      const more = missing.length > 8 ? ` (+${missing.length - 8} more)` : "";
      const msg = `${code}.${ns}: ${missing.length} missing leaf key(s) — e.g. ${sample}${more}`;
      if (isComplete && !CRITICAL_ONLY) assert(false, msg);
      else warn(msg);
    } else {
      console.log(`PASSED: ${code}.${ns} leaf keys cover en`);
    }
  }

  if (isComplete || CRITICAL_ONLY) {
    const leftovers: string[] = [];
    for (const { path, value: enVal } of leafEntries(enResources as Tree)) {
      if (!isCritical(path)) continue;
      if (isPrintLayoutKey(path)) continue;
      if (isAllowedEnglish(enVal, code)) continue;
      const locVal = getPath(catalog, path);
      if (typeof locVal === "string" && locVal === enVal) {
        leftovers.push(path);
      }
    }
    if (leftovers.length > 0) {
      const sample = leftovers.slice(0, 8).join(", ");
      const more = leftovers.length > 8 ? ` (+${leftovers.length - 8} more)` : "";
      assert(
        false,
        `${code}: ${leftovers.length} critical-path English leftover(s) — e.g. ${sample}${more}`
      );
    } else {
      console.log(`PASSED: ${code} critical-path QA (no unexpected English leftovers)`);
    }
  }
}

console.log("");
if (failed) {
  console.error(`${failed} assertion(s) failed; ${warnings} soft warning(s)`);
  process.exit(1);
}
console.log(
  `All namespace checks passed (${warnings} soft warning(s) for incomplete leaves). Complete locales: ${[
    ...completeByCode.entries(),
  ]
    .filter(([, c]) => c)
    .map(([code]) => code)
    .join(", ")}`
);
process.exit(0);
