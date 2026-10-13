# School Onboarding & Student Admission — Implementation & Test Plan

> **Status:** Part B honesty fix shipped (2026-07-24). **Online registration control** shipped (2026-07-24). **Direct Admission existing-student prefill** shipped (2026-07-24). **Shared public + Direct Admission fields** shipped (2026-07-24). **Admission documents optional** shipped (2026-07-29).  
> **Date:** 2026-07-31  
> **Scope:** (1) Platform school registration — Super Admin + public/online form  
> **Scope:** (2) Student admission lifecycle — apply → review → fees → documents → enroll → class placement  
> **Companion:** Current microservices baseline in `IMPLEMENTATION_STATUS.md` / `MICROSERVICES_ROADMAP.md`

### 2026-08-06 — 95→100 gap plans (doc only)

- **Change:** Added `docs/ONBOARDING_ADMISSIONS_95_TO_100_PLAN.md` and `docs/ACADEMICS_ASSESSMENT_GAPS_PLAN.md`; corrected §1.1–1.2 remaining lists (CAPTCHA/Turnstile, notifications, parent hub partially shipped).
- **Status:** plan authored — awaiting confirmation before coding
- **Verify:** Cross-check `IMPLEMENTATION_STATUS.md` items 0x + 6

### 2026-08-05 — Remaining-gaps accuracy pass (doc only)

- **Change:** Corrected §1.1–1.2 “remaining” lists after code audit — admission policy UI lives in Admissions (`OnlineRegistrationCard`), not Settings; public apply status page exists (token lookup); clarified CAPTCHA (backend-only today), saved views, and approve→school link gaps.
- **Status:** done (documentation)
- **Verify:** Cross-check `IMPLEMENTATION_STATUS.md` item 0u + 6

### 2026-07-31 — Suspended-school login page

- **Change:** When Super Admin sets a school to `SUSPENDED` (or other blocked statuses), **all tenant users** who try to sign in are sent to a branded public page `/school-unavailable` (not a toast on the login form). Mid-session `/api/auth/me` and API `SCHOOL_SUSPENDED` responses also logout and redirect there.
- **Services / UI:** identity (login/me payload includes `schoolName` / `schoolStatus`); SPA `SchoolUnavailable` page; `ProtectedRoute` + `api` client
- **Status:** done
- **Verify:** Suspend school in Super Admin → school user login → lands on `/school-unavailable` with school name; Back to sign in works

### 2026-07-29 — Admission documents optional (no DOCS_REQUIRED block)

- **Change:** Student admission documents no longer block enroll. Default `requiredDocTypes` is `[]`; Identity/Lifecycle policy parsers always treat docs as optional (clears legacy `BIRTH_CERTIFICATE` / `ID_COPY` gates on existing schools). Uploads/review can still exist; enroll does not require them.
- **Services:** identity, lifecycle
- **Status:** done
- **Verify:**
  - Approve application → Enroll without birth cert / ID → succeeds (no `DOCS_REQUIRED`)
  - New schools provisioned with empty `requiredDocTypes`

### 2026-07-24 — Online registration (public apply control + returning students)

- **Change:** Registrar/Admin can enable online student registration and copy a public `/apply/{slug}` link. New applicants use the full form. Returning students verify with school email + DOB against an existing Identity `STUDENT` (no duplicate account); enroll sets `feeCohort=RETURNING` and skips force-password/welcome email.
- **Services:** Identity (`admission-policy` GET/PATCH, public grade-levels, verify-returning); Lifecycle (policy gates, create/enroll); Gateway suffix `admission-policy` → identity
- **UI / API:** Admissions → Overview → Online registration; `/apply/:slug`; `GET|PATCH /api/schools/:schoolId/admission-policy`
- **Status:** done
- **Verify:**
  - Registrar enables “Accept online applications” → copy link → submit new application → appears in Admissions as Online · New
  - Disable public apply → form unavailable + API 403
  - Returning path with existing student email+DOB → Returning badge → enroll → student `feeCohort` Returning

### 2026-07-24 — Direct Admission: select existing student + prefill

- **Change:** On Registrar **Direct Admission**, staff can search/select an existing school student. Selecting one prefills identity, DOB, gender, grade, address, parent, and contact fields from Identity; admission type becomes Returning. Submit sends `applicantType=RETURNING` + `existingStudentUserId` so Lifecycle links the application to the existing user (same path as public returning apply). Clearing the select resets to a blank new-applicant form.
- **Services / UI:** Frontend Registrar only (`ManualAdmissionTab`, `manualAdmissionForm` helpers, `usePageActions`); Lifecycle already accepts `existingStudentUserId` on create.
- **Status:** done
- **Verify:**
  - Admissions → Direct Admission → select an existing student → fields populate from directory data
  - Edit any field → submit → Pipeline shows Returning; enroll reuses the student user
  - “New applicant (blank form)” clears prefill

### 2026-07-24 — Shared public + Direct Admission fields

- **Change:** Public `/apply/:slug` and Registrar Direct Admission use the **same applicant field set** via `src/features/admission-form` (identity split name, contacts, parents/guardians, family info, prior schooling, notes). Public keeps New/Returning tabs + honeypot; Direct keeps existing-student prefill. Both submit through `buildAdmissionApiPayload`.
- **Services / UI:** Frontend only; Lifecycle create unchanged (notes JSON carries shared fields).
- **Status:** done
- **Verify:**
  - Public new apply shows first/middle/last, parents, family checkboxes, grade completed — same sections as Direct Admission
  - Public returning still requires email + DOB; other fields optional / updateable
  - Direct Admission submit still lands in Pipeline with notes preserving shared fields

---

## 0. Executive summary

