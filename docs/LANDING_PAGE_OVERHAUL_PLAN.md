# Public marketing landing — Full overhaul plan

> **Status:** Complete (phases 0–5) — 2026-07-30  
> **Scope:** Redesign and restructure the public marketing surface at `/` so it reads as a **professional School Management System** product site: clear information architecture, slick Tailwind + motion UI, comprehensive UX, international-grade trust/accessibility/SEO, and **honest coverage of nearly all live SMS capabilities** (with stub modules labeled truthfully).  
> **Non-goals:** Changing in-app Executive Slate dashboards; inventing fake customer logos, fake metrics, or “system health” telemetry; selling features that do not exist; building a separate CMS.  
> **Companion:** `docs/APP_FEATURES_OVERVIEW.md`, `FRONTEND_GUIDELINES.md`, `docs/I18N_PLAN.md`, `docs/RESPONSIVE_UI_PLAN.md`, `ONBOARDING_AND_ADMISSION_PLAN.md`, `IMPLEMENTATION_STATUS.md`  
> **Owning surface:** SPA only — `src/features/landing/**`, `src/pages/Landing.tsx`, `public/marketing/**`, `index.html` meta, `public` i18n namespace (`landing.*`)  
> **Stack:** React 18 + Vite + Tailwind + `motion/react` + `lucide-react` + existing `public` locale files (7 languages + RTL)

### Changelog (2026-07-30) — Phases 0–5 shipped

| Phase | Delivered |
| :--- | :--- |
| 0 | Content maps: `content/pillars.ts`, `modules.ts`, `tourSlides.ts`, `faqs.ts`, `personas.ts` + full EN `public.landing.*` |
| 1 | Slim campus-only hero; skip link; sticky mobile CTA; trust strip; nav anchors for tour/FAQ |
| 2 | 8 capability pillars; keyboard product tour with 8 decorative previews |
| 3 | Grouped/filterable module catalog (live + stub specialists); 8 role personas; 5 workflows |
| 4 | FAQ accordion; platform trust band; SEO/OG/JSON-LD in `index.html`; `i18n-fill-leaves` |
| 5 | `e2e/landing.spec.ts`; docs; `frontend-spa` rebuild |

**Verify:** Open `http://localhost:8080/` logged out — hero (no product mock), tour tabs, module filters, FAQ, Register/Sign in; switch language; Arabic RTL.

---

## 0. Product intent (plain English)

Gnet SMS already has a public landing at `/` with a campus hero, capability cards, a flat module chip grid, workflows, platform depth, how-it-works, audience, and CTAs to **Register school** / **Sign in**. It is a solid first pass, but it still under-represents the product: modules are shallow labels, deep academic/finance/ops/parent flows are not *shown*, specialty stubs are invisible, and the page does not yet meet the bar of an international EdTech marketing site (IA density, feature storytelling, SEO, a11y, performance, mobile polish).

**Definition of done for this program:** A visitor who lands on `/` (any supported locale, including Arabic RTL) understands in under two minutes that this is a full school OS — admissions through report cards, fees, payroll, classrooms, parent/PTA, ops — can scan every major live capability, trust the honesty of what is shipping vs stub, and convert to register or sign in without friction. The page must look intentional and premium on phone and desktop, pass WCAG 2.2 AA for the marketing chrome, and ship with i18n parity + Playwright smoke.

---

## 1. Current state (audit snapshot 2026-07-30)

### 1.1 What exists

| Piece | Path | Notes |
| :--- | :--- | :--- |
| Route | `/` → `src/pages/Landing.tsx` → `src/features/landing/Page.tsx` | Signed-in users redirect to dashboard (keep) |
| Nav | `LandingNav.tsx` | Floating pill bar (TrustLine), section links, locale, Sign in / Register |
| Hero | `Hero.tsx` + `HeroOrbitCards.tsx` | TrustLine-style centered hero + floating orbit cards + pill nav |
| Capabilities | `Capabilities.tsx` | 4 pillars only: Admissions, Academics, Finance, Ops |
| Modules | `ModuleMap.tsx` | ~24 flat chips; title only, no descriptions / grouping |
| Workflows | `Workflows.tsx` | 4 numbered journeys |
| Platform | ~~`PlatformDepth.tsx`~~ removed | Removed from landing (2026-07-31); tenancy/trust covered elsewhere |
| How it works | `HowItWorks.tsx` | 3 steps |
| Audience | `Audience.tsx` | Leadership / Teaching / Family |
| CTA + footer | `CtaBand.tsx`, `LandingFooter.tsx` | Convert + legal-ish links |
| Motion / fonts | `motion.ts`, `index.css` `.landing-root` | Plus Jakarta + Fraunces; grain; reduced-motion |
| i18n | `public:landing.*` | Wired in all 7 locales (leaf quality varies) |
| Asset | `public/marketing/hero-campus.jpg` | Single hero photo |

