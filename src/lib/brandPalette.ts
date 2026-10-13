/**
 * Derive a full action-color palette from a single school brand hex
 * and apply it as CSS variables on :root so Tailwind indigo-* utilities recolor.
 *
 * Platform default (login, public pages, Super Admin) is modern blue.
 * School brandColor only remaps the palette after a school user is logged in.
 */

const BRAND_VAR_KEYS = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
] as const;

export type BrandShade = (typeof BRAND_VAR_KEYS)[number];

type Rgb = { r: number; g: number; b: number };

/** Platform action color — modern blue (Tailwind blue-600). */
export const APP_BRAND_DEFAULT = "#2563eb";

/** @deprecated Prefer APP_BRAND_DEFAULT — kept for older imports. */
const DEFAULT_BRAND = APP_BRAND_DEFAULT;

export function normalizeBrandHex(input?: string | null): string | null {
  if (!input || typeof input !== "string") return null;
  let h = input.trim();
  if (!h) return null;
  if (h.startsWith("#")) h = h.slice(1);
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return `#${h.toLowerCase()}`;
}

function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Mix toward white (t→1) or black (t→1 with black). */
function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };

/**
 * Build Tailwind-like shade steps from a mid brand (maps to 600).
 * Soft tints → white; deep shades → black.
 */
export function brandPaletteFromHex(brandHex: string): Record<BrandShade, string> {
  const base = hexToRgb(normalizeBrandHex(brandHex) || DEFAULT_BRAND);
  return {
    50: rgbToHex(mix(base, WHITE, 0.92)),
    100: rgbToHex(mix(base, WHITE, 0.85)),
    200: rgbToHex(mix(base, WHITE, 0.7)),
    300: rgbToHex(mix(base, WHITE, 0.5)),
    400: rgbToHex(mix(base, WHITE, 0.28)),
    500: rgbToHex(mix(base, WHITE, 0.12)),
    600: rgbToHex(base),
    700: rgbToHex(mix(base, BLACK, 0.18)),
    800: rgbToHex(mix(base, BLACK, 0.32)),
    900: rgbToHex(mix(base, BLACK, 0.48)),
    950: rgbToHex(mix(base, BLACK, 0.62)),
  };
}

export function brandCssCustomProperties(
  brandHex?: string | null
): Record<string, string> | null {
  const hex = normalizeBrandHex(brandHex);
  if (!hex) return null;
  const palette = brandPaletteFromHex(hex);
  const props: Record<string, string> = {
    "--school-brand": palette["600"],
  };
  for (const shade of BRAND_VAR_KEYS) {
    props[`--school-brand-${shade}`] = palette[shade];
  }
  return props;
}

/** Apply or clear school brand variables on documentElement. */
export function applySchoolBrandToDocument(brandHex?: string | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const props = brandCssCustomProperties(brandHex);
  if (!props) {
    root.style.removeProperty("--school-brand");
    for (const shade of BRAND_VAR_KEYS) {
      root.style.removeProperty(`--school-brand-${shade}`);
    }
    root.removeAttribute("data-school-brand");
    return;
  }
  for (const [key, value] of Object.entries(props)) {
    root.style.setProperty(key, value);
  }
  root.setAttribute("data-school-brand", props["--school-brand"]);
}
