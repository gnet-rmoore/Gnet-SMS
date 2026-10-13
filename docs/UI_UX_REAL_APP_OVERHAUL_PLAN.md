# GNET SPA — UI/UX "Real App" Overhaul Plan

> **Status:** Proposal (2026-10-11)
> **Framing:** Move the SPA from *functional / vibe-coded* to *designed product* — a coherent visual language, complete component states, and intentional information architecture — without a full rebrand.
> **Scope:** `src/` (frontend SPA). Builds on the existing foundations: `src/components/ui` primitives, semantic tokens in `src/index.css` (`--sms-*` + `@theme`), `docs/UI_CONSISTENCY_PLAN.md`, `docs/UI_VISUAL_BASELINES.md`, `docs/RESPONSIVE_UI_PLAN.md`.
> **Non-goals:** New brand identity/palette; a full Storybook migration; rewriting print/report-card templates.
> **Companion:** `docs/UI_CONSISTENCY_PLAN.md`, `docs/RESPONSIVE_UI_PLAN.md`, `docs/DASHBOARD_VISUAL_UNIFICATION_PLAN.md`, `FRONTEND_GUIDELINES.md`

---

## 0. The honest problem

The app *works* but reads as machine-assembled:

| Symptom | Consequence |
| :--- | :--- |
| Class strings invented per feature (before the token/primitive program) | Inconsistent radii, shadows, spacing, type sizes across pages |
| Components missing **states** (hover/focus/active/disabled/loading/empty/error) | Feels unfinished; users can't tell what's interactive |
| Ad-hoc page layouts (no shared header, filters, empty, loading shells) | Every page looks like a different product |
| Placeholder/`text-[10px]` micro-labels, weak hierarchy | Poor skim-ability; looks like a prototype |
| Motion is inconsistent or absent | No sense of responsiveness/polish |
| Weak accessibility (contrast, focus, keyboard) | Exclusion + amateur impression |
| Real-time & long-running flows (exams/monitoring) have no designed states | High-stakes UI looks like a dev tool |

**North star:** a user should never be able to tell which page was built first. Every surface uses the same tokens, the same primitives, the same state vocabulary.

---

## 1. Design principles

1. **One system, no exceptions.** Tokens → primitives → pages. No raw color/size literals on screens (enforced by `test:ui-drift`).
2. **Every element has a state.** Interactive = default/hover/focus/active/disabled/loading. Data = loading/empty/error/partial.
3. **Hierarchy is deliberate.** One `h1` per page, an action cluster, then content. Eyeballs know where to land in <1s.
4. **Calm by default, loud on alert.** Neutral chrome; color reserved for status/action/danger.
5. **Motion with meaning.** 120–200ms ease-out for state; 240–320ms for enter/exit; respect `prefers-reduced-motion`.
6. **Accessible is table stakes.** WCAG 2.2 AA: contrast, 24×24 min targets (44×44 preferred), visible focus, keyboard paths.
7. **Density with breathing room.** Desktop dense-but-airy; mobile thumb-friendly; one spacing scale.

---

## 2. Workstreams

### WS1 — Design foundation (tokens)
- **Color:** finish semantic roles (`--sms-surface`, `--sms-surface-raised`, `--sms-border`, `--sms-text`, `--sms-text-muted`, `--sms-accent`, `--sms-success/warning/danger/info`) and a **dark mode** set. Brand color must theme via a single accent token (school branding already injects `brandColor`).
- **Type scale:** 5–6 steps (display/h1/h2/body/body-sm/caption) with fixed line-heights; kill arbitrary `text-[Npx]`.
- **Spacing & radius:** one scale (4/8/12/16/24/32/48); 3 radii (sm/md/lg) + pill.
- **Elevation:** 3 shadows (flat/raised/overlay) — no one-off `shadow-[...]` strings.
- **Motion tokens:** `--sms-dur-fast/base/slow`, standard easings.
- **Deliverable:** token block in `src/index.css` + `@theme`; documented in `UI_VISUAL_BASELINES.md`.

### WS2 — Component library completeness
Ensure `src/components/ui` covers, with all states + a11y + variants:
- `Button` (primary/secondary/ghost/danger/icon; sizes; loading), `IconButton`
- `Field`/`Input`/`Textarea`/`Select`/`Combobox`/`DatePicker`/`Checkbox`/`Radio`/`Switch` (label, help, error, required)
- `Card`/`Panel`, `SectionHeader`, `PageHeader` (title + subtitle + actions + breadcrumb)
- `Tabs`, `SegmentedControl`, `Badge`/`Chip`/`StatusDot`, `Avatar`
- `Table` (sortable, sticky header, column config, density, row actions, selection/bulk bar, pagination)
- `Modal`/`Drawer`/`ConfirmDialog`, `Tooltip`, `Popover`/`Menu`
- `Toast`/`Banner`/`InlineAlert`, `EmptyState`, `Skeleton`/`LoadingState`, `ErrorState`
- `ProgressBar`, `Stepper`/`Wizard`, `Timeline`
- **Deliverable:** every primitive has a state matrix + keyboard behavior; a minimal `/dev/ui` gallery page for visual review.

### WS3 — Information architecture & navigation
- Sidebar: logical groupings, collapsible sections (already partly in `Layout.tsx`), active-state clarity, `SIDEBAR_NAV_OVERHAUL_PLAN` alignment.
- **Global page header pattern:** breadcrumb → `h1` → subtitle → primary action(s) → (optional) filter bar. Apply to every feature Page.
- **Command palette** (exists: `globalSearch`) — promote it as the primary jump tool; add "create" actions.
- Consistent **backlinks** on detail pages; breadcrumbs on nested routes.

