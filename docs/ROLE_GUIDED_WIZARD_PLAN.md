# Role-guided platform wizard — Implementation plan

> **Status:** Phases 0–4 + extras shipped — 2026-07-31  
> **Scope:** A **per-account-type** guided wizard that teaches each signed-in user how to navigate and use **their** slice of Gnet SMS — Teachers, Students, Parents, and Staff (with **role-specific** tracks, not one generic tour).  
> **Goal:** A new Teacher, Parent, Student, or Staff member can learn the platform **without asking anyone**, by following an interactive, honest, replayable guide tied to real screens they can open.  
> **Non-goals:** Auto-translating user content; inventing fake modules; replacing school training policy; a single “product tour” for every role; AI chat that invents answers; Super Admin marketing tour (optional later).  
> **Companions:** `docs/APP_FEATURES_OVERVIEW.md`, `docs/ROLE_ACCESS_PLAN.md`, `docs/PERMISSIONS_FIX_REPORT.md`, `docs/I18N_PLAN.md`, `docs/SIDEBAR_NAV_OVERHAUL_PLAN.md`, `ONBOARDING_AND_ADMISSION_PLAN.md` (school setup checklist ≠ this), `FRONTEND_GUIDELINES.md`, `IMPLEMENTATION_STATUS.md`  
> **Owning services:** primarily **SPA** (`frontend-spa`); progress persistence on **Identity** (`User` prefs / small progress table); optional later Comms for “welcome tips” emails  
> **Stack:** React + Tailwind + `motion/react` + existing nav/role/capability filters + i18n namespaces

---

## 0. Product intent (plain English)

Today, role help is thin:

- Dashboard **Help guide** panels (`HelpGuidePanel`) show **3 static cards** for some roles (Teacher, Accountant, Registrar, VPI, VPA, …).
- They are **not** step-by-step, **not** tied to real routes with “Go there” actions, **not** progress-tracked, and **not** shown automatically on first login.
- School **onboarding checklist** (`/:slug/onboarding`) is for **tenant setup** (branding, calendar, fees) — not for teaching Teachers/Parents/Students how to work day to day.

Schools need something different: when a **Teacher**, **Student**, **Parent**, or **Staff** account is created and they sign in, they should get a **wizard customized to their role** that:

1. Explains **only what they can see and do** (nav + capabilities).  
2. Walks them through **real pages** (spotlight / coach marks / short checklists).  
3. Marks progress so they can pause and resume.  
4. Can be **replayed** anytime from Profile / Help.  
5. Stays **honest** about Limited/stub modules (no fake “Library is fully live” claims).

**Success looks like:** a Parent finishes the wizard and can open Fees, view a child’s grades, and find PTA without calling the school office; a Teacher finishes and can take roll call, open My Classes, and enter gradebook marks without a colleague demo.

---

## 1. Principles (non-negotiable)

| # | Principle | Meaning |
| :--- | :--- | :--- |
| 1 | **Role-first, never generic** | Separate curricula per account type. Shared shell UI is OK; **copy, steps, routes, and order** must differ. |
| 2 | **Capability-aware** | If Roles & Access hides a module for that school, the wizard **skips** that step (or marks it unavailable) — never deep-link to a 403. |
| 3 | **Honest product** | Live vs Limited from `docs/APP_FEATURES_OVERVIEW.md`. Stub specialty roles get a short “what’s ready / what’s coming” track. |
| 4 | **Do, don’t only read** | Prefer “Open Attendance and take roll” over paragraphs of prose. Optional **practice check** (visited route / clicked CTA). |
| 5 | **Non-blocking** | User can Skip / Remind me later. Never trap behind a modal with no exit (except optional first-run after force password change). |
| 6 | **i18n + RTL** | All wizard strings via catalogs; Arabic RTL layout for overlays. |
| 7 | **Privacy-safe** | Guides never show other families’ data; Parent steps use **their** children context only. |
| 8 | **One composition** | First viewport of the wizard launcher is calm (brand/role name + one CTA) — not a dashboard of 20 tiles. |

---

## 2. Audience model — “account types”

User asked for **Staff, Teachers, Students, Parents**. Map to product roles:

