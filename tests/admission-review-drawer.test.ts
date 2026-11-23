/**
 * Source-contract tests for the stage-separated review drawer.
 * Run: npx tsx tests/admission-review-drawer.test.ts
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) { console.error(`FAILED: ${msg}`); failed++; } else { console.log(`PASSED: ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

const orchestrator = read("src/features/registrar/components/ApplicationReviewModal.tsx");
const shell = read("src/features/registrar/components/review/ReviewDrawerShell.tsx");
const frame = read("src/features/registrar/components/review/StageFrame.tsx");
const readOnly = read("src/features/registrar/components/review/ReadOnlyStageView.tsx");
const banner = read("src/features/registrar/components/review/StageHistoryBanner.tsx");
const menu = read("src/features/registrar/components/review/BrowsePreviousMenu.tsx");
const rail = read("src/features/registrar/components/review/StageRail.tsx");
const stepper = read("src/components/OnboardingStepper.tsx");
const publicStatus = read("src/pages/PublicApplyStatus.tsx");

console.log("=== admission-review-drawer ===");

assert((orchestrator.match(/<StageFrame/g) || []).length === 1, "orchestrator renders exactly one StageFrame");
assert((shell.match(/children/g) || []).length >= 1 && shell.includes("min-h-0 flex-1 overflow-y-auto overscroll-contain"), "shell has one scrolling body");
for (const s of ["SubmittedStage", "ReviewStage", "EntranceStage", "ApprovedStage", "EnrolledStage", "TerminalStage"]) {
  assert(frame.includes(s), `StageFrame imports ${s}`);
  assert((frame.match(new RegExp(`<${s}`, "g")) || []).length === 1, `${s} rendered once in StageFrame`);
}
assert(frame.includes("ReadOnlyStageView") && frame.includes('mode === "history"'), "StageFrame chooses history vs active");
assert(!/<input|<select|<textarea|handle|save|Upload/i.test(readOnly), "ReadOnlyStageView has no editable controls or handlers");
assert(banner.includes("returnToCurrent") && banner.includes("onReturn"), "history banner owns Return to current stage");
assert(menu.includes("browsePrevious") && menu.includes("role=\"menu\""), "BrowsePreviousMenu is a footer menu");
assert(orchestrator.includes("BrowsePreviousMenu") && orchestrator.includes('nav.view.mode === "history"'), "footer is mode-aware");
assert(orchestrator.includes("titleRef") && orchestrator.includes("historyRef"), "focus targets exist for stage title and history heading");
assert(orchestrator.includes("dirtyClose.save") && orchestrator.includes("dirtyClose.discard") && orchestrator.includes("dirtyClose.cancel"), "dirty close offers Save/Discard/Cancel");
assert(orchestrator.includes("z-[110]") && orchestrator.includes("rejectRef.current?.focus()"), "reject confirmation nests above drawer and restores focus");
assert(menu.includes("Escape") && orchestrator.includes("if (confirm)"), "Escape order menu -> confirmation -> drawer");
assert(rail.includes("stageToStepper") && rail.includes("stepperToStage"), "StageRail adapts admission stages to stepper stages");
assert(!frame.includes("EntranceFeeStage") && stepper.includes("ENTRANCE"), "entrance replaces fee stage");
assert(stepper.includes("activeStage") && stepper.includes("browsableStages") && stepper.includes("onStageSelect"), "stepper supports explicit stage navigation");
assert(!publicStatus.includes("onStageSelect"), "public status page remains non-clickable");
assert(orchestrator.includes("nextActionState") && orchestrator.includes("aria-busy"), "loading/error renders skeleton without stage fields");
assert(!orchestrator.includes("max-w-[1040px]") && !orchestrator.includes("hover:bg-red-150"), "old width and red-150 removed");

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("All admission-review-drawer tests passed");
