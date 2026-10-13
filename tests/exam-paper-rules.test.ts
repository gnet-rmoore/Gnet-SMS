/**
 * Exam paper delivery-mode content rules (mirrors examPaperService.validateContentForMode).
 * Run: npm run test:exam-paper
 */

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed += 1;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

function validateContentForMode(
  mode: string,
  questionCount: number,
  hasPdf: boolean
): string | null {
  if (!questionCount && !hasPdf) {
    return "Add structured questions and/or a PDF before submitting";
  }
  if (mode === "ONLINE" && questionCount < 1) {
    return "Online delivery requires at least one structured question";
  }
  if (mode === "OFFLINE" && !hasPdf) {
    return "Offline delivery requires a PDF paper";
  }
  if (mode === "HYBRID" && (questionCount < 1 || !hasPdf)) {
    return "Hybrid delivery requires both structured questions and a PDF";
  }
  return null;
}

function canStartOnline(opts: {
  paperStatus: string;
  deliveryMode: string;
  leg: string;
}): string | null {
  if (opts.paperStatus !== "APPROVED") return "PAPER_NOT_APPROVED";
  if (opts.deliveryMode === "OFFLINE") return "OFFLINE_ONLY";
  if (opts.deliveryMode === "HYBRID" && opts.leg !== "ONLINE") {
    return "HYBRID_OFFLINE_LEG";
  }
  return null;
}

console.log("=========================================");
console.log(" EXAM PAPER RULES TESTS");
console.log("=========================================\n");

assert(validateContentForMode("ONLINE", 0, true) !== null, "ONLINE needs questions");
assert(validateContentForMode("ONLINE", 2, false) === null, "ONLINE with questions OK");
assert(validateContentForMode("OFFLINE", 0, false) !== null, "OFFLINE needs PDF");
assert(validateContentForMode("OFFLINE", 0, true) === null, "OFFLINE with PDF OK");
assert(validateContentForMode("HYBRID", 1, false) !== null, "HYBRID needs both");
assert(validateContentForMode("HYBRID", 1, true) === null, "HYBRID with both OK");

assert(
  canStartOnline({ paperStatus: "SUBMITTED", deliveryMode: "ONLINE", leg: "ONLINE" }) ===
    "PAPER_NOT_APPROVED",
  "block before approve"
);
assert(
  canStartOnline({ paperStatus: "APPROVED", deliveryMode: "OFFLINE", leg: "ONLINE" }) ===
    "OFFLINE_ONLY",
  "block offline mode"
);
assert(
  canStartOnline({
    paperStatus: "APPROVED",
    deliveryMode: "HYBRID",
    leg: "OFFLINE",
  }) === "HYBRID_OFFLINE_LEG",
  "block hybrid offline leg"
);
assert(
  canStartOnline({
    paperStatus: "APPROVED",
    deliveryMode: "HYBRID",
    leg: "ONLINE",
  }) === null,
  "allow hybrid online leg"
);

if (failed > 0) {
  console.error(`\n${failed} exam-paper assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll exam-paper checks passed");