| Account type (product language) | Platform role(s) | Wizard track id |
| :--- | :--- | :--- |
| **Teacher** | `TEACHER` | `teacher` |
| **Student** | `STUDENT` | `student` |
| **Parent** | `PARENT` | `parent` |
| **Staff** (umbrella) | All other school roles **except** Teacher / Student / Parent / Super Admin | Split into **staff tracks** below |

### 2.1 Staff is not one tour

“Staff” covers Registrar, Accountant, Principal, Maintenance, Nurse, etc. A generic Staff wizard would feel wrong. Plan **staff tracks**:

| Staff track id | Roles | Emphasis |
| :--- | :--- | :--- |
| `staff_admin` | `SCHOOL_ADMIN`, `IT_ADMIN` | Setup, Roles & Access, Settings, campus-wide modules |
| `staff_academic_lead` | `PRINCIPAL`, `VPI` | Curriculum, grade review, exams, attendance oversight |
| `staff_ops_lead` | `VPA` | Leave, maintenance/procurement oversight, HR-ish portal |
| `staff_registrar` | `REGISTRAR` | Admissions, enrollment, students, transcripts |
| `staff_finance` | `ACCOUNTANT` | Fees, expenses, payroll, receipts |
| `staff_ops_specialist` | `MAINTENANCE`, `PROCUREMENT`, `SECURITY`, `TRANSPORTATION`, `HOSTEL_WARDEN`, `CAFETERIA_MANAGER`, `ATHLETICS_DIRECTOR` | Their live hub + Staff Portal; honest Limited labels |
| `staff_care` | `NURSE`, `COUNSELOR`, `LIBRARIAN` | Live adjacent tools (directory, calendar, docs) + stub honesty |

**Resolution rule:** `wizardTrackForRole(role) → trackId`. Teachers/Students/Parents never fall into a Staff track.

**Optional later:** Super Admin track (`super_admin`) — platform schools, not in v1.

---

## 3. Experience design

### 3.1 Three layers (same shell, different content)

```
┌─────────────────────────────────────────────────────────────┐
│  A. Launcher / Learning center   (replayable hub)           │
│  B. Guided tour (spotlight)      (step → real page)         │
│  C. Checklist progress           (persist %, resume)        │
└─────────────────────────────────────────────────────────────┘
```

| Layer | UX | When |
| :--- | :--- | :--- |
| **A. Learning center** | Role-branded page or drawer: modules of the guide, % complete, Restart | Profile → “Platform guide”; Help in header; Dashboard card |
| **B. Guided tour** | Spotlight on sidebar item / page chrome; short tip; Next / Back / Skip | First login + on demand |
| **C. Checklist** | Ordered tasks with status `todo` / `done` / `skipped` | Always visible in Learning center; optional sticky “Continue guide” chip |

### 3.2 First-run triggers

| Trigger | Behavior |
| :--- | :--- |
| First successful login after account creation | After `mustChangePassword` (if any) → soft welcome → offer **Start guide** |
| Returning user, incomplete guide | Dashboard banner: “Continue your {role} guide (3/8)” |
| Manual | Avatar menu / Profile / `?guide=1` / Learning center |
| Role change (Roles & Access) | Reset progress for **new** track; keep archive of old track optional |

**Do not** auto-start on every login forever — only until completed or dismissed with “Don’t show again” (still replayable from Profile).

### 3.3 Step types (building blocks)

| Type | Description | Example |
| :--- | :--- | :--- |
| `intro` | Full-screen calm welcome for this role | “Welcome, Teacher — here’s your week” |
| `nav_spotlight` | Highlight a sidebar leaf; explain; optional navigate | Spotlight **My Classes** |
| `page_spotlight` | On a target route, highlight a control | Gradebook “Save” / Fees “Pay” |
| `action` | Soft require visit or click (not hard block) | “Open Attendance once” |
| `concept` | Short card explaining a concept without navigation | “What Live vs Limited means” |
| `honesty` | Stub module explanation | Specialty staff Limited pages |
| `completion` | Celebrate + link to Learning center / Dashboard | Certificate-style summary (no fake metrics) |

### 3.4 Visual / UX rules (Executive Slate + landing motion)