| Area | Today | Target |
| :--- | :--- | :--- |
| **School onboarding** | Super Admin modal only; invite email fake; no public form; `ACTIVE` immediately; suspended schools still login | Dual-path: Super Admin provision **or** public application → review → activate; real invite; status enforced |
| **Student admission** | Staff-only Registrar pipeline; docs = boolean checklist; fees not linked; class assign is best-effort client side | Full lifecycle with optional public apply; real document store; admission fee as Finance invoice; transactional enroll + class placement |

**Owning services (target):**

| Concern | Service | Schema |
| :--- | :--- | :--- |
| Tenant School, school admins, invites, school status | **Identity** | `identity` |
| Public school applications (platform leads) | **Identity** (or thin public BFF on gateway) | `identity` |
| Student applications, admission state machine | **Lifecycle** | `lifecycle` |
| Admission / term fees | **Finance** | `finance` |
| Application document binaries | **Comms** (or object storage + Comms metadata) | `comms` + S3/GCS |
| Classroom membership after enroll | **Classroom** | `classroom` |
| Cross-service orchestration events | **@sms/event-bus** | Redis / BullMQ |

---

## 1. Current state (baseline — do not re-litigate)

### 1.1 School registration (as-built)

- **Super Admin assisted:** `/super-admin/schools` → “Register New School” (`src/pages/SuperAdmin/Schools.tsx`); `POST /api/super-admin/schools`
- **Public self-serve:** `/register-school` → `POST /api/public/school-registrations` + email confirm
- **Review queue:** `/super-admin/registrations` — workflow guide, filter/search, click any row → detail drawer with **full submitted application** (org, slug, country, timezone, address, size, contact, message, timeline); approve / request info / reject with per-application notes; one-time credentials panel on approve
- **Dashboard:** Platform dashboard stat “Pending applications” + recent pending table links to review queue
- **Creates on approve:** `School` + `SCHOOL_ADMIN`; returns `tempPassword` + invite (one-time reveal)
- **Status:** `SchoolRegistration` statuses `SUBMITTED | NEEDS_INFO | APPROVED | REJECTED | WITHDRAWN`
- **Remaining gaps (2026-08-06):** See **`docs/ONBOARDING_ADMISSIONS_95_TO_100_PLAN.md`** — ClamAV sidecar + fail-closed policy; SA queue `ListPagination` + school detail CTA; registrar applications paging; paged enrollment/classroom student pickers; parent hub i18n polish. *(CAPTCHA/Turnstile end-to-end, admission notifications, saved views scope, and partial approve→school toast link already shipped.)*

### 1.2 Student admission (as-built — refreshed 2026-07-24)

- **UI:** `/:slug/admissions` → **Registrar** hub (Overview / Directory / Pipeline / Cohorts / Direct Admission). Direct Admission and public `/apply/:slug` share the same applicant fields (`features/admission-form`); Direct also supports existing-student prefill. Orphan `src/features/admissions` removed. **Admissions tab** includes an in-page help panel; review modal uses charcoal header, indigo pill actions (upload / entrance fee / mark under review), human-readable interview rating labels (`1–5`), and **profile photo** edit (live for linked students; pending photo in notes for new applicants, applied on enroll).
- **Secondary:** `/:slug/enrollment` for classroom placement of existing students (Admin/Registrar).
- **API:** Lifecycle applications CRUD + `transition` + orchestrated `POST .../enroll` + documents + `create-entrance-fee`.
- **On `ENROLLED`:** Lifecycle loads Identity `admissionPolicy`, asserts fee/docs gates (waive only if staff checks boxes), Identity `find-or-create` with **`mustChangePassword: true`** + welcome email (console/SMTP), returns one-time credentials for copy panel.
- **Documents:** MinIO `AdmissionDocument` + legacy JSON checklist (still saved for notes; gates use file docs).
- **Fees:** Finance entrance fee via `create-entrance-fee`; `fee-paid` internal requires `x-internal-token`.
- **Public apply:** Verifies school `ACTIVE`/`TRIAL` + `publicApplyEnabled` server-side before create.
- **Admission policy UI (shipped):** `/{slug}/admissions` → **Online registration** card (`OnlineRegistrationCard`) — enable public apply, returning apply, entrance fee, doc gates via `GET/PATCH …/admission-policy` (not a Settings tab).
- **Public apply status:** `/apply/:slug/status` — bookmarkable link (`id` + `token` query) after submit; lookup form accepts pasted status link or **reference number + access code** (`GET /api/public/applications/lookup`); success screen shows reference, access code, and copy-link actions. **Not** a logged-in parent hub for all family applications (see My Children / my-applications).
- **Remaining gaps (2026-08-06):** See **`docs/ONBOARDING_ADMISSIONS_95_TO_100_PLAN.md`** — registrar pipeline server paging; enrollment/classroom full student fetch. *(In-app `ADMISSION_STATUS` notifications and parent read-only list on My Children shipped.)*

---

## 2. Product principles (non-negotiable)

1. **Two entry doors for schools, one data model** — Super Admin and public form both create the same `SchoolRegistration` / `School` records; only the actor and initial status differ.
2. **Two entry doors for students, one pipeline** — Public apply and Registrar direct-admit both create `AdmissionApplication` rows; staff always owns approve/enroll.
3. **Money and files are first-class** — Fees go through Finance; documents go through storage + metadata, not JSON checkboxes pretending to be files.
4. **State machines are server-enforced** — Clients cannot jump `PENDING → ENROLLED` without required gates (configurable per school).
5. **No secrets in UI forever** — Temp passwords delivered once via email (or one-time reveal modal for Super Admin), then force change on first login.
6. **Events over hidden coupling** — `school.activated`, `application.enrolled`, `fee.paid` drive side effects; avoid dual-writes across schemas in one HTTP request where possible (saga / outbox where needed).
7. **Honesty** — No fake revenue, fake invite success, or fake “subscription managed” buttons.

