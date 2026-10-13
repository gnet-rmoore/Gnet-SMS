# Multi-language (i18n) support — Plan

> **Status:** Phases 0–6 + full leaf catalogs + **production-complete gate** (2026-07-31) — **fr/hi/zh-Hans full parity remaining** — see `docs/I18N_LOCALE_PARITY_PLAN.md` (draft 2026-08-06). Print report-card / grade-sheet legal layouts remain English until report-card finalize (§6.4). User-authored content is never auto-translated (by design).  
> **Scope:** Full UI localization for **every** SPA page, feature, shared component, public surface, toast/confirm, nav label, empty state, and form — plus school/user language prefs, Arabic RTL, and locale-aware dates/numbers. Extensible catalog starting with **English, French, Arabic, Spanish, German, Chinese, Hindi** (and more without code rewrites).  
> **Companion:** `docs/SCHOOL_SETTINGS_PLAN.md`, `FRONTEND_GUIDELINES.md`, `docs/APP_FEATURES_OVERVIEW.md`, `IMPLEMENTATION_STATUS.md`  
> **UI:** Language picker on Login, Profile, Settings, public pages, and marketing landing; applies immediately across the shell

### Changelog (2026-07-31) — Account language preference hardened

| Surface | Behavior | Verify |
| :--- | :--- | :--- |
| Profile | Prominent **Language preference** card; PATCH `preferredLocale`; applies immediately | Profile → pick Français → all chrome switches |
| Header menu | Language select under avatar; same persist helper | Change language from header; reload / re-login stays FR |
| `GET /api/users/:id` | Returns `preferredLocale` (was omitted — reset prefs to EN on profile load) | Open Profile after setting FR — select still FR |
| Login / Super Admin login | Session includes `preferredLocale`; `changeAppLocale(resolveEffectiveLocale…)` | Set FR → logout → login → UI in FR |
| Identity update | Validates locale against supported set (`INVALID_LOCALE`) | PATCH unsupported code → 400 |

### Changelog (2026-07-31) — AR/ZH/HI production-complete QA gate

| Surface | Behavior | Verify |
| :--- | :--- | :--- |
| `SUPPORTED_LOCALES[].complete` | All 7 locales `complete: true`; incomplete would show `(beta)` in `LanguageSelect` | Language picker |
| `npm run i18n:check` | Hard-fail missing leaves + critical-path EN leftovers for complete locales | Run script |
| Unit QA | AR Arabic / ZH Han / HI Devanagari on auth + students/fees/settings | `npm run test:i18n` |
| Playwright | Login smokes for `fr`, `ar` (`dir=rtl`), `zh-Hans`, `hi` | `E2E_ENABLED=1 … e2e/i18n-locale.spec.ts` |

### Changelog (2026-07-31) — full leaf coverage + runtime wiring fix

| Surface | Behavior | Verify |
| :--- | :--- | :--- |
| Translation memory | `scripts/i18n-data/*.json` — `[en, fr, es, de, ar, zh-Hans, hi]` rows per distinct English string, built by namespace/batch; `scripts/i18n-build-full-locales.ts` compiles them into `src/i18n/catalogs/locales/{code}.ts` (full parallel tree, English fallback only for any leaf not yet in memory — currently none) | `npx tsx scripts/i18n-build-full-locales.ts` → `missing leaves: 0` for all 6 locales |
| Runtime wiring fix | `translations.ts` previously defined `fr`/`ar`/`es`/`de`/`zhHans`/`hi` as fully inline hand-written objects disconnected from the generated `locales/*.ts` catalogs. Now imports each `*Resources` catalog and deep-merges it as the base, with the hand-curated inline object as the higher-priority override (`deepMergeLocale`) — so generated coverage and hand-tuned strings coexist, hand-tuned wins on conflict | Read `src/i18n/catalogs/translations.ts` `localeResources` export |
| Duplicate-key cleanup | `fr` object in `translations.ts` had duplicate `settings`/`lessonPlans`/`onlineExams`/`profile` keys (later literal silently won at runtime, discarding richer content) — merged into single blocks | `tsc --noEmit` — 0 `TS1117` duplicate-property errors in `catalogs/` |
| `localeFill.ts` | Regenerated — empty object for all 6 locales (no leaves fall back to English) | Read `src/i18n/catalogs/localeFill.ts` |
| Tests | `npm run test:i18n`, `npm run test:email-i18n` green; `npm run lint` (`tsc --noEmit`) has 0 errors in `src/i18n/**` | Re-run commands |