### 1.2 Gaps vs a professional SMS landing

| Area | Today | Gap |
| :--- | :--- | :--- |
| **Feature coverage** | 4 pillars + flat chips | Missing deep stories for gradebook, online exams, report cards (LR + international), bulk import, documents, PTA, notifications, transcripts, reports, specialty campus modules (honest stubs) |
| **Storytelling** | Abstract bullets | No interactive / tabbed product showcases that *look like* the real app surfaces |
| **Information architecture** | Long single scroll, weak hierarchy | Needs clear chaptering: Promise → Proof → Domains → Roles → Trust → Convert |
| **Hero composition** | Campus + large ProductMock | Busy for first viewport; brand/headline/CTA compete with mock |
| **Trust / international** | Platform cards only | No security/privacy summary, no “built for multi-country schools”, no accessibility statement link, thin SEO |
| **SEO / share** | Minimal `index.html` | Need title/description/OG/Twitter, canonical, optional JSON-LD SoftwareApplication |
| **UX polish** | Good motion basics | Missing skip-link, focus order audit, sticky CTA on mobile, FAQ, “Explore features” deep anchors |
| **Honesty** | No stub callouts | Library/clinic/hostel/etc. absent — either omit or label “coming / stub” per product honesty rules |
| **i18n** | Keys exist | Overhaul will add many keys; need `i18n:check` + native-quality English source first |
| **Perf** | Full hero JPG always | Need responsive image sizes, lazy below-fold, font subset/preload strategy |

### 1.3 Inventory source of truth

All marketed features must map to **live** product surfaces in `docs/APP_FEATURES_OVERVIEW.md` (and linked domain plans). Do not invent capabilities.

---

## 2. Design principles (non-negotiable)

### 2.1 Brand & first viewport

Aligned with marketing UI rules used for this product:

1. **One composition** — first viewport is a single marketing moment, not a dashboard collage.
2. **Brand first** — “Gnet SMS” is the hero-level signal; headline supports it, never overpowers it.
3. **Hero budget** — brand, one headline, one short supporting sentence, one CTA group, **one** dominant visual plane (campus full-bleed). Product chrome lives **below** the fold or as a secondary reveal after scroll — not competing with the hero photo as a second equal weight.
4. **No hero overlays** — no floating badges, fake KPI chips, or sticker callouts on the campus image.
5. **No cards in the hero.**
6. **Avoid AI-default looks** — no purple-on-white cliché, no cream+terracotta broadsheet, no glow spam, no emoji, no fake telemetry.

### 2.2 Visual system (landing-specific, still SMS family)

| Token | Direction |
| :--- | :--- |
| Canvas | `slate-50` sections alternating with white and occasional `slate-950` trust bands |
| Brand action | Platform blue `#2563EB` (`blue-600` / existing public indigo remap rules) — **not** school brand colors on `/` |
| Display type | Keep Fraunces (or equivalent expressive serif) for section titles; Plus Jakarta for body |
| In-app preview chrome | May echo Executive Slate (`rounded-[32px]`, slate borders, indigo accents) so demos feel like the real product |
| Icons | `lucide-react` only |
| Motion | `motion/react` only; intentional 2–3 signature motions (hero entrance, section reveal, one interactive showcase); respect `prefers-reduced-motion` |

### 2.3 Honesty & international standards

| Standard | Requirement |
| :--- | :--- |
| **WCAG 2.2 AA** | Contrast on text/CTAs; visible focus; skip to content; keyboard nav for tabs/accordions; meaningful alt / decorative `aria-hidden` |
| **Honest marketing** | Live features labeled as available; stub specialty modules either omitted or marked “Limited / coming soon” with no fake screenshots of backends that do not exist |
| **i18n + RTL** | All new copy via `public:landing.*`; layout uses logical properties (`ps`/`pe`/`start`/`end`); Arabic smoke |
| **Privacy / trust** | Short, plain “How we handle school data” band — no legal fiction; link to real policy pages when they exist |
| **SEO** | Unique title + meta description; Open Graph; Twitter card; `lang`/`dir` already from i18n; optional JSON-LD |
| **Performance** | LCP hero optimized; below-fold lazy; no layout thrash; target Lighthouse marketing score ≥ 90 on desktop (stretch on mobile) |
| **Responsive** | Usable 320–1440px; sticky mobile CTA; nav drawer already present — keep and harden |

### 2.4 Relationship to in-app UI

- Landing may use **landing fonts** and bolder marketing rhythm.
- Product **previews** should visually rhyme with Executive Slate so visitors recognize the app after login.
- Do **not** pull `Layout` / sidebar into `/`.

---

## 3. Target information architecture

Proposed single-page chapters (anchor IDs stable for nav + deep links):

