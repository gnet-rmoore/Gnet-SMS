# Canvas vs surface contrast — Implementation plan

> **Status:** Phases 0–3 shipped (Option A) — 2026-08-03  
> **Scope:** Make page **canvas** (gray backing) clearly distinguishable from **surfaces** (white cards, forms, panels) across landing, auth/public, school app, and Super Admin — without abandoning Executive Slate.  
> **Problem:** Canvas is typically `bg-slate-50` (`#F8FAFC`) and surfaces are `bg-white` with `border-slate-100` and an almost invisible shadow (`0_4px_20px_rgb(0,0,0,0.015)`). On many monitors the two read as the same flat white; forms and cards look “floating in nothing” or, worse, invisible as cards.  
> **Non-goals:** Dark mode; purple/glow redesign; heavy neumorphism; per-page one-off background hacks; changing school brand indigo remapping.  
> **Companions:** `FRONTEND_GUIDELINES.md` §4–5, `src/components/ui/tokens.ts`, `docs/UI_CONSISTENCY_PLAN.md`, `docs/UI_VISUAL_BASELINES.md`, `docs/RESPONSIVE_UI_PLAN.md`  
> **Owning surface:** SPA (`frontend-spa`) — tokens + Layout/PageShell + public shells first

---

## 0. Diagnosis (why it fails)

| Layer | Typical token today | Approx. | Role |
| :--- | :--- | :--- | :--- |
| **Canvas** | `bg-slate-50` | `#F8FAFC` | Page / Layout main / landing bands |
| **Surface** | `bg-white` + `border-slate-100` | `#FFFFFF` / `#F1F5F9` edge | Cards, forms, drawers, modals |
| **Elevation** | `shadow-[0_4px_20px_rgb(0,0,0,0.015)]` | ~1.5% black | Meant to lift cards; too weak to read |

Contrast between `#F8FAFC` and `#FFFFFF` is tiny (~1–2% relative luminance). Borders at `slate-100` disappear next to either fill. Users report the issue everywhere the pattern appears: landing sections, login/register, dashboards, settings forms, wizard cards.

**Principle:** Separation must come from **at least two** of: (1) canvas darkness, (2) border strength, (3) shadow depth. Relying on fill alone is not enough.

---

## 1. Recommended direction (token-first)

Adopt named semantic tokens (document in `FRONTEND_GUIDELINES.md` + implement in `tokens.ts` / Tailwind usage) so pages stop inventing ad-hoc grays.

### 1.1 Proposed token set

| Token | Intent | Recommended Tailwind (v1) | Notes |
| :--- | :--- | :--- | :--- |
| `sms.canvas` | App / page backing | `bg-slate-100` | One step darker than today’s `slate-50`; still calm, not “dirty” |
| `sms.canvasMuted` | Nested page wells / secondary bands | `bg-slate-200/60` or custom mid | Optional; use sparingly |
| `sms.surface` | Primary card / form | `bg-white` | Unchanged fill |
| `sms.surfaceBorder` | Card edge | `border-slate-200` | Up from `slate-100` |
| `sms.surfaceShadow` | Card lift | Slightly stronger soft shadow (see §1.2) | Still soft, not Material “card stack” |
| `sms.surfaceNested` | Inner wells on a white card | `bg-slate-50` + `border-slate-100` | Nested must be **lighter or inset**, never same as canvas |

### 1.2 Shadow recipe (v1 candidate)

Keep radius rules (`rounded-[32px]` primary / `rounded-2xl` nested). Replace ultra-weak shadow with something like:

- **Default surface:** soft dual-layer or single mid: e.g. `shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]`
- **Modals / drawers:** existing stronger overlay is fine; do not flatten them to match cards

Pick one recipe in Phase 0 and bake it into `SMS_SHADOW_SURFACE` / `surfaceClass` so drift stops.

### 1.3 What *not* to do

- Do **not** only darken canvas to `slate-200` app-wide (feels muddy next to white).
- Do **not** only thicken every border to `slate-300` (looks boxed / admin-template).
- Do **not** use colored canvas washes (cream/terracotta/purple) — conflicts with brand rules.
- Do **not** put `bg-slate-50` nested panels on a `bg-slate-50` page without a white parent card (hierarchy collapses).

### 1.4 Decision matrix (choose in Phase 0 review)

| Option | Canvas | Surface border | Shadow | Pros | Cons |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A — Canvas step (recommended default)** | `slate-100` | `slate-200` | Mild bump | Fast global win via Layout + tokens | Nested `slate-50` wells need audit |
| **B — Surface-only** | keep `slate-50` | `slate-200` + stronger shadow | Bigger bump | Less page-tone change | Weak on washed screens |
| **C — Both (max clarity)** | `slate-100` | `slate-200` | Dual-layer shadow | Clearest separation | Must recheck empty states & dense tables |

