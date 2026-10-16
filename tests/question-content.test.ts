/**
 * Rich question content parser (math + image tokens).
 * Imports the REAL shared lib so authoring, import, and rendering agree.
 * Run: npm run test:question-content
 */
import {
  hasRichContent,
  isSafeImageUrl,
  parseRichContent,
  richTextToPlain,
  type RichSegment,
} from "../src/features/online-exam/richText.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed += 1;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

function types(segs: RichSegment[]): string {
  return segs.map((s) => s.type).join(",");
}

console.log("=========================================");
console.log(" RICH QUESTION CONTENT TESTS");
console.log("=========================================\n");

// Plain text passes through untouched.
{
  const segs = parseRichContent("The capital of France is Paris.");
  assert(types(segs) === "text", "plain text yields a single text segment");
  assert(segs[0].type === "text" && segs[0].value === "The capital of France is Paris.", "text preserved");
}

// Inline math with $...$
{
  const segs = parseRichContent("Area is $\\pi r^2$ exactly");
  assert(types(segs) === "text,math,text", "$...$ splits into text/math/text");
  const math = segs.find((s) => s.type === "math") as Extract<RichSegment, { type: "math" }>;
  assert(math?.value === "\\pi r^2", "inline math keeps the LaTeX");
  assert(math?.display === false, "inline math is not display mode");
}

// Display math with $$...$$
{
  const segs = parseRichContent("$$\\int_0^1 x\\,dx$$");
  assert(types(segs) === "math", "$$...$$ is a single math segment");
  const math = segs[0] as Extract<RichSegment, { type: "math" }>;
  assert(math.display === true, "$$...$$ is display mode");
}

// Backslash delimiters \( \) and \[ \]
{
  const inline = parseRichContent("\\(x+1\\)");
  assert(inline[0].type === "math", "\\(...\\) is inline math");
  const display = parseRichContent("\\[x+1\\]");
  assert(display[0].type === "math" && (display[0] as any).display === true, "\\[...\\] is display math");
}

// Currency must NOT be treated as math.
{
  const segs = parseRichContent("I paid $5 and then $10 for it");
  assert(types(segs) === "text", "currency dollar signs are not math");
}

// Empty / whitespace math must not match.
{
  const segs = parseRichContent("$ $ not math");
  assert(!segs.some((s) => s.type === "math"), "whitespace-only $ $ is not math");
}

// Escaped dollar renders literally.
{
  const segs = parseRichContent("Only \\$5 please");
  assert(segs[0].type === "text" && segs[0].value === "Only $5 please", "\\$ becomes a literal dollar");
}

// Safe images.
{
  const segs = parseRichContent("![diagram](https://example.com/a.png)");
  assert(types(segs) === "image", "https image token parses");
  const img = segs[0] as Extract<RichSegment, { type: "image" }>;
  assert(img.alt === "diagram" && img.src === "https://example.com/a.png", "image src/alt kept");
}

// Unsafe image is left as plain text (never rendered).
{
  const segs = parseRichContent("![x](javascript:alert(1))");
  assert(!segs.some((s) => s.type === "image"), "javascript: image is rejected");
  assert(types(segs) === "text", "unsafe image falls back to text");
}

// URL safety helper.
{
  assert(isSafeImageUrl("https://a.example/b.png"), "https allowed");
  assert(isSafeImageUrl("http://a.example/b.png"), "http allowed");
  assert(isSafeImageUrl("data:image/png;base64,iVBORw0KGgo="), "png data URL allowed");
  assert(!isSafeImageUrl("data:text/html;base64,PHNjcmlwdD4="), "html data URL blocked");
  assert(!isSafeImageUrl("javascript:alert(1)"), "javascript: blocked");
  assert(!isSafeImageUrl("vbscript:msgbox(1)"), "vbscript: blocked");
  assert(!isSafeImageUrl(""), "empty URL blocked");
}

// Plain-text projection + detection.
{
  assert(richTextToPlain("Solve $x^2$ now") === "Solve x^2 now", "richTextToPlain strips math delimiters");
  assert(richTextToPlain("![d](https://a.example/b.png)") === "[d]", "richTextToPlain marks images");
  assert(hasRichContent("$x$") === true, "hasRichContent detects math");
  assert(hasRichContent("plain") === false, "hasRichContent false for plain text");
}

console.log(`\nRich content tests: ${failed === 0 ? "ALL PASSED" : failed + " FAILED"}`);
if (failed > 0) process.exit(1);