```text
#top
  └─ Nav (sticky)
  └─ Hero                          #product
  └─ Social proof / continuity     #trust-strip   (quiet line — no fake logos)
  └─ Capability domains            #capabilities  (expanded pillars)
  └─ Interactive product tour      #tour         (NEW — tabbed real-feature demos)
  └─ Full module catalog           #modules       (grouped, searchable/filterable)
  └─ Role journeys                 #audience      (expanded personas)
  └─ End-to-end workflows          #workflows
  └─ Platform & trust              #platform
  └─ How schools go live           #how-it-works
  └─ FAQ                           #faq           (NEW)
  └─ Final CTA                     #get-started
  └─ Footer
```

**Nav labels (desktop):** Product · Capabilities · Tour · Modules · Roles · Platform · FAQ  
Keep primary CTAs always visible: **Register school** (primary), **Sign in** (secondary). Optional tertiary: **Explore modules** → `#modules`.

---

## 4. Feature coverage map (what the landing must include)

Every row must appear somewhere on the page (pillar detail, tour slide, module catalog, or role journey). Source: `docs/APP_FEATURES_OVERVIEW.md`.

### 4.1 Domain pillars (Capabilities — expand from 4 → 8)

| Pillar ID | Title (EN intent) | Live features to call out |
| :--- | :--- | :--- |
| `admissions` | Admissions & enrollment | Public apply, waitlist, registrar funnel, enrollment saga, bulk student import, transcripts / student records |
| `academics` | Teaching & curriculum | Curriculum, classrooms admin, My Classes workspace, lesson plans, class schedules, academic calendar |
| `assessment` | Exams & grades | Exams, exam paper approval, online exams, gradebook, grade review, report cards (Liberian + international packs), My Grades |
| `attendance` | Attendance | Teacher roll call, instructional-day gate, parent/student view, staff summary → payroll hooks |
| `finance` | Fees, expenses & payroll | Fee templates / scope / partial payments, checkout, expenses, payroll/payslips, QR receipts + public verify |
| `people` | Staff, roles & leave | Staff directory, bulk staff import, Roles & Access, leave requests/approvals, staff portal |
| `comms` | Communications & family | Announcements, documents, notifications bell, parent portal / My Children, PTA |
| `operations` | Campus operations | Work orders, facilities hub, procurement, security incidents; **specialty stubs** called out honestly (library, clinic, hostel, cafeteria, transport, athletics, counseling) |

### 4.2 Interactive product tour slides (Phase 2)

Each slide = short copy + **styled product frame** (static/decorative UI mirroring real pages — not live API data). Prefer 6–8 slides max:

| Slide | Mirrors |
| :--- | :--- |
| Registrar admissions queue | Admissions / Registrar chrome |
| Classroom stream & classwork | My Classes |
| Gradebook spreadsheet | Gradebook period sheet |
| Online exam take | Online exam student UI (honest: lockdown exists) |
| Fee ledger + pay | Fees parent/accountant |
| Parent family hub | Parent dashboard / children |
| Facilities work order | Work orders / maintenance |
| Report card booklet preview | Report card templates (print chrome, not full PDF engine) |

### 4.3 Module catalog (Phase 3) — complete vs today

**Keep / expand** existing chips and **add** at least:

| Module | Status label on landing |
| :--- | :--- |
| Online exams | Live |
| Grade review | Live |
| Exam paper review | Live |
| Bulk import (students/staff) | Live |
| Documents library | Live |
| PTA | Live |
| School reports | Live |
| Transcripts | Live |
| Receipt verify (public) | Live |
| Academic calendar wizard | Live |
| Roles & Access | Live |
| Library, Clinic, Counseling, Athletics, Hostel, Cafeteria, Transport | **Stub / limited** — grouped under “Campus specialists” with plain copy |

Catalog UX: group by pillar; optional client-side filter chips; each item has **title + one-line description** (not title-only).

### 4.4 Role journeys (Audience — expand)

| Persona | What they see highlighted |
| :--- | :--- |
| School leadership (Admin / Principal / VP) | Setup checklist, roles, reports, oversight |
| Registrar | Admissions, enrollment, students, schedules |
| Teachers | Classes, lesson plans, attendance, gradebook, exams |
| Students | Schedule, classes, grades, exams, fees, attendance |
| Parents / guardians | Children hub, fees, grades, news, PTA |
| Finance (Accountant) | Fees, expenses, payroll |
| Ops specialists | Work orders, facilities, security (and stub specialties) |
| Platform (Super Admin) | Multi-school registry — short mention only |

### 4.5 Workflows (refresh copy, keep 4–6)

Suggested journeys (map to real sagas):

1. Register school → invite admins → setup checklist → go live  
2. Online apply → admit → enroll into class → classroom membership  
3. Teach week → attendance → gradebook → grade review → report cards  
4. Invoice fees → parent checkout → receipt verify  
5. Staff leave → approval → payroll period  

