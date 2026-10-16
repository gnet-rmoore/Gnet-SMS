/**
 * Global search ranking engine — scoring, tokenization, highlighting.
 * Run: npm run test:global-search
 */
import assert from "node:assert/strict";
import {
  highlightSegments,
  normalizeSearchText,
  scoreFields,
  scoreText,
  sortByScoreDesc,
  tokenizeQuery,
} from "../src/lib/searchRanking";

// --- normalization -----------------------------------------------------------
assert.equal(normalizeSearchText("  Grade-Review  "), "grade review");
assert.equal(normalizeSearchText("Cafétéria"), "cafeteria");
assert.equal(normalizeSearchText("my_class "), "my class");
assert.deepEqual(tokenizeQuery(" Grade   REVIEW "), ["grade", "review"]);
assert.deepEqual(tokenizeQuery("   "), []);

// --- scoring -----------------------------------------------------------------
// Exact > prefix > word boundary > mid-word.
assert.equal(scoreText("students", "students"), 1);
assert.ok(scoreText("students", "stud") > scoreText("students", "tuden"));
assert.ok(scoreText("grade review", "review") > scoreText("grade review", "rade"));
assert.ok(scoreText("attendance", "dance") > 0);

// Multi-token AND semantics: all tokens must match.
assert.ok(scoreText("grade review", "review grade") > 0.8);
assert.equal(scoreText("grade review", "review math"), 0);

// Hyphen/underscore separators count as word boundaries.
assert.ok(scoreText("grade-review", "grade review") > 0.8);

// Diacritics-insensitive.
assert.ok(scoreText("Cafeteria Manager", "cafeteria") > 0.9);
assert.ok(scoreText("Café", "cafe") > 0.9);

// Ordered-subsequence fuzzy fallback beats zero for near misses.
assert.ok(scoreText("attendance", "atend") > 0);
assert.ok(scoreText("attendance", "zzz") === 0);

// Short tokens must not fuzzy-match everything.
assert.equal(scoreText("students", "zz"), 0);

// --- field weighting ---------------------------------------------------------
const best = scoreFields(
  [
    { text: "Grade Review", weight: 1 },
    { text: "Academics", weight: 0.6 },
    { text: "grade-review", weight: 0.55 },
  ],
  "grade"
);
const onlySection = scoreFields([{ text: "Academics", weight: 0.6 }], "grade");
assert.ok(best > onlySection);
assert.equal(scoreFields([{ text: null }, { text: undefined }], "x"), 0);

// --- highlighting ------------------------------------------------------------
const segs = highlightSegments("Grade Review", "grade");
assert.equal(segs[0].text, "Grade");
assert.equal(segs[0].match, true);
assert.equal(segs[1].text, " Review");
assert.equal(segs[1].match, false);

// Multi-token highlights every token; empty query returns plain text.
const multi = highlightSegments("Students and Staff", "students staff");
assert.ok(multi.filter((s) => s.match).length >= 2);
assert.deepEqual(highlightSegments("Students", ""), [{ text: "Students", match: false }]);
assert.deepEqual(highlightSegments("", "x"), []);

// --- stable sort -------------------------------------------------------------
const sorted = sortByScoreDesc([
  { score: 0.5, id: "b" },
  { score: 1, id: "a" },
  { score: 0.5, id: "c" },
]);
assert.deepEqual(
  sorted.map((s) => s.id),
  ["a", "b", "c"] // equal scores keep insertion order
);

console.log("global-search-ranking: ok");
