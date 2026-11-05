/**
 * Plain-text equation helpers for the online-exam authoring surface.
 *
 * The stored grammar is intentionally unchanged (`$...$` / `$$...$$`), so
 * MathLive can be used for authoring while existing questions keep rendering
 * through KaTeX. These helpers never emit HTML.
 */
import { parseRichContentWithRanges, type RichSegmentWithRange } from "./richText";

export type EquationEdit = {
  start: number;
  end: number;
  latex: string;
  display: boolean;
};

export type ApplyEquationInput = {
  start: number;
  end: number;
  latex: string;
  display: boolean;
  /** Add surrounding newlines when inserting a new display equation. */
  padDisplay?: boolean;
};

export type ApplyEquationResult = {
  value: string;
  start: number;
  end: number;
};

const WRAPPERS = [
  { open: "$$", close: "$$", display: true },
  { open: "\\[", close: "\\]", display: true },
  { open: "$", close: "$", display: false },
  { open: "\\(", close: "\\)", display: false },
] as const;

/** Remove one or more equation delimiter pairs from a raw LaTeX source. */
export function normalizeEquationLatex(raw: unknown): string {
  let latex = String(raw ?? "").replace(/\r\n?/g, "\n").trim();
  let changed = true;

  while (changed && latex) {
    changed = false;
    for (const wrapper of WRAPPERS) {
      if (
        latex.length >= wrapper.open.length + wrapper.close.length &&
        latex.startsWith(wrapper.open) &&
        latex.endsWith(wrapper.close)
      ) {
        latex = latex
          .slice(wrapper.open.length, latex.length - wrapper.close.length)
          .trim();
        changed = true;
        break;
      }
    }
  }

  return latex;
}

/** Format normalized LaTeX using the existing question grammar. */
export function formatEquation(latex: string, display: boolean): string {
  const source = normalizeEquationLatex(latex);
  if (!source) return "";
  const delimiter = display ? "$$" : "$";
  return `${delimiter}${source}${delimiter}`;
}

function toEdit(segment: Extract<RichSegmentWithRange, { type: "math" }>): EquationEdit {
  return {
    start: segment.start,
    end: segment.end,
    latex: segment.value,
    display: segment.display,
  };
}

/**
 * Find the equation under a caret or selection. Offsets refer to the plain
 * textarea source, including the delimiters.
 */
export function findMathExpressionAt(
  input: string,
  selectionStart: number,
  selectionEnd = selectionStart
): EquationEdit | null {
  const source = String(input ?? "");
  const start = Math.max(0, Math.min(selectionStart, source.length));
  const end = Math.max(start, Math.min(selectionEnd, source.length));
  const math = parseRichContentWithRanges(source).filter(
    (segment): segment is Extract<RichSegmentWithRange, { type: "math" }> =>
      segment.type === "math"
  );

  if (end > start) {
    const overlap = math.find((segment) => segment.start < end && segment.end > start);
    return overlap ? toEdit(overlap) : null;
  }

  const inside = math.find((segment) => start > segment.start && start < segment.end);
  if (inside) return toEdit(inside);

  // A caret immediately after an equation is the common edit position.
  const after = math.find((segment) => start === segment.end);
  if (after) return toEdit(after);

  const before = math.find((segment) => start === segment.start);
  return before ? toEdit(before) : null;
}

/** Replace a range with a formatted equation and return the adjusted selection. */
export function applyEquation(
  input: string,
  edit: ApplyEquationInput
): ApplyEquationResult {
  const source = String(input ?? "");
  const start = Math.max(0, Math.min(edit.start, source.length));
  const end = Math.max(start, Math.min(edit.end, source.length));
  const token = formatEquation(edit.latex, edit.display);

  if (!token) {
    return { value: source, start, end };
  }

  let prefix = "";
  let suffix = "";
  if (edit.padDisplay && edit.display) {
    if (start > 0 && source[start - 1] !== "\n") prefix = "\n";
    if (end < source.length && source[end] !== "\n") suffix = "\n";
  }

  const inserted = `${prefix}${token}${suffix}`;
  const tokenStart = start + prefix.length;
  return {
    value: source.slice(0, start) + inserted + source.slice(end),
    start: tokenStart,
    end: tokenStart + token.length,
  };
}
