# Dashboard visual unification — Implementation plan

> **Status:** Done (2026-08-07)  
> **Goal:** Make every **school-role** home dashboard match the visual style of the Finance (`AccountantDashboard`) home — **CSS/layout only**; no data, API, or chart-series changes.  
> **Companion:** `FRONTEND_GUIDELINES.md` §5, `src/features/dashboard/`, [`DASHBOARD_CHART_VISUAL_UNIFICATION_PLAN.md`](./DASHBOARD_CHART_VISUAL_UNIFICATION_PLAN.md) (charts — draft)

---

## 1. Problem

Each school role has a customized dashboard body (registry in `src/features/dashboard/registry.ts`). That is good functionally, but the **visual language is inconsistent**:

| Body kind | Used by (examples) | Current KPI / shell style |
| :--- | :--- | :--- |
| `accountant` | ACCOUNTANT | **Reference** — hero dark KPI + semantic white KPIs + 2/3 chart row + link cards |
| `leadership` | SCHOOL_ADMIN, PRINCIPAL, VPI, REGISTRAR, … | Generic `StatTile` (indigo icon chip only) |
| `teacher` | TEACHER | `StatTile` + plain chart grid + slate list panels |
| `student` | STUDENT | `StatTile` (4-up) + charts + list panels |
| `parent` | PARENT | Custom cards with solid `bg-indigo-600` icon blocks |
| `specialty` | LIBRARIAN, NURSE, IT, … | Hub grid + `SpecialtyDashboardCharts` |
| `minimal` | Fallback roles | Charts only, no KPI row |

The Finance dashboard feels more polished because it uses a **repeatable pattern**:

1. **Primary hero KPI** — charcoal gradient card (`from-slate-950 to-slate-900`) for the headline number  
2. **Secondary KPIs** — white Executive Slate cards with **semantic tones** (emerald inflow, rose outflow, amber open items) — icon chip + corner badge + slate label + mono value  
3. **Featured chart row** — `lg:grid-cols-3`, wide chart (2 cols) + side chart (1 col), in-card title + hint + optional badge pill  
4. **Secondary chart grid** — existing `DashboardChartsGrid` / `DashboardChartCard`  
5. **Quick-link footer** — horizontal link cards (icon tone, title, one-line desc, arrow)  
6. **Shared card shell** — `rounded-[32px] border border-slate-200 bg-white` + project shadow  
7. **Motion** — `motion.div` entrance on the body (`opacity` + `y: 15`, `duration: 0.2`)

---

## 2. Scope

### In scope

- School portal dashboards rendered via `SchoolDashboard` → `RoleHomeShell` + role body components under `src/features/dashboard/components/`
- Shared dashboard chrome pieces used by multiple bodies: `StatTile` usage on dashboards, `RecentActivityPanel`, `SpecialtyDashboardCharts`, list/shortcut panels inside dashboard bodies
- Extract **presentational** primitives so Finance and other roles share one CSS source of truth

### Out of scope (unless you ask to include later)

- **Super Admin** dashboard (`src/pages/SuperAdmin/Dashboard.tsx`) — different shell (`PageShell` / `PageHeader`); can be Phase 2  
- **Data / APIs** — no new KPIs, no new charts, no changed aggregations  
- **i18n copy** — keep existing keys; only layout/class changes  
- **Quick actions** in `RoleHomeShell` header (`QuickActionRow`) — keep behavior; optional minor spacing alignment only  
- **Business docs** — UI-only; no change to onboarding/admission/finance rules

---

## 3. Reference anatomy (Finance)

Source: `src/features/dashboard/components/AccountantDashboard.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│ RoleHomeShell (title, subtitle, quick actions) — unchanged  │
├─────────────────────────────────────────────────────────────┤
│ [Hero KPI dark] [KPI white] [KPI white] [KPI white]         │  ← 4-col sm/2 lg/4
├──────────────────────────────┬──────────────────────────────┤
│ Main chart (2/3) + badge     │ Side chart / donut (1/3)     │
├──────────────────────────────┴──────────────────────────────┤
│ DashboardChartsGrid (3-col secondary charts)                │
├─────────────────────────────────────────────────────────────┤
│ Quick-link row (3 cards: icon + title + desc + arrow)       │
└─────────────────────────────────────────────────────────────┘
```

