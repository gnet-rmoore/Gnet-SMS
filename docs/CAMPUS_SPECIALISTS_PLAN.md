# Campus specialists — Full implementation plan

> **Status:** Done (2026-08-04) — Campus service + Ops transport; all 7 specialist modules Live; Phase 8 hardening complete  
> **Scope:** Library, Clinic, Counseling, Athletics, Hostel, Cafeteria, Transport — from honest stubs to production workflows  
> **Companion:** `IMPLEMENTATION_STATUS.md`, `docs/APP_FEATURES_OVERVIEW.md`, `docs/OPS_FACILITIES_PLAN.md`, `docs/ROLE_DASHBOARDS_PLAN.md`, `docs/ROLE_GUIDED_WIZARD_PLAN.md`, `docs/LANDING_PAGE_OVERHAUL_PLAN.md`

---

## 0. Summary

| Module | Path(s) | Primary role | Today | Target v1 |
| :--- | :--- | :--- | :--- | :--- |
| **Library** | `library`, `inventory` (digital) | Librarian | `StubFeaturePage` | Catalog + loans + overdue list |
| **Clinic** | `clinic`, `inventory` (medical) | Nurse | `StubFeaturePage` | Visit log + student health snapshot |
| **Counseling** | `counseling`, `students` (wellbeing) | Counselor | `StubFeaturePage` | Session log + restricted notes |
| **Athletics** | `athletics`, `staff` (coaches) | Athletics Director | `StubFeaturePage` | Teams + roster + fixtures |
| **Hostel** | `hostel`, `attendance` (reuse) | Hostel Warden | `StubFeaturePage` | Buildings/rooms/bed assignments |
| **Cafeteria** | `cafeteria`, `inventory` (food) | Cafeteria Manager | `StubFeaturePage` | Weekly menu + daily meal counts |
| **Transport** | `bus-routes`, `drivers`, `vehicle-maintenance` | Transportation | 3 stubs; orphaned `Transportation.tsx` with **fake KPI** | Routes, fleet, drivers, maintenance |

**Entitlements:** Premium+ plans already include all seven keys (`library`, `clinic`, `counseling`, `athletics`, `hostel`, `cafeteria`, `transport`) in `services/identity/src/domain/platformPlans.ts`. School-level feature gates must stay enforced on every new API route.

**Honesty rule (non-negotiable):** No fake counts, seeded lists, or localStorage demos. Until a module ships, keep `StubFeaturePage`. Remove or rewrite `src/pages/School/Transportation.tsx` (hardcoded “Active Routes: 8”; not routed today).

---

## 1. Problem statement

Campus specialists appear in:

- Sidebar nav (`src/constants/navByRole.ts`)
- Role dashboards (`src/features/dashboard/registry.ts`)
- Marketing catalog (`Campus specialists · 7 modules · 0 live`)
- Platform guide honesty cards (`docs/ROLE_GUIDED_WIZARD_PLAN.md`)

Operators see menu entries but get empty stubs. That is intentional today; the product promise is to **graduate each module to Live** only when API-backed workflows exist.

---

## 2. Goals

1. **Real workflows** per module — create, list, update, and report on school-scoped records.
2. **Student linkage** where the domain requires it (loans, visits, sessions, bed assignments, route riders, team roster).
3. **Role-safe access** — specialist roles manage their domain; Admin/Principal oversight; parents/students read only what policy allows (v1 can defer parent views).
4. **Reuse platform patterns** — Executive Slate UI, `PageShell` / `PageHeader` / `Surface`, `FeatureModalShell` forms, `PageToast`, `confirmAction`, Identity staff/student name enrichment.
5. **Flip marketing status** module-by-module from Limited → Live in landing catalog when acceptance checks pass.

## 3. Non-goals (v1)

