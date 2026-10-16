/**
 * Lightweight, dependency-free ranking engine for the global search palette.
 *
 * Design goals:
 * - Deterministic and testable (pure functions, no I/O).
 * - Tolerant matching: diacritics, hyphen/underscore separators, multi-token
 *   queries and a conservative fuzzy (ordered-subsequence) fallback.
 * - Explainable scores: 0 = no match; higher = better (1 = exact).
 */

export type HighlightSegment = { text: string; match: boolean };

export type ScoredField = {
  text: string | null | undefined;
  /** Multiplier applied to this field's score (default 1). */
  weight?: number;
};

/** Lowercase, strip diacritics, unify separators, collapse whitespace. */
export function normalizeSearchText(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalized, non-empty query tokens. */
export function tokenizeQuery(query: string): string[] {
  const normalized = normalizeSearchText(query);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

function scoreSingle(haystack: string, token: string): number {
  if (!token) return 0;
  if (haystack === token) return 1;
  if (haystack.startsWith(token)) return 0.92;

  const idx = haystack.indexOf(token);
  if (idx > 0) {
    // Word-boundary hits ("review" in "grade review") beat mid-word hits.
    return haystack[idx - 1] === " " ? 0.85 : 0.65;
  }

  // Conservative fuzzy fallback: the token's characters appear in order.
  // Only for tokens long enough to be meaningful; scores below substring hits.
  if (token.length >= 3) {
    let ti = 0;
    let last = -1;
    for (let i = 0; i < haystack.length && ti < token.length; i++) {
      if (haystack[i] === token[ti]) {
        last = i;
        ti++;
      }
    }
    if (ti === token.length && last >= 0) {
      const density = token.length / (last + 1);
      if (density >= 0.5) return 0.45 * density;
    }
  }
  return 0;
}

/**
 * Score `haystack` against `query` (0..1).
 * Multi-token queries require every token to match (AND semantics);
 * the average token score is scaled slightly below single-token hits.
 */
export function scoreText(haystack: string, query: string): number {
  const h = normalizeSearchText(haystack);
  const q = normalizeSearchText(query);
  if (!h || !q) return 0;

  const tokens = q.split(" ").filter(Boolean);
  if (tokens.length <= 1) return scoreSingle(h, q);

  let sum = 0;
  for (const token of tokens) {
    const s = scoreSingle(h, token);
    if (!s) return 0;
    sum += s;
  }
  return (sum / tokens.length) * 0.95;
}

/** Best (weighted) score across several candidate fields. */
export function scoreFields(fields: ScoredField[], query: string): number {
  let best = 0;
  for (const field of fields) {
    if (!field.text) continue;
    const s = scoreText(field.text, query) * (field.weight ?? 1);
    if (s > best) best = s;
  }
  return best;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Split `text` into highlighted / non-highlighted segments for rendering.
 * Matches the full query phrase (when present) plus every query token,
 * case-insensitively on the original text.
 */
export function highlightSegments(text: string, query: string): HighlightSegment[] {
  if (!text) return [];
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [{ text, match: false }];

  // Prefer the whole phrase so "grade review" highlights as one run when possible.
  const phrases = new Set<string>();
  const rawPhrase = String(query).trim().replace(/\s+/g, " ");
  if (rawPhrase.length > 1) phrases.add(rawPhrase);
  for (const token of tokenizeQuery(query)) {
    if (token.length > 1) phrases.add(token);
  }
  if (!phrases.size) return [{ text, match: false }];

  const pattern = [...phrases]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const re = new RegExp(pattern, "gi");

  const out: HighlightSegment[] = [];
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (!m[0]) {
      re.lastIndex += 1;
      continue;
    }
    if (m.index > last) out.push({ text: text.slice(last, m.index), match: false });
    out.push({ text: m[0], match: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), match: false });
  return out;
}

/** Stable descending sort of `{ score }`-bearing records. */
export function sortByScoreDesc<T extends { score: number }>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.score - a.item.score || a.index - b.index)
    .map(({ item }) => item);
}
