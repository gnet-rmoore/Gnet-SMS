/**
 * Document signatory helpers (Settings map → official signatures on printouts).
 * Run: npx tsx tests/document-signatories.test.ts
 */
import assert from "node:assert/strict";
import {
  parseDocumentSignatories,
  resolveDocumentSignatory,
  serializeDocumentSignatories,
  staffWithOfficialSignatures,
} from "../src/lib/documentSignatories";
import { getOfficialSignatureUrl } from "../src/lib/userSignature";

const PNG = "data:image/png;base64,abc";

assert.deepEqual(parseDocumentSignatories(null), {});
assert.deepEqual(parseDocumentSignatories("{}"), {});
assert.deepEqual(
  parseDocumentSignatories({ principal: { userId: "u1" }, accountant: "u2" }),
  { principal: { userId: "u1" }, accountant: { userId: "u2" } }
);
assert.equal(
  serializeDocumentSignatories({ principal: { userId: " u1 " } }),
  JSON.stringify({ principal: { userId: "u1" } })
);

const staff = [
  { id: "u1", name: "Ada Principal", signatureUrl: PNG },
  { id: "u2", name: "No Sig", signatureUrl: null },
  { id: "u3", name: "Bad Url", signatureUrl: "https://cdn.example/x.png" },
];

assert.equal(staffWithOfficialSignatures(staff).length, 1);

const map = { principal: { userId: "u1" } };
const resolved = resolveDocumentSignatory("principal", map, staff);
assert.equal(resolved.name, "Ada Principal");
assert.equal(resolved.signatureUrl, PNG);
assert.equal(getOfficialSignatureUrl(resolved), PNG);

const blank = resolveDocumentSignatory("principal", {}, staff);
assert.equal(blank.signatureUrl, null);
assert.equal(blank.name, "");

const missingUser = resolveDocumentSignatory(
  "principal",
  { principal: { userId: "gone" } },
  staff
);
assert.equal(missingUser.signatureUrl, null);

const override = resolveDocumentSignatory("principal", map, staff, {
  name: "Override Name",
  title: "Head",
});
assert.equal(override.name, "Override Name");
assert.equal(override.title, "Head");
assert.equal(override.signatureUrl, PNG);

console.log("All document-signatories tests passed");
