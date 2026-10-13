# Parent Portal & PTA — Implementation Plan

> **Status:** Done (2026-07-23) — Phases 0–E shipped: parent grades IDOR closed, family hub + dashboard KPIs, classroom `studentId`, announcements reader, parent event producers, Comms PTA domain + engagement UI, attendance CSV / roles docs.  
> **Scope:** Parent account as a **family hub** — children attendance, classroom assignments, gradesheet, report cards, tuition; effective parent controls; **PTA** (Parent–Teacher Association); parent-relevant notifications  
> **Non-goals (this plan):** Replacing admin Classrooms / Exam Gradebook; email delivery (in-app + prefs first); full PTA banking/GL  
> **Companion:** `docs/FINANCE_BILLING_PLAN.md`, `docs/ATTENDANCE_INTEGRATION_PLAN.md`, `docs/CLASSROOM_MANAGEMENT_PLAN.md`, `docs/TEACHER_GRADEBOOK_PLAN.md`, `docs/COMMS_DOCUMENTS_PLAN.md`, `docs/NOTIFICATIONS_PLAN.md`, `ONBOARDING_AND_ADMISSION_PLAN.md`, `IMPLEMENTATION_STATUS.md`  
> **UI:** `/{slug}/…` under PARENT role; Executive Slate (`FRONTEND_GUIDELINES.md`)

---

## 0. Product intent

Parents need one calm place to **see everything that matters for each child** and act where the school allows (pay fees, RSVP, acknowledge docs, contact teacher via approved channels). PTA is the **community layer** for meetings, minutes, volunteers, and campaigns — not a second school admin console.

| Parent need | Product surface |
| :--- | :--- |
| Who are my kids? | **Family hub** (`/children`) with real summaries + child switcher |
| Were they in class? | Attendance (scoped to linked children) |
| Homework / classwork | Classroom assignments (read-only, `?studentId=`) |
| Formal marks | Gradesheet + Report card (released / accepted only) |
| Money owing / paid | Fees / tuition (already strong) |
| School + PTA news | Announcements reader + Documents + Calendar |
| PTA life | PTA home: meetings, minutes, volunteers, campaigns |
| Alerts | In-app bell + `/notifications` (parent-targeted events) |

### Hard product rules

1. **Linked children only.** Every parent API must verify `ParentStudent` (or approved Identity equivalent). No IDOR on grades/report cards/classroom.
2. **Honest UI.** No fake GPA, attendance %, or “Good Standing.” Empty = grey + short copy.
3. **Child context everywhere.** Global or page-level **child switcher**; deep links carry `?studentId=`.
4. **Read-first.** Parents do not edit grades, attendance, or rosters. Allowed writes: pay fees, PTA RSVP/volunteer, doc acknowledgement, limited messaging if we add it later.
5. **Separate formal vs classroom grades.** Exam Gradebook ≠ Classroom assignment marks (`CLASSROOM_MANAGEMENT_PLAN.md`).
6. **Executive Slate** for all new parent / PTA surfaces.

---

## 1. Current state (honest)

### Already works (reuse)

| Area | Reality | Paths / services |
| :--- | :--- | :--- |
| Parent ↔ child links | Identity `ParentStudent` + `GET /api/parents/:id/children` | Identity |
| Fees / tuition | Parent-scoped `/api/my-fees`, checkout, pay | Finance + Fees UI |
| Attendance | Sessions filtered to linked children | Lifecycle + Attendance page |
| In-app notifications | Bell, inbox, prefs, producers for several events | Comms (`NOTIFICATIONS_PLAN.md`) |
| Documents | Role-scoped library can include PARENT | Comms |
| Calendar | School calendar visible to PARENT | Academic / Calendar UI |
| Classroom APIs (partial) | Parent read requires `?studentId=` + link check | Classroom |

### Broken / incomplete / missing

| Gap | Impact |
| :--- | :--- |
| Children page fake metrics (98% attendance, 3.8 GPA, Good Standing) | Misleading trust |
| Academic `GET /api/students/:id/grades` allows PARENT **without** link check | **Privacy / IDOR** |
| Report card same authorization weakness | Same |
| PARENT nav omits Grades, Documents, Notifications, Classroom, Announcements | Features hard to discover |
| No parent announcements **reader** route (management UI is staff-only) | Announcement notification `href` may 403 |
| Classroom UI does not pass `studentId` for parents | Assignments not usable |
| `ATTENDANCE_ALERT` pref exists; no producer | No absence/late push to parents |
| Fee paid notify may target student only | Parents miss payment confirmation |
| No grade-release / report-card notify for parents | Parents must hunt |
| PTA minutes still via Documents category only (no dedicated PTA minutes model) | Officers link minutes as school documents |
| “Contact School” on Children page is a no-op | Dead control |

