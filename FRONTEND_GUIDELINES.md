# SMS Frontend Architecture & Design System Guidelines

This document serves as the authoritative source of truth for both **Human Frontend Developers** and **AI Coding Agents** who read, maintain, or expand this codebase. All modifications must align strictly with the structures, design patterns, and boundaries defined herein.

---

## 1. Frontend Architecture & Directory Layout

The application is structured as a full-stack Single Page Application (SPA) leveraging **React 18+**, **TypeScript**, **Vite**, and **Prisma/Express** on the backend.

### Project Directory Structure

```text
/src
  ├── components/          # Extracted, highly reusable UI components (e.g. Layout, GlobalSearch, Route guards)
  ├── pages/               # Primary Page-level views containing module specific containers
  │   ├── School/          # School Portal Views (Academic Supervision, Profile, Calendar, Clinics)
  │   └── SuperAdmin/      # System Custodian Views (Database Tables, Logs, Users Management)
  ├── services/            # Client-side API proxy services (interacts with Express Server routes)
  │   ├── api.ts           # Centralized Axios/fetch client wrapper with bearer auth tokens
  │   ├── staffService.ts  # Staff attendance & shift registry endpoints
  │   └── gradeService.ts  # Academic assessment and reports proxy
  ├── store/               # Lightweight state machines
  │   └── authStore.ts     # Global persistence store for Active User, School Profile and tokens (Zustand)
  ├── App.tsx              # Core Client router, route definitions, and Guard wrappers
  ├── main.tsx             # Application mount initialization point
  └── index.css            # Global stylesheet compiling Tailwind CSS utility variables
```

### Core Architecture Flow

1. **Routing Strategy**: Handled via `react-router-dom` in `src/App.tsx`. Standard layout routes are wrapped with `<Layout>` components. 
2. **Access Guards**: Sub-routes are restricted via custom route guards checking roles stored dynamically in `useAuthStore`.
3. **State Engine**: Zustand provides a non-boilerplate reactive state. Session variables, access keys, and logged-in user structures persist smoothly across refreshes.

---

## 2. CSS, UI, and UX Organization Patterns

We strictly adhere to a **Utility-First styling paradigm** using **Tailwind CSS**. Custom `.css` style structures, css-in-js, or inline `style` attributes are strictly prohibited to prevent layout drift and keep compilation optimized.

### Visual Rhythms & Containers

1. **The Modern Bento Container**: 
   - Card wrappers must use a consistent rounded hierarchy: `rounded-[32px]` for large dominant containers (e.g. profile banners, major form components) and `rounded-2xl` for child sub-cards or badges.
   - Elevated items use a clear border + soft dual-layer shadow: `border border-slate-200` + `SMS_SHADOW_SURFACE` (see `tokens.ts`).
2. **Spacing Hierarchy (Intentional Variation)**:
   - Page margins must utilize generous, balanced breathing room. Avoid uniform margins; create vertical pace.
   - Use `max-w-6xl mx-auto space-y-8 w-full min-w-0` (or `<PageShell>`) as the base wrapper for Layout-backed feature pages. **Do not** add `px-6 sm:px-8` on the shell — Layout `<main>` already uses `p-4 sm:p-6 lg:p-8`.
   - Public / out-of-Layout pages keep their own horizontal padding.
   - Generous interior card padding: prefer `p-8` for primary forms/settings grids, and `p-4` or `p-6` for sidebar widgets.
3. **Typography Scaling**:
   - **Primary Font**: *Inter* (applied to general application copy). High readability, balanced kerning.
   - **Display/Headings**: Use `tracking-tight font-extrabold text-slate-900` paired with high-impact font-sizes (`text-2xl` up to `text-4xl`) for clear structural headers.
   - **Monospaced Items**: Use *JetBrains Mono* for IDs, cryptographic hashes, and numerical counts to ensure column-alignment and technical precision.
4. **Motion & Transitions**:
   - State toggles or section exits must use standard fade/scale parameters via the `motion` framework (imported exclusively from `motion/react`).
   - Staggered entrances are encouraged on major layouts (`initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}`). Avoid high-velocity, distracting spring metrics. Keep transitions fast: `duration: 0.2`.