### Changelog (2026-07-31) — full locales + email/PDF

| Surface | Behavior | Verify |
| :--- | :--- | :--- |
| SPA catalogs | `src/i18n/catalogs/locales/{fr,es,de,ar,zh-Hans,hi}.ts` — 4,457 leaves/locale, 0 English-fallback leaves in any namespace; deep-merged under hand-curated `translations.ts` overrides at runtime; `localeFill` empty | `npm run i18n:check` (0 warnings); `npx tsx scripts/i18n-build-full-locales.ts` reports 0 missing per locale |
| Identity emails | `services/identity/src/i18n/emailCatalogs.ts` — 6 message types × 7 locales; school default / user preferred | `npm run test:email-i18n`; provision school in `fr` |
| Receipt PDF | `services/finance/src/i18n/receiptChrome.ts` — chrome via school `defaultLocale`; snapshotted in branding | `npx tsx tests/receipt-pdf-i18n.test.ts`; issue fee receipt |
| Remaining toasts | `showToast("…")` under `src/features` / `src/pages` cleared | `rg 'showToast\\("' src/features src/pages` → 0 |

| Surface | Behavior | Verify |
| :--- | :--- | :--- |
| School dashboard | Role stats, quick actions, help guides via `pages.dashboard.*` | Switch to fr; open `/{slug}/dashboard` as admin/teacher/parent/accountant |
| Parent / Accountant / Default panels | KPI labels, charts, shortcuts, empty states translated | Parent + accountant roles |
| Super Admin dashboard | Stats, help guide, registrations table, edit modal, confirms via `pages.superAdmin.*` | `/super-admin` in fr/ar |

| Surface | Behavior | Verify |
| :--- | :--- | :--- |
| Landing `/` | Full copy via `public:landing.*` (en/fr/ar/es/de/zh-Hans/hi); compact language select in sticky nav; campus hero photo at `/marketing/hero-campus.jpg` | Open `/`; switch language in nav; hero + sections update; Arabic flips RTL |

### Changelog (2026-07-30) — Phase 2–5 hardening

| Surface | Behavior | Verify |
| :--- | :--- | :--- |
| Enroll / Edit student modals | Titles, fields, buttons, empty/warn copy via `pages.students` + `common` | Switch to fr; open enroll/edit |
| Add staff modal | Full form + credentials panel via `pages.staff` + `common` | Add staff; labels update |
| Fee TemplateModal | Template create/edit chrome via `pages.fees` | Fees → New template |
| Appearance settings | Section labels via `pages.settings` / `common` | Settings → Appearance |
| StubFeaturePage + PTA unavailable | `common.stubNotAvailable` (+ stub empty copy) | Open Library / PTA when disabled |
| Layout RTL | Logical `ps`/`pe`/`ms`/`start`/`end`/`text-start`; `ChevronRight` `rtl:rotate-180`; `[dir=rtl] .rtl-flip` | Switch to ar; sidebar/header |
| Playwright | `e2e/i18n-locale.spec.ts` French login (skip unless `E2E_ENABLED`) | `E2E_ENABLED=1 npm run test:e2e -- e2e/i18n-locale.spec.ts` |
| Catalog check | `npm run i18n:check` — namespace parity; soft-warn missing leaves | Run script |

### Changelog (2026-07-30) — first SPA wiring