| Out of scope | Notes |
| :--- | :--- |
| GPS live bus tracking | Future extension per `docs/features-guide.md` |
| E-book DRM / external library integrations | Manual catalog only in v1 |
| Parent SMS on clinic admission | Defer to Comms templates phase |
| End-to-end encrypted counselor notes | Role ACL + audit log in v1; crypto layer later |
| Stripe / fee integration for library fines or cafeteria payments | Manual overdue list only |
| Barcode/RFID hardware | Manual checkout/scan fields optional later |
| New microservice per module | One **Campus** service + **Ops** transport completion |

---

## 4. Architecture

### 4.1 Service ownership

| Concern | Owner | Rationale |
| :--- | :--- | :--- |
| **Transport fleet** (existing `Vehicle`, `VehicleMaintenance`) | **Ops** | Already in `services/ops/prisma/schema.prisma` + `logisticsService` |
| **Transport routes & ridership** | **Ops** (extend) | Same logistics domain; gateway already maps `vehicles` → ops |
| **Library, Clinic, Counseling, Athletics, Hostel, Cafeteria** domain records | **Campus** (new) | Keeps Ops focused on facilities; student-care data in one place |
| Student / staff directory, names, plan entitlements | **Identity** | Existing `GET …/students`, `GET …/staff` |
| Student profile health fields (allergies, blood type) | **Identity** (extend) | Today only in Student Records UI — not persisted in Identity schema |
| In-app notifications | **Comms** | Follow work-order / leave producer pattern |
| Calendar events (optional) | **Academic** | Hostel check-in, athletics fixtures — phase 2+ |
| Shared stock (medical / food / general) | **Ops** `InventoryItem` | Category-scoped lists; Campus modules link when needed |

### 4.2 New service: `campus`

```
services/campus/
  prisma/schema.prisma   → schema `campus`
  src/routes/
  src/controllers/
  src/services/
  src/lib/identityClient.ts
  src/lib/notifyInApp.ts   (or HTTP to Comms internal)
```

**Gateway:** register `/api/schools/:schoolId/campus/*` (or per-resource paths) → `campus` service.

**Cross-service reads:** Campus never FKs to Identity.User/Student — store `studentId`, `staffId`, `schoolId` as UUID strings (same pattern as Ops).

### 4.3 Data model (Campus schema)

#### Library

| Model | Key fields |
| :--- | :--- |
| `LibraryItem` | `schoolId`, `title`, `author`, `isbn?`, `category`, `copiesTotal`, `copiesAvailable`, `location?`, `status` |
| `LibraryLoan` | `itemId`, `studentId`, `loanedAt`, `dueAt`, `returnedAt?`, `status` (OUT/OVERDUE/RETURNED), `notes?` |

#### Clinic

| Model | Key fields |
| :--- | :--- |
| `StudentHealthProfile` | `studentId`, `schoolId`, `bloodType?`, `allergies?`, `medications?`, `emergencyContact?`, `updatedBy` |
| `ClinicVisit` | `studentId`, `schoolId`, `visitDate`, `reason`, `treatment?`, `disposition` (OBSERVATION/SENT_HOME/REFERRED), `loggedBy`, `parentNotified` bool |

#### Counseling

| Model | Key fields |
| :--- | :--- |
| `CounselingSession` | `studentId`, `schoolId`, `sessionDate`, `sessionType`, `summary` (staff-visible), `confidentialNotes?` (counselor + admin only), `followUpAt?`, `loggedBy` |

#### Athletics

| Model | Key fields |
| :--- | :--- |
| `AthleticsTeam` | `schoolId`, `name`, `sport`, `season`, `coachStaffId?` |
| `AthleticsRoster` | `teamId`, `studentId`, `jerseyNumber?`, `role?` |
| `AthleticsEvent` | `teamId`, `title`, `startsAt`, `location?`, `opponent?`, `result?` |

#### Hostel

| Model | Key fields |
| :--- | :--- |
| `HostelBuilding` | `schoolId`, `name`, `genderPolicy?` |
| `HostelRoom` | `buildingId`, `label`, `capacity`, `status` |
| `HostelAssignment` | `roomId`, `studentId`, `checkIn`, `checkOut?`, `status` |