### 4.6 Platform & trust band

Retain and deepen: multi-tenant schools, role RBAC + school capability overrides, onboarding/invites, QR receipts, 7-language UI + RTL, security posture (auth, role guards, honest empty states). Add: country/timezone-aware school profile, brand color after login (not on public landing).

---

## 5. UX specification

### 5.1 Navigation & wayfinding

- Sticky nav with active section via `IntersectionObserver` (already present — extend IDs).
- Mobile: full-height drawer; CTAs pinned at bottom of drawer.
- **Skip to main content** link as first focusable element.
- Deep links: `/#tour`, `/#modules?group=finance` (query optional Phase 3).

### 5.2 Conversion paths

| Intent | Primary CTA | Secondary |
| :--- | :--- | :--- |
| New school | `/register-school` | Scroll to How it works |
| Existing user | `/login` | — |
| Explore | `#tour` / `#modules` | — |

Mobile: after scrolling past hero, show a slim sticky bottom bar (Register / Sign in) that dismisses near `#get-started` to avoid double CTAs.

### 5.3 Interaction patterns

| Pattern | Use |
| :--- | :--- |
| Tabbed tour | Keyboard arrows + tabs; `aria-selected`; swipe optional on touch |
| Accordion FAQ | One open at a time or multi; focus management |
| Module filter | Pressable chips; `aria-pressed` |
| Reveal on scroll | Existing `Reveal` / stagger — keep duration calm (~0.2–0.45s) |
| Reduced motion | Disable parallax, float, infinite scroll cues |

### 5.4 Empty / error honesty on marketing

- Product frames are decorative (`aria-hidden` or labeled “Product preview”).
- Never show fabricated revenue charts or “1,284 students online”.
- Continuity strip may say what the product *does* (“Built for K–12 and multi-campus schools”) — not fake customer counts.

### 5.5 Accessibility checklist (gate for ship)

- [ ] Color contrast AA for all text/CTA states  
- [ ] Focus visible on nav, tabs, filters, FAQ, CTAs  
- [ ] Landmark roles: `header`, `main`, `footer`, section headings hierarchical  
- [ ] Locale select associated with visible/accessible name  
- [ ] Motion respects `prefers-reduced-motion`  
- [ ] Hit targets ≥ 44px on mobile nav/CTAs  

---

## 6. Technical architecture

### 6.1 File layout (target)

```text
src/features/landing/
  Page.tsx                 # section composition only
  motion.ts                # shared variants
  content/
    pillars.ts             # pillar meta + i18n keys
    modules.ts             # full catalog + group + status
    tourSlides.ts          # tour config
    faqs.ts
    personas.ts
  components/
    LandingNav.tsx
    Hero.tsx               # slim hero — campus only
    TrustStrip.tsx         # NEW
    Capabilities.tsx       # 8 pillars
    ProductTour.tsx        # NEW — tabs + frames
    previews/              # NEW — one frame component per slide
      AdmissionsPreview.tsx
      ClassroomPreview.tsx
      GradebookPreview.tsx
      ...
    ModuleCatalog.tsx      # replace ModuleMap
    Workflows.tsx
    Audience.tsx           # role journeys
    PlatformDepth.tsx
    HowItWorks.tsx
    Faq.tsx                # NEW
    CtaBand.tsx
    StickyMobileCta.tsx    # NEW
    LandingFooter.tsx
    Reveal.tsx
    LandingCta.tsx         # shared button/link
public/marketing/
  hero-campus.jpg          # keep + add responsive variants
  hero-campus-800.webp     # Phase 4
  og-cover.jpg             # Phase 4 SEO
```

### 6.2 i18n

- All user-visible strings under `public.landing.*`.
- English is source of truth; run `npm run i18n:check` after key adds; fill leaves via existing fill script or explicit translations.
- Do not hardcode EN in preview chrome labels — either i18n or keep previews purely visual with `aria-hidden` and no readable fake names that need translation (prefer generic labels that are translated).

### 6.3 SEO (`index.html` + optional react-helmet-async only if already in stack)

Prefer updating `index.html` defaults for `/` and keep SPA simple unless a head manager already exists:

| Tag | Intent |
| :--- | :--- |
| `<title>` | Gnet SMS — School Management System |
| meta description | One sentence covering academics, fees, families, operations |
| og:title / og:description / og:image | Share card |
| twitter:card | `summary_large_image` |
| JSON-LD | `SoftwareApplication` + `Organization` (factual) |

### 6.4 Performance

- Hero: `<img>` with `fetchpriority="high"`, width/height or aspect box, WebP/AVIF sources.
- Below-fold sections: lazy mount heavy preview trees (`React.lazy` + intersection) optional in Phase 4.
- Fonts: preload display/sans woff2 already if present; avoid extra families.
- No autoplaying video in v1.

