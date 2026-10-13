# UI Density Consistency — Implementation Plan

> **Status:** Phases 0–5 complete (2026-07-24); Waves A–D migrated  
> **Framing:** **UI density consistency program** — not a full brand / design-ops system  
> **Scope:** Unify interactive sizing (type, buttons, fields, cards, shells) via **semantic tokens → primitives → migration waves**  
> **Non-goals:** New palette; full Storybook/Chromatic; forcing print templates to screen density; multi-platform token export (future)  
> **Companion:** `FRONTEND_GUIDELINES.md`, `.cursor/skills/sms-ui-consistency/`, `IMPLEMENTATION_STATUS.md`, `docs/UI_VISUAL_BASELINES.md`, **responsive program:** `docs/RESPONSIVE_UI_PLAN.md`  
> **Owners:** Frontend eng (implementation) · Product (priority of waves) · Default reviewer: whoever merges SPA PRs until a named design owner exists  

---

## 0. Problem (honest)

Executive Slate existed on paper and newer pages; legacy denser chrome remained on many School ops / Super Admin / registrar surfaces.

### Audit snapshot (2026-07-24, pre-migration)

| Signal | Evidence |
| :--- | :--- |
| Large card radius | ~40% still `rounded-3xl` vs `rounded-[32px]` |
| Elevation | ~half still `shadow-sm` vs project shadow |
| Micro labels | ~582 `text-[10px]` (~128 files) |
| Canonical `h1` / primary CTA | Rare vs compact `px-4 py-2` |
| Root cause | No shared primitives; class strings invented per feature |

### Post-migration (Phases 2–4)

| Signal | Result |
| :--- | :--- |
| `rounded-3xl` / card `shadow-sm` / screen `text-[10px]` | **0** outside print/template allowlist (`test:ui-drift`) |
| Wave pages | Super Admin, Security, ops hubs + stubs, Registrar, schedules/gradebook/attendance use `src/components/ui` |

---

## 1. Critique amendments (applied)

| Gap | Amendment |
| :--- | :--- |
| Class strings as source of truth | **Semantic CSS variables** in `src/index.css` (`--sms-*`) + `@theme`; primitives consume tokens |
| No a11y | **WCAG 2.2 AA checklist** (§2.6); min target **24×24** (AA), prefer **44×44** touch; focus rings on `Button`/`Field` |
| One density only | Default **comfortable**; **`compact`** on `Button` / `Field` for tables/toolbars only |
| Weak governance | Named owners; **deprecation** of legacy recipes; drift script + CI |
| Eng counts only | Drift counters **plus** axe/visual baseline list (`UI_VISUAL_BASELINES.md`) |
| Overclaim “brand guide” | This doc = **density consistency**, not voice/logo/photography |

---

## 2. Architecture: tokens → components → pages

```text
CSS variables (--sms-*)     ← source of truth for scale
        ↓
src/components/ui/*         ← Button, Field, Surface, PageShell…
        ↓
Feature pages / PageSkeleton / StubFeaturePage / FeatureModalShell
```

### 2.1–2.7

Unchanged contracts: see Phase 1 sections in git history / `FRONTEND_GUIDELINES.md` § Control density. Summary:

- Type: page title extrabold; meta `text-xs` + `slate-500`; no new screen `text-[10px]`
- Buttons: primary `px-6 py-3` / min ~44px; `compact` ≥24px for tables
- Fields: labelled + `aria-describedby` via `Field` / `TextField`
- Surfaces: `rounded-[32px]` + project shadow

---

## 3. Primitives (`src/components/ui`)

| Export | Purpose |
| :--- | :--- |
| `PageShell` | `max-w-6xl` / `wide` → `max-w-7xl` |
| `PageHeader` | Title + subtitle + actions |
| `Surface` | primary / nested / empty / banner |
| `StatTile` | Stat recipe |
| `Button` | variant + `size: default \| compact \| icon` + loading |
| `Field` / `TextField` / … | label + control + hint/error + density |
| `SectionTitle` | Section heading |