### PARENT nav today

Dashboard · Calendar · My Children · Fees · Attendance  

*(Grades, documents, notifications, classroom often allowed in `App.tsx` but hidden from nav.)*

---

## 2. Target IA (information architecture)

### Parent nav (proposed)

| Item | Route | Purpose |
| :--- | :--- | :--- |
| Home | `/dashboard` | Family snapshot (honest counts) |
| My Children | `/children` | Hub + per-child cards + switcher source of truth |
| Attendance | `/attendance` | Children’s sessions |
| Classes | `/classroom?studentId=` | Assignments / stream (read-only) |
| Grades | `/grades` or `/grades/:studentId` | Formal gradesheet |
| Fees | `/fees` | Owing / paid / pay |
| Documents | `/documents` | Handbooks, forms, PTA minutes (role-scoped) |
| PTA | `/pta` | Association home (Phase C+) |
| Notifications | `/notifications` | Inbox |
| Calendar | `/calendar` | School + PTA events |

Report cards: deep link from Grades / Children (`/report-card/:examId/:studentId`) — not a top-level nav item unless volume warrants it.

### Child switcher

- Persist selected child in URL (`studentId`) and session (`localStorage` key per school).
- All child-scoped pages read the same helper (`useSelectedChild`).
- Multi-child parents can compare via Children hub; detail pages are one child at a time.

---

## 3. Parent controls (what parents can do)

| Control | Phase | Notes |
| :--- | :--- | :--- |
| View linked children profiles (safe fields) | A | Name, photo, class, grade level — no internal staff notes |
| Switch child context | A | Required |
| View attendance history + session detail | A | Already mostly done |
| View classroom assignments & due dates | B | Read-only submissions status |
| View released/accepted grades | A | After auth fix |
| Open / download report card PDF | A | After auth fix |
| View fees owing/paid; pay | A | Existing |
| Download fee receipts | A/B | Via receipts platform if exposed |
| Read school + PTA announcements | B | Parent reader |
| Open / acknowledge documents | B | Optional ack |
| PTA: view meetings, RSVP, volunteer signup | C–D | |
| PTA: see campaign progress (honest totals) | D | |
| Contact teacher / school | B | Prefer in-app “message request” or mailto/tel from school settings — **no** fake button |
| Notification prefs (parent-relevant keys) | B | Extend Settings or a slim parent prefs panel |

Parents **cannot:** edit grades, take roll call, enroll/withdraw without registrar flow, manage other families, or administer PTA unless granted **PTA officer** role (Phase C).

---

## 4. Phases

### Phase 0 — Safety & honesty (must ship first)

**Goal:** Stop lying and stop leaking.

| Work | Owner |
| :--- | :--- |
| Academic: PARENT grades/report-card APIs verify parent↔student link (Identity internal) | academic + identity |
| Parent-safe child profile endpoint (or allow PARENT on scoped user GET) | identity |
| Children page: remove fake metrics; live attendance rate / fees due / last grade date or empty | frontend |
| Wire or remove “Contact School” (school phone/email from settings) | frontend |
| Automated tests: parent cannot fetch unrelated student’s grades | tests |

**Done when:** IDOR closed; Children hub shows only real or empty data.

### Phase A — Family hub complete

**Goal:** Parent can track each child for attendance, formal grades, report cards, tuition without hunting.

| Work | Owner |
| :--- | :--- |
| `useSelectedChild` + Children hub redesign (Executive Slate) | frontend |
| Nav: Grades, Notifications, Documents (and Classes when B ready) | frontend |
| Gradesheet UX polish for parent (read-only, child switcher) | frontend |
| Report card entry points from Grades / Children | frontend |
| Dashboard parent branch: honest family KPIs (fees due, absences this week, unread notifs) | frontend |
| Docs: parent portal section in this plan marked Phase A done | docs |

**Reuse:** Fees + Attendance as-is (minor child-filter UX).

### Phase B — Classroom assignments + announcements + notifications

**Goal:** Homework visibility + news + alerts that reach parents.

| Work | Owner |
| :--- | :--- |
| Classroom parent UI: require `studentId`; list classes for that child; stream/assignments read-only | classroom + frontend |
| Parent announcements **reader** (`/announcements` or `/news`) — not management | frontend + maybe thin Comms list |
| Fix announcement notification `href` for PARENT → reader route | comms / producers |
| Producers: `ATTENDANCE_ALERT` (absence/late → linked parents); `FEE_PAID`/`FEE_DUE` → linked parents; `GRADE_RELEASED` (exam release or ACCEPTED visible to family) | lifecycle, finance, academic → Comms |
| Pref keys + Settings meta for parent events | comms + frontend |
| Optional document acknowledgement for PARENT-targeted docs | comms |