### 6.5 Routing / auth

- Keep: unauthenticated `/` shows landing; authenticated redirect to school/super-admin home.
- Footer links: Login, Register school, Receipt verify example path only if useful (`/verify/receipt/...` needs a code — prefer omit or link to docs).

---

## 7. Phased delivery

### Phase 0 — Foundations & content model (0.5–1 day)

**Goal:** Freeze IA, content keys, and design tokens before large JSX rewrites.

| Deliverable | Detail |
| :--- | :--- |
| Content TypeScript maps | `pillars`, `modules`, `tourSlides`, `faqs`, `personas` with i18n key refs |
| Status labels | `live` \| `stub` enum for modules |
| Nav ID contract | Document anchor list in this plan §3 |
| Design notes | Hero slimmed; blue/slate/landing fonts confirmed |
| Copy draft (EN) | Write all new English strings in locale file |

**Acceptance**

- [ ] Content maps cover §4 feature matrix  
- [ ] No UI rewrite yet required beyond stub imports if needed  
- [ ] EN keys added; `i18n:check` passes or only warns known fills  

---

### Phase 1 — Structure & hero/nav rewrite (1–2 days)

**Goal:** New page skeleton, slim professional hero, upgraded nav/CTA UX.

| Work | Detail |
| :--- | :--- |
| `Page.tsx` | New section order per §3 |
| `Hero.tsx` | Remove competing ProductMock from first viewport; full-bleed campus; brand + headline + body + CTAs + quiet bridge line |
| Optional | Soft scroll cue only |
| `LandingNav.tsx` | New anchors; skip link; harden mobile drawer |
| `StickyMobileCta.tsx` | Post-hero convert bar |
| `TrustStrip.tsx` | One quiet continuity row (multi-country, roles, languages — no fake metrics) |
| Remove / relocate | `ProductMock` → first tour slide or delete |

**Acceptance**

- [ ] First viewport passes brand test (remove nav → still obviously Gnet SMS)  
- [ ] No cards/overlays on hero media  
- [ ] Mobile nav + sticky CTA usable at 375px  
- [ ] Locale switch still works  

---

### Phase 2 — Capability pillars + interactive product tour (2–3 days)

**Goal:** Visitors *see* the SMS, not only read bullets.

| Work | Detail |
| :--- | :--- |
| `Capabilities.tsx` | 8 pillars; richer points; deep-link `id`s |
| `ProductTour.tsx` | Tabs + keyboard; 6–8 preview frames |
| `previews/*` | Decorative Executive-Slate-like frames; `aria-hidden` on chrome; section has accessible title/description |

**Acceptance**

- [ ] Each pillar maps to §4.1  
- [ ] Tour covers admissions, classroom, gradebook, fees, parent, at least one of exams/report cards/ops  
- [ ] Keyboard-only tour works  
- [ ] Reduced motion: no continuous float on previews  

---

### Phase 3 — Full module catalog + roles + workflows refresh (1–2 days)

**Goal:** Comprehensive feature coverage without a wall of undifferentiated chips.

| Work | Detail |
| :--- | :--- |
| Replace `ModuleMap` | Grouped catalog + filter chips + one-line descriptions + stub group |
| `Audience.tsx` | Expand personas per §4.4 |
| `Workflows.tsx` | Refresh to 5 journeys in §4.5 |
| Cross-links | Module → pillar anchor; persona → tour slide |

**Acceptance**

- [ ] Every live feature in §4 appears in catalog or tour  
- [ ] Stub modules visually distinct and honest  
- [ ] Filter works with keyboard  

---

### Phase 4 — Platform, FAQ, SEO, performance, a11y pass (1–2 days)

**Goal:** International professional bar.

| Work | Detail |
| :--- | :--- |
| `PlatformDepth.tsx` | Deepen trust copy; security/i18n/receipts/tenancy |
| `Faq.tsx` | 6–10 questions (register school, roles, languages, fees/receipts, parent access, data honesty) |
| `CtaBand` / footer | Align links; year; product name |
| SEO | `index.html` + `og-cover` asset |
| Perf | Hero responsive images; lazy below-fold previews if needed |
| A11y | Full §5.5 checklist |
| i18n | Translate or fill all new keys for 7 locales; RTL spot-check |

**Acceptance**

- [ ] Lighthouse accessibility ≥ 90 on `/`  
- [ ] OG tags present  
- [ ] `i18n:check` clean for new keys  
- [ ] Arabic RTL: nav, hero gradient, CTAs mirrored correctly  

---

### Phase 5 — Hardening, tests, docs (0.5–1 day)

| Work | Detail |
| :--- | :--- |
| Playwright | `e2e/landing.spec.ts` — loads `/`, nav anchors, locale switch, register CTA href |
| Unit (optional) | Pure helpers for module filter |
| Docs | Update this plan status; `APP_FEATURES_OVERVIEW` public row; `FRONTEND_GUIDELINES` landing note if tokens change |
| Rebuild | `docker compose up --build -d frontend-spa` |

