# Executive Slate — token & template reference

Use with [`SKILL.md`](SKILL.md). Source of truth: repo root `FRONTEND_GUIDELINES.md`.  
Density program: `docs/UI_CONSISTENCY_PLAN.md`. CSS vars: `--sms-*` in `src/index.css`.

## Prefer primitives

```tsx
import {
  PageShell, PageHeader, Surface, StatTile, Button, TextField, SectionTitle,
} from "../components/ui";

<PageShell>
  <PageHeader
    title="Title"
    subtitle="Short supporting sentence."
    actions={<Button type="button">Primary action</Button>}
  />
  <Surface className="space-y-6">
    <SectionTitle>Section</SectionTitle>
    <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
  </Surface>
</PageShell>
```

`Button` / `TextField`: `size="compact"` / `density="compact"` for tables only. Icon-only buttons need `aria-label`.

## Color & type

| Role | Classes |
| :--- | :--- |
| Canvas (page / section) | `bg-slate-100` (`smsCanvasClass`) |
| Nested well (inside white card) | `bg-slate-50 border border-slate-100` |
| Primary text | `text-slate-900` |
| Secondary text | `text-slate-500` (prefer over `slate-400` for essential labels) |
| Surface border | `border-slate-200` |
| Hairline / nested border | `border-slate-100` |
| Action | `bg-indigo-600 hover:bg-indigo-700 text-white` |
| Success | `text-emerald-600` / `bg-emerald-50` |
| Danger | `text-rose-600` / `bg-rose-50` |
| Banner | `bg-gradient-to-br from-slate-950 to-slate-900 text-white` |
| Page title | `text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900` |
| Counts / IDs | add `font-mono` |
| Forbidden on screens | new `text-[10px]` (print / preview allowlist only) |

## Elevation

```text
border border-slate-200 + SMS_SHADOW_SURFACE
# SMS_SHADOW_SURFACE =
# shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]
```

Never use legacy `shadow-[0_4px_20px_rgb(0,0,0,0.015)]`.  
Large surface radius: `rounded-[32px]`. Nested: `rounded-2xl`. Controls: `rounded-xl`.

**Contrast rule:** white cards must sit on `bg-slate-100` (or a dark band), never on `bg-white`. See `docs/CANVAS_SURFACE_CONTRAST_PLAN.md`.

## Page shell

```tsx
<div className="max-w-6xl mx-auto space-y-8 px-6 sm:px-8">
  {/* header + sections */}
</div>
```

## Page header

```tsx
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div>
    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
      Title
    </h1>
    <p className="text-slate-500 font-medium">Short supporting sentence.</p>
  </div>
  <button
    type="button"
    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl"
  >
    Primary action
  </button>
</div>
```

## Primary card

```tsx
<section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-6">
  <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Section</h2>
  {/* … */}
</section>
```

## Stat tile

```tsx
<div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
    {/* lucide icon */}
  </div>
  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Label</p>
  <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">{value}</p>
</div>
```

Stat row: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`.

## Dark banner

```tsx
<section className="rounded-[32px] bg-gradient-to-br from-slate-950 to-slate-900 text-white p-8 space-y-3">
  <h2 className="text-2xl font-extrabold tracking-tight">Banner title</h2>
  <p className="text-slate-300 text-sm">One honest sentence.</p>
</section>
```

## Empty state

```tsx
<div className="rounded-[32px] border border-dashed border-slate-200 bg-white py-16 text-center px-6">
  <p className="text-slate-500 text-sm font-medium">Nothing here yet.</p>
</div>
```

## Soft tip / help panel

```tsx
<div className="rounded-[32px] border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-slate-50 p-6 md:p-8">
  <p className="text-sm font-medium text-slate-700">Plain tip for the user.</p>
</div>
```

## Motion

```tsx
import { motion } from "motion/react";

<motion.div
  initial={{ opacity: 0, y: 15 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}
>
  {children}
</motion.div>
```

## Country + timezone fields

```tsx
import { CountryTimezoneFields } from "../components/CountryTimezoneFields";
import { DEFAULT_COUNTRY, DEFAULT_TIMEZONE } from "../lib/countryTimezones";

const [country, setCountry] = React.useState(DEFAULT_COUNTRY);
const [timezone, setTimezone] = React.useState(DEFAULT_TIMEZONE);

<CountryTimezoneFields
  country={country}
  timezone={timezone}
  onCountryChange={setCountry}
  onTimezoneChange={setTimezone}
  required
/>
```

Do not hand-roll a second country/timezone pair — extend this component if styling differs (`selectClassName` / `labelClassName`).

## Legacy → canonical

| Avoid in new / touched UI | Prefer |
| :--- | :--- |
| `rounded-3xl` | `rounded-[32px]` / `<Surface>` or `rounded-2xl` |
| `shadow-sm` / `0.015` shadow on cards | `SMS_SHADOW_SURFACE` / `<Surface>` |
| `bg-white` section hosting `bg-white` cards | Section `bg-slate-100` + white cards |
| Page canvas `bg-slate-50` | `bg-slate-100` (`smsCanvasClass`); keep `slate-50` for nested wells |
| Hand-rolled CTAs / fields | `<Button>` / `<TextField>` |
| `font-bold` on page `h1` | `font-extrabold tracking-tight` / `<PageHeader>` |
| Hardcoded KPI numbers | API value or empty state |
| `window.alert` / `confirm` | toast / inline confirm |
| Extra icon packs / raw SVG | `lucide-react` |

Guardrails: `npm run test:ui-drift` · `npm run test:ui-primitives`.