- Spotlight overlay: slate dim + indigo focus ring; respect `prefers-reduced-motion`.
- Coach card: `rounded-2xl`, white, soft shadow — not sci-fi glass.
- Mobile: bottom sheet coach; don’t spotlight off-screen sidebar (open drawer first).
- Never use `window.alert` / `confirm` — toasts + existing `confirmAction` if needed.
- Language: wizard follows **user preferredLocale** (already on Profile).

---

## 4. Curricula (role-specific content)

Steps below are the **v1 curriculum**. Each step lists: intent, target route (relative to `/:slug/`), and success criterion. Exact copy lives in i18n (`guide.*`).

### 4.1 Teacher (`teacher`) — ~8–10 steps

| # | Intent | Route / focus | Done when |
| :--- | :--- | :--- | :--- |
| 1 | Welcome + how the sidebar works | Dashboard | Dismiss intro |
| 2 | Personal timetable | `my-schedule` | Visited |
| 3 | My Classes workspace (stream / classwork) | `classroom` | Visited a class room |
| 4 | Take roll call | `attendance` | Opened Attendance (optional: opened roll-call modal) |
| 5 | Lesson plans | `lesson-plans` | Visited |
| 6 | Gradebook entry | `gradebook` | Visited |
| 7 | Submit for grade review | `grade-review` | Visited |
| 8 | Exams / online exams (if capability) | `exams` / `online-exams` | Visited one |
| 9 | Staff Portal (leave / self-service) | `staff-portal` | Visited |
| 10 | Completion + tip: announcements | — | Mark complete |

**Out of scope for Teacher tour:** school Settings, Roles & Access, fee template admin.

### 4.2 Student (`student`) — ~7–8 steps

| # | Intent | Route / focus | Done when |
| :--- | :--- | :--- | :--- |
| 1 | Welcome to your student account | Dashboard | Intro done |
| 2 | Calendar & My Schedule | `calendar`, `my-schedule` | Visited one |
| 3 | My Classes | `classroom` | Visited |
| 4 | My Grades / report cards | `grades` | Visited |
| 5 | Exams & online exams | `exams`, `online-exams` | Visited one |
| 6 | My Attendance | `attendance` | Visited |
| 7 | Fees (view / pay if applicable) | `fees` | Visited |
| 8 | Completion | — | Complete |

**Honesty:** Students don’t manage school settings; keep copy age-appropriate and short.

### 4.3 Parent (`parent`) — ~8–9 steps

| # | Intent | Route / focus | Done when |
| :--- | :--- | :--- | :--- |
| 1 | Welcome + multi-child model | Dashboard | Intro done |
| 2 | My Children hub | `children` | Visited |
| 3 | Switch child context (if >1 child) | Children / classroom query | Viewed child selector once |
| 4 | Child schedule | `my-schedule` | Visited |
| 5 | Grades & report cards | `grades` | Visited |
| 6 | Attendance visibility | `attendance` | Visited |
| 7 | Fees & receipts | `fees` | Visited |
| 8 | Announcements / Documents / PTA | `announcements`, `documents`, `pta` | Visited one |
| 9 | Completion | — | Complete |

**Privacy:** Never tour “other parents”; never invent sample siblings.

### 4.4 Staff tracks (summaries)

#### `staff_registrar`

Admissions pipeline → public apply link (if enabled) → Students directory → Enrollment / class placement → Transcripts → Calendar.

#### `staff_finance`

Fees overview → templates/invoices → partial payments & receipts → Expenses → Payroll → Staff Portal.

#### `staff_academic_lead` (Principal / VPI)

Dashboard oversight → Curriculum → Classrooms → Grade review → Exam paper review → Attendance oversight → Announcements.

#### `staff_admin` (School Admin / IT)

School Settings (locale, branding) → Roles & Access → Academic calendar → Staff management → Admissions/Fees overview → Setup checklist cross-link (`onboarding` page) as **school setup**, distinct from this guide.

#### `staff_ops_lead` (VPA)

Leave approvals → Maintenance / work orders → Procurement (as available) → Staff Portal → Calendar.

#### `staff_ops_specialist` / `staff_care`