---

# PART A — School registration (platform onboarding)

## A1. Target user journeys

### Journey A — Super Admin provisions a school (assisted)

```
Super Admin → /super-admin/schools → Register
  → Step 1: Legal / org details (name, slug, country, timezone, address, phones)
  → Step 2: Primary admin (name, contactEmail) + optional plan/tier
  → Step 3: Confirm → create School status=ACTIVE (or TRIAL)
  → System creates SCHOOL_ADMIN, generates invite token
  → Email: magic link or temp password + /login?school=slug
  → Super Admin sees one-time credentials panel (copy once)
  → Optional: seed default grade levels / fee catalog templates
```

### Journey B — Online / public school registration (self-serve)

```
Anonymous → /register-school (marketing site or SPA public route)
  → Multi-step form (org + contact + intended size + attestation)
  → CAPTCHA + rate limit
  → Creates SchoolRegistration status=SUBMITTED (School row may be draft or absent)
  → Email confirmation to applicant
  → Super Admin queue: /super-admin/registrations
  → Review → Request info | Reject | Approve
  → On Approve: provision School + SCHOOL_ADMIN (same as Journey A)
  → Applicant receives invite email
```

### Journey C — Activation & first login

```
Admin opens invite → sets password → lands /:slug/dashboard
  → Onboarding checklist (operational): branding, grade levels, subjects, teacher,
    classroom, academic calendar periods, fee templates; soft: review public apply
    (SPA verifies required steps via live APIs; Mark setup complete when all required done)
  → School status remains ACTIVE/TRIAL; trial expiry job optional later
```

### Journey D — Suspend / reactivate

```
Super Admin → set SUSPENDED
  → Identity login rejects school users with clear error
  → Gateway/services reject tenant-scoped tokens for suspended schools
  → Reactivate restores access; emit school.status_changed
```

---

## A2. Domain model (Identity)

### A2.1 Extend `School`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `status` | enum string | `DRAFT` \| `PENDING_REVIEW` \| `TRIAL` \| `ACTIVE` \| `SUSPENDED` \| `REJECTED` \| `CLOSED` |
| `onboardingSource` | string | `SUPER_ADMIN` \| `PUBLIC_FORM` |
| `planCode` | string? | e.g. `STARTER`, `STANDARD` (billing later; store code only now) |
| `approvedAt` / `approvedBy` | datetime / userId? | Audit |
| `suspendedAt` / `suspendReason` | | |
| `trialEndsAt` | datetime? | Optional |

Keep existing: `slug`, `schoolCode`, `contactEmail`, branding fields.

### A2.2 New: `SchoolRegistration` (public applications)

| Field | Notes |
| :--- | :--- |
| `id`, `organizationName`, `requestedSlug`, `country`, `timezone` | |
| `applicantName`, `applicantEmail`, `applicantPhone` | |
| `address`, `estimatedStudents`, `message` | |
| `status` | `SUBMITTED` \| `NEEDS_INFO` \| `APPROVED` \| `REJECTED` \| `WITHDRAWN` |
| `reviewNotes`, `reviewedBy`, `reviewedAt` | |
| `schoolId` | set when approved / provisioned |
| `confirmationToken`, `emailConfirmedAt` | double opt-in |
| `ipHash`, `userAgent` | abuse forensics (hashed) |
| `createdAt`, `updatedAt` | |

### A2.3 New: `InviteToken`

| Field | Notes |
| :--- | :--- |
| `id`, `schoolId`, `userId`, `tokenHash`, `expiresAt`, `usedAt` | |
| `purpose` | `SCHOOL_ADMIN_ONBOARD` \| `PASSWORD_RESET` |

Never store raw tokens; email contains raw once.

---

## A3. API design (Identity + Gateway)

### Public (unauthenticated, rate-limited)

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `POST` | `/api/public/school-registrations` | Submit online form |
| `POST` | `/api/public/school-registrations/:id/confirm-email` | Confirm applicant email |
| `GET` | `/api/public/slug-available?slug=` | Slug uniqueness check |
| `POST` | `/api/public/invites/:token/accept` | Set password from invite |

### Super Admin

| Method | Path | Purpose |
| :--- | :--- | :--- |
| Existing | `/api/super-admin/schools` CRUD | Keep; enhance create body |
| `GET` | `/api/super-admin/school-registrations` | Queue |
| `GET` | `/api/super-admin/school-registrations/:id` | Detail |
| `POST` | `/api/super-admin/school-registrations/:id/approve` | Provision school |
| `POST` | `/api/super-admin/school-registrations/:id/reject` | Reject + email |
| `POST` | `/api/super-admin/school-registrations/:id/request-info` | NEEDS_INFO |

**UX (2026-07-31):** Request info requires review notes; on success the queue switches to **Needs info** and a toast confirms the email (previously the row left Pending with no feedback — looked broken).

| `POST` | `/api/super-admin/schools/:id/resend-invite` | Resend admin invite |
| Enhance | `PATCH .../status` | Enforce transitions; emit events |

### Auth hardening

| Change | Detail |
| :--- | :--- |
| School login | Reject if school `SUSPENDED` / `CLOSED` / `REJECTED` / `DRAFT` / `PENDING_REVIEW` → SPA **`/school-unavailable`** (custom page for all tenant users) |
| Super Admin login | Unchanged |
| JWT claims | Include `schoolStatus` or re-check on each authenticated request via middleware cache |

### Gateway