**CSS constants to extract** (from Finance):

- `DASHBOARD_CARD` — white surface shell (already duplicated inline as `card` in Accountant)
- Tone map: `emerald` | `rose` | `amber` | `indigo` | `slate` for icon chip + badge pill
- `DashboardHeroKpi` — dark gradient primary tile
- `DashboardKpiTile` — white semantic tile (maps 1:1 to existing Finance secondary cards)
- `DashboardLinkTile` — footer quick-link card

---

## 4. Implementation phases

### Phase A — Shared dashboard UI primitives

**New file:** `src/features/dashboard/components/dashboardUi.ts` (or `dashboardUi.tsx` if components)

| Export | Purpose |
| :--- | :--- |
| `DASHBOARD_CARD` | Shared card class string |
| `DashboardHeroKpi` | Dark headline metric card |
| `DashboardKpiTile` | White KPI with `tone`, `icon`, `badge`, `label`, `value`, `subtext?` |
| `DashboardLinkTile` | Footer link card (icon tone + title + description) |
| `DashboardKpiSkeleton` / `DashboardBodySkeleton` | Loading placeholders matching Finance layout |

**Refactor:** `AccountantDashboard.tsx` to consume these primitives — **pixel-parity check** (no visual regression on Finance home).

**Optional:** Add `tone` prop to replace hard-coded emerald/rose/amber classes in Finance.

---

### Phase B — Leadership dashboards

**File:** `LeadershipDashboard.tsx`  
**Roles:** SCHOOL_ADMIN, PRINCIPAL, VPI, REGISTRAR, DEAN, … (`body: "leadership"`)

| Current | Target |
| :--- | :--- |
| `StatTile` grid (2–3 tiles) | Hero KPI = first tile (e.g. total students); remaining tiles = `DashboardKpiTile` with semantic tones |
| Chart grid only | Keep charts/data; ensure `DashboardChartsGrid` spacing matches Finance |
| Recent activity + setup sidebar | Wrap in `DASHBOARD_CARD`; setup links use `DashboardLinkTile` styling where appropriate |

**Data mapping (labels/values unchanged):**

- Hero: `totalStudents` (or preset-specific primary count)
- Secondary: teachers, applications, setup remaining, etc. — same values, new shells

---

### Phase C — Teacher & Student dashboards

**Files:** `TeacherDashboard.tsx`, `StudentDashboard.tsx`

| Section | Change |
| :--- | :--- |
| KPI row | Replace `StatTile` with hero + `DashboardKpiTile` (3–4 metrics, same numbers) |
| Charts | No data change; cards already use `DashboardChartCard` — verify padding/titles match Finance |
| Class list + shortcuts | Restyle list rows / shortcut links to match Finance **link tile** or Finance list hover (`hover:border-indigo-100`, icon tone) |
| Loading | Use shared skeleton grid |

**Teacher-specific:** First KPI = class count (hero candidate); roster seats + “open tools” as secondary.

**Student-specific:** First KPI = class count or fees due (pick hero by prominence — fees due if > 0, else classes); keep four metrics.

---

### Phase D — Parent dashboard

**File:** `ParentDashboard.tsx`

| Current | Target |
| :--- | :--- |
| Linked cards with solid `bg-indigo-600` icons | `DashboardKpiTile` with per-card tone (emerald children, amber attendance, etc.) |
| First card could be hero | e.g. linked children count on dark hero card |
| Children section | Keep data; apply `DASHBOARD_CARD` + Finance section header pattern |
| Charts | Unchanged data; card shells already close |

---

### Phase E — Specialty & minimal dashboards

**Files:** `SpecialtyHubDashboard.tsx`, `SpecialtyDashboardCharts.tsx`, `DefaultRoleDashboard.tsx`

**Specialty:**