**Acceptance**

- [ ] Playwright smoke green (or documented skip unless `E2E_ENABLED`)  
- [ ] Manual checklist §9 signed off  
- [ ] Plan status → Complete  

---

## 8. Copy guidelines

- Plain English; school-admin readable; no sci-fi (“Chronos Bio-Metrics”).
- Prefer verbs schools use: admit, enroll, take attendance, publish grades, collect fees, approve leave.
- CTAs: **Register your school** / **Sign in** — consistent everywhere.
- Stub copy: “Shown in the role menu today; full workflows are still rolling out.” — never “AI-powered campus twin.”

---

## 9. Acceptance / verify (program-level)

### 9.1 Functional

- [ ] `/` renders for logged-out users; logged-in redirect unchanged  
- [ ] All nav anchors scroll to sections  
- [ ] Register → `/register-school`; Sign in → `/login`  
- [ ] Language picker updates entire landing; Arabic `dir=rtl`  
- [ ] Module catalog lists live + stub groups  
- [ ] Product tour operable by keyboard  

### 9.2 Content honesty

- [ ] No fake metrics, logos, or live student counts  
- [ ] Stub modules labeled  
- [ ] Claims match `APP_FEATURES_OVERVIEW.md`  

### 9.3 Quality

- [ ] WCAG AA spot-check (contrast, focus, skip link)  
- [ ] 375 / 768 / 1280 layouts without horizontal page scroll  
- [ ] `npm run i18n:check`  
- [ ] `docker compose up --build -d frontend-spa` + smoke open `http://localhost:8080/`  

### 9.4 Out of scope regressions

- [ ] Login, register-school, apply, invite pages unchanged except shared footer/link consistency if touched  
- [ ] In-app Layout / brand theming unchanged  

---

## 10. Effort & sequencing summary

| Phase | Focus | Est. |
| :--- | :--- | :--- |
| 0 | Content model + EN copy | 0.5–1 d |
| 1 | Hero / nav / skeleton / sticky CTA | 1–2 d |
| 2 | Pillars + product tour | 2–3 d |
| 3 | Module catalog + roles + workflows | 1–2 d |
| 4 | FAQ / SEO / perf / a11y / i18n | 1–2 d |
| 5 | Tests + docs + rebuild | 0.5–1 d |
| **Total** | | **~6–11 days** |

Suggested ship cadence: **Phase 1+2** as first visible milestone (professional hero + tour); **Phase 3–5** as coverage + international hardening.

---

## 11. Risks & mitigations

| Risk | Mitigation |
| :--- | :--- |
| Page becomes endless feature dump | Grouped catalog + tour max 8 slides; FAQ for detail |
| Preview frames drift from real UI | Reference screenshots from running app; label as preview |
| i18n lag across 7 locales | EN first; `i18n-fill-leaves` then native pass for FR/AR priority |
| Perf regression from many previews | Lazy-mount tour panels; CSS-only frames preferred over images |
| Over-promising stubs | Dedicated “Campus specialists” stub group only |

---

## 12. Explicit non-goals

- Customer logo wall or fabricated testimonials  
- ~~Pricing page / Stripe billing for the platform itself~~ — **done (page) / partial (billing):** dedicated `/pricing` with live list prices; Stripe SaaS checkout still out of scope for landing CTAs
- Live demo tenant embedded in iframe  
- Blog / CMS / case studies (can link later)  
- Changing school brand application on public `/`  
- Replacing Fraunces/Jakarta without a deliberate type redesign pass  

---

## Change log

### 2026-07-31 — Landing skeleton loading

- **Change:** Skeleton fallbacks for home / pricing / modules route chunks and below-fold sections; pricing plan cards skeleton while `GET /api/public/plans` loads; gallery mosaic/thumb image pulse until `onLoad`.  
- **Services:** `frontend-spa`  
- **UI:** `src/features/landing/components/skeletons.tsx`  
- **Status:** done  
- **Verify:** Throttle network → `/`, `/pricing`, `/modules` show blue/slate skeletons before content

### 2026-07-31 — Dedicated modules page

- **Change:** Move module domain catalog off the home landing into **`/modules`**. Home nav/footer link to `/modules`. `/#modules` redirects to `/modules`.  
- **Services:** `frontend-spa`  
- **UI:** `/modules` · `ModulesPage.tsx` · `ModuleCatalog.tsx`  
- **Status:** done  
- **Verify:** `/` has no `#modules` section; `/modules` shows domain explorer; nav Modules → `/modules`

### 2026-07-31 — Dedicated pricing page