- Route `/api/public/school-registrations*` → Identity
- Route `/api/public/invites*` → Identity
- Route `/api/public/slug-available` → Identity
- Keep `/api/super-admin*` → Identity
- Apply IP rate limits (stricter than school login)

---

## A4. UI surfaces

| Route | Audience | Work |
| :--- | :--- | :--- |
| `/register-school` | Public | New multi-step form (Tailwind Executive Slate; no fake stats) |
| `/invite/:token` | Invitee | Set password |
| `/super-admin/schools` | Super Admin | Fix invite reveal; real filters; wire “View School”; remove fake subscription CTAs or implement |
| `/super-admin/registrations` | Super Admin | **New** review queue |
| `/:slug/onboarding` | School Admin | Optional checklist after first login |

**Email templates (Comms or Identity mailer):** registration received, needs info, approved+invite, rejected, school suspended notice.

---

## A5. Events

| Event | Producer | Consumers |
| :--- | :--- | :--- |
| `school.registration.submitted` | Identity | Comms (ack email), Ops metrics |
| `school.approved` / `school.provisioned` | Identity | Academic (optional grade-level template seed), Finance (fee catalog seed), Comms (invite) |
| `school.status_changed` | Identity | All services: deny tenant traffic when suspended |
| `school.deleted` | Identity | Cascade cleanup jobs (lifecycle/classroom/…) |

---

## A6. Implementation phases (Part A)

### Phase A0 — Harden what exists (1–2 days)

1. Enforce school status on `POST /api/auth/login`.
2. After `registerSchool`, return + **display once** admin email + temp password; add “Copy credentials” UI.
3. Replace `window.confirm` with project toasts/modals.
4. Stop advertising “Send Invite” until mailer exists — or wire SMTP/`COMMS` immediately in A1.

**Exit:** Suspended school cannot log in; Super Admin can actually onboard a school without Slack-pasting passwords from logs.

### Phase A1 — Invite + email (2–3 days)

1. `InviteToken` model + accept endpoint + `/invite/:token` page.
2. Mailer abstraction (`EMAIL_PROVIDER=console|smtp|ses`) — console logs in dev.
3. `resend-invite` for Super Admin.
4. Force password change flag on first login.

**Exit:** End-to-end Super Admin → email (or console) → admin sets password → dashboard.

### Phase A2 — Public registration + review queue (4–6 days)

1. `SchoolRegistration` model + public POST + email confirm.
2. Super Admin registrations UI + approve/reject/request-info.
3. Approve path reuses provision logic from A0/A1.
4. CAPTCHA (Turnstile/hCaptcha) + rate limit + honeypot.
5. Slug availability endpoint + client debounce.

**Exit:** Stranger can apply; Super Admin can approve into a working tenant.

### Phase A3 — Onboarding checklist + templates (2–3 days)

1. Post-login checklist (branding, grades, fee types).
2. Optional “starter pack” seed on approve (grade levels, sample fee types).
3. Audit log entries for provision/approve/suspend.

**Exit:** New school is usable for admissions without manual DB surgery.

#### Changelog (2026-08-03) — Setup checklist completion tracking

- **Change:** `/:slug/onboarding` now verifies each step from live APIs: school branding (`GET /api/schools/:id`), grade levels, classrooms, and **fee templates** (no longer hard-coded done). Failed fetches show **unknown** (not empty todo). Refreshes on focus/visibility + manual Refresh. Deep links only for roles that can open the target page. Mark complete requires `res.ok`.
- **Who:** School Admin (primary); Principal / IT Admin can view status with limited links
- **Services / UI:** `frontend-spa` — `Onboarding.tsx`, `src/features/onboarding/setupChecklist.ts`
- **Status:** superseded by operational checklist below
- **Verify:** School Admin completes branding / grade / classroom / fee template → each flips to done after return or Refresh; Mark setup complete only when all done; `npm run test:setup-checklist`

#### Changelog (2026-08-03) — Operational School setup (expanded)

- **Change:** Checklist expanded to **operational readiness**. **Required** (gate Mark setup complete): branding, ≥1 grade level, ≥1 subject, ≥1 teacher, ≥1 classroom, academic calendar with ≥1 period, ≥1 fee template. **Recommended** (soft): review online admission / public apply (local “Mark reviewed”). Progress counts required only.
- **Who:** School Admin (primary)
- **Services / UI:** `frontend-spa` — `setupChecklist.ts`, `Onboarding.tsx`
- **Status:** done
- **Verify:** Create classroom still needs a teacher — staff step reflects that; calendar empty → calendar step todo; Mark complete disabled until all 7 required are done; `npm run test:setup-checklist`

### Phase A4 — Billing hooks (deferrable)

- `planCode`, trial dates, webhook stubs for Stripe later.
- Do **not** fake revenue in Reports; hide or label “Not connected”.

---

## A7. Test plan (Part A)

### A7.1 Unit / service tests

| ID | Case | Expected |
| :--- | :--- | :--- |
| SA-U1 | `registerSchool` duplicate slug | 409 |
| SA-U2 | `registerSchool` duplicate contactEmail admin | 409 |
| SA-U3 | Login when school `SUSPENDED` | 403 + `SCHOOL_SUSPENDED` → redirect `/school-unavailable` |
| SA-U4 | Login when school `ACTIVE` | 200 + JWT |
| SA-U5 | Invite accept expired token | 410 |
| SA-U6 | Invite accept twice | 409 |
| SA-U7 | Public registration invalid slug format | 400 |
| SA-U8 | Approve registration twice | Idempotent or 409 |
| SA-U9 | Status transition `ACTIVE → SUSPENDED → ACTIVE` | Allowed; emits event |
| SA-U10 | Illegal transition `CLOSED → ACTIVE` without reopen | 400 |

### A7.2 API / integration (gateway + Identity)