| Surface | Behavior | Verify |
| :--- | :--- | :--- |
| Login | Labels via `auth`/`common`; on success `changeAppLocale(resolveEffectiveLocale({ userPreferred, schoolDefault }))`; API errors via `translateApiError` | Sign in; UI language matches user/school prefs |
| Profile | `LanguageSelect` + `preferredLocale` PATCH `/api/users/:id`; session + `changeAppLocale` | Change language on Profile; reload keeps it |
| Settings → School info | School `defaultLocale` in form + PATCH school; `LanguageSelect` label `schoolDefaultLanguage` | Save school; new users/public pages inherit default |
| Students / Staff / Bulk import | Page chrome, toasts, confirms, modal copy via `pages` + `common` | Switch locale; titles/buttons update |
| Feature page chrome | `useTranslation('pages')` on feature `Page.tsx` files; h1/subtitle from `enPages` (fees, expenses, payroll, attendance, curriculum, classrooms, exams, gradebook, gradeReview, admissions, enrollment, dashboard, calendar, reports, announcements, documents, notifications, workOrders, leaveApproval, staffPortal, roleAccess, lessonPlans, onlineExams, facilities, pta); My Classes uses `nav:items.myClasses` | Switch locale; feature titles/subtitles update |
| Public register / apply / status / invite / receipt / checkout | `public.*` + compact `LanguageSelect`; apply applies school `defaultLocale`; `translateApiError` | Open public routes; switch language without login |
| Super Admin chrome | `pages.superAdmin.*` titles/subtitles; header actions via `common` | `/super-admin/*` titles follow locale |

---

## 0. Product intent (plain English)

Today the entire product UI is **English-only** (hardcoded strings in pages, features, nav, toasts, modals, public apply/login). Schools and families in Liberia and beyond need to use the SMS in their preferred language.

After this work:

1. Any signed-in user can pick a **preferred language**; it persists and applies to **all** chrome and screens they can open.
2. A school can set a **default language** for new users and for public pages (login / apply / register) when no user preference exists.
3. Switching language updates **every** translated surface in the SPA — nav, pages, features, shared components, empty states, validation copy, SweetAlert confirms, toasts — without a full app rewrite per page.
4. **Arabic** (and any future RTL locale) flips layout direction correctly.
5. Dates, times, and money display follow the active locale (while keeping ISO day-keys and API payloads language-neutral).
6. Adding a new language is mostly **adding a JSON catalog**, not editing hundreds of components again.

**Out of scope for MVP (phased later, still designed for):** machine auto-translate of user-authored content (announcements, custom subjects); translating every microservice error string in the backend; translating Liberian/international **print** report-card legal layouts (may stay LTR / English for authenticity — see §6.4).

---

## 1. Current gaps (audit)

| Area | Today | Gap |
| :--- | :--- | :--- |
| i18n library | None (`i18next` / FormatJS not in `package.json`) | Greenfield |
| `index.html` | `lang="en"` fixed | Must follow active locale |
| Auth / Identity | School has `country` + `timezone` only; User has no locale | Need `preferredLocale` / `defaultLocale` |
| Settings | Appearance / School info — no language control | Picker + persist |
| Nav | ~194 English labels in `src/constants/navByRole.ts` | Keys + `t()` |
| Pages / features | ~75 pages, ~39 feature areas, ~25 shared components | Full string extraction |
| Toasts / confirms | ~50+ `showToast`, ~39 `confirmAction` | All via `t()` |
| Dates | `date-fns` + many `toLocaleString` / hardcoded `en-US` | Locale-bound helpers |
| RTL | No `dir`, heavy physical Tailwind (`ml`/`mr`/`left`) | Logical props + `dir=rtl` |
| API errors | ~500 English `{ error: "..." }` strings | Codes → SPA `t('errors.*')` |
| PDFs / email | English subjects/bodies | Phase E |

---

## 2. Supported languages (v1 catalog)

BCP 47 codes. **English is the source of truth** for keys; other locales fill the same key tree.

| Code | Language | Script | Direction | `date-fns` locale |
| :--- | :--- | :--- | :--- | :--- |
| `en` | English | Latin | LTR | `enUS` |
| `fr` | French | Latin | LTR | `fr` |
| `ar` | Arabic | Arabic | **RTL** | `ar` |
| `es` | Spanish | Latin | LTR | `es` |
| `de` | German | Latin | LTR | `de` |
| `zh-Hans` | Chinese (Simplified) | Han | LTR | `zhCN` |
| `hi` | Hindi | Devanagari | LTR | `hi` |