- Add KPI row **only if** existing chart component already exposes summary counts — **do not add new fetches**
- Restyle hub cards to match `DashboardLinkTile` (already similar; unify icon size `w-11 h-11`, `rounded-2xl`, tone classes)
- Align section title block with Finance chart headers

**Minimal (fallback):**

- No KPI data available — skip hero row OR show a single neutral hero with role title + “—” ( **avoid** — prefer no hero if no metric)
- Wrap chart grid + `RecentActivityPanel` in consistent spacing; match Finance `space-y-8` rhythm

---

### Phase F — Shared panels & polish

| File | Change |
| :--- | :--- |
| `RecentActivityPanel.tsx` | Match Finance in-card header spacing; timeline icon tones aligned with semantic palette |
| `DashboardChartCard.tsx` | Already aligned — verify optional **badge slot** for parity with Finance cash-flow header (optional prop, used where UI already has a badge) |
| `StatTile.tsx` | **Do not change globally** — only stop using it on dashboards (other pages may still use it) |
| `Page.tsx` / `RoleHomeShell.tsx` | No structural change; body children pick up new styling |

---

## 5. Role → body coverage checklist

After implementation, manually verify **one login per body kind**:

| Body | Sample role | Verify |
| :--- | :--- | :--- |
| accountant | ACCOUNTANT | Unchanged (reference) |
| leadership | SCHOOL_ADMIN, PRINCIPAL, REGISTRAR | Hero + KPI tiles + charts + activity |
| teacher | TEACHER | KPI row + charts + class list |
| student | STUDENT | KPI row + charts + shortcuts |
| parent | PARENT | KPI tiles + children section |
| specialty | LIBRARIAN or NURSE | Hub cards + charts |
| minimal | Any unmapped role | Charts + activity, consistent spacing |

**Super Admin:** out of scope for v1 (noted in §2).

---

## 6. Acceptance criteria

- [x] Finance (`AccountantDashboard`) looks the same as before Phase A refactor (screenshot or side-by-side)  
- [x] All school-role dashboard bodies use `DASHBOARD_CARD` shell and Finance KPI patterns where metrics already exist  
- [x] No changes to `useDashboardQuery`, `registry.ts` body routing, API calls, or chart data transforms  
- [x] No new i18n keys required (reuse existing labels/hints)  
- [x] Loading states use skeletons that match Finance grid proportions  
- [x] Tailwind only; no new CSS files  
- [x] Motion: body wrapper uses `motion.div` with project-standard `duration: 0.2` where missing  

---

## 7. Test & deploy

| Step | Command / action |
| :--- | :--- |
| Frontend lint | IDE diagnostics on touched dashboard files |
| Manual smoke | Log in as ACCOUNTANT, TEACHER, STUDENT, PARENT, SCHOOL_ADMIN, one specialty role; open `/{slug}/dashboard` |
| Build | `docker compose up --build -d frontend-spa` (frontend-only diff) |

No backend service rebuild unless unrelated changes exist.

---

## 8. Risks & mitigations

| Risk | Mitigation |
| :--- | :--- |
| Hero KPI choice feels wrong for a role | Use first existing KPI in current order; no new metrics |
| Parent loses clickable KPI cards | Keep `Link` wrapper around `DashboardKpiTile` where cards are links today |
| Specialty roles have no numeric KPIs | Skip hero row; unify hub + chart card styling only |
| Visual regression on Finance | Refactor Finance first in Phase A; compare before migrating others |

---

## 9. Estimated touch list

```
src/features/dashboard/components/
  dashboardUi.tsx          (new)
  AccountantDashboard.tsx  (refactor to primitives)
  LeadershipDashboard.tsx
  TeacherDashboard.tsx
  StudentDashboard.tsx
  ParentDashboard.tsx
  SpecialtyHubDashboard.tsx
  SpecialtyDashboardCharts.tsx  (classNames only if needed)
  DefaultRoleDashboard.tsx
  RecentActivityPanel.tsx       (minor)
```

---

## 10. Status log

| Date | Note |
| :--- | :--- |
| 2026-08-07 | Plan drafted from Finance dashboard audit vs other role bodies |
