# Landing dark hero

**Status:** Done — dark hero band shipped; verify visually on `/`  
**Owning:** `frontend-spa` (`src/features/landing`)  
**Scope:** Public `/` hero only — not full-site dark mode.

## Goal

Dark slate opening band for the TrustLine-style hero so brand + headline + CTAs land harder, while keeping below-fold sections light.

## Key files

- `src/features/landing/components/Hero.tsx`
- `src/features/landing/components/HeroOrbitCards.tsx`
- `src/features/landing/components/LandingNav.tsx` (home, unscrolled → on-dark treatment)
- `src/features/landing/components/Reveal.tsx` (hero secondary CTA uses existing `outline`)
- `src/index.css` (dark hero grid)
- `src/features/landing/components/skeletons.tsx` (hero skeleton tones)

## Phases

1. Dark hero surface + light type hierarchy + CTA pairing (primary blue / outline on dark).
2. Retune orbit cards + dotted connectors for contrast on slate-950.
3. Scroll-aware nav: transparent/dark-friendly over hero; current light pill after scroll / on `/modules` `/pricing`.
4. Rebuild `frontend-spa`; visual smoke on `/`.

## Acceptance

- [x] First viewport reads dark slate + light copy; brand still hero-level.
- [x] Orbit cards readable; no purple glow / neon.
- [x] Nav readable on dark hero and after scroll into light sections.
- [x] Clean edge into light `HeroImageGrid`; rest of landing unchanged.

## Docs

Marketing-only visual; no business-rule doc beyond this plan.
