/**
 * UI primitive class contracts.
 * Run: npm run test:ui-primitives
 */
import {
  SMS_RADIUS_SURFACE,
  SMS_SHADOW_SURFACE,
  buttonClass,
  fieldControlClass,
  pageShellClass,
  smsCanvasClass,
  surfaceClass,
  typeClass,
} from "../src/components/ui/tokens.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

console.log("=========================================");
console.log(" UI PRIMITIVES / TOKEN CONTRACTS");
console.log("=========================================\n");

assert(pageShellClass.default.includes("max-w-6xl"), "PageShell default max-w-6xl");
assert(pageShellClass.wide.includes("max-w-7xl"), "PageShell wide max-w-7xl");

assert(surfaceClass.primary.includes(SMS_RADIUS_SURFACE), "Surface primary radius");
assert(surfaceClass.primary.includes(SMS_SHADOW_SURFACE), "Surface primary shadow");
assert(surfaceClass.primary.includes("border-slate-200"), "Surface primary border slate-200");
assert(surfaceClass.nested.includes("rounded-2xl"), "Surface nested radius");
assert(surfaceClass.empty.includes("border-dashed"), "Surface empty dashed");
assert(surfaceClass.banner.includes("from-slate-950"), "Surface banner gradient");
assert(smsCanvasClass === "bg-slate-100", "Canvas is slate-100 (not slate-50)");
assert(
  SMS_SHADOW_SURFACE.includes("0_8px_24px"),
  "Surface shadow uses dual-layer lift"
);
assert(
  !SMS_SHADOW_SURFACE.includes("0.015"),
  "Surface shadow is not the legacy ultra-weak recipe"
);

assert(buttonClass.base.includes("focus-visible:ring-2"), "Button focus ring");
assert(buttonClass.sizeDefault.includes("px-6"), "Button primary padding x");
assert(buttonClass.sizeDefault.includes("py-3"), "Button primary padding y");
assert(buttonClass.sizeDefault.includes("min-h-11"), "Button primary min height ≥44px");
assert(buttonClass.sizeCompact.includes("px-3"), "Button compact padding");
assert(buttonClass.sizeCompact.includes("min-h-6"), "Button compact ≥24px");
assert(buttonClass.primary.includes("bg-indigo-600"), "Button primary indigo");
assert(buttonClass.danger.includes("bg-rose-600"), "Button danger rose");

assert(fieldControlClass.default.includes("px-4"), "Field default px");
assert(fieldControlClass.default.includes("py-2.5"), "Field default py");
assert(fieldControlClass.compact.includes("px-3"), "Field compact px");
assert(fieldControlClass.invalid.includes("border-rose"), "Field invalid border");

assert(typeClass.pageTitle.includes("font-extrabold"), "Page title weight");
assert(typeClass.pageTitle.includes("tracking-tight"), "Page title tracking");
assert(typeClass.metaLabel.includes("text-xs"), "Meta label not text-[10px]");
assert(typeClass.metaLabel.includes("text-slate-500"), "Meta label AA-friendlier slate-500");
assert(!typeClass.metaLabel.includes("text-[10px]"), "Meta forbids 10px");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("All UI primitive contracts passed");
process.exit(0);
