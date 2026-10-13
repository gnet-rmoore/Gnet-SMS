---
name: sms-ui-consistency
description: >-
  Applies Gnet SMS Executive Slate UI consistency when building or updating
  dashboards, school/super-admin pages, feature views, cards, stats, forms,
  country/timezone fields, empty states, or marketing/landing sections. Use when
  creating pages, redesigning UI, fixing layout drift, canvas vs white-card
  contrast, adding nav routes, wiring country+timezone selects, or the user
  mentions design system, Tailwind, dashboard, Executive Slate,
  FRONTEND_GUIDELINES, or timezone filtering by country.
---

# SMS UI Consistency

Authoritative doc: [`FRONTEND_GUIDELINES.md`](../../../FRONTEND_GUIDELINES.md).  
Token cheat sheet: [`reference.md`](reference.md).  
Public portal forms (`/apply`, `/register-school`): [`sms-portal-form-layout`](../sms-portal-form-layout/SKILL.md).  
Canvas vs surface: [`docs/CANVAS_SURFACE_CONTRAST_PLAN.md`](../../../docs/CANVAS_SURFACE_CONTRAST_PLAN.md).

## When this skill applies

Use for any change under `src/pages/`, `src/features/`, or shared UI in `src/components/` that affects layout, cards, dashboards, forms, **or landing/marketing sections**.

## Workflow

Copy and track:

```
UI Progress:
- [ ] 1. Read existing nearby page for patterns
- [ ] 2. Place file (pages/ vs features/)
- [ ] 3. Wire route + navByRole
- [ ] 4. Apply page shell + header + cards
- [ ] 5. Canvas vs surface contrast (see below)
- [ ] 6. Honest data / empty / loading
- [ ] 7. Self-check against checklist
```

### 1. Match neighbors, then canonicalize

- Open a similar page (e.g. Super Admin Schools, School Profile, Registrar Overview).
- Prefer **Executive Slate** tokens from `reference.md`, not legacy `rounded-3xl` + `shadow-sm`.
- If editing a legacy page, migrate **all cards you touch** on that screen to canonical classes so the page is not half-old/half-new.

### 2. File placement

| Kind | Location |
| :--- | :--- |
| Thin route entry | `src/pages/School/` or `src/pages/SuperAdmin/` |
| Feature body / extracts | `src/features/<name>/Page.tsx` + `components/` |
| Reusable chrome | `src/components/` |
| API calls | `src/services/` or `src/features/<name>/api.ts` |

### 3. Route + nav

1. Add route in `src/App.tsx` under the correct layout (school `/:slug/*` or `/super-admin`).
2. Add nav item in `src/constants/navByRole.ts` for allowed roles.
3. Paths: `/${slug}/…` or `/super-admin/…`.

### 4. Compose the page

Prefer primitives from `src/components/ui` (see `reference.md`). Required structure:

1. **Shell** — `<PageShell>` (or `max-w-6xl mx-auto space-y-8 px-6 sm:px-8`)
2. **Header** — `<PageHeader title subtitle actions={<Button>…</Button>} />`
3. **Body** — one primary purpose; `<Surface>` / `<StatTile>` for cards
4. **Forms** — `<TextField>` / `<Field>` (label + error `aria-describedby`); `density="compact"` only in tables
5. **Motion** — `motion/react`, `duration: 0.2`, light entrance only; honor reduced motion via CSS token

**Dashboards specifically**

- Header + stat row (API-backed) + one main panel
- No fake health %, filler charts, or sci-fi labels
- Role branches OK under `src/features/dashboard/`; same tokens in every branch
- Dark executive banners: `from-slate-950 to-slate-900`; CTAs stay indigo

### 5. Canvas vs surface contrast (required)

White cards on white (or near-white) sections are a defect. Follow Option A:

| Layer | Token / class | Use |
| :--- | :--- | :--- |
| **Page / section canvas** | `bg-slate-100` (`smsCanvasClass`) | Layout main, public shells, landing section bands that host cards |
| **Surface (card / form)** | `bg-white border border-slate-200` + `SMS_SHADOW_SURFACE` | Primary cards, forms, panels |
| **Nested well** | `bg-slate-50 border border-slate-100` | Only *inside* a white surface — never as the only fill next to white cards on a white section |

**Landing / marketing**

- Sections that contain white cards → section `bg-slate-100` (not `bg-white`).
- Cards → `bg-white border-slate-200` + soft dual-layer shadow.
- Alternate dark bands (`slate-950`) and canvas bands; avoid white-on-white.
- Full-bleed photo heroes keep their own treatment.

**Do not**

- Put `bg-white` cards on a `bg-white` section.
- Use the legacy ultra-weak shadow `shadow-[0_4px_20px_rgb(0,0,0,0.015)]`.
- Use page-level `bg-slate-50` as canvas (reserved for nested wells).

### 6. States

- Loading: `PageSkeleton` or local spinner
- Empty: dashed border, short copy, optional CTA
- Errors: toast or rose inline text — never `window.alert` / `confirm`
- Public auth/register: prefer floating `PageToast` for form errors

### Country + timezone (required pattern)

Whenever a form collects **country** and **timezone**:

1. Import `CountryTimezoneFields` from `src/components/CountryTimezoneFields.tsx`.
2. Helpers live in `src/lib/countryTimezones.ts` (`getTimezonesForCountryName`, `resolveTimezoneForCountry`).
3. Changing country must narrow the timezone `<select>` to that country’s IANA zones and reset if the previous zone is invalid.
4. Never show the full world timezone list next to a country field; never use free-text for either when both are present.
5. Existing call sites: Super Admin Register/Edit School, Dashboard edit school, public `/register-school`, School Settings regional, Super Admin Settings defaults.

### 7. Checklist (must pass)

- [ ] Tailwind only; no new CSS file / css-in-js / layout `style` props
- [ ] `lucide-react` icons only; `motion/react` only
- [ ] Shell + heading + card tokens match `reference.md`
- [ ] Canvas ≠ surface: white cards sit on `slate-100` (or dark), not white-on-white
- [ ] Numbers are real or empty state — no hardcoded KPIs
- [ ] Forms init to `""`; submit has loading
- [ ] Secrets never in client bundles
- [ ] Responsive: stacks cleanly on mobile

## Templates

See [`reference.md`](reference.md) for copy-paste shell, stat tile, empty state, and dark banner.