**Extensibility:** `SUPPORTED_LOCALES` array in `src/i18n/locales.ts`. Adding Portuguese / Portuguese-BR / Swahili / etc. = new JSON files + one registry row. Fallback chain: `user → school default → en`.

Display names in the picker are **native** (Français, العربية, Español, Deutsch, 简体中文, हिन्दी) plus English subtitle.

---

## 3. Target architecture

### 3.1 Stack choice

| Choice | Decision |
| :--- | :--- |
| Library | **`i18next` + `react-i18next`** |
| Message format | JSON, ICU-lite via i18next interpolation (`{{name}}`, plurals) |
| Loading | Bundle `en` eagerly; **lazy-import** other locale packs (Vite dynamic `import()`) |
| Namespaces | Split by domain (see §4) so features load only what they need |
| Not chosen | FormatJS / Lingui — heavier migration; no ICU-heavy need for MVP |

### 3.2 Preference resolution

```
effectiveLocale =
  user.preferredLocale
  ?? school.defaultLocale
  ?? browser navigator.language (if in SUPPORTED_LOCALES)
  ?? "en"
```

| Field | Owner | Where set |
| :--- | :--- | :--- |
| `User.preferredLocale` | Identity | Profile → Language; optional Settings |
| `School.defaultLocale` | Identity | Settings → School info / Language |
| Session cache | `authStore` + `i18n.changeLanguage` | On login / me / save |

Public pages (login, school register, public apply, receipt verify): use **school default** when school context is known; else browser / `en`.

### 3.3 Bootstrap (before paint)

1. `src/i18n/index.ts` — create instance, register namespaces, detect initial locale from `localStorage` / auth hydrate.
2. Wrap app in `src/main.tsx`: `<I18nextProvider>` (or `initReactI18next` only).
3. `LocaleDocumentEffect` component: set `document.documentElement.lang` and `dir` (`rtl` for `ar`, else `ltr`).
4. Persist last UI locale in `localStorage` key `sms-locale` for flash-free public pages.

### 3.4 Developer API (mandatory pattern)

```tsx
import { useTranslation } from "react-i18next";

const { t } = useTranslation("students");
<h1>{t("page.title")}</h1>
showToast(t("toast.enrolled"), "success");
```

| Rule | Detail |
| :--- | :--- |
| **No raw user-facing English** in JSX/TS after a feature is migrated | CI lint phase (optional) flags string literals in `src/features/**` / `src/pages/**` |
| Keys | `namespace:dot.path` — stable; never renumber |
| Interpolation | `t("hello", { name })` — never concatenate translated fragments |
| Plurals | i18next plural forms per locale |
| Enums | Map `PENDING` → `t("status.pending")` at display only |
| User content | Announcements, names, custom fee labels — **do not translate** |

---

## 4. Namespace map (covers everything)

One namespace per concern. **Every** page/feature maps into one of these. Shared chrome never duplicates keys.