---

## 3. Core Design Concept (Mood & Vibe)

The design is conceptualized as a **Slick Executive Slate** theme — blending an elegant off-white, spacious layout with deep, high-contrast dark visual components for banners, widgets, and accent headers.

```
       [ OFF-WHITE BASE CANVAS ] ─── (Light Slate #F8FAFC)
                  │
                  ▼
       [ HIGH-CONTRAST HEADER CARDS ] ─── (Cosmic Charcoal #020617 / Dark Slate)
                  │
                  ▼
       [ BRAND ACCENTS ] ─── (Indigo #4F46E5 & Emerald #10B981)
```

### Architectural Honesty (Anti-AI-Slop Mandate)

Both Human and AI developers must preserve absolute architectural honesty. We design tools for users, not sci-fi wireframes.
- **No Mock Telemetry**: Never output synthetic metadata lines like `CORE_NODE_ONLINE`, `PING: 14ms`, or fake console terminal line streams in sidebars.
- **Literal Labeling**: Keep copy humble, plain, and direct. Use "Profile Details", not "Chronos Bio-Metrics Hub". Use "Reset Password", not "Cryptographic Authority Registry".
- **Empty State Restraint**: If data is missing, design a clean, spacious grey state with simple explanatory text rather than filling space with fake analytics charts.

---

## 4. Full Color Palette & Branding Guide

The branding relies on a strict semantic color hierarchy to ensure visual consistency and high color contrast (Web Content Accessibility Guidelines compliant).

| Segment | Palette Category | Tailwind Token | Hex / Usage Description |
| :--- | :--- | :--- | :--- |
| **Canvas Backing** | Light Neutrals | `bg-slate-100` (`smsCanvasClass`) | `#F1F5F9` application / public page container. Reserve `bg-slate-50` for **nested wells inside white surfaces**. |
| **Borders** | Soft Boundaries | `border-slate-200` (surfaces) / `border-slate-100` (nested / hairlines) | White cards use `slate-200` so they separate from canvas. |
| **Primary Text** | Deep Charcoal | `text-slate-900` | `#0F172A` - Used for highly legible headers and copy. |
| **Secondary Text** | Medium Grey | `text-slate-500` | `#64748B` - Used for secondary descriptors and helper texts. |
| **Brand Primary** | Platform blue / school brand | `bg-indigo-600` / `text-indigo-600` | Platform default `#2563EB` (modern blue) on login, public pages, and Super Admin. After school login, Layout remaps the same Tailwind `indigo-*` / `violet-*` tokens from Settings → Appearance (`school.brandColor`) via `--school-brand-*` so that school’s CTAs, focus rings, and nav recolor together. Public apply does **not** use school brand. |
| **Verified Positive** | Vibrant Emerald | `bg-emerald-500` / `text-emerald-400` | `#10B981` - Checked status indicators, success notifications. |
| **Destructive/Alert** | Crimson Rose | `bg-rose-600` / `text-rose-100` | `#E11D48` - Error indicators, missing configurations. |
| **Executive Accents** | Deep Slate/Charcoal | `from-slate-950 to-slate-900` | Gradient backgrounds used in banner headers. |

### Iconography Rules
- All icons **MUST** be imported directly from `lucide-react`.
- **Do NOT** embed raw custom SVG paths or install secondary icon libraries (such as FontAwesome).
- Icons should retain a soft accent colour matching their category (e.g. `text-indigo-400` inside dark widgets, `text-slate-400` inside standard forms).

---

## 5. Dashboard & Page Composition (canonical)

All **new** pages and any dashboard you touch must use Executive Slate tokens below. Older screens still use `rounded-3xl` + `shadow-sm`; when you edit those files, migrate touched components to the canonical classes (do not leave a mixed card on the same page).

### Page shell

```text
max-w-6xl mx-auto space-y-8 w-full min-w-0
```

