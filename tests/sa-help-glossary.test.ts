/**
 * Super Admin help glossary filter + detail contract.
 */
import assert from "node:assert/strict";
import {
  SA_HELP_GLOSSARY,
  filterHelpEntries,
  getHelpEntryById,
  getHelpEntrySections,
  getRelatedHelpEntries,
} from "../src/features/super-admin-help/glossary";

assert.ok(SA_HELP_GLOSSARY.length >= 20);
assert.ok(SA_HELP_GLOSSARY.some((e) => e.id === "custom-domain"));
assert.ok(SA_HELP_GLOSSARY.some((e) => e.id === "mrr"));

const mrr = filterHelpEntries(SA_HELP_GLOSSARY, "monthly recurring", "ALL");
assert.ok(mrr.some((e) => e.id === "mrr"));
assert.equal(filterHelpEntries(SA_HELP_GLOSSARY, "mrr", "billing").filter((e) => e.id === "mrr").length, 1);

const domain = filterHelpEntries(SA_HELP_GLOSSARY, "vanity", "domains");
assert.ok(domain.some((e) => e.id === "custom-domain"));

const none = filterHelpEntries(SA_HELP_GLOSSARY, "zzzz-not-a-term", "ALL");
assert.equal(none.length, 0);

const mrrEntry = getHelpEntryById("mrr");
assert.ok(mrrEntry);
assert.ok(getHelpEntrySections(mrrEntry!).length >= 2);

const planRelated = getRelatedHelpEntries(getHelpEntryById("plan")!);
assert.ok(planRelated.some((e) => e.id === "entitlement"));

assert.equal(getHelpEntryById("not-a-real-id"), undefined);

console.log("PASSED: SA help glossary filter + detail");