#### Cafeteria

| Model | Key fields |
| :--- | :--- |
| `CafeteriaMenuDay` | `schoolId`, `date`, `mealType` (BREAKFAST/LUNCH/SNACK), `items` (JSON text array or join table) |
| `CafeteriaMealCount` | `schoolId`, `date`, `mealType`, `planned`, `served`, `notes?` |

### 4.4 Data model (Ops extensions — Transport)

| Model | Key fields |
| :--- | :--- |
| `TransportRoute` | `schoolId`, `name`, `vehicleId?`, `driverStaffId?`, `status`, `notes?` |
| `TransportStop` | `routeId`, `name`, `sortOrder`, `pickupTime?` |
| `TransportRider` | `routeId`, `studentId`, `stopId?`, `status` |

**Existing:** `Vehicle`, `VehicleMaintenance` — wire UI to real PATCH/create endpoints; add update vehicle status + assign driver.

**Inventory categories (Ops):** Standardize enum or prefix: `MEDICAL`, `FOOD`, `LIBRARY`, `GENERAL`. Specialist inventory pages filter by category (replace generic `Inventory.tsx` copy with role-specific headers only — same API).

---

## 5. Roles & permissions

| Module | View | Create / update | Notes |
| :--- | :--- | :--- | :--- |
| Library | Librarian, Admin, Principal | Librarian (+ admin) | Students: optional “my loans” read later |
| Clinic | Nurse, Admin, Principal | Nurse (+ admin) | Teachers: no confidential health by default |
| Counseling | Counselor, Admin, Principal | Counselor (+ admin) | `confidentialNotes` hidden from non-counselor roles |
| Athletics | Athletics Director, Admin, Principal, Coach* | Athletics Director (+ admin) | *Coach = staff linked as `coachStaffId` read-only roster |
| Hostel | Hostel Warden, Admin, Principal | Warden (+ admin) | Reuse student attendance read for warden nav |
| Cafeteria | Cafeteria Manager, Admin, Principal | Manager (+ admin) | Food inventory via Ops category filter |
| Transport | Transportation, Admin, Principal, VPA | Transportation (+ admin) | Drivers = staff with role or assigned `driverId` |

**Capabilities:** Add `action.campus_*` and `nav.*` keys only if missing; align `shared/role-capability-defaults.json` + School Admin matrix. Gate APIs with same role lists as `App.tsx` routes.

**Feature entitlements:** Middleware checks school has feature key (`library`, etc.) from Identity tenant entitlements before Campus/Ops handlers run.

---

## 6. UI surfaces

Replace stubs under `src/features/<module>/` (thin `src/pages/School/*.tsx` re-exports). Follow Work Orders / Facilities Hub patterns.

| Module | Route | UI structure |
| :--- | :--- | :--- |
| Library | `/:slug/library` | Tabs: **Catalog** (search, add item, adjust copies) · **Loans** (checkout, return, overdue) · stat row: titles, out, overdue |
| Clinic | `/:slug/clinic` | Tabs: **Today’s visits** · **Student lookup** (health profile + visit history) · log visit modal |
| Counseling | `/:slug/counseling` | Session list + filters; log session drawer; student picker from Identity students |
| Athletics | `/:slug/athletics` | Tabs: **Teams** · **Schedule** · team detail drawer (roster add/remove) |
| Hostel | `/:slug/hostel` | Tabs: **Buildings & rooms** · **Assignments** · occupancy stats (beds used / available) |
| Cafeteria | `/:slug/cafeteria` | Tabs: **Menu planner** (week view) · **Meal counts** (daily entry) |
| Transport | `/:slug/bus-routes` | Route list + stops editor + rider assignment |
| Transport | `/:slug/drivers` | Staff filter (transport role or assigned drivers) + vehicle assignment |
| Transport | `/:slug/vehicle-maintenance` | Fleet list + maintenance log per vehicle (Ops API) |

**Specialty dashboards:** When a module goes Live, replace Limited honesty cards with real KPI tiles (counts from API only).

