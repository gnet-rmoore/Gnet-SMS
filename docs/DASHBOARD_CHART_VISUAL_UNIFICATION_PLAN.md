# Dashboard charts visual unification — Implementation plan

> **Status:** Done (2026-08-07)  
> **Goal:** Make every **school-role** dashboard chart match the visual style of the Finance (`AccountantDashboard`) charts — **CSS/layout/chart chrome only**; no data, API, or series logic changes.  
> **Companion:** [`DASHBOARD_VISUAL_UNIFICATION_PLAN.md`](./DASHBOARD_VISUAL_UNIFICATION_PLAN.md) (KPI/layout — done), `src/features/dashboard/components/charts/`

---

## 1. Problem

Dashboard **layouts** were unified (hero KPIs, cards, link tiles). Chart **widgets** inside those layouts still diverge:

| Area | Finance (reference) | Other dashboards |
| :--- | :--- | :--- |
| Featured row | `lg:grid-cols-3` — wide **AreaChart** (2 cols) + **donut** (1 col), `h-72` | No featured row; all charts same size in a flat grid |
| Chart height | Featured `h-72`; secondary grid uses `h-56` via `SimpleCharts` | Uniform `h-56` everywhere |
| Area / trend | Gradient-filled `AreaChart`, legend, `borderRadius: 16px` tooltip | `SimpleLineChart` — plain line, no fill |
| Donut / pie | `innerRadius 55` / `outerRadius 75`, center total overlay, category badge footer | `SimplePieChart` — smaller donut (`52/78`), center label optional, no footer legend |
| Chart card header | Title + hint + optional **badge pill** (`bg-indigo-50`, uppercase) | Title + hint only |
| Bar charts | Horizontal bars in Finance secondary grid; semantic fills from data | Same component but mixed vertical/horizontal per dashboard |
| Teacher layout | — | Custom `lg:grid-cols-2` (4 charts) instead of Finance 3-col rhythm |
| Empty state | Dashed border inside chart well (`rounded-2xl`, `text-slate-400`) | Shared `DashboardChartEmpty` — close but shorter well |
| Inline Recharts | Finance embeds `AreaChart` + custom `PieChart` directly in `AccountantDashboard.tsx` | All others use `SimpleCharts.tsx` wrappers |

**Root cause:** Finance chart polish lives in **one-off JSX** inside `AccountantDashboard.tsx`, while every other role uses generic `SimpleBarChart` / `SimplePieChart` / `SimpleLineChart` with smaller defaults.

---

## 2. Scope

### In scope

- Shared chart primitives under `src/features/dashboard/components/charts/`
- `DashboardChartCard` enhancements (badge slot, optional `size` / height token)
- Refactor Finance inline charts into shared components (no visual regression)
- Migrate chart sections in:
  - `AccountantDashboard.tsx`
  - `LeadershipDashboard.tsx`
  - `TeacherDashboard.tsx`
  - `StudentDashboard.tsx`
  - `ParentDashboard.tsx`
  - `SpecialtyDashboardCharts.tsx`
  - `DefaultRoleDashboard.tsx`

### Out of scope

- **Super Admin** charts (`SuperAdminDashboardCharts.tsx`) — separate shell; Phase 2 optional
- **`chartAggregates.ts`** — no new metrics, buckets, or fill logic unless purely cosmetic constants move to chart layer
- **New chart types or API calls** — e.g. no inventing cash-flow AreaChart for Teacher
- **i18n** — reuse existing title/hint/empty keys

---

## 3. Finance chart reference anatomy

From `AccountantDashboard.tsx`:

```
┌─ Featured row (lg:grid-cols-3) ─────────────────────────────────────┐
│ [ AreaChart 2/3 ]          │ [ Donut 1/3 + center total + footer ] │
│  h-72, gradient fills      │  h-44 chart + badge legend grid        │
│  Legend, 16px tooltip      │  innerR 55 / outerR 75                 │
└────────────────────────────┴─────────────────────────────────────────┘
┌─ Secondary grid (DashboardChartsGrid, 3-col) ───────────────────────┐
│ [ H-bar pending ] │ [ Line/area surplus — lg:col-span-2 ]           │
│  h-56             │  h-56, mono valueFormatter                      │
└───────────────────┴─────────────────────────────────────────────────┘
```

**Shared visual tokens to extract:**