### WS4 — Page templates
Codify 4 templates and migrate toward them:
- **List:** header + filter/saved-views bar + table/cards + empty/loading/error + pagination.
- **Detail:** header + status + tabset + related panels + activity.
- **Form:** grouped sections, inline validation, autosave/draft, unsaved-changes guard, sticky action bar.
- **Dashboard:** KPI tiles + charts + recent activity, unified chart styling.
- **Deliverable:** `src/components/templates/` (or documented conventions) + migrate top ~10 pages first.

### WS5 — Data display & charts
- Unify chart theming (axes, gridlines, tooltips, empty/loading) — see `DASHBOARD_CHART_VISUAL_UNIFICATION_PLAN`.
- Tables: consistent density, numeric alignment, truncation + tooltip, sticky first column on mobile, export.
- Number/date/currency formatting via shared formatters (locale-aware).

### WS6 — Feedback, states, resilience
- Replace blank flashes with **skeleton** loaders matched to layout.
- **Empty states** with an illustration/icon + primary CTA (e.g. "No online exams yet → Create one / Try a sample").
- **Error boundaries** per route + friendly retry; map API errors via `translateApiError`.
- Offline/expired-session handling (401 → re-auth toast), optimistic saves with rollback.

### WS7 — Micro-interactions & motion
- Page enter transitions, list stagger, button press, focus rings, drag feedback.
- **Exam-specific:** countdown urgency states, violation warning (make it a **blocking modal**, not just a banner), submit confirm, auto-submit flourish.
- Honor `prefers-reduced-motion` everywhere.

### WS8 — Accessibility (WCAG 2.2 AA)
- Contrast audit on tokens (light + dark + brand).
- Focus-visible on all interactive elements; logical tab order; focus trap in modals.
- Keyboard for tables/menus/tabs; ARIA for status/loading/errors; skip-to-content.
- Automated a11y assertions (extend `test:ui-primitives`) + manual checklist.
- Ensure exam kiosk warns are announced (live regions).

### WS9 — Responsive & mobile
- Breakpoint audit; ensure tables → cards on small screens; sticky action bars; touch target sizes (44×44).
- Exam: kiosk/authoring/preview must be usable on tablets (common in schools).

### WS10 — Content, i18n & microcopy
- Remove hardcoded strings; enforce `i18n:check` **critical-only → full** over time.
- Microcopy pass: actionable button labels ("Save draft", "Submit for review", "Return with note"), helpful empty/error text, no jargon.
- Locale-aware formatting; RTL spot-check (ar).

### WS11 — Exam / proctor UX (ties to the fixes plan)
- **Authoring:** section-based builder, live preview, autosave, clear draft/submitted/returned status with a timeline.
- **Review:** inline question + PDF preview, side-by-side with the return note; status timeline.
- **Sitting:** intro + consent, calm exam surface, prominent timer, blocking violation modal, resume-safety, auto-save indicator.
- **Proctor Console** (new): live grid, per-student progress, violation feed, screen thumbnails — designed, not a raw table.
- **Preview:** clearly labelled dry-run, exit affordance, result explanation.

---

## 3. Rollout phases

| Phase | Focus | Exit criteria |
| :--- | :--- | :--- |
| **P0 — Foundation** | WS1 tokens + WS2 primitives (states) + `/dev/ui` gallery | Tokens live; primitives pass a11y + drift tests |
| **P1 — Chrome** | WS3 header/nav + WS6 states (loading/empty/error) applied app-wide | Every page uses `PageHeader`; no blank-flash loads |
| **P2 — High-traffic** | Migrate Dashboard, Online Exams, Gradebook, Attendance, Exams, Settings to templates | Top 10 pages visually consistent |
| **P3 — Long tail** | Remaining features migrated; WS5 charts/tables unified | `test:ui-drift` clean across `src/` |
| **P4 — Polish** | WS7 motion + WS8 a11y + WS10 microcopy + WS9 mobile | WCAG 2.2 AA checklist signed off; reduced-motion honored |
| **P5 — Exam/proctor** | WS11 (depends on the fixes plan Phases 3–5) | Proctor Console + exam surfaces feel first-class |

---

## 4. Quality gates

- `npm run lint`, `test:ui-primitives`, `test:ui-drift`, `test:responsive`, `test:i18n`, `i18n:check` green.
- **Visual regression** snapshots for `/dev/ui` + the top 10 pages.
- **A11y:** axe/automated checks + keyboard-only pass + contrast audit.
- **Design review:** every migrated page reviewed against `UI_VISUAL_BASELINES.md` before merge.

## 5. Success metrics

- Zero raw design literals (`text-[Npx]`, one-off `shadow-[...]`) outside the allowlist.
- 100% of primitives expose hover/focus/disabled/loading states.
- Every data page has designed loading/empty/error states.
- Lighthouse a11y ≥ 95 on key routes; no contrast failures.
- Qualitative: "feels like one product" in a blind page-identification test.

## 6. Decisions needed

| ID | Decision | Recommendation |
| :- | :--- | :--- |
| U1 | Adopt dark mode now or later? | Tokens first; ship dark mode behind a flag in P4 |
| U2 | Build `/dev/ui` gallery or adopt Storybook? | Lightweight `/dev/ui` now; Storybook only if design-ops headcount grows |
| U3 | Visual-regression tooling | Playwright screenshots (already have Playwright) |
| U4 | Density model | One comfortable density + optional compact table density |