**Done when:** Parent sees assignments for a selected child; gets bell items for absence, fee, grade release; can open announcements.

### Phase C — PTA foundation (information + membership)

**Goal:** First-class PTA home without inventing a second school.

| Work | Owner |
| :--- | :--- |
| Comms (or Ops) models: `PtaOrganization` (per school), `PtaMembership` (parent user + role: MEMBER / OFFICER), `PtaMeeting`, `PtaDocument` link or category | comms |
| Staff: enable PTA, appoint officers, publish meeting | admin UI |
| Parent: `/{slug}/pta` — upcoming meetings, minutes (documents), officers list | frontend |
| Calendar: PTA meeting category / events | academic calendar |
| Announcements target `PARENT` + optional PTA badge | existing announcements |
| Permissions: OFFICER can draft meeting notes; ADMIN publishes | |

**Done when:** Parents open PTA and see real meetings/minutes or honest empty; officers can be assigned.

### Phase D — PTA engagement

**Goal:** Parents participate.

| Work | Owner |
| :--- | :--- |
| Meeting RSVP + capacity | comms |
| Volunteer signup / shifts | comms |
| Campaign / contribution tracker (honest totals; payment optional via Finance later) | comms ± finance |
| Notifications: `PTA_MEETING`, `PTA_VOLUNTEER`, `PTA_CAMPAIGN` | prefs + producers |
| Officer dashboard (lightweight) | frontend |

**Out of scope until later:** Full PTA ledger, payroll of PTA staff, private parent–parent chat.

### Phase E — Polish & controls pack

| Work |
| :--- |
| Multi-child comparison strip on hub |
| Export attendance CSV for a child (optional) |
| Receipt / statement shortcuts from Fees |
| Accessibility + mobile pass on parent flows |
| Role documentation update (`ROLES_DOCUMENTATION.md`) |

---

## 5. Data & services map

| Concern | Service |
| :--- | :--- |
| Parent–student links, safe child profile | **Identity** |
| Attendance for children | **Lifecycle** |
| Classroom assignments / stream | **Classroom** |
| Formal grades / report card data | **Academic** |
| Fees / checkout / receipts | **Finance** |
| Announcements, documents, in-app notifications, PTA entities | **Comms** |
| Calendar events (school + PTA) | **Academic** |
| SPA | **frontend-spa** |

### Authorization pattern (all parent child-scoped reads)

```text
authenticate → role PARENT → resolve linked child IDs (Identity)
→ reject if :studentId not in set → return filtered payload
```

Prefer one shared helper: `assertParentOfStudent(parentId, studentId)` callable via Identity internal API from Academic / Classroom / Lifecycle / Finance (Finance already does analogous checks).

---

## 6. Notifications (parent-relevant)

| Event key | When | Recipient |
| :--- | :--- | :--- |
| `FEE_DUE` / `FEE_PAID` | Reminder / successful pay | Linked parents (+ student if desired) |
| `ATTENDANCE_ALERT` | Absent / late marked on instructional day | Linked parents |
| `GRADE_RELEASED` | Exam grades released or marks accepted & visible | Linked parents |
| `ANNOUNCEMENT` | Targeted to PARENT | Parents in school |
| `PTA_MEETING` / `PTA_VOLUNTEER` / `PTA_CAMPAIGN` | Phase D | PTA members / all parents per school setting |

Respect `SchoolNotificationPreference.inAppEnabled`. No email required in this plan (align with existing notification stack).

---

## 7. UI / UX notes

- Family hub is **one composition**: child cards, not a busy dashboard wall of fake charts.
- Child switcher sticky on Grades / Classes / Attendance.
- PTA home: brand-safe school slate; avoid marketing clutter; empty states for “No meetings yet.”
- Motion: `motion/react`, `duration: 0.2` only.

---

## 8. Acceptance (by phase)

### Phase 0
- [x] Parent A cannot load Parent B’s child grades by guessing UUID
- [x] Children page has zero hard-coded academic/finance metrics
- [x] Contact control opens real school contact or is removed

### Phase A
- [x] Parent switches child; Attendance / Grades / Fees respect selection
- [x] Nav exposes Grades, Documents, Notifications (plus Classes, News, PTA)
- [x] Report card opens only for linked child + released/accepted data
- [x] Family dashboard honest KPIs (children, fees due, absences/late 7d, unread)

### Phase B
- [x] Parent sees classroom assignments for selected child (`?studentId=`)
- [x] Absence/late generates in-app notification for linked parents (when prefs on)
- [x] Parent can open announcements from bell without 403 (`/announcements` reader)
- [x] `FEE_PAID` / `FEE_DUE` notify linked parents; `GRADE_RELEASED` on exam release