- **Change:** Move plans off the home landing into **`/pricing`**; home nav/footer link to `/pricing`. Pricing cards use **3-per-row** grid (`lg:grid-cols-3`), not a single 5-column row. `/#pricing` redirects to `/pricing`.
- **Services:** frontend-spa
- **UI:** `src/features/landing/PricingPage.tsx`, `Pricing.tsx`, `LandingNav`, `LandingFooter`
- **Status:** done
- **Verify:** `/` has no `#pricing` section; `/pricing` shows cards in rows of 3; nav Pricing → `/pricing`

### 2026-07-31 — Plans & entitlements pricing section

- **Change:** Landing `#pricing` section with live catalog from `GET /api/public/plans` (Identity), static fallback, nav/footer links, i18n. Standard plan highlighted. CTAs to `/register-school`.  
- **Services:** `identity`, `api-gateway`, `frontend-spa`  
- **UI:** Originally `#pricing` on `/` — **superseded** by dedicated `/pricing` page  
- **Status:** superseded  
- **Verify:** Logged-out `/pricing`; `curl /api/public/plans`

### 2026-07-30 — Plan created

- **Change:** Full overhaul plan for public `/` landing: IA, 8 pillars, interactive tour, complete module catalog (live + stub), UX/a11y/SEO/i18n/perf phases 0–5.  
- **Services:** SPA `frontend-spa` only  
- **UI:** `src/features/landing/**`  
- **Status:** plan only (superseded by ship below)  
- **Verify:** N/A  

### 2026-07-30 — Phases 0–5 implemented

- **Change:** Shipped professional SMS marketing landing with slim hero, 8 pillars, product tour, full module catalog, roles, workflows, FAQ, SEO, sticky mobile CTA.  
- **Services:** `frontend-spa`  
- **UI / API:** `/`  
- **Status:** done (tour later removed — see below)  
- **Verify:** Logged-out `/`; module Live/Limited filters; locale switch; `E2E_ENABLED=1 npm run test:e2e -- e2e/landing.spec.ts`

### 2026-07-31 — Module catalog domain explorer

- **Change:** Replaced dense filterable module wall with a calm domain explorer (left domain rail / mobile chips + one domain’s modules). Softer headline; removed dotted backdrop and All/Live/Limited pill row.  
- **Services:** `frontend-spa`  
- **UI:** `ModuleCatalog.tsx` · `content/modules.ts` (`MODULE_GROUP_ICONS`) · `public.landing.modules*`  
- **Status:** done  
- **Verify:** Logged-out `/#modules` — pick domains; only one group’s modules shown; hard-refresh after rebuild

### 2026-07-31 — Capabilities light canvas

- **Change:** Removed dark `bg-slate-950` Capabilities band. Cards are white Executive Slate surfaces with per-domain accent (icon/tag/checks); clearer EN headline/body/points.  
- **Services:** `frontend-spa`  
- **UI:** `Capabilities.tsx` · `content/pillars.ts` · `public.landing.capabilities*` / `cap*`  
- **Status:** done  
- **Verify:** Logged-out `/#capabilities` — light section, readable cards; hard-refresh after rebuild

### 2026-07-31 — Remove product tour; Capabilities pattern + parallax band

- **Change:** Removed Product tour section (nav/footer/page/e2e). Capabilities gains a professional grid/dot backdrop. Added full-bleed campus **parallax** band (`#campus`) with Unsplash campus photo at `public/marketing/parallax-campus.jpg`.
- **Services:** `frontend-spa`
- **Status:** done
- **Verify:** Logged-out `/` — no `#tour`; patterned Capabilities; parallax band between Capabilities and Modules

### 2026-07-31 — TrustLine-inspired hero

