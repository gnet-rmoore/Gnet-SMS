/**
 * Rich question content parser (shared, pure, XSS-safe by construction).
 *
 * Question prompts and choice texts are stored as *plain text* that may embed:
 *   - inline math   $...$        or  \(...\)
 *   - display math  $$...$$      or  \[...\]
 *   - images        ![alt](url)   (http(s) or data:image/*)
 *
 * Nothing here produces HTML from user input; `RichContent.tsx` turns these
 * segments into React nodes (text is escaped by React, math is rendered by
 * KaTeX with `trust: false`). That keeps authors safe from XSS without a
 * server-side HTML sanitiser.
 *
 * A literal dollar sign is written as `\$`.
 */

export type RichSegment =
  | { type: "text"; value: string }
  | { type: "math"; value: string; display: boolean }
  | { type: "image"; alt: string; src: string };

/** Max characters allowed for a single question prompt (allows inline drawings). */
export const MAX_RICH_PROMPT_LENGTH = 120000;
/** Max characters allowed for a single choice text / expected answer. */
export const MAX_RICH_CHOICE_LENGTH = 40000;

const DATA_IMAGE_RE = /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i;
const HTTP_IMAGE_RE = /^https?:\/\/[^\s]+$/i;

/** True when an image `src` is safe to place in an `<img>` tag. */
export function isSafeImageUrl(raw: string): boolean {
  const url = String(raw || "").trim();
  if (!url) return false;
  // Block control characters and whitespace that can smuggle schemes.
  if (/[\u0000-\u001f\u007f]/.test(url)) return false;
  if (DATA_IMAGE_RE.test(url)) return true;
  if (!HTTP_IMAGE_RE.test(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function findUnescaped(haystack: string, needle: string, from: number): number {
  let idx = haystack.indexOf(needle, from);
  while (idx !== -1) {
    let backslashes = 0;
    for (let i = idx - 1; i >= 0 && haystack[i] === "\\"; i--) backslashes++;
    if (backslashes % 2 === 0) return idx;
    idx = haystack.indexOf(needle, idx + 1);
  }
  return -1;
}

/**
 * Rule for `$...$` (mirrors Pandoc): the opening `$` must be followed by a
 * non-space, the closing `$` must be preceded by a non-space, and inline math
 * may not span a blank line. This avoids treating currency like "$5 and $10"
 * as math.
 */
function matchInlineDollar(src: string, i: number): { value: string; end: number } | null {
  if (src[i] !== "$") return null;
  if (src[i + 1] === "$") return null; // handled as display math
  const next = src[i + 1];
  if (next === undefined || /\s/.test(next)) return null;
  let j = i + 1;
  while (j < src.length) {
    if (src[j] === "\n" && src[j + 1] === "\n") return null;
    if (src[j] === "$" && src[j - 1] !== "\\") {
      const prev = src[j - 1];
      if (prev !== undefined && !/\s/.test(prev)) {
        return { value: src.slice(i + 1, j), end: j + 1 };
      }
      return null;
    }
    j++;
  }
  return null;
}

function matchDelimited(
  src: string,
  i: number,
  open: string,
  close: string
): { value: string; end: number } | null {
  if (!src.startsWith(open, i)) return null;
  const closeIdx = findUnescaped(src, close, i + open.length);
  if (closeIdx === -1) return null;
  return { value: src.slice(i + open.length, closeIdx), end: closeIdx + close.length };
}

function matchImage(src: string, i: number): { alt: string; src: string; end: number } | null {
  if (!src.startsWith("![", i)) return null;
  const altEnd = src.indexOf("]", i + 2);
  if (altEnd === -1) return null;
  if (src[altEnd + 1] !== "(") return null;
  const urlEnd = src.indexOf(")", altEnd + 2);
  if (urlEnd === -1) return null;
  const url = src.slice(altEnd + 2, urlEnd).trim();
  if (!isSafeImageUrl(url)) return null;
  return { alt: src.slice(i + 2, altEnd), src: url, end: urlEnd + 1 };
}

/** Split rich text into ordered segments. Never throws. */
export function parseRichContent(input: string): RichSegment[] {
  const src = String(input ?? "");
  const segments: RichSegment[] = [];
  let buffer = "";
  let i = 0;

  const flush = () => {
    if (buffer) {
      segments.push({ type: "text", value: buffer });
      buffer = "";
    }
  };

  while (i < src.length) {
    // Escaped dollar sign -> literal.
    if (src[i] === "\\" && src[i + 1] === "$") {
      buffer += "$";
      i += 2;
      continue;
    }

    if (src[i] === "$") {
      if (src[i + 1] === "$") {
        const m = matchDelimited(src, i, "$$", "$$");
        if (m) {
          flush();
          segments.push({ type: "math", value: m.value, display: true });
          i = m.end;
          continue;
        }
      } else {
        const m = matchInlineDollar(src, i);
        if (m && m.value.trim()) {
          flush();
          segments.push({ type: "math", value: m.value, display: false });
          i = m.end;
          continue;
        }
      }
    }

    if (src[i] === "\\") {
      const disp = matchDelimited(src, i, "\\[", "\\]");
      if (disp) {
        flush();
        segments.push({ type: "math", value: disp.value, display: true });
        i = disp.end;
        continue;
      }
      const inl = matchDelimited(src, i, "\\(", "\\)");
      if (inl) {
        flush();
        segments.push({ type: "math", value: inl.value, display: false });
        i = inl.end;
        continue;
      }
    }

    if (src[i] === "!") {
      const img = matchImage(src, i);
      if (img) {
        flush();
        segments.push({ type: "image", alt: img.alt, src: img.src });
        i = img.end;
        continue;
      }
    }

    buffer += src[i];
    i += 1;
  }

  flush();
  return segments;
}

/** Plain-text projection (for previews, list snippets, accessibility). */
export function richTextToPlain(input: string): string {
  return parseRichContent(input)
    .map((seg) => {
      if (seg.type === "text") return seg.value;
      if (seg.type === "image") return seg.alt ? `[${seg.alt}]` : "[image]";
      return ` ${seg.value.replace(/\s+/g, " ").trim()} `;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** Whether a string contains any math or image token. */
export function hasRichContent(input: string): boolean {
  return parseRichContent(input).some((seg) => seg.type !== "text");
}