### Phase C
- [x] `/pta` lists meetings/volunteers/campaigns or honest empty; admin enable + officers
- [x] Admin can appoint PTA officer

### Phase D
- [x] Parent RSVPs / volunteers; going/signup counts shown
- [x] PTA publish notifies parents (`PTA_MEETING` / `PTA_VOLUNTEER` / `PTA_CAMPAIGN`)

### Phase E
- [x] Multi-child strip on hub; attendance CSV; roles documentation updated
- [x] Automated parent-grades auth fail-closed test (`npm run test:parent-grades`)

---

## 9. Suggested build order (engineering)

1. Phase 0 auth + Children honesty (small PR, high urgency)  
2. Phase A hub + nav + grades/report entry points  
3. Phase B classroom parent path + announcement reader + producers  
4. Phase C PTA models + `/pta` read surface  
5. Phase D engagement  

Estimate (indicative): Phase 0–A ~3–5 days; B ~4–6 days; C ~4–6 days; D ~5–8 days — depending on PTA model depth.

---

## 10. Change log

### 2026-07-23 — Plan created

- **Change:** Documented Parent Portal + PTA roadmap (Phases 0–E), current gaps (incl. grades IDOR), nav IA, controls, notification events
- **Who:** Parents; School Admin / PTA officers (later); teachers only as data producers
- **Services (planned):** identity, academic, lifecycle, classroom, finance, comms, frontend-spa
- **Status:** plan only
- **Verify:** N/A until Phase 0 implementation starts

### 2026-07-23 — Phase 0 foundation and partial Phase A

- **Change:** Identity now exposes authenticated internal parent-link assertions and parent recipient lookups. Academic fails closed when a PARENT requests grades for a student without an explicit `ParentStudent` link. The Children hub uses linked-child data only, removes invented GPA/attendance/status values, has real deep links, and only exposes school contact when configured.
- **Who:** Parents and school administrators; unlinked parents are denied grade data.
- **Services:** identity, academic, frontend-spa, comms (preference key registration).
- **Status:** Phase 0 complete except the requested automated authorization test; Phase A partial. PTA phases C–D and Phase B producers are not implemented.
- **Verify:** With a parent JWT, `GET /api/students/{unlinkedStudentId}/grades` returns 403; linked child returns the normal grade response. Open `/{slug}/children` and confirm no fabricated metrics are shown.

### 2026-07-23 — PTA backend (Phases C–D APIs)

- **Change:** Comms owns PTA organization, membership (MEMBER/OFFICER), meetings + RSVP, volunteer opportunities + signup, and campaigns. School admin enables org and appoints parent officers; officers/admins create and publish content; parents RSVP/signup. Publishing fires in-app notifications (`PTA_MEETING` / `PTA_VOLUNTEER` / `PTA_CAMPAIGN`) to PARENT users when prefs allow. Gateway routes `/api/schools/:id/pta*` and `/api/pta/*` to Comms.
- **Who:** Parents (read/RSVP/volunteer when enabled); School Admin (enable + officers); PTA officers (create/publish).
- **Services:** `comms`, `api-gateway` (path map). Schema applied via `prisma db push`.
- **Status:** Backend done (schema pushed). SPA `/pta` later completed in the Phases A–E entry below.
- **Verify:** As SCHOOL_ADMIN, `PUT /api/schools/{schoolId}/pta` with `{ "enabled": true, "name": "PTA" }`; `POST .../pta/officers` with a PARENT `userId`; create a meeting with `published: true` and confirm PARENT users receive an in-app notification. As PARENT, `GET /api/schools/{schoolId}/pta` returns org + published items; `POST /api/pta/meetings/{id}/rsvp` with `{ "status": "GOING" }`.

### 2026-07-23 — Phases A–E complete

- **Change:** Family dashboard KPIs; announcements reader for PARENT/STUDENT; producers for `ATTENDANCE_ALERT`, parent `FEE_*`, `GRADE_RELEASED`; Comms PTA models/APIs/gateway + SPA enable/officers/meetings/RSVP/volunteer/campaigns; attendance CSV; multi-child strip; `ROLES_DOCUMENTATION.md` PARENT section; `test:parent-grades`.
- **Who:** Parents; School Admin / Principal / PTA officers.
- **Services:** identity, academic, lifecycle, finance, comms, api-gateway, frontend-spa.
- **Status:** Done for planned Phases 0–E (PTA minutes still via Documents category; no PTA GL).
- **Verify:** Parent grades IDOR still 403; parent News + PTA routes load; enable PTA as admin, publish meeting, parent RSVPs; mark child ABSENT and confirm parent bell when prefs on.