1–2 intro steps for **their** live page (Work Orders, Security, etc.) + Staff Portal + Calendar + Documents; **honesty card** for Limited stubs.

---

## 5. Information architecture & routes

| Surface | Path / entry | Notes |
| :--- | :--- | :--- |
| Learning center | `/:slug/guide` (or `/help`) | Role-filtered; resume CTA |
| Auto-launch | Layout effect after auth | Respect dismiss + progress |
| Header | Help (? ) → Learning center / Continue | Next to search/bell |
| Profile | “Platform guide” section | Restart / language note |
| Deep link | `/:slug/guide?track=teacher&step=attendance` | Support training links from school admins |

**Nav:** Add **Guide** / **Help** leaf for all school roles (or header-only to avoid clutter — prefer **header Help** + Profile; optional nav for Student/Parent).

---

## 6. Data model & persistence

### 6.1 Recommended (Identity)

Add either:

**Option A (simpler):** JSON on `User`

```text
guideProgress Json?  // { trackId, version, status, steps: { [stepId]: "todo"|"done"|"skipped" }, dismissedAt?, completedAt? }
```

**Option B (queryable):** `UserGuideProgress` table

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | uuid | PK |
| `userId` | uuid | FK User |
| `schoolId` | uuid? | Tenant |
| `trackId` | string | e.g. `teacher` |
| `guideVersion` | int | Bump when curriculum changes |
| `status` | enum | `NOT_STARTED` \| `IN_PROGRESS` \| `COMPLETED` \| `DISMISSED` |
| `steps` | json | Per-step state |
| `updatedAt` | datetime | |

**APIs (Identity):**

- `GET /api/users/me/guide` — current progress + resolved track  
- `PATCH /api/users/me/guide` — upsert step status / dismiss / restart  

Self-only (or School Admin read-only aggregate later: “% of teachers completed guide”).

### 6.2 Curriculum versioning

Ship `GUIDE_VERSION = 1` in SPA catalog. If user progress `guideVersion < GUIDE_VERSION`, show “Guide updated — review new steps” and merge (keep done steps that still exist).

### 6.3 Capability filtering

At runtime:

```text
steps = catalog[track].steps
  .filter(step => !step.capability || hasCapability(step.capability))
  .filter(step => !step.route || userCanAccessRoute(step.route))
```

---

## 7. SPA architecture

Suggested layout:

```text
src/features/platform-guide/
  Page.tsx                 # Learning center
  GuideHost.tsx            # Layout-level tour engine
  api.ts                   # GET/PATCH progress
  catalog/
    tracks.ts              # trackId → meta
    steps/
      teacher.ts
      student.ts
      parent.ts
      staffRegistrar.ts
      ...
  components/
    GuideWelcome.tsx
    SpotlightOverlay.tsx
    CoachCard.tsx
    GuideChecklist.tsx
    ContinueGuideChip.tsx
  hooks/
    useGuideProgress.ts
    useGuideEngine.ts
  lib/
    resolveTrack.ts
    matchRoute.ts
```

**Engine responsibilities:**

1. Resolve track from role.  
2. Load progress.  
3. Decide auto-open.  
4. Render spotlight targeting `data-guide-id="nav-attendance"` anchors (add to sidebar leaves + key page controls).  
5. Advance steps; write progress.  
6. Honor Skip / Don’t show again / Restart.

**Anchors:** Add stable `data-guide-id` on sidebar items (from `navByRole`) and a few primary CTAs (Fees Pay, Roll call, etc.). Prefer data attributes over brittle CSS selectors.

---

## 8. Content & i18n

| Namespace | Content |
| :--- | :--- |
| `guide` (new) | Track titles, step titles/bodies, CTAs, completion, empty/skip |
| `nav` / `pages` | Reuse existing page names where possible |

Rules:

- No hardcoded English in components.  
- Coach tip **body** stays short (1–2 sentences); **Learning center + coach** may show a **How to get started** bullet list (`pages.guide.steps.<id>.howTo`) with honest module walkthroughs.  
- Guide chrome uses **`indigo-*`** so tenant `applySchoolBrandToDocument(school.brandColor)` remaps accents per school (Super Admin keeps default platform indigo).  
- Liberian / multi-country schools: avoid US-only slang; keep institutional tone.  
- RTL: coach card docks logically (`start`/`end`).