| Token | Value |
| :--- | :--- |
| Grid stroke | `#f1f5f9`, `strokeDasharray="3 3"` |
| Axis stroke | `#94a3b8`, `fontSize={10}` |
| Tooltip (featured) | `borderRadius: 16px`, `border: 1px solid #e2e8f0`, `fontSize: 12px` |
| Tooltip (compact) | existing `DASHBOARD_CHART_TOOLTIP` (12px) — keep for grid cells |
| Empty well | `rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400` |
| Featured height | `h-72` (`288px`) |
| Grid chart height | `h-56` (`224px`) — unchanged for dense 3-col grid |
| Donut (featured) | `innerRadius={55}`, `outerRadius={75}`, `paddingAngle={3}` |
| Donut (grid) | `innerRadius={52}`, `outerRadius={78}` — or unify to featured size when `size="featured"` |
| Center overlay label | `text-xs font-bold uppercase tracking-wider text-slate-500` |
| Center overlay value | `text-sm font-extrabold text-slate-800 font-mono` |
| Header badge | `inline-flex … bg-indigo-50 text-indigo-700 … text-xs uppercase tracking-wider` |

---

## 4. Implementation phases

### Phase A — Chart design tokens + `DashboardChartCard` upgrade

**Files:** `charts/chartTokens.ts` (new), `charts/DashboardChartCard.tsx`

- Export `DASHBOARD_CHART_HEIGHT`, `DASHBOARD_CHART_HEIGHT_FEATURED`, grid/axis/tooltip constants
- Add optional `badge?: ReactNode` prop to `DashboardChartCard` (Finance cash-flow pill)
- Add optional `size?: "grid" | "featured"` to control default child chart height via context or className passthrough
- Align `DashboardChartCard` shell with `DASHBOARD_CARD` from `dashboardUi.tsx` (same border/shadow — may import constant)

**Acceptance:** Finance cash-flow header badge renderable via prop; no dashboard migrations yet.

---

### Phase B — Extract Finance chart widgets into shared components

**New file:** `charts/FinanceChartWidgets.tsx` (or split: `DashboardAreaChart.tsx`, `DashboardDonutChart.tsx`)

| Component | Extracted from Finance | Notes |
| :--- | :--- | :--- |
| `DashboardAreaChart` | Cash-flow `AreaChart` | Props: `data`, `series[]` (key, color, gradientId), `emptyMessage`, `height` |
| `DashboardDonutChart` | Expense mix pie | Props: `data`, `centerLabel`, `centerValue`, `footerItems[]` (badge + mono value), `emptyMessage` |
| `DashboardSurplusLineChart` | Monthly surplus line | Wrap/enhance `SimpleLineChart` with optional soft gradient fill under line (Finance-like) |

**Refactor:** `AccountantDashboard.tsx` to use extracted widgets — **pixel-parity** check on Finance home.

**Acceptance:** No inline `ResponsiveContainer` / `AreaChart` left in Accountant dashboard file (except if truly unique).

---

### Phase C — Upgrade `SimpleCharts.tsx` to Finance defaults

**File:** `charts/SimpleCharts.tsx`

Enhance existing exports (backward-compatible props):

| Component | Visual upgrades |
| :--- | :--- |
| `SimpleBarChart` | Support `size="featured" \| "grid"` height; consistent horizontal bar `radius={[0, 6, 6, 0]}` for horizontal layout; default fills unchanged from `ChartDatum.fill` |
| `SimplePieChart` | `size` prop → featured vs grid radii; always support `centerLabel` / `centerValue`; optional `footer?: ReactNode` for badge legend row |
| `SimpleLineChart` | Optional `showAreaFill?: boolean` with soft gradient (surplus style); `size` height prop |

**Do not change:** data shapes, formatters, empty-message behavior, chart aggregation.

**Acceptance:** Existing call sites render correctly with defaults; featured size opt-in available.

---

### Phase D — Featured chart row pattern (where data allows)

Introduce layout helper:

**New:** `DashboardFeaturedChartRow` — `lg:grid-cols-3`, left `col-span-2`, right `col-span-1`, `gap-6`

| Dashboard | Featured row (no new data) | Layout |
| :--- | :--- | :--- |
| **Accountant** | Already has featured row | Phase B refactor only |
| **Teacher** | Attendance pie (1/3) + Assignments horizontal bar (2/3) | Replace `lg:grid-cols-2` block |
| **Leadership** | Population horizontal bar (2/3) + Attendance pie (1/3) | Pull first two charts from grid into featured row; remaining charts stay in `DashboardChartsGrid` |
| **Student / Parent / Specialty / Default** | No natural wide time-series | Skip featured row; unify grid chart chrome only (Phase E) |

**Acceptance:** Teacher + Leadership gain Finance-style featured row; others unchanged in layout structure.

---

### Phase E — Grid chart migration (all school dashboards)

Apply unified components + card badges where meaningful:

| File | Changes |
| :--- | :--- |
| `LeadershipDashboard.tsx` | Featured row + 3-col grid for remaining charts; pie center labels (totals from existing data) |
| `TeacherDashboard.tsx` | Featured row + `DashboardChartsGrid` for quizzes/exams |
| `StudentDashboard.tsx` | 3-col grid; fee pie + alert pie get center totals; consistent `size="grid"` |
| `ParentDashboard.tsx` | Same as student charts section |
| `SpecialtyDashboardCharts.tsx` | Unified pie/bar sizing; center labels on single-value pies when total > 0 |
| `DefaultRoleDashboard.tsx` | Grid charts only — consistent heights and empty states |
| `AccountantDashboard.tsx` | Secondary grid uses upgraded `SimpleBarChart` / `SimpleLineChart` |

**Optional badges (cosmetic, no new data):**

- Teacher assignments chart: static “This term” style badge only if an existing i18n key fits — otherwise skip badges on non-Finance dashboards

**Acceptance:** All school dashboard charts use shared components; no dashboard imports raw Recharts except shared chart files.

---

### Phase F — Polish, docs, verify

- Update [`DASHBOARD_VISUAL_UNIFICATION_PLAN.md`](./DASHBOARD_VISUAL_UNIFICATION_PLAN.md) cross-link to this doc
- Mark acceptance checklist below
- `npm run build` (frontend)
- Rebuild `frontend-spa`
- Manual smoke: ACCOUNTANT, TEACHER, SCHOOL_ADMIN, STUDENT, PARENT, one specialty role — confirm charts match Finance **feel** (heights, donuts, grids, empty states)

---

## 5. Role → chart coverage checklist

| Body | Sample role | Featured row | Grid unified |
| :--- | :--- | :---: | :---: |
| accountant | ACCOUNTANT | ✓ (reference) | ✓ |
| leadership | SCHOOL_ADMIN | ✓ | ✓ |
| teacher | TEACHER | ✓ | ✓ |
| student | STUDENT | — | ✓ |
| parent | PARENT | — | ✓ |
| specialty | LIBRARIAN | — | ✓ |
| minimal | Fallback | — | ✓ |

---

## 6. Acceptance criteria

- [x] Finance charts visually unchanged after Phase B refactor  
- [x] All school dashboard charts render via `charts/*` shared components (no one-off Recharts in dashboard body files)  
- [x] Featured row on Accountant, Teacher, Leadership matches Finance proportions (`h-72`, 2/3 + 1/3)  
- [x] `SimplePieChart` / `DashboardDonutChart` use Finance donut radii in featured contexts  
- [x] `DashboardChartCard` supports optional header badge (used on Finance cash-flow)  
- [x] No changes to `useDashboardQuery`, `chartAggregates.ts` series logic, or API payloads  
- [x] No new i18n keys required  
- [x] Tailwind + Recharts only; chart tokens in TS constants (Recharts `contentStyle` exception unchanged)  
- [x] `npm run build` green; `frontend-spa` rebuilt  

---

## 7. Risks & mitigations

| Risk | Mitigation |
| :--- | :--- |
| Featured row overcrowds Teacher on mobile | Stack `grid-cols-1` below `lg` (same as Finance) |
| Center labels wrong when total is 0 | Show `—` or hide overlay; reuse Finance empty-well pattern |
| Leadership featured row leaves only 1 grid chart | Move 3rd chart to grid; featured row uses 2 charts only |
| Gradient `AreaChart` IDs clash when multiple on page | Prefix gradient ids with `useId()` or chart instance id |
| Super Admin divergence | Document as out of scope; optional follow-up |

---

## 8. Estimated touch list

```
src/features/dashboard/components/charts/
  chartTokens.ts              (new)
  DashboardChartCard.tsx        (badge, size)
  FinanceChartWidgets.tsx       (new — area, donut, or split files)
  SimpleCharts.tsx              (size, footer, area fill)
  DashboardFeaturedChartRow.tsx (new — optional layout helper)

src/features/dashboard/components/
  AccountantDashboard.tsx
  LeadershipDashboard.tsx
  TeacherDashboard.tsx
  StudentDashboard.tsx
  ParentDashboard.tsx
  SpecialtyDashboardCharts.tsx
  DefaultRoleDashboard.tsx
```

---

## 9. Status log

| Date | Note |
| :--- | :--- |
| 2026-08-07 | Plan drafted from Finance chart audit vs `SimpleCharts` / role dashboards |
| 2026-08-07 | Phases A–F implemented — shared chart tokens, Finance widgets, featured rows, all school dashboards migrated |
| 2026-08-07 | Registrar home: population donut + attendance-by-grade bar (replaces recent-activity chart); `/attendance/stats` adds `todayByGradeLevel` |
| 2026-08-07 | Premium chart widgets (`PremiumDonutChart`, `PremiumBarChart`) rolled out to all dashboards except Finance |