- **Change:** Hero redesigned as light split layout (airy copy + edge campus visual) inspired by [TrustLine Hero](https://dribbble.com/shots/25215878-TrustLine-Hero-Section). Nav restyled for light canvas. No product mock / sticker overlays.
- **Services:** `frontend-spa`
- **Status:** superseded (see corrected entry below)
- **Verify:** Logged-out `/` — light split hero; nav dark-on-light; CTAs Register / Sign in

### 2026-07-31 — TrustLine hero corrected (centered + orbit cards)

- **Change:** Matched the TrustLine shot composition: floating pill nav, centered headline/CTAs, soft grid, orbiting UI cards with dotted connectors, brand hub badge. Cards use honest school metaphors (no fake conversion %).
- **Services:** `frontend-spa`
- **Status:** done
- **Verify:** Logged-out `/` — centered hero; floating nav; orbit cards visible at ≥lg

### 2026-07-31 — Hero grain + cursor trail + Motion springs

- **Change:** Page-wide soft cursor trail (desktop / fine pointer, respects reduced motion) via [Motion](https://motion.dev/) springs; spring hovers/taps on CTAs and section cards; gentle orbit-card float. Hero film grain removed (will revisit later).
- **Services:** `frontend-spa`
- **Status:** done
- **Verify:** Logged-out `/` — cursor trail on desktop; card spring on hover; no hero grain

---

## Appendix A — Hero image grid (plan + ship)

> **Status:** Done (2026-07-31) — evolved to beauty-style shattered mosaic  
> **Placement:** Directly under `Hero` (`#product`), before `TrustStrip`  
> **Component:** `src/features/landing/components/HeroImageGrid.tsx` · anchor `#gallery`

### A.1 Intent

After the TrustLine-style centered hero, visitors should land on a **visual proof band** — a two-column beauty-site-inspired layout: short copy + three thumbs on the left, and a **shattered photo mosaic** on the right (one education photo continuous across rounded panes with white gutters). SMS accents use **blue/slate** (not maroon/pink).

### A.2 Design rules

| Rule | Detail |
| :--- | :--- |
| Layout | Two-column: copy + CTA + 3 thumbs \| asymmetric shattered mosaic |
| Mosaic | Same `background`/`img` offset per pane so content aligns across gutters; one rotated detail inset |
| Style | Soft radii, white canvas, soft blue/indigo radial glows |
| Motion | `Reveal` / `fadeUp`; arrow badges on thumbs (indigo) |
| Honesty | Real Unsplash education photography only; no fake KPIs |
| Perf | `loading="lazy"`; fixed aspect mosaic box |
| i18n | `public.landing.gallery*` (+ title before/accent/after + CTA + mosaic alt) |
| Responsive | Stack copy → mosaic on small screens |

### A.3 Assets (`public/marketing/grid/`)

| File | Role |
| :--- | :--- |
| `mosaic-main.jpg` | Primary shattered mosaic (students collaborating) |
| `mosaic-detail.jpg` | Rotated inset pane (classroom) |
| `thumb-01…03.jpg` | Left-column thumbnail strip |

### A.4 Acceptance

- [x] Section sits between Hero and TrustStrip  
- [x] Shattered mosaic reads as one photo through panes (desktop)  
- [x] Blue/slate accents (CTA disc, accent word, glows)  
- [x] Lazy-loaded; locale strings  
- [x] `frontend-spa` rebuilt  

### Changelog (2026-07-31) — Hero image grid

- **Change:** Added bento image mosaic (`#gallery`) under Hero with campus photos in `public/marketing/grid/`.  
- **Services:** `frontend-spa`  
- **UI:** `HeroImageGrid.tsx` · `Page.tsx`  
- **Status:** superseded by shattered mosaic below  
- **Verify:** Logged-out `/` — gallery between hero and trust strip; hard-refresh after rebuild  

### Changelog (2026-07-31) — Shattered mosaic gallery

- **Change:** Redesigned `#gallery` to beauty-style two-column band; Unsplash education photos; continuous shattered mosaic + blue accent word/CTA.  
- **Services:** `frontend-spa`  
- **UI:** `HeroImageGrid.tsx` · `public/marketing/grid/mosaic-*.jpg` · `thumb-*.jpg` · `public.landing.gallery*`  
- **Status:** done  
- **Verify:** Logged-out `/` — mosaic panes align on one photo; hard-refresh after rebuild  

### Changelog (2026-07-31) — FAQ professional accordion

- **Change:** FAQ redesigned as two-column layout: sticky intro + register CTA card on the left; numbered accordion cards with open accent rail, badge index, and smooth expand on the right.  
- **Services:** `frontend-spa`  
- **UI:** `Faq.tsx` · `public.landing.faq*` / `faqCta*`  
- **Status:** done  
- **Verify:** Logged-out `/#faq` — open/close items; sticky intro on desktop; hard-refresh after rebuild  

### Changelog (2026-07-31) — Comprehensive `/modules` & `/pricing`

- **Change:** Expand dedicated marketing pages beyond thin catalog/cards: page heroes, modules search + All/Live/Limited filters + `?domain=` deep links, roles strip, FAQs, cross-link bands; pricing shared plans fetch, 8-feature card preview, comparison matrix, entitlements explainer, FAQ. No Stripe SaaS checkout; CTA remains `/register-school`.  
- **Who:** Public visitors / prospective schools  
- **Services:** `frontend-spa` (Identity `GET /api/public/plans` unchanged)  
- **UI:** `ModulesPage.tsx` · `PricingPage.tsx` · `MarketingPageHero` · `MarketingFaq` · `CrossLinkBand` · `ModuleCatalog` · `Pricing` · `PricingCompare` · `PricingEntitlements` · `public.landing.modulesPage*` / `pricingPage*`  
- **Status:** done  
- **Verify:** Logged-out `/modules` (hero H1, search, filters, FAQ → pricing); `/pricing` (hero, cards, `#pricing-compare` matrix, FAQ → modules); hard-refresh after `frontend-spa` rebuild  