**Recommendation:** Ship **Option A** as default; allow Option C if Phase 1 review still finds cards hard to see on target devices (low-end laptop / bright-room demos).

---

## 2. Surface hierarchy rules (after the fix)

Document these as non-negotiable in `FRONTEND_GUIDELINES.md`:

1. **Page canvas** = `sms.canvas` only (Layout `<main>`, public shells, empty page chrome).  
2. **Interactive / content containers** (forms, lists, stats, drawers) = white `sms.surface` + border + shadow.  
3. **Nested regions inside a card** (summary strips, disabled wells) = `sms.surfaceNested` (`slate-50`), never raw canvas color alone on the page.  
4. **Full-bleed dark bands** (landing hero, slate-950 chrome) stay dark — they already separate; do not gray-wash them.  
5. **Tables:** keep white/header; zebra rows may use `slate-50/80` *inside* a bordered surface, not on bare canvas.  
6. **Landing:** section canvas may use white ↔ `slate-100` alternating bands so white product cards still lift; avoid white-on-white sections.

---

## 3. Inventory (where to apply)

### 3.1 Global shells (highest leverage)

| Area | Files / pattern | Change |
| :--- | :--- | :--- |
| Authenticated Layout main | `src/components/Layout.tsx` | Canvas token on outer / main |
| `PageShell` | `src/components/ui` | Ensure shell does not fight canvas |
| `surfaceClass` / shadows | `src/components/ui/tokens.ts` | Border + shadow recipe |
| Stub / empty | `StubFeaturePage`, empty surfaces | Match new surface tokens |

### 3.2 Public / marketing

| Area | Notes |
| :--- | :--- |
| Landing page sections | Card-hosting bands use `bg-slate-100`; white cards + `border-slate-200`. Avoid `bg-white` sections that only hold white cards (Audience, How it works, FAQ, modules, pricing compare). |
| Login | Specialty background — ensure **card** still lifts vs any light wash |
| Register school | Centered form on light canvas — primary beneficiary |
| Pricing / modules / error pages | Same canvas/surface pattern |

### 3.3 App feature pages

Any page using `bg-slate-50` page + `bg-white` `rounded-[32px]` cards: dashboard, settings, fees, registrar, onboarding, platform guide, etc. Prefer migrating through **shared tokens** rather than hunting every class by hand — then add a drift guard (Phase 3).

---

## 4. Phased delivery

### Phase 0 — Spec & sample (½–1 day)

- Lock Option A vs C with 2–3 screenshot comps: Login card, Register form, School dashboard, one Settings form, one Landing section.  
- Update token names in `FRONTEND_GUIDELINES.md` §4 (canvas = `slate-100` as canonical; `slate-50` reserved for nested).  
- Define exact shadow string once.  
- **Exit:** Written token table + approved comps (even if comps are a small static playground).

### Phase 1 — Token + shell cutover (1–2 days)

- Change `SMS_SHADOW_SURFACE`, `surfaceClass.*`, and Layout / public register/login shells to new canvas + surface border/shadow.  
- Update `PageShell` / `Surface` primitives if present.  
- Smoke: login, register, dashboard, settings general, landing home.  
- **Exit:** Global shells use new tokens; no mixed weak canvas + weak border on those routes.

### Phase 2 — Drift pass on high-traffic pages (2–3 days)

- Grep / audit for `bg-slate-50` used as **page** background vs **nested** well; fix misuses.  
- Landing: ensure white cards sit on `slate-100` (or darker) bands, not white-on-white.  
- Touch: dashboard widgets, fees chrome, registrar chrome, onboarding, platform guide.  
- **Exit:** Listed routes pass “arm’s length” test (card readable without squinting).

### Phase 3 — Guards & docs (1 day)

- Extend `test:ui-primitives` / `test:ui-drift` (or a small new check) to forbid deprecated patterns, e.g.:  
  - page-level `bg-slate-50` in Layout/PageShell (prefer canvas token)  
  - `surfaceClass` still using `border-slate-100` + old shadow string  
- Update `docs/UI_VISUAL_BASELINES.md` with a “canvas vs surface” checklist item.  
- Link from `IMPLEMENTATION_STATUS.md`.  
- **Exit:** CI fails on token regression; guidelines match code.

### Phase 4 — Optional polish (as needed)

- Slightly stronger modal/drawer dim vs new canvas.  
- Print / report-card paper stays pure white on white print context (exclude from canvas rules).  
- Density modes: confirm compact tables still separate.

---

## 5. Acceptance criteria

### Must