Layout `<main>` pads with `p-4 sm:p-6 lg:p-8`. Prefer the shell above for content; **do not** nest extra shell `px-*` that double-pads. Below `lg`, the sidebar is an overlay drawer (closed by default). Registrar may use `max-w-7xl` only when tables need the width.

### Page header

```text
flex flex-col sm:flex-row sm:items-center justify-between gap-4
h1: text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900
sub: text-slate-500 font-medium
primary CTA: bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl
```

### Cards & stat tiles

| Surface | Classes |
| :--- | :--- |
| Primary card | `rounded-[32px] border border-slate-200 bg-white p-8` + `SMS_SHADOW_SURFACE` (or `<Surface>`) |
| Child / compact card | `rounded-2xl border border-slate-100 bg-white p-4\|p-6` |
| Stat tile | `bg-white p-6 rounded-2xl border border-slate-200` + `SMS_SHADOW_SURFACE` + `space-y-3` |
| Stat label | `text-xs font-bold text-slate-400 uppercase tracking-wider` |
| Stat value | `text-2xl font-extrabold tracking-tight text-slate-900` (counts: `font-mono`) |
| Icon chip | `w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600` (or emerald/rose by meaning) |
| Dark banner | `bg-gradient-to-br from-slate-950 to-slate-900 text-white rounded-[32px] p-8` |