**Landing / modules page:** Per-module flag in catalog config — flip `status: "live"` when that module’s acceptance section is checked.

**Delete:** Orphan `src/pages/School/Transportation.tsx` (unrouted, dishonest KPIs).

---

## 7. Cross-cutting requirements

| Area | Requirement |
| :--- | :--- |
| **Notifications** | Optional v1: library overdue (weekly job), clinic visit logged → parent inbox (if `parentNotified` toggled). Use Comms producer pattern from `docs/NOTIFICATIONS_PLAN.md`. |
| **Reports** | Extend `/:slug/reports` with optional campus summary rows when role permits (counts only). |
| **Audit** | Campus mutations log to Ops/Identity `SystemLog` or Campus audit table — at minimum create/update/delete with `userId`. |
| **i18n** | New copy under `pages` namespace; run `i18n:check` before marking phase done. |
| **Tests** | Unit tests per Campus service; HTTP smoke for CRUD; Playwright persona smokes per specialist role (replace library-only stub smoke). |
| **Docs** | Update `docs/APP_FEATURES_OVERVIEW.md` §4.10 row per module; platform guide honesty cards retired per module as it goes Live. |

---

## 8. Phased delivery

Estimates assume one implementer familiar with the codebase. Phases are sequential per module but **Transport Phase 1** and **Campus service scaffold (Phase 0)** can overlap.

### Phase 0 — Foundation (3–4 days)

- [ ] Create `services/campus` (Dockerfile, compose, gateway routes, db-roles schema)
- [ ] Shared Campus patterns: school scoping, validation, Identity student/staff enrichment helper
- [ ] Feature entitlement middleware
- [ ] Frontend feature folder template + API client
- [ ] Remove or rewrite dishonest `Transportation.tsx`
- [ ] Document API conventions in this plan’s §10

**Acceptance:** `GET /health/live` on campus; gateway proxy smoke; no regression on existing Ops routes.

### Phase 1 — Transport (4–5 days)

**Ops-only** (no Campus service dependency).

- [ ] CRUD `TransportRoute`, `TransportStop`, `TransportRider`
- [ ] Vehicle: PATCH status, assign `driverId`; maintenance log create/list (extend existing)
- [ ] UI: `bus-routes`, `drivers`, `vehicle-maintenance` — full Executive Slate
- [ ] Drivers page: pick from Identity staff; show assigned vehicle/route

**Acceptance:**

- [ ] Create route with 3 stops → assign vehicle + driver → assign 2 students to stops
- [ ] Log maintenance on vehicle → appears in vehicle-maintenance tab
- [ ] No hardcoded route counts; empty states when none
- [ ] Transportation role E2E smoke passes
- [ ] Landing catalog: **Transport** → Live

### Phase 2 — Library (4–5 days)

- [ ] Campus: `LibraryItem`, `LibraryLoan` CRUD
- [ ] Checkout enforces available copies; return restores count; overdue derived from `dueAt`
- [ ] UI: catalog search, loan/return modals, overdue filter
- [ ] Optional: link duplicate titles via ISBN field only (no external API)

**Acceptance:**

- [ ] Add book (5 copies) → loan to student → available = 4 → return → 5
- [ ] Overdue list shows past-due loans only
- [ ] Librarian + School Admin access; teacher cannot mutate
- [ ] Landing: **Library** → Live

### Phase 3 — Clinic (4–5 days)

- [ ] Identity: persist `StudentHealthProfile` fields (migrate from Student Records UI fiction)
- [ ] Campus: `ClinicVisit` CRUD + list by date/student
- [ ] UI: log visit; view/edit health profile on student detail panel
- [ ] Medical inventory: Ops inventory filtered `category=MEDICAL` (polish existing page title for Nurse)

**Acceptance:**

- [ ] Save allergies on student → reload persists from API
- [ ] Log visit with disposition → appears in today list
- [ ] Nurse cannot see counseling confidential notes (N/A cross-module)
- [ ] Landing: **Clinic** → Live

