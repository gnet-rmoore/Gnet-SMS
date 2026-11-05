/**
 * Equation authoring helpers (MathLive dialog + plain-text grammar).
 * Run: npm run test:math-equation
 */
import {
  applyEquation,
  findMathExpressionAt,
  formatEquation,
  normalizeEquationLatex,
} from "../src/features/online-exam/mathEquation.ts";
import { parseRichContentWithRanges } from "../src/features/online-exam/richText.ts";

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
console.log(" MATH EQUATION AUTHORING TESTS");
console.log("=========================================\n");

// Normalization strips delimiters and whitespace.
{
  assert(normalizeEquationLatex("  $$\\frac{a}{b}$$  ") === "\\frac{a}{b}", "display delimiters stripped");
  assert(normalizeEquationLatex("$x^2$") === "x^2", "inline delimiters stripped");
  assert(normalizeEquationLatex("\\[x+1\\]") === "x+1", "\\[...\\] delimiters stripped");
  assert(normalizeEquationLatex("\\(x+1\\)") === "x+1", "\\(...\\) delimiters stripped");
  assert(normalizeEquationLatex("\\frac{a}{b}") === "\\frac{a}{b}", "bare LaTeX kept");
  assert(normalizeEquationLatex("") === "", "empty input stays empty");
}

// Formatting preserves the existing grammar.
{
  assert(formatEquation("x^2", false) === "$x^2$", "inline token formatted");
  assert(formatEquation("$$x^2$$", false) === "$x^2$", "pre-wrapped inline token normalized");
  assert(formatEquation("\\int_0^1 x\\,dx", true) === "$$\\int_0^1 x\\,dx$$", "display token formatted");
  assert(formatEquation("   ", false) === "", "blank equation produces no token");
}

// Range parser keeps exact source offsets.
{
  const source = "Area is $\\pi r^2$ and $$x^2$$ ok";
  const segments = parseRichContentWithRanges(source);
  assert(segments.length === 5, "range parser yields text/math/text/math/text");
  const inline = segments[1];
  const display = segments[3];
  assert(inline.type === "math" && inline.start === 8 && inline.end === 17, "inline offsets include delimiters");
  assert(display.type === "math" && display.start === 22 && display.end === 29, "display offsets include delimiters");
  assert(source.slice(inline.start, inline.end) === "$\\pi r^2$", "inline source slice matches");
}

// Caret and selection detection.
{
  const source = "Solve $x^2$ please";
  const caret = findMathExpressionAt(source, 9);
  assert(caret?.latex === "x^2" && caret.start === 6 && caret.end === 11, "caret inside inline equation resolves");
  const after = findMathExpressionAt(source, 11);
  assert(after?.latex === "x^2", "caret immediately after equation resolves");
  const through = findMathExpressionAt(source, 7, 10);
  assert(through?.latex === "x^2", "selection inside equation resolves");
  assert(findMathExpressionAt(source, 0) === null, "plain caret does not resolve");
  assert(findMathExpressionAt("$5 and $10", 2) === null, "currency does not resolve as math");
}

{
  const source = "Start $$\\int_0^1 x\\,dx$$ end";
  const edit = findMathExpressionAt(source, 9);
  assert(edit?.display === true, "display equation detected");
  assert(edit?.latex === "\\int_0^1 x\\,dx", "display LaTeX preserved");
}

// Insertion and replacement.
{
  const inserted = applyEquation("Area is  exactly", {
    start: 8,
    end: 8,
    latex: "\\pi r^2",
    display: false,
  });
  assert(inserted.value === "Area is $\\pi r^2$ exactly", "inline equation inserted at caret");
  assert(inserted.value.slice(inserted.start, inserted.end) === "$\\pi r^2$", "inserted selection covers token");

  const display = applyEquation("beforeafter", {
    start: 6,
    end: 6,
    latex: "x^2",
    display: true,
    padDisplay: true,
  });
  assert(display.value === "before\n$$x^2$$\nafter", "display insertion padded with newlines");

  const noPad = applyEquation("before\n\nafter", {
    start: 7,
    end: 7,
    latex: "x^2",
    display: true,
    padDisplay: true,
  });
  assert(noPad.value === "before\n$$x^2$$\nafter", "existing newlines are not duplicated");

  const updated = applyEquation("Solve $x^2$ now", {
    start: 6,
    end: 11,
    latex: "x^{3}",
    display: false,
  });
  assert(updated.value === "Solve $x^{3}$ now", "existing equation replaced exactly");
  assert(updated.value.slice(updated.start, updated.end) === "$x^{3}$", "replacement selection covers token");

  const blank = applyEquation("unchanged", {
    start: 0,
    end: 0,
    latex: "",
    display: false,
  });
  assert(blank.value === "unchanged", "empty equation leaves source unchanged");
}

console.log(`\nMath equation tests: ${failed === 0 ? "ALL PASSED" : failed + " FAILED"}`);
if (failed > 0) process.exit(1);