| Namespace | Covers |
| :--- | :--- |
| `common` | Save, Cancel, Delete, Search, Loading, Yes/No, Close, Back, required, optional, pagination, table empty, copy, download, upload, confirm shell |
| `nav` | All `navByRole` section + item labels; Layout Overview / Notifications |
| `auth` | Login, logout, invite accept, must-change-password, expired session |
| `public` | School register, public apply, slug check, receipt verify |
| `errors` | Mapped API `code` → message; generic fallback |
| `roles` | Role display labels (`STAFF_CREATE_ROLES`, `staffRoleLabel`, capability labels) |
| `settings` | All Settings tabs + language picker |
| `dashboard` | Role dashboards |
| `students` | Students directory, enroll/edit, bulk import strings |
| `staff` | Staff management, add/import staff |
| `registrar` | Admissions, applications, enroll credentials |
| `enrollment` | Class placement |
| `curriculum` | Subjects, grade levels, offerings |
| `classrooms` | Class groups, members |
| `classroomWorkspace` | My Classes feed, posts, topics |
| `attendance` | Roll call, summaries |
| `exams` | Exam list, schedule |
| `examDetails` | Results / history modals |
| `onlineExam` | Take / author / kiosk |
| `examPaper` | Paper approval |
| `gradebook` | Sheets, periods, sync |
| `gradeReview` | Queues, reopen |
| `reportCards` | Template picker UI (not legal print body — §6.4) |
| `academicCalendar` | Wizard + overview |
| `calendar` | School calendar events |
| `classSchedule` | Timetable UI |
| `lessonPlans` | Builder, week board |
| `fees` | Ledger, collect, templates, txn history |
| `expenses` | Overview, budgets, forms |
| `payroll` | Runs, payslips |
| `leave` | Staff portal leave + leave approval |
| `workOrders` | List + detail |
| `facilities` | Hub / maintenance / inventory |
| `documents` | School documents library |
| `announcements` | Composer + reader |
| `notifications` | Bell page + prefs labels for system categories |
| `pta` | PTA org / meetings / RSVP |
| `reports` | School reports + CSV headers UI |
| `roleAccess` | Roles & Access |
| `profile` | Profile / signature / language |
| `superAdmin` | Super-admin pages |
| `bulkImport` | Import wizard copy |
| `security` | Security / ops logs UI if any |
| `stubs` | Honest stub page titles (“not available yet”) |

**Coverage rule:** Migrating a feature means **100%** of user-visible strings in that feature’s files use `t()` — titles, subtitles, buttons, placeholders, aria-labels, empty states, toasts, confirms, table headers, helper text. No “mostly translated” pages ship as Done.

---

## 5. Surface inventory (must all be translated)

### 5.1 Shell & routing

| Surface | Path / notes |
| :--- | :--- |
| Document `lang` / `dir` | `index.html` + runtime effect |
| Layout sidebar + header | `src/components/Layout.tsx` |
| Nav catalog | `src/constants/navByRole.ts` → keys, labels via `t('nav:…')` |
| ProtectedRoute messages | `src/components/ProtectedRoute.tsx` |
| PageShell / PageHeader / ui primitives | `src/components/ui/*` — accept `title` already translated from parents **or** take i18n keys |
| FeatureModalShell | Title/subtitle/eyebrow passed already translated |
| SweetAlert `confirmAction` | Callers pass `t()`; default button labels from `common` |
| PageToast | Message already translated |

### 5.2 Public / unauthenticated

| Surface | Files |
| :--- | :--- |
| Login | `src/pages/Login.tsx` (or equivalent) |
| Super-admin login | SuperAdmin auth |
| School registration | Public register flow |
| Public student apply | Apply pages |
| Invite accept | Invite route |
| Receipt verify | Public receipt page |

### 5.3 School feature modules (complete list)

Translate each end-to-end (Page + components + hooks toasts):

`dashboard`, `students`, `staff-management` / `StaffManagement`, `registrar`, `enrollment`, `curriculum`, `classrooms`, `classroom-workspace`, `attendance`, `exams`, `exam-details`, `online-exam`, `exam-paper`, `gradebook`, `grade-review`, `report-cards` (UI chrome), `academic-calendar`, `calendar-page`, `class-schedule`, `lesson-plans`, `fees`, `expenses`, `payroll`, `leave-approval`, `staff-portal`, `work-orders`, `maintenance` / facilities, `documents`, `announcements`, `notifications`, `pta`, `reports`, `role-access`, `settings`, `student-records`, `bulk-import`, Profile, Counseling/stubs if still shown.

### 5.4 Super Admin

All `src/pages/SuperAdmin/**` — schools list, users, platform chrome.

### 5.5 Shared dictionaries

| Dictionary | Source today | After |
| :--- | :--- | :--- |
| Roles | `src/constants/roles.ts` | `t('roles:TEACHER')` etc. |
| Fee / leave / WO statuses | Scattered English maps | `status.*` keys per namespace or `common.status.*` |
| Capability labels | Role access UI | `roles` / `roleAccess` namespace |
| Country names | `countries-list` | Prefer library locale if available; else leave English country names in v1 with note |

