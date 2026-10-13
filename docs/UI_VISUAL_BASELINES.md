# UI visual & a11y baselines

> Companion to [`UI_CONSISTENCY_PLAN.md`](./UI_CONSISTENCY_PLAN.md).  
> **Status:** Routes listed for manual axe / Playwright persona smoke (`e2e/`, nightly). CI runs density unit guards (`test:ui-primitives`, `test:ui-drift`) plus SPA route matrix (`test:spa`). Chromatic not required.

## Routes to snapshot (comfortable / wide density)

| Route | Role | Notes |
| :--- | :--- | :--- |
| `/{slug}/dashboard` | SchoolAdmin | Header + stats + panels |
| `/{slug}/attendance` | Teacher / Admin | `PageShell wide` baseline |
| `/{slug}/gradebook` | Teacher | Dense table + compact controls |
| `/{slug}/schedules` | Admin | Wide shell + timetable grid |
| `/{slug}/my-schedule` | Teacher | Read-only wide schedule |
| `/{slug}/registrar` | Registrar | Wave C chrome + tabs |
| `/{slug}/security` | Security / Admin | Wave A command hub |
| `/{slug}/maintenance` | Ops | Facilities Hub banner + Buttons |
| `/{slug}/cafeteria` (stub) | Ops | `StubFeaturePage` empty state |
| `/super-admin` | SuperAdmin | System Overview |
| `/super-admin/schools` | SuperAdmin | Wave A schools table |

## Axe checks (manual until screenshot CI)

On each route after deploy:

1. Keyboard tab through primary CTA + first form field — visible focus ring  
2. axe DevTools: no serious/critical on page chrome  
3. Zoom 200% — layout remains usable (no clipped primary actions)
4. **Canvas vs surface:** white cards/forms clearly separate from `bg-slate-100` page backing (see `docs/CANVAS_SURFACE_CONTRAST_PLAN.md`)

## CI today

```bash
npm run test:ui-primitives
npm run test:ui-drift
npm run test:responsive
npm run test:spa
# Nightly / local with compose SPA:
# E2E_ENABLED=1 npm run test:e2e
```

PR: `.github/workflows/deploy.yml`. Nightly Playwright: `.github/workflows/nightly-tests.yml`. See `docs/TEST_COVERAGE_PLAN.md`.

## Mobile / narrow viewport (≤390px)

Per `docs/RESPONSIVE_UI_PLAN.md`:

1. Sidebar is an **overlay drawer** (closed by default below `lg`) — content uses full width  
2. No **page-level** horizontal scroll on dashboard / fees (inner table scroll OK)  
3. Gradebook / schedules: swipe tip (`MatrixScrollHint`) + intentional matrix scroll  
4. Print/report-card paper layouts may scroll — do not treat as density failures  

## How to add visual CI later

```bash
# Suggested screenshots / Chromatic (not required)
# npx playwright test --project=ui-a11y
# npx chromatic --project-token=…
```