### Changelog (2026-08-03) — Tenant branding + richer how-to

- **Change:** Platform guide / Learning center accents `blue-*` → `indigo-*` (inherits school brand). Every step gains `howTo[]` copy; hub and spotlight coach render how-to lists.  
- **Who:** All roles with a guide track  
- **UI:** `platform-guide/Page.tsx`, `GuideHost.tsx`, `ContinueGuideChip.tsx`, dashboard guide banner, `enGuide.ts`  
- **Status:** done  
- **Verify:** Set school brand color in Settings → open `/:slug/guide` — buttons/progress match brand; expand a step’s how-to; `npm run test:guide`

---

## 9. Relationship to existing features

| Existing | Relationship |
| :--- | :--- |
| Dashboard `HelpGuidePanel` | **Replace or fold into** Learning center “Quick tips”; do not maintain two parallel help systems long-term |
| `/:slug/onboarding` checklist | Remains **school setup** for Admin/IT; Admin guide **links to it** as a step, does not merge |
| Landing marketing tour | Public only; not authenticated guide |
| Notifications | Optional later: “Continue your Teacher guide” reminder |
| Roles & Access | Capability filter for steps; role change → new track |
| Preferred language | Guide uses current i18n locale |

---

## 10. Phased delivery

### Phase 0 — Foundations (1–2 days)

- Track resolver + empty Learning center page  
- Progress API (Option A JSON is fine for v1)  
- `data-guide-id` on sidebar leaves  
- i18n namespace scaffold  
- Doc status → Partial  

**Exit:** Teacher can open `/guide` and see a checklist with no spotlight yet.

### Phase 1 — Teacher + Student + Parent tours (core ask) (4–6 days)

- Full curricula §4.1–4.3  
- Spotlight engine + Continue chip  
- First-login soft prompt  
- Replay from Profile  
- E2E: teacher/student/parent smoke  

**Exit:** Three personas can complete guides end-to-end on demo school.

### Phase 2 — Staff tracks (Registrar, Finance, Academic lead, Admin) (3–5 days)

- Curricula for high-traffic staff  
- Admin step linking to school onboarding checklist  
- Capability skips  

**Exit:** Registrar + Accountant + School Admin guides ship.

### Phase 3 — Specialty staff + honesty (2–3 days)

- Ops/care tracks with Limited honesty cards  
- Polish mobile bottom sheet  
- Reports page widget: guide completion % by role (honest counts only; School Admin / Principal / IT)  

### Phase 4 — Hardening (2 days)

- Guide version migrations  
- Reduced motion / a11y (focus trap, Esc, aria)  
- Playwright coverage per track smoke  
- Retire duplicate HelpGuidePanel or thin-wrap to Learning center  

---

## 11. Acceptance criteria

### Must

- [x] Teacher / Student / Parent each have **distinct** step lists (not the same copy with a different title).  
- [x] Steps only deep-link to routes the user can open.  
- [x] Progress persists across logout/login.  
- [x] Skip / dismiss / restart all work.  
- [x] Works in French (and RTL Arabic layout for overlay).  
- [x] Stub modules labeled Limited — no false “fully live” claims.  
- [x] Docs + `IMPLEMENTATION_STATUS` updated when phases ship.

### Nice

- [x] School Admin sees completion rates.  
- [x] Deep links for training (`?step=`).  
- [x] Confetti-free, calm completion screen.

### Explicit non-goals for v1

- [ ] ChatGPT-style freeform Q&A.  
- [ ] Video hosting.  
- [ ] Forcing completion before using the app.  
- [ ] One generic “SMS 101” tour for all roles.

---

## 12. Test plan

| Layer | What |
| :--- | :--- |
| Unit | `resolveTrack(role)`, capability filter, version merge |
| Component | Coach next/back; dismiss; checklist states |
| E2E | Login as teacher → start guide → visit attendance step → progress saved → reload continues |
| E2E | Parent with 0 children — graceful empty, no crash |
| E2E | Capability-stripped gradebook — teacher step skipped |
| i18n | `guide` namespace in `i18n:check` |

---