---

## 6. Cross-cutting rules

### 6.1 Dates, numbers, money

| Concern | Approach |
| :--- | :--- |
| Display dates | `src/i18n/format.ts` → `formatDate(d, pattern)` using `date-fns` + locale map |
| Relative time | `formatDistanceToNow` with locale |
| Money | `formatMoney(amount, currency)` via `Intl.NumberFormat(effectiveLocale, { style: 'currency' })` |
| Day keys / API | Keep `YYYY-MM-DD` / ISO — **never** locale-format identifiers |
| Kill | Hardcoded `"en-US"` in UI paths |

### 6.2 Forms & validation

| Concern | Approach |
| :--- | :--- |
| Placeholder / label | `t()` |
| Zod / RHF | Build schemas with translated messages **inside** the component/hook using `t`, or map error codes |
| Required asterisk | `common.required` |

### 6.3 API / backend errors

**Do not** translate 500 English strings inside each microservice for v1.

1. Prefer returning `{ code: "EMAIL_EXISTS", error: "…" }` (English for logs).
2. SPA: `translateApiError(err)` → `t(\`errors:${code}\`)` if key exists, else `t('errors:generic')`.
3. Gradually add codes to high-traffic paths (auth, fees, enroll, import).
4. Emails (welcome, invite): Phase E — template per locale or school default.

### 6.4 RTL (Arabic)

| Step | Work |
| :--- | :--- |
| Document | `dir="rtl"` when locale is RTL |
| Tailwind | Prefer logical: `ms`/`me`/`ps`/`pe`/`start`/`text-start`; migrate Layout + tables first |
| Icons | Mirror directional chevrons when `dir=rtl` |
| Third-party | SweetAlert2, TipTap, Recharts, drawers — verify or override |
| **Print / report cards** | Official Liberian / international paper templates may remain **LTR and fixed language** for legal authenticity; Settings UI and on-screen chrome still translate. Document this exception in report-card plans. |

### 6.5 What is never auto-translated

- Student / staff **names**, emails, addresses entered by users  
- Announcement **body**, document **titles** uploaded by schools  
- Custom notification category labels created by admin (unless they later add per-locale labels)  
- Curriculum subject names as stored  
- CSV import column **headers** in templates — ship locale-specific template downloads **or** keep English headers with translated UI instructions (recommend: **English headers** for machine stability + translated help text)

---

## 7. Owning services & APIs

| Concern | Service | Change |
| :--- | :--- | :--- |
| `User.preferredLocale` | **Identity** | Prisma field + `PATCH /api/users/:id` / profile; return on `/api/auth/me` |
| `School.defaultLocale` | **Identity** | Prisma field + school GET/PATCH |
| Gateway | api-gateway | No special routing |
| SPA | frontend-spa | i18n core + all string migrations |
| Other domain services | — | Optional `code` on errors over time |

### Suggested Identity fields

```prisma
// User
preferredLocale String?  // e.g. "fr", "ar", "zh-Hans"

// School
defaultLocale   String  @default("en")
```

Validate against `SUPPORTED_LOCALES` allow-list server-side.

---

## 8. File / folder layout (SPA)

```
src/i18n/
  index.ts              # init i18next
  locales.ts            # SUPPORTED_LOCALES, RTL set, labels
  format.ts             # date/money helpers
  apiErrors.ts          # code → t()
  LocaleDocumentEffect.tsx
  locales/
    en/
      common.json
      nav.json
      auth.json
      …
    fr/ …
    ar/ …
    es/ …
    de/ …
    zh-Hans/ …
    hi/ …
```

English JSON files are **complete**. Other locales may ship incomplete during Phase B–D with fallback to `en` (i18next `fallbackLng: 'en'`) — but a language is not marked **Done** in Settings until coverage ≥ threshold (see §10).

---

## 9. Implementation phases

### Phase 0 — Foundation (platform)