| ID | Case | Expected |
| :--- | :--- | :--- |
| SA-I1 | `POST /api/public/school-registrations` no auth | 201 |
| SA-I2 | Same IP bursts | 429 after limit |
| SA-I3 | Confirm email then approve | School + admin exist |
| SA-I4 | Super Admin list registrations filter by status | Correct subset |
| SA-I5 | Rejected registration cannot be approved without reopen policy | Per rules |
| SA-I6 | `slug-available` reflects reserved + existing | Accurate |

### A7.3 E2E / UI

| ID | Case | Expected |
| :--- | :--- | :--- |
| SA-E1 | Super Admin register → copy credentials → login | Dashboard |
| SA-E2 | Public form submit → see confirmation page | No stack traces |
| SA-E3 | Super Admin approve → applicant invite flow | Password set works |
| SA-E4 | Suspend school → school admin session fails refresh/login | Blocked |
| SA-E5 | Mobile + desktop public form | Usable; one composition; brand-first if marketing |

### A7.4 Security / abuse

| ID | Case | Expected |
| :--- | :--- | :--- |
| SA-S1 | Public endpoints require CAPTCHA in prod | Reject without token |
| SA-S2 | Invite tokens not logged in plaintext | Hash only in DB |
| SA-S3 | XSS in organization name / message | Escaped in Super Admin UI |
| SA-S4 | IDOR: school admin cannot approve registrations | 403 |
| SA-S5 | Enumerate invites by brute force | Rate limited; opaque tokens |

### A7.5 Acceptance criteria (Part A done)

- [x] Both Super Admin and public paths can produce an `ACTIVE`/`TRIAL` school with a working admin login. *(API + UI; rebuild identity image to apply schema)*
- [x] Suspended schools cannot authenticate.
- [x] Invite email path works (console mailer in local; SMTP when configured).
- [x] No UI invents revenue; stats report `billingConnected: false`.
- [x] Gateway routes public school endpoints without monolith.

---

# PART B — Student admission lifecycle

## B1. Target end-to-end flow

```
                    ┌─────────────────────┐
   Public parent    │  Staff Direct Admit │
   /apply/:slug  ───┤                     │
                    └─────────┬───────────┘
                              ▼
                    AdmissionApplication
                         PENDING
                              │
                              ▼
                      UNDER_REVIEW
                    (docs + evaluation)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
          REJECTED        APPROVED      WAITLIST (opt)
                              │
                              ▼
                    FEE_PENDING (if required)
                     Finance invoice
                              │
                         fee.paid
                              │
                              ▼
                    DOCS_COMPLETE gate
                              │
                              ▼
                         ENROLLED
              Identity: STUDENT + PARENT
                              │
                              ▼
                    CLASS_ASSIGNED (opt same txn)
                 Classroom membership
                              │
                              ▼
                    Welcome email / credentials
```

**Configurable gates per school** (`SchoolAdmissionPolicy` JSON or table):

| Gate | Default |
| :--- | :--- |
| Require entrance fee before `ENROLLED` | `false` by default (configurable) |
| Required document types | **none** — all student documents optional; never block enroll |
| Require classroom on enroll | `false` (assign later on **Enrollment** — homeroom class groups only; subject classrooms fan out automatically) |
| Allow public apply | per-school flag |

---

## B2. Domain model changes

### B2.1 `AdmissionApplication` (Lifecycle) — harden