### Phase 4 — Counseling (3–4 days)

- [ ] Campus: `CounselingSession` with confidential field ACL at API layer
- [ ] UI: session log + student filter; hide confidential textarea from non-counselor roles
- [ ] Counselor nav `students` continues to link Students directory (live read) — optional badge “has sessions”

**Acceptance:**

- [ ] Counselor creates session with confidential notes → Admin sees summary only, not confidential field
- [ ] Counselor can list sessions for one student
- [ ] Landing: **Counseling** → Live

### Phase 5 — Hostel (4–5 days)

- [ ] Campus: buildings, rooms, assignments
- [ ] Occupancy stats = assigned beds / total capacity (computed, not stored fake KPI)
- [ ] Warden can assign student to bed; checkout clears assignment

**Acceptance:**

- [ ] Create building → 10 rooms → assign student → occupancy 1/10
- [ ] Checkout student → bed available again
- [ ] Landing: **Hostel** → Live

### Phase 6 — Cafeteria (3–4 days)

- [ ] Campus: menu days + meal counts
- [ ] UI: week menu grid; daily served count entry
- [ ] Food inventory: Ops category `FOOD` filter for Cafeteria Manager

**Acceptance:**

- [ ] Plan lunch menu for Mon–Fri → enter served counts → stats show planned vs served
- [ ] Landing: **Cafeteria** → Live

### Phase 7 — Athletics (4–5 days)

- [ ] Campus: teams, roster, events
- [ ] UI: team cards, roster management, simple fixture list (no fake scores)
- [ ] Coaches directory nav → staff list filtered by coach role or team link

**Acceptance:**

- [ ] Create team → add 5 students → schedule one event → visible on athletics schedule tab
- [ ] Landing: **Athletics** → Live

### Phase 8 — Hardening (2–3 days)

- [x] Nav badges where queues exist (e.g. overdue loans, clinic visits today, unassigned route drivers)
- [x] CSV export per module (honest columns only; counseling omits confidential notes)
- [x] Platform guide: replace Limited honesty steps for Live modules
- [x] `docs/TEST_COVERAGE_PLAN.md` updated (live specialist stub guard)
- [x] Full `IMPLEMENTATION_STATUS.md` gap row closed
- [x] Premium feature entitlement middleware on Campus/Ops specialist routes (`GET /api/internal/schools/:id/entitlements`)
- [x] Ops inventory category filters for Nurse / Cafeteria / Librarian nav (`MEDICAL`, `FOOD`, `LIBRARY`)
- [x] **Deferred v1:** Parent/student read-only views (transport route, clinic summary)
- [x] **Family portal v2 (2026-08-04):** `GET /api/schools/:id/my-campus` + `/my-campus` SPA for PARENT/STUDENT — link-scoped, counseling excluded, per-module plan gates

---

## 9. API sketch (illustrative)

Prefix: `/api/schools/:schoolId/…` — all require auth + school membership + feature entitlement.

```
# Library (campus)
GET    /library/items
POST   /library/items
PATCH  /library/items/:id
GET    /library/loans?status=OUT|OVERDUE|RETURNED
POST   /library/loans              { itemId, studentId, dueAt }
PATCH  /library/loans/:id/return

# Clinic (campus + identity)
GET    /clinic/visits?date=&studentId=
POST   /clinic/visits
GET    /students/:studentId/health-profile
PUT    /students/:studentId/health-profile

# Counseling (campus)
GET    /counseling/sessions
POST   /counseling/sessions
PATCH  /counseling/sessions/:id

# Athletics (campus)
GET    /athletics/teams
POST   /athletics/teams
POST   /athletics/teams/:id/roster
DELETE /athletics/teams/:id/roster/:studentId
GET    /athletics/events

# Hostel (campus)
GET    /hostel/buildings
POST   /hostel/assignments
PATCH  /hostel/assignments/:id/checkout

# Cafeteria (campus)
GET    /cafeteria/menus?from=&to=
PUT    /cafeteria/menus/:date/:mealType
POST   /cafeteria/meal-counts

# Transport (ops)
GET    /transport/routes
POST   /transport/routes
POST   /transport/routes/:id/stops
POST   /transport/routes/:id/riders
GET    /vehicles                      (existing)
POST   /vehicles/:id/maintenance      (existing, expose in UI)
PATCH  /vehicles/:id
```