- [x] Add `i18next`, `react-i18next`
- [x] `src/i18n` bootstrap + `LocaleDocumentEffect`
- [x] Identity `preferredLocale` / `defaultLocale` + API + authStore
- [x] Settings + Profile language pickers
- [x] `common` + `nav` + `auth` + `errors` (generic) English catalogs (+ `roles`, `pages`)
- [x] Wire Layout + Login to `t()`
- [x] `formatDate` / `formatMoney` helpers (`src/i18n/format.ts`)
- [x] Unit tests: locale resolve, RTL dir (`npm run test:i18n`)
- [x] Update `FRONTEND_GUIDELINES.md` with i18n rules

**Exit:** User can switch language; nav + login + common buttons change; rest may still be English via fallback.

### Phase 1 — Shell + public + dictionaries

- [x] Full `nav` for all roles (`labelKey` + Layout `t()`)
- [x] `roles` dictionary (`staffRoleLabel` uses i18n)
- [x] Public: register, apply, apply status, invite, receipt verify, mock checkout (+ Login)
- [x] ProtectedRoute / stub honesty pages (`StubFeaturePage` + `common.stubNotAvailable`; ProtectedRoute still `Navigate` only)
- [x] Super Admin chrome

### Phase 2 — Core school ops (wave A)

Migrate page chrome + primary actions (deeper modal copy continues):

- [x] `dashboard`, `students`, `staff`, `bulkImport`, `registrar`, `enrollment` (titles/subtitles; students/staff/import deeper — enroll/edit/add staff modals)
- [x] `settings`, `profile`, `notifications`, `roleAccess` (titles; settings/profile language; appearance tab labels)

### Phase 3 — Academics (wave B)

- [x] Feature **titles/subtitles** for curriculum, classrooms, classroomWorkspace, calendar, lessonPlans, attendance, exams, onlineExams, gradebook, gradeReview, academicCalendar, classSchedule, studentRecords, examDetails, examPaper
- [x] Stub / unavailable surfaces use `common.stubNotAvailable`
- [x] High-traffic student enroll/edit modals

### Phase 4 — Finance & ops (wave C)

- [x] Feature **titles/subtitles** for fees, expenses, payroll, reports, leave, staff-portal, workOrders, facilities, documents, announcements, pta
- [x] Fee **TemplateModal** deep copy
- [x] Common empty/action keys for remaining ledger cells (English fill via `localeFill` until translated)

### Phase 5 — Locale packs + RTL harden

- [x] **fr, es, de, zh-Hans, hi, ar** catalogs (+ `localeFill` for leaf gaps; runtime recursive deep-merge)
- [x] Arabic `dir=rtl` via `LocaleDocumentEffect`
- [x] Logical Tailwind migration for Layout chrome (`ps`/`pe`/`start`/`end` + chevron `rtl:rotate-180`)
- [x] Playwright smoke: `e2e/i18n-locale.spec.ts` (French login; gated by `E2E_ENABLED`)
- [x] `npm run i18n:check` namespace parity (+ soft leaf warnings)

### Phase 6 — Backend codes + documents (wave D / E)

- [x] SPA `translateApiError` helper + expanded `errors` namespace
- [x] `src/services/api.ts` localizes API errors when `code` is present
- [x] Locale-aware Identity emails (`emailCatalogs.ts` — registration, welcome, invite, account ready)
- [x] Locale-aware Finance receipt PDF chrome (`receiptChrome.ts` — school `defaultLocale`, branding snapshot)
- [x] Full leaf catalogs for fr/es/de/ar/zh-Hans/hi (`catalogs/locales/*`; `localeFill` empty)
- [x] Production-complete gate for all locales including AR/ZH/HI (`complete: true`; critical-path QA in `i18n:check` + unit script checks; Playwright ar/zh/hi login smokes)
- [ ] Print report-card / grade-sheet legal layouts remain English until report-card finalize (§6.4)

---

## 10. Translation workflow & quality

| Rule | Detail |
| :--- | :--- |
| Source | English JSON only edited by engineers with features |
| Process | Export keys → translators / reviewed MT → PR per locale |
| Completeness | Script `npm run i18n:check` compares each locale key tree to `en`; fail CI if missing keys for locales marked `complete` |
| Pseudo-locale (dev) | Optional `en-XA` / accented English to spot untranslated UI |
| Screenshots | Translators use Settings language switch on staging |
| Tone | Match Executive Slate: plain, short, no sci-fi filler (`FRONTEND_GUIDELINES`) |