## 13. Risks & mitigations

| Risk | Mitigation |
| :--- | :--- |
| Spotlight breaks when layout changes | Stable `data-guide-id`; fall back to Learning center step without spotlight |
| Overwhelming first login | Soft modal, not forced; max ~10 steps; Skip always visible |
| Staff specialty roles feel ignored | Phase 3 honesty track — better than a fake generic Staff tour |
| Duplicate help systems | Phase 4 consolidates HelpGuidePanel |
| Progress loses meaning after nav redesign | `guideVersion` + merge strategy |

---

## 14. Open decisions (resolve in Phase 0)

1. **Route:** `/guide` vs `/help` vs header-only (recommend `/guide` + header Help).  
2. **Persistence:** JSON on User vs dedicated table (recommend JSON for v1, table if Admin analytics needed in Phase 3).  
3. **Force start after password change?** Recommend soft offer, not hard gate.  
4. **Students under 13:** shorter curriculum + parental language — confirm with product.  
5. **Should School Admin assign “required guide”?** Defer to Phase 3+.

---

## 15. Changelog

### 2026-07-31 — Extras (nice-to-haves + deferred)

- **Change:** Admin `GET /api/schools/:schoolId/guide-stats` + dashboard completion widget; `?step=` / `?tour=1` deep links; focus trap + Esc + `prefers-reduced-motion`; Super Admin track + `/super-admin/guide`; school `guideRequired` (Settings → General); under-13 student shorter checklist via `User.dob`; one-time `guideWelcome` tip email on first tour start; broader Playwright smokes.
- **Who:** School Admin/Principal/IT (stats + require flag); all guided roles; Super Admin; students under 13.
- **Services:** Identity + SPA
- **Status:** done
- **Verify:** Settings → Require platform guide → Don’t show again hidden; `/demo-school/guide?step=teacher_attendance` opens coach; Admin dashboard shows completion by role; Super Admin → Platform guide; student with DOB under 13 sees shorter checklist.

### 2026-07-31 — Phases 0–4 shipped

- **Change:** Role-guided Learning center + spotlight tour for Teacher / Student / Parent and staff tracks (`staff_admin`, `staff_registrar`, `staff_finance`, `staff_academic_lead`, `staff_ops_lead`, `staff_ops_specialist`, `staff_care`). Progress on Identity `User.guideProgress` via `GET|PATCH /api/users/me/guide`. Sidebar `data-guide-id`, Continue chip, dashboard banner, Profile link. Dashboard `HelpGuidePanel` removed. Unit `test:guide`; Playwright smoke behind `E2E_ENABLED=1`.
- **Who:** All school roles with a track; Super Admin excluded (v1).
- **Services:** Identity + SPA (`frontend-spa`)
- **Status:** done (v1) → superseded extras entry above for Super Admin
- **Verify:** Login as Teacher → soft tour or `/:slug/guide` → Start → Next through Attendance → reload → progress retained. Registrar/Accountant/Admin tracks distinct. Nurse/Maintenance honesty steps visible. Esc closes tour; Don’t show again → status `DISMISSED`.

### 2026-07-31 — Plan authored

- **Change:** Created role-guided wizard plan (Teacher / Student / Parent / Staff tracks), phases 0–4, persistence, IA, acceptance.  
- **Services:** SPA + Identity (planned)  
- **Status:** plan only → superseded by ship entry above  
- **Verify:** Review with stakeholders; start Phase 0 when approved  

---

## Appendix A — Quick map: role → first three “must learn” skills

| Role | Must learn first |
| :--- | :--- |
| Teacher | My Classes → Attendance roll call → Gradebook |
| Student | My Classes → My Grades → Fees |
| Parent | My Children → Grades → Fees |
| Registrar | Admissions → Students → Enrollment |
| Accountant | Fees → Expenses → Payroll |
| School Admin | Settings → Roles & Access → Academic calendar |
| Specialty staff | Own hub → Staff Portal → Calendar |

## Appendix B — Why not one generic wizard?

A generic tour must either (a) skip role-specific depth or (b) show screens the user cannot open. Both fail the product goal. **Shared engine, separate curricula** is the only approach that scales to 20+ roles without lying to users.