- [x] On a mid-range laptop display, white forms/cards are obviously separate from the page background at normal viewing distance.  
- [x] Canonical tokens live in `tokens.ts` + `FRONTEND_GUIDELINES.md` (no “mystery gray”).  
- [x] Layout + Login + Register + Dashboard + Settings (General) migrated.  
- [x] Nested wells use `slate-50` *inside* white surfaces, not as the only page fill next to white cards.  
- [x] No new purple/cream/glow themes; Executive Slate preserved.  
- [x] Docs + status updated when phases ship.

### Nice

- [x] Automated drift test for forbidden old shadow / page canvas combo.  
- [ ] Landing section rhythm documented (alternating bands).  
- [ ] Side-by-side before/after screenshots in this plan’s appendix after Phase 1.

### Explicit non-goals

- [ ] Per-school custom canvas colors.  
- [ ] Dark mode.  
- [ ] Redesigning card radius or motion language.

---

## 6. Test plan

| Layer | What |
| :--- | :--- |
| Visual | Arm’s-length review on target devices; optional before/after in `docs/assets/` |
| Unit | Token string constants / drift grep (`test:ui-drift`) |
| Smoke | Login/register form edges clear; floating error toasts still readable |
| A11y | Text focus rings unchanged; text-on-white contrast unchanged (problem is fill-vs-fill) |
| Regression | Report-card print and full-bleed heroes unchanged |

---

## 7. Risks & mitigations

| Risk | Mitigation |
| :--- | :--- |
| `slate-100` canvas makes nested `slate-50` wells look “lifted wrong” | Nest only inside white cards; audit Phase 2 |
| Stronger shadows look dated | Cap opacity; prefer soft dual-layer over large blur |
| One-off pages still use old combo | Drift test + migrate via `surfaceClass` |
| Landing full-bleed photos clash | Photo sections keep their own treatment; only gray/white bands change |

---

## 8. Open decisions (resolve in Phase 0)

1. **Option A vs C** as the shipped default?  
2. Exact shadow CSS string — single soft vs dual-layer?  
3. Should Super Admin chrome match school app canvas exactly? (Recommend **yes**.)  
4. Landing: alternate section fills, or one global `slate-100` under all content sections?

---

## 9. Changelog

### 2026-08-03 — Landing card-hosting bands + skill sync

- **Change:** Audience / How it works / FAQ / Capabilities / Module catalog / Pricing compare use `bg-slate-100` under white cards; FAQ closed items use white surfaces; `sms-ui-consistency` skill + reference updated for Option A tokens and white-on-white ban.
- **Who:** Marketing landing visitors; agents using the UI skill
- **Services:** SPA
- **Status:** done
- **Verify:** `/#audience` — white persona cards clearly lift on gray; skill checklist includes canvas vs surface

### 2026-08-03 — Option A shipped (Phases 0–3)

- **Change:** Canvas `bg-slate-100`; surfaces `border-slate-200` + dual-layer soft shadow; `smsCanvasClass` / `SMS_SHADOW_SURFACE` in `tokens.ts`; Layout + landing/public shells; bulk migrate weak shadow; UI drift forbids legacy `0.015` shadow; guidelines updated.
- **Who:** All SPA users (landing, auth, school, Super Admin)
- **Services:** SPA
- **Status:** done (Option A); Phase 4 polish optional
- **Verify:** Register form / dashboard cards clearly lift off gray page; `npm run test:ui-primitives && npm run test:ui-drift`

### 2026-08-03 — Plan authored

- **Change:** Documented canvas/surface contrast problem, token proposal, hierarchy rules, phases 0–4, acceptance.  
- **Services:** SPA only (planned)  
- **Status:** plan only → superseded by ship entry above  
- **Verify:** Stakeholder pick Option A or C; start Phase 0 comps when approved  

---

## Appendix A — Quick “before / after” mental model

```text
BEFORE                          AFTER (Option A)
┌─────────────────────┐         ┌─────────────────────┐
│ canvas slate-50     │         │ canvas slate-100    │
│  ┌───────────────┐  │         │  ┌───────────────┐  │
│  │ white card    │  │         │  │ white card    │  │
│  │ border-100    │  │         │  │ border-200    │  │
│  │ shadow ~0     │  │         │  │ soft shadow   │  │
│  └───────────────┘  │         │  └───────────────┘  │
└─────────────────────┘         └─────────────────────┘
  (reads as one flat sheet)       (card clearly floats)
```

## Appendix B — Implementation order (when coding starts)

1. Tokens + guidelines  
2. Layout + `surfaceClass`  
3. Login + Register  
4. Dashboard / Settings  
5. Landing bands  
6. Drift tests + remaining greps  