**Production-complete rule:** A locale may set `complete: true` only when (1) leaf coverage vs `en` is 100%, (2) critical-path English-leftover audit passes for Login/Nav/Students/Fees/Settings/Apply (`npm run i18n:check`), and (3) script-direction smoke passes (Arabic RTL; ZH/HI script samples). Spot human native review remains welcome for tone polish but is not a release blocker once the gate is green.

---

## 11. Testing & acceptance

### Automated

- [x] `tests/i18n-resolve.test.ts` — preference chain, RTL set, fallback
- [x] `npm run i18n:check` — key parity; **hard-fail** for `complete` locales (missing leaves + critical-path EN leftovers)
- [x] Playwright: French + Arabic RTL + zh-Hans + Hindi login locale smoke (`e2e/i18n-locale.spec.ts`)
- [x] SPA smoke: Login under `ar` sets `dir=rtl` (Playwright + `localeDir` unit)
- [x] Complete-locale QA assertions in `tests/i18n-resolve.test.ts`

### Manual (per locale before marking Done)

- [ ] Switch language in Profile — entire nav updates
- [ ] Students: title, empty state, enroll modal, toast, delete confirm
- [ ] Fees: ledger headers, collect, empty
- [ ] Public apply: labels + validation
- [ ] Arabic: sidebar, forms, modals readable RTL; no clipped text
- [ ] Dates on attendance / payroll show locale format
- [ ] Reload page — language persists
- [ ] New user inherits school `defaultLocale`
- [ ] User override beats school default

### Definition of Done (product)

> Every route reachable from `navByRole` + public auth routes shows **no intentional English leftovers** for a completed locale, except: user-authored content, allow-listed print templates, and developer-only error codes in network tab.

---

## 12. Engineering standards (mandatory for contributors)

1. New UI **must** use `t()` — no new hardcoded English in `src/pages` / `src/features` / `src/components` (except tests and story fixtures).
2. Add keys to **`en` first**, then open translation tickets for other locales.
3. Prefer `common.*` for repeated actions.
4. Never build sentences by stitching translated words (word order breaks in DE/FR/AR).
5. After auth/profile locale PATCH: `i18n.changeLanguage` + `setAuth` with new locale.
6. Document RTL exceptions next to print templates.

Update `FRONTEND_GUIDELINES.md` § (new) **Internationalization** when Phase 0 lands.

---

## 13. Risks & mitigations

| Risk | Mitigation |
| :--- | :--- |
| Huge string volume | Phased waves; `en` fallback keeps app usable |
| Incomplete MT quality | Gate “complete” flag; native review for AR/ZH/HI |
| Layout breakage in RTL | Early Layout logical CSS; Phase 5 harden |
| PDF legal layouts | Explicit print exception (§6.4) |
| API English leaks into toasts | `translateApiError` + expand codes |
| Bundle size | Lazy locale packs; namespace code-splitting |

---

## 14. Effort sketch (planning only)

| Phase | Rough order of magnitude |
| :--- | :--- |
| 0 Foundation | 3–5 days |
| 1 Shell + public | 3–5 days |
| 2–4 Feature waves | 2–4 weeks (parallelizable by domain) |
| 5 Locale packs + RTL | 1–2 weeks + translation lead time |
| 6 API codes / email / PDF | Ongoing |

---

## 15. Change log

### 2026-07-30 — Plan authored

- **Change:** Defined full-coverage multi-language plan (en/fr/ar/es/de/zh-Hans/hi), Identity locale prefs, i18next namespaces for all pages/components, RTL, dates/money, API error strategy, phased delivery to 100% UI coverage.
- **Services:** identity, frontend-spa (planned); other services optional error codes later
- **UI / API:** Profile + Settings language; `User.preferredLocale`, `School.defaultLocale`
- **Status:** draft / not implemented
- **Verify:** n/a until Phase 0
