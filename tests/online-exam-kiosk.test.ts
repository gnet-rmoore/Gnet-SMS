/**
 * Online-exam kiosk / proctoring policy (Phase 1).
 * Run: npx tsx tests/online-exam-kiosk.test.ts
 */
import {
  DEFAULT_KIOSK_CONFIG,
  VIOLATION_TYPES,
  evaluateViolation,
  isCountedViolation,
  isKnownViolationType,
  parseKioskConfig,
  serializeKioskConfig,
} from "../services/academic/src/lib/onlineExamKiosk.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed += 1;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

console.log("=========================================");
console.log(" ONLINE EXAM KIOSK POLICY TESTS");
console.log("=========================================\n");

// --- violation type allow-list ---
assert(isKnownViolationType("EXIT_FULLSCREEN"), "recognizes EXIT_FULLSCREEN");
assert(isKnownViolationType("screen_share_stopped"), "normalizes case for known type");
assert(!isKnownViolationType("ARBITRARY_EVENT"), "rejects unknown violation types");
assert(VIOLATION_TYPES.includes("SCREEN_SHARE_STOPPED"), "screen-share stop is a known type");

// --- parse defaults ---
const def = parseKioskConfig(null);
assert(def.requireFullscreen === true, "fullscreen required by default");
assert(def.maxViolations === DEFAULT_KIOSK_CONFIG.maxViolations, "default max violations");
assert(def.blockedEvents.includes("EXIT_FULLSCREEN"), "default blocked events include fullscreen");

// --- legacy maxViolations seeds the limit (backward compat) ---
const legacy = parseKioskConfig(null, 5);
assert(legacy.maxViolations === 5, "legacy exam.maxViolations seeds kiosk limit");
const legacyCapped = parseKioskConfig(null, 999);
assert(legacyCapped.maxViolations === 50, "legacy limit capped at 50");

// --- explicit config overrides + validation ---
const cfg = parseKioskConfig(
  JSON.stringify({
    requireFullscreen: false,
    requireScreenShare: true,
    maxViolations: 2,
    warnAt: 1,
    blockedEvents: ["TAB_BLUR", "ARBITRARY_EVENT"],
    allowReconnect: false,
  }),
  5
);
assert(cfg.requireFullscreen === false, "explicit requireFullscreen honored");
assert(cfg.requireScreenShare === true, "explicit requireScreenShare honored");
assert(cfg.maxViolations === 2, "explicit maxViolations overrides legacy");
assert(cfg.allowReconnect === false, "explicit allowReconnect honored");
assert(
  cfg.blockedEvents.length === 1 && cfg.blockedEvents[0] === "TAB_BLUR",
  "blockedEvents drops unknown types"
);

// --- warnAt clamped to maxViolations ---
const clampedWarn = parseKioskConfig(JSON.stringify({ maxViolations: 2, warnAt: 9 }));
assert(clampedWarn.warnAt === 2, "warnAt clamped down to maxViolations");

// --- malformed JSON falls back to defaults ---
const malformed = parseKioskConfig("{not json", 4);
assert(malformed.maxViolations === 4, "malformed config keeps legacy limit");
assert(malformed.requireFullscreen === true, "malformed config keeps default fullscreen");

// --- counted vs recorded violations ---
const countedCfg = parseKioskConfig(
  JSON.stringify({ maxViolations: 3, blockedEvents: ["EXIT_FULLSCREEN"] })
);
assert(isCountedViolation(countedCfg, "EXIT_FULLSCREEN"), "listed type counts");
assert(!isCountedViolation(countedCfg, "TAB_BLUR"), "unlisted type is recorded only");

// --- evaluateViolation thresholds ---
const evalCfg = parseKioskConfig(JSON.stringify({ maxViolations: 3, warnAt: 1 }));
assert(evaluateViolation(evalCfg, 0).warn === false, "no warn at zero");
assert(evaluateViolation(evalCfg, 1).warn === true, "warn at threshold");
assert(evaluateViolation(evalCfg, 1).autoSubmit === false, "no auto-submit under limit");
assert(evaluateViolation(evalCfg, 3).autoSubmit === true, "auto-submit at limit");
assert(evaluateViolation(evalCfg, 3).warn === false, "no warn once auto-submitting");

// --- maxViolations 0 = unlimited (never auto-submit) ---
const unlimited = parseKioskConfig(JSON.stringify({ maxViolations: 0 }));
assert(evaluateViolation(unlimited, 100).autoSubmit === false, "0 = unlimited, never auto-submit");
assert(evaluateViolation(unlimited, 100).warn === false, "0 = unlimited, never warn");

// --- empty blockedEvents = record only ---
const recordOnly = parseKioskConfig(JSON.stringify({ blockedEvents: [] }));
assert(
  !isCountedViolation(recordOnly, "EXIT_FULLSCREEN"),
  "empty blockedEvents counts nothing"
);

// --- serialize round-trips ---
const roundTrip = parseKioskConfig(serializeKioskConfig(evalCfg));
assert(roundTrip.maxViolations === evalCfg.maxViolations, "serialize/parse round-trips limit");
assert(JSON.stringify(roundTrip.blockedEvents) === JSON.stringify(evalCfg.blockedEvents), "round-trips blocked events");

if (failed > 0) {
  console.error(`\n${failed} kiosk-policy assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll kiosk-policy checks passed");