| Change | Detail |
| :--- | :--- |
| `status` | Controlled enum (string union enforced in service): `PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `WAITLISTED`, `FEE_PENDING`, `DOCS_PENDING`, `ENROLLED`, `WITHDRAWN` |
| `source` | `PUBLIC` \| `STAFF_DIRECT` \| `IMPORT` |
| `studentUserId` / `parentUserId` | Set on enroll (Identity UUIDs) |
| `classroomId` | Optional target / assigned section |
| `feePaymentId` | Finance UUID (no FK across schemas) |
| `applicationNumber` | Human-readable unique per school |
| `reviewedBy`, `reviewedAt`, `enrolledAt` | Audit |
| `documents` | Deprecate boolean blob → use `AdmissionDocument` rows |
| `notes` | Keep free text; stop stuffing structured fee data here |
| `evaluation` | Optional JSON column or structured fields for score/interview |

**Server state machine (illustrative allowed edges):**

```
PENDING → UNDER_REVIEW | WITHDRAWN | REJECTED
UNDER_REVIEW → APPROVED | REJECTED | WAITLISTED | UNDER_REVIEW
APPROVED → FEE_PENDING | DOCS_PENDING | ENROLLED (if gates waived)
FEE_PENDING → DOCS_PENDING | ENROLLED | APPROVED (refund/cancel path)
DOCS_PENDING → ENROLLED | UNDER_REVIEW
WAITLISTED → UNDER_REVIEW | REJECTED | APPROVED
ENROLLED → (terminal for v1; transfer/withdraw later)
REJECTED / WITHDRAWN → terminal (or reopen → UNDER_REVIEW)
```

Illegal transitions → `400` with `code: INVALID_STATUS_TRANSITION`.

### B2.2 `AdmissionDocument` (Lifecycle metadata + Comms/storage)

| Field | Notes |
| :--- | :--- |
| `id`, `applicationId`, `schoolId` | |
| `docType` | `BIRTH_CERTIFICATE` \| `TRANSCRIPT` \| `ID_COPY` \| `MEDICAL` \| `OTHER` |
| `status` | `MISSING` \| `UPLOADED` \| `APPROVED` \| `REJECTED` |
| `storageKey` / `fileUrl` | Object storage |
| `fileName`, `mimeType`, `sizeBytes` | |
| `uploadedBy`, `reviewedBy`, `reviewedAt` | |
| `rejectionReason` | |

Upload flow: client → `POST` presigned URL (or multipart via Comms) → confirm → Lifecycle updates metadata.

### B2.3 Finance linkage

| Change | Detail |
| :--- | :--- |
| `FeePayment.applicationId` | Optional string UUID |
| `FeePayment.type` | Include `ENTRANCE` / `ADMISSION` |
| `FeePayment.studentId` | Nullable until enroll **or** use application-scoped invoice without student |

**Preferred v1:** On `APPROVED` (when fee required), Finance creates invoice keyed by `applicationId` (+ placeholder payer email). On pay → publish `fee.paid` → Lifecycle advances to next gate. On `ENROLLED`, attach `studentId` to the fee row.

### B2.4 `SchoolAdmissionPolicy` (Identity or Lifecycle)

Per-school knobs listed in B1; editable by `SCHOOL_ADMIN` / `REGISTRAR` under Settings → Admissions.

---

## B3. API design

### Public apply (optional, per school)

| Method | Path | Service |
| :--- | :--- | :--- |
| `GET` | `/api/public/schools/:slug` | Identity (includes parsed `admissionPolicy`) |
| `GET` | `/api/public/schools/:slug/grade-levels` | Identity → Academic internal |
| `POST` | `/api/public/applications` | Lifecycle (`applicantType`: `NEW` \| `RETURNING`) |
| `GET` | `/api/public/applications/:id/status?token=` | Lifecycle (opaque status token) |
| `POST` | `/api/public/applications/:id/documents` | Lifecycle + storage |
| `GET` | `/api/public/applications/:id/fees` | Finance |
| `POST` | `/api/public/fees/:id/checkout` | Finance (Stripe/manual mark) |

**Policy knobs (Identity `School.admissionPolicy`):** `publicApplyEnabled`, `returningApplyEnabled`, entrance fee / docs / classroom-on-enroll. Staff edit via `GET|PATCH /api/schools/:schoolId/admission-policy` (Registrar / Admin / Principal).

**Returning students:** Public form verifies email (+ DOB when on file) via Identity; application notes store `applicantType=RETURNING` + `existingStudentUserId`; enroll reuses the user and sets `feeCohort=RETURNING`.

### Staff (existing + new)

| Method | Path | Change |
| :--- | :--- | :--- |
| Existing applications CRUD | Lifecycle | Add state machine + richer body |
| `POST` | `/api/applications/:id/transition` | Explicit `{ to, reason }` preferred over raw status PATCH |
| `POST` | `/api/applications/:id/documents` | Upload / register |
| `PATCH` | `/api/applications/:id/documents/:docId` | Approve/reject doc |
| `POST` | `/api/applications/:id/create-entrance-fee` | Lifecycle → Finance |
| `POST` | `/api/applications/:id/enroll` | Orchestrated enroll (replaces bare status=ENROLLED) |
| `DELETE` | `/api/applications/:id` | Soft-delete / withdraw (fix client stub) |
| `POST` | `/api/applications/:id/assign-classroom` | Lifecycle → Classroom |

### Orchestrated `enroll` (critical)

Single staff action that:

1. Validates status + gates (fee paid if required; required docs approved).
2. Calls Identity find-or-create student + parent + link.
3. Optionally calls Classroom add member.
4. Sets `ENROLLED`, `studentUserId`, `enrolledAt`.
5. Emits `application.enrolled`.
6. Triggers welcome email (Comms) with invite/password-reset — **not** hardcoded shared passwords in production.

**Idempotency:** `Idempotency-Key` header; second call returns same result.

---

## B4. UI surfaces

| Route | Work |
| :--- | :--- |
| `/:slug/admissions` | Keep Registrar hub; wire real docs + fee status columns; use `transition` / `enroll` APIs |
| `/:slug/enrollment` | Keep as post-admit placement; show unassigned enrolled students |
| `/:slug/fees` | Show entrance fees filter; deep-link from application |
| `/apply/:slug` | **New** public multi-step apply (student → parents → docs → review → fee if enabled) |
| `/apply/:slug/status` | Applicant status lookup |
| Settings → Admissions | Policy toggles |
| Retire or mount | Decide: delete orphaned `src/features/admissions/*` **or** merge into Registrar — do not leave two UIs |

**Roles:** Nav for `SCHOOL_ADMIN` + `PRINCIPAL` + `REGISTRAR` (today only REGISTRAR sees Admissions in nav — fix).

---

## B5. Events

| Event | Producer | Consumers |
| :--- | :--- | :--- |
| `application.submitted` | Lifecycle | Comms ack to parent |
| `application.status_changed` | Lifecycle | Comms, analytics |
| `application.fee_required` | Lifecycle | Finance create invoice |
| `fee.paid` | Finance | Lifecycle advance; Comms receipt |
| `application.enrolled` | Lifecycle | Classroom (if deferred assign), Comms welcome, Academic roster hooks |
| `application.document_uploaded` | Lifecycle | Staff notification |

---

## B6. Implementation phases (Part B)

### Phase B0 — Stabilize current pipeline (2–3 days)

1. Server-side status transition validation (minimal allowed graph).
2. Hydrate `gradeLevel` name in list API (Lifecycle → Academic client or denormalize `gradeLevelName` on create).
3. Implement `DELETE` / withdraw; fix client stub.
4. Mount **one** admissions UI; remove or redirect orphaned feature module.
5. Add Admissions nav for SCHOOL_ADMIN / PRINCIPAL.
6. Stop hardcoded prod passwords — generate random + invite (align with Part A invite system).

**Exit:** Staff pipeline reliable; no dual UIs; grade names visible.

### Phase B1 — Documents (real files) (3–5 days)

1. Object storage (MinIO local / GCS prod) + presigned upload.
2. `AdmissionDocument` model + staff review UI in Application Review Modal.
3. Policy: required types block enroll.
4. Virus scan hook stub (async job placeholder).

**Exit:** Parent/staff can upload PDF/JPEG; registrar can approve/reject; enroll blocked until required docs OK (when policy on).

### Phase B2 — Admission fees (3–5 days)

1. `FeePayment.applicationId` + create-on-approve (or create-on-submit) path.
2. Staff “Mark entrance fee collected” + optional Stripe Checkout later.
3. Application list shows fee status pill.
4. Gate: cannot enroll while `FEE_PENDING` if policy requires.

**Exit:** Money path is real Finance rows, not `notes` JSON.

### Phase B3 — Orchestrated enroll + classroom (2–3 days)

1. `POST .../enroll` saga with idempotency.
2. Classroom assign in same orchestration when `classroomId` provided; compensate/report if Classroom fails.
3. Enrollment page lists `ENROLLED` without classroom.
4. Emit events; welcome email.

**Exit:** One button provisions Identity users + optional class seat without silent client failures.

### Phase B4 — Public apply portal (4–6 days)

1. `/apply/:slug` multi-step; gated by school policy `publicApplyEnabled`.
2. Status token page; document upload; fee checkout/instructions.
3. Rate limits, CAPTCHA, PII retention policy note.
4. Spam / duplicate detection (same email + grade + year).

**Exit:** Parent can complete apply → pay (if required) → upload docs without staff creating the row first.

### Phase B5 — Polish & reporting (2–3 days)

1. Admissions funnel metrics (honest counts by status).
2. Export CSV of applications.
3. Waitlist management.
4. Contract tests Lifecycle ↔ Identity ↔ Finance ↔ Classroom.

---

## B7. Test plan (Part B)

### B7.1 Unit / state machine

| ID | Case | Expected |
| :--- | :--- | :--- |
| AD-U1 | `PENDING → ENROLLED` direct | 400 |
| AD-U2 | `APPROVED → ENROLLED` with fee required unpaid | 400 `FEE_REQUIRED` |
| AD-U3 | `APPROVED → ENROLLED` docs missing | **200** — documents optional (no `DOCS_REQUIRED`) |
| AD-U4 | Valid path to enroll with gates waived (Direct Admit) | 200 |
| AD-U5 | Enroll idempotent with same key | Same student IDs |
| AD-U6 | Duplicate public apply same email+year | 409 or merge policy |
| AD-U7 | Document reject then re-upload | Status cycle OK |

### B7.2 Integration across services

| ID | Case | Expected |
| :--- | :--- | :--- |
| AD-I1 | Enroll creates Identity student + parent link | Users exist; roles correct |
| AD-I2 | Enroll with classroomId | Classroom membership exists |
| AD-I3 | Classroom down during enroll | Documented behavior: enroll succeeds + `classAssignFailed` **or** full rollback — **pick one and test it** |
| AD-I4 | `fee.paid` moves `FEE_PENDING →` next | Status updated once (idempotent consumer) |
| AD-I5 | Finance invoice has `applicationId` | Queryable |
| AD-I6 | Gateway routes public apply without auth | 201 |
| AD-I7 | Suspended school rejects public apply | 403 |

### B7.3 E2E / UI

| ID | Case | Expected |
| :--- | :--- | :--- |
| AD-E1 | Registrar Direct Admit → review → enroll → student in directory | Full path |
| AD-E2 | Assign class on enroll → student in classroom roster | Visible |
| AD-E3 | Upload docs → approve → enroll enabled | Button state correct |
| AD-E4 | Create entrance fee → mark paid → enroll | Gate clears |
| AD-E5 | Public apply happy path | Confirmation + status page |
| AD-E6 | Public apply when disabled | Branded `/apply` 403 shell (`ErrorPageShell`); school missing → 404 shell |
| AD-E7 | Enrollment page assigns late classroom | Works for ENROLLED w/o class |

### B7.4 Data / PII / security

| ID | Case | Expected |
| :--- | :--- | :--- |
| AD-S1 | Applicant status token cannot list other apps | No IDOR |
| AD-S2 | Document URLs expire / auth-checked | No public bucket listing |
| AD-S3 | Staff from School A cannot read School B apps | 403 |
| AD-S4 | File type/size validation | Reject exe / >max |
| AD-S5 | No default `student123` in production builds | Env-enforced |

### B7.5 Acceptance criteria (Part B done)

- [x] Staff can run pipeline with orchestrated enroll (+ optional class; docs/fees APIs present).
- [x] Public apply works when school `publicApplyEnabled` (policy on School).
- [x] Finance supports `applicationId` + internal fee create for entrance fees.
- [x] Identity users created via enroll with random passwords (not hardcoded student123).
- [x] Single Registrar admissions UI; SCHOOL_ADMIN/PRINCIPAL nav links added.
- [x] Unit tests cover state machine + school login gates (`npm run test:onboarding`).
- [x] Full object-storage uploads / virus scan stub / Stripe or console checkout — shipped.
- [x] Waitlist UI + school onboarding checklist + planCode/trial fields + honest billing display.
- [x] Cross-service enroll/checkout/storage unit tests (`npm run test:enroll`).
- [x] B5: admissions funnel metrics, CSV export, waitlist filter, staff file upload/review in modal.
- [x] Public apply rate limit + honeypot; Academic internal grade seed for starter pack.
- [x] **2026-07-24:** Enroll loads school `admissionPolicy`; UI does not auto-waive; enrollable statuses only.
- [x] **2026-07-24:** Public create verifies school status + `publicApplyEnabled`; `fee-paid` uses `authenticateInternal`.
- [x] **2026-07-24:** `mustChangePassword` + welcome email on enroll; credentials copy modal; create entrance fee in review UI.
- [x] **2026-07-24:** Orphan `features/admissions` removed.
- [x] **2026-07-24:** Registrar Online registration card (enable/disable + copy URL); `returningApplyEnabled`; public New/Returning tabs; verify-returning; enroll `feeCohort`; review UI preserves applicant type.
- [x] **2026-07-24:** Direct Admission can select an existing student and prefill form fields; submit as Returning with `existingStudentUserId`.
- [x] **2026-07-24:** Public apply and Direct Admission share the same applicant field schema/UI (`features/admission-form`).

---

# 3. Cross-cutting concerns

## 3.1 Suggested delivery order (combined)

```
A0 → A1 → B0 → B1 → B2 → B3 → A2 → A3 → B4 → B5 → A4(optional)
```

Rationale: harden auth/invites first; stabilize staff admissions before public school + public student portals (highest abuse surface last).

## 3.2 Engineering standards

- Follow `FRONTEND_GUIDELINES.md` / Executive Slate; toasts not `alert`.
- All new routes through gateway; no monolith dependence (Phase 6).
- Zod validation on every write; OpenAPI or shared zod schemas in `packages/` if practical.
- Structured logs + `x-request-id` on every hop.
- Feature flags: `PUBLIC_SCHOOL_REGISTRATION`, `PUBLIC_STUDENT_APPLY`, `ADMISSION_FEE_REQUIRED_DEFAULT`.

## 3.3 Observability

| Signal | Where |
| :--- | :--- |
| Registration submit / approve rates | Identity metrics |
| Application funnel by status | Lifecycle |
| Fee collection latency (approve → paid) | Finance + Lifecycle |
| Enroll failure rate (Identity/Classroom errors) | Lifecycle |

## 3.4 Open decisions (resolve before B2/B4)

| Decision | Options | Recommendation |
| :--- | :--- | :--- |
| Document storage | MinIO / GCS / S3 | MinIO in compose; GCS in prod |
| Fee before vs after approve | Pay to apply vs pay after accept | **After APPROVED** (fewer refunds) |
| Classroom failure on enroll | Fail all vs enroll without class | **Enroll + flag** + Enrollment page (better UX) |
| Public school form location | Same SPA vs marketing site | Start in SPA `/register-school` |
| Waitlist | v1 or defer | Defer to B5 unless product requires |
| Orphaned admissions feature | Merge vs delete | **Merge useful bits into Registrar, delete rest** |

---

# 4. Effort sketch (calendar, 1–2 engineers)

| Block | Est. |
| :--- | :--- |
| A0–A1 | ~1 week |
| B0–B3 | ~2–3 weeks |
| A2–A3 | ~1–1.5 weeks |
| B4–B5 | ~1.5–2 weeks |
| Buffer / hardening | ~1 week |
| **Total** | **~7–9 weeks** to solid v1 of both parts |

---

# 5. Definition of Done (program-level)

1. **Part A:** Super Admin **and** public form can onboard a school; invites work; suspended tenants blocked; no fake invite/subscription UX.
2. **Part B:** Application → review → documents → fees → enroll → class placement works for staff; public apply available behind policy; gates server-enforced; tests green in CI.
3. Docs updated: this plan’s checkboxes, `IMPLEMENTATION_STATUS.md`, lifecycle/identity READMEs.
4. No dependence on retired `sms-api` for these flows.

---

# 6. Traceability to existing code (starting points)

| Work | Start here |
| :--- | :--- |
| Super Admin register UI | `src/pages/SuperAdmin/Schools.tsx` |
| Identity provision | `services/identity/src/services/superAdminService.ts` |
| Login status check | Identity auth login handler |
| Registrar pipeline | `src/features/registrar/*` |
| Lifecycle applications | `services/lifecycle/src/services/admissionService.ts` |
| Enroll → Identity | `services/lifecycle/src/lib/identityClient.ts` |
| Fees | `services/finance` + `src/pages/School/Fees` / features |
| Classroom members | `services/classroom` |
| Gateway routing | `services/gateway/src/server.ts` |
| Orphan UI to resolve | ~~`src/features/admissions/*`~~ removed; `Admissions` page re-exports Registrar |

---

*This document is the authoritative plan for Parts A and B until replaced by an ADR or a checked-off implementation status section.*

---

## 7. Change log

### 2026-07-30 — Bulk roster import (companion)

- **Change:** Existing-school **CSV/Excel student import** shipped as **direct Identity create** (same door as Students → Enroll), **not** Lifecycle applications / enroll saga — so fee/docs gates do not block roster migration. See `docs/BULK_IMPORT_PLAN.md`.
- **Services:** identity, frontend-spa; lifecycle unchanged
- **Status:** done (Phases 1–2)
- **Verify:** Students → Import CSV / Excel; bad row → zero creates; `npm run test:bulk-import`

### 2026-07-24 — Admission honesty / gate fix

- **Change:** Enroll loads Identity `admissionPolicy` and enforces fee/docs (UI no longer auto-waives). Enroll only from APPROVED / FEE_PENDING / DOCS_PENDING. Public apply verifies school status + `publicApplyEnabled`. `fee-paid` requires internal token. Identity `findOrCreateUser` sets `mustChangePassword` + welcome email. Registrar credentials copy modal + create entrance fee + explicit waive checkboxes. Removed orphan `features/admissions`.
- **Services:** lifecycle, identity, frontend-spa
- **Status:** Done
- **Verify:** `npm run test:onboarding && npm run test:enroll`; enroll without waive when `requireEntranceFee: true` returns `FEE_REQUIRED`