**Adoption:** New and migrated UI imports from `src/components/ui`.  

**Allowlist** (print / micro): `*Template*`, `*ReportCard*`, `*GradeSheet*`, `lessonPlanPdf`, `schedulePdf`.

---

## 4. Phases

| Phase | Deliverable | Status |
| :--- | :--- | :--- |
| **0 — Freeze + amend** | Plan; guidelines density + a11y | **Done** |
| **1 — Tokens + primitives** | `--sms-*`, `src/components/ui/*`, PageSkeleton, drift script, skill | **Done** |
| **2 — Safe mechanical pass** | Card recipe codemod (`rounded-3xl` → `[32px]`, `shadow-sm` → project shadow) | **Done** |
| **3 — Cluster migrations** | Waves A–D | **Done** |
| **4 — Control sweep** | Screen `text-[10px]` → `text-xs`; primary CTA padding; stub chrome | **Done** |
| **5 — Guardrails + visual** | CI `test:ui-primitives` + `test:ui-drift` in deploy workflow; visual/axe stubs | **Done** |

### Wave order (Phase 3) — completed

| Wave | Paths | Outcome |
| :--- | :--- | :--- |
| A | Super Admin + Security | `PageShell` / `PageHeader` / `Button` / `Surface` / `StatTile` |
| B | School ops clones + Facilities Hub | Live Inventory/Procurement/Transportation + Maintenance/WorkOrders chrome; other ops via `StubFeaturePage` primitives |
| C | Registrar | Chrome + tabs/modals on `Button` / `Surface` / `PageShell` |
| D | Dense academic tables | `PageShell width="wide"` + compact controls on schedules, gradebook, attendance |

---

## 5. Ownership & process

| Role | Responsibility |
| :--- | :--- |
| **Implementer** | Use `ui/` primitives; run `npm run test:ui-drift` before SPA PRs that add screens |
| **Reviewer** | Reject new legacy card recipes / `text-[10px]` on screens |
| **CI** | `.github/workflows/deploy.yml` runs primitives + drift on PRs/pushes |

Contribution: need a new control variant → add to `Button`/`Field` with token, document in skill reference — do not one-off class strings on a page.

---

## 6. Acceptance

- [x] Semantic `--sms-*` tokens in `src/index.css`  
- [x] `src/components/ui` exports Shell, Header, Surface, StatTile, Button, Field, SectionTitle  
- [x] `Button`/`Field` support `compact`; a11y focus + Field labelling  
- [x] `PageSkeleton` + `StubFeaturePage` use canonical radii/shadows / primitives  
- [x] `npm run test:ui-drift` + `npm run test:ui-primitives` (baselines **0** outside allowlist)  
- [x] Skill / guidelines updated  
- [x] Waves A–D migrated  
- [x] CI wired for UI density tests  

---

## 7. Verification

```bash
npm run test:ui-primitives
npm run test:ui-drift
docker compose up --build -d frontend-spa
```

**Manual:** Attendance / Super Admin Schools / Registrar — titles, buttons, cards share density.

**Axe / visual:** `docs/UI_VISUAL_BASELINES.md`.

---

## 8. Change log

### 2026-07-24 — Initial plan

- Documented audit + primitive-first remediation.

### 2026-07-24 — Best-practice amendments + Phase 1 foundation

- Tokens, a11y checklist, compact density, owners/deprecation, primitives + PageSkeleton + drift/primitive tests.

### 2026-07-24 — Phases 2–5 + Waves A–D

- **Change:** Mechanical card/label codemod; Super Admin/Security/Registrar/academic/ops hubs on `ui` primitives; stub ops pages on `StubFeaturePage`; CI density tests; drift baselines zeroed.  
- **Services:** frontend-spa  
- **Status:** Complete  
- **Verify:** `npm run test:ui-primitives && npm run test:ui-drift`