Stat grids: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4\|gap-6`.

**Full-app responsive program** (mobile drawer, table scroll, grid collapse, print allowlist, checklist): see `docs/RESPONSIVE_UI_PLAN.md`. Stack headers (`flex-col sm:flex-row`); never ship interactive `grid-cols-2+` without a `grid-cols-1` base; wrap ledgers in `overflow-x-auto` or `<TableScroll>`.

**List filters:** Prefer shared `<ListFilterBar>` + `useListFilters` from `src/features/list-filters` for every table/queue toolbar (search, primary enums, advanced panel, chips, URL sync). Do not invent new ad-hoc `left-4` search rows. See `docs/ADVANCED_TABLE_FILTERS_PLAN.md`.

### Dashboards (Super Admin + School)

1. **One composition** — header + honest stats + one primary panel. Do not pack fake “system health”, sci-fi labels, or filler charts.
2. **Live data only** — every number must come from an API (or show an empty state). No hardcoded `99.9%`, fake class counts, or placeholder revenue.
3. **Role variants** — school dashboard may branch by role in `src/features/dashboard/`, but each branch still uses the same shell/stat/card tokens.
4. **Charts** — Recharts is allowed; keep colors aligned with indigo/emerald/slate; no decorative chart when there is no data.
5. **Help / tips** — optional soft panel: `from-indigo-50/60 to-slate-50 border border-indigo-100 rounded-[32px]`; plain language only.

### Empty / loading / error

- Loading: spinner or `PageSkeleton` (`form` \| `table` \| `dashboard` \| `detail`).
- Empty: dashed `border-slate-200` area, short sentence, optional single CTA.
- Errors: rose text or toast — never `window.alert()` / `window.confirm()`.
- Confirmations: `confirmAction` from `src/lib/swal` (SweetAlert2). Use `danger: true` for deletes.
### Country + timezone

Forms that collect both must use `src/components/CountryTimezoneFields.tsx` so timezone options are filtered by the selected country (`src/lib/countryTimezones.ts`). Do not show an unbound world timezone list beside a country field.

### Legacy migration (when touching a file)

| Legacy (avoid in new code) | Canonical |
| :--- | :--- |
| `rounded-3xl` | `rounded-[32px]` (large) or `rounded-2xl` (child) |
| `shadow-sm` on cards | `SMS_SHADOW_SURFACE` (`0 1px 2px` + `0 8px 24px` soft slate) |
| `font-bold` page titles | `font-extrabold tracking-tight` |
| Solid `bg-indigo-600` hero only | Prefer charcoal gradient for executive banners; indigo for CTAs |

### Control density (unify sizing)

Interactive screens share **comfortable** density by default; use **`compact`** only on dense tables/toolbars. Full plan: [`docs/UI_CONSISTENCY_PLAN.md`](./docs/UI_CONSISTENCY_PLAN.md). Tokens: `--sms-*` in `src/index.css`.

**Prefer primitives** from `src/components/ui` (`PageShell`, `PageHeader`, `Surface`, `StatTile`, `Button`, `Field` / `TextField`, `SectionTitle`) over inventing class strings.

| Role | Canonical |
| :--- | :--- |
| Primary CTA | `<Button>` → `px-6 py-3` / min ~44px; focus-visible ring |
| Secondary CTA | `<Button variant="secondary">` |
| Field | `<TextField>` / `<Field>` with label + `aria-describedby` for errors |
| Compact controls | `size="compact"` / `density="compact"` — tables only; still ≥ 24×24 |
| Screen meta label | `text-xs … text-slate-500` — **not** `text-[10px]` / avoid `slate-400` for essential labels |
| Large card | `<Surface>` → `rounded-[32px]` + project shadow — **not** `rounded-3xl` + `shadow-sm` |

Print / report-card templates may keep tighter type on an allowlist. Run `npm run test:ui-drift` before SPA PRs that add screens. Visual/axe stubs: [`docs/UI_VISUAL_BASELINES.md`](./docs/UI_VISUAL_BASELINES.md).

---

## 6. Development Integrity Checklist (Keep Working Safely)

To ensure subsequent features do not degrade the design quality or break database triggers, review this checklist on every code iteration:

### 1. Adding New Pages & Views
- **Single Page vs Complex Flow Constraint**: For simple feature additions, keep the entire layout contained within a single responsive view grid. Avoid creating redundant tabs.
- **Sidebar Integration**: Update `src/constants/navByRole.ts` via `getNavSections` (grouped collapsible sections). Flat helpers `getNavItems` / `roleCanAccessNavPath` remain for GlobalSearch and access checks. Paths: `/${slug}/…` (school), `/super-admin/…` (global). Layout sidebar (`src/components/sidebar/**`) is a **dark rounded rail**: accordion sections when expanded; desktop collapse is an **icon rail** (not hidden) with flyouts for multi-item sections; bottom profile card; preference in `localStorage` (`sms-sidebar-mode`). Below `lg`, overlay drawer stays fully labeled. Details: `docs/SIDEBAR_NAV_OVERHAUL_PLAN.md`.
- **React-Router Configuration**: Register the new view path inside the nested routing configuration in `src/App.tsx`.
- **Design skill**: For UI work, follow `.cursor/skills/sms-ui-consistency/SKILL.md`.

### 2. Form States & Modulations
- **Lazy Initializations**: When interacting with server APIs, declare loading states. Initialize forms with empty strings (`""`) to prevent React uncontrolled component errors.
- **Never expose Secret Keys**: Never output Gemini API tokens or Stripe keys directly to the client browser. Proxy via service routes / gateway.
- **Toast Notifications**: Avoid standard `window.alert()` / `confirm()` dialogs. Use project toasts (`PageToast` / feature toasts) for feedback, and `confirmAction` from `src/lib/swal` for any user confirmation.

### 3. State Syncing
- Always sync updated user states directly to the local Auth Store (`setAuth`) so changes instantly reflect in navigation profile headers without requiring a browser refresh.

---

## 7. Internationalization (i18n)

- Stack: `i18next` + `react-i18next` (`src/i18n/`). Catalogs: `common`, `nav`, `auth`, `errors`, `roles`, `pages`.
- Locales: `en`, `fr`, `ar` (RTL), `es`, `de`, `zh-Hans`, `hi`. Prefer `t('ns:key')` for all new user-facing copy.
- Persist: `User.preferredLocale`, `School.defaultLocale` (Identity). Apply via `changeAppLocale` / `LanguageSelect`.
- Do not concatenate translated fragments into sentences. Keep API day-keys ISO. Print report cards may stay LTR/fixed language.
- Plan: `docs/I18N_PLAN.md`.

---

*This document was composed to align human craft and AI execution into a single, cohesive development philosophy. Adhere to it meticulously.*