Exact path naming to match gateway conventions during Phase 0.

---

## 10. Verification matrix (per module)

| Module | Role to test | Primary URL | Must be true |
| :--- | :--- | :--- | :--- |
| Library | Librarian | `/{slug}/library` | CRUD + loan cycle |
| Clinic | Nurse | `/{slug}/clinic` | Visit + health profile persist |
| Counseling | Counselor | `/{slug}/counseling` | Confidential ACL |
| Athletics | Athletics Director | `/{slug}/athletics` | Team + roster + event |
| Hostel | Hostel Warden | `/{slug}/hostel` | Assign / checkout bed |
| Cafeteria | Cafeteria Manager | `/{slug}/cafeteria` | Menu + meal count |
| Transport | Transportation | `/{slug}/bus-routes` | Route + rider + fleet |

**Regression:** Stub pages must not reappear for Live modules. Marketing catalog must show **7 live** only when all acceptance rows pass.

---

## 11. Risks & decisions

| Decision | Recommendation |
| :--- | :--- |
| One Campus service vs seven | **One Campus service** — shared student linkage, auth, and deployment |
| Transport in Ops vs Campus | **Ops** — vehicles already live there |
| Student health on Identity vs Campus | **Split** — durable profile on Identity; episodic visits on Campus |
| Inventory duplication | **Single Ops inventory** with category filters for nurse/cafeteria/librarian views |
| Parent portal visibility | **Defer** to `docs/PARENT_PORTAL_AND_PTA_PLAN.md` after v1 specialist UIs stable |

| Risk | Mitigation |
| :--- | :--- |
| Scope creep (GPS, fines, SMS) | Non-goals table; phase gates |
| Counseling privacy compliance | API-field ACL + audit; document retention policy in school settings later |
| Cross-service name enrichment N+1 | Batch Identity lookup helper (pattern from grade review / work orders) |
| Premium schools without module staff | Modules hidden by role nav; entitlements allow Admin to preview |

---

## 12. Doc updates (when implementing)

| When | Update |
| :--- | :--- |
| Phase 0 start | This file status → **In progress** |
| Each module Live | `docs/APP_FEATURES_OVERVIEW.md` §4.10 row; landing module config |
| All modules Live | `IMPLEMENTATION_STATUS.md` — remove Limited gap; `docs/features-guide.md` stub language |
| Guide wizard | `docs/ROLE_GUIDED_WIZARD_PLAN.md` — retire Limited honesty cards per module |

---

## 13. Suggested implementation order (summary)

```
Phase 0  Foundation + Campus service
Phase 1  Transport      ← partial Ops backend already exists
Phase 2  Library        ← clear CRUD, high visibility
Phase 3  Clinic         ← unblocks health data honesty
Phase 4  Counseling
Phase 5  Hostel
Phase 6  Cafeteria
Phase 7  Athletics
Phase 8  Hardening + marketing Live flip
```

**Total estimate:** ~28–35 engineering days for full v1 of all seven modules, excluding parent portal and hardware integrations.

---

## 14. Open questions (confirm before Phase 0 coding)

1. **Counseling confidentiality:** Is counselor-only API hiding enough for v1, or does the school require a separate “elevated admin break-glass” role?
2. **Library fines:** Track overdue without fees in v1 — OK?
3. **Hostel attendance:** Reuse Lifecycle student attendance as-is, or add hostel-specific nightly check-in records in Campus?
4. **Transport ↔ parent:** Include read-only “my child’s route” in v1 or defer?

Default if unanswered: ship v1 with counselor-only confidential fields, overdue without fines, reuse existing attendance page for warden, defer parent transport view.
