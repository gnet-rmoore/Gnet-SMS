# Implementation Plan — Class Capacity Limits & Entrance Scheduling

**Status:** Implemented (migrations written; apply per environment)
**Date:** 2026-11-21
**Scope:**
1. Per-class student limits set by School Admin / Registrar, enforced on application class selection, enrollment, and re-enrollment.
2. Admission confirmation email that explains how to check status and links to a secure entrance-date scheduling page; the school receives the selected date details.
3. Post-submission confirmation and status lookup use **only the application reference number** (no visible access code); the confirmation page and the email state exactly which parent email address the details were sent to.
4. School-configured entrance availability: inclusive date range, allowed weekdays, a written note shown to families, and explicit time slots. Sunday (or any unselected weekday) and out-of-range/past slots cannot be booked.

**Architecture baseline:** React 19 + Vite SPA, Express microservices behind a gateway, PostgreSQL/Prisma with per-service schemas (`classroom`, `lifecycle`, `identity`, `academic`).

---

## Part A — Per-Class Enrollment Capacity

### A.1 Current state (verified)

- `Classroom` has **no capacity field** in either schema: `services/classroom/prisma/schema.prisma:22-58` and legacy `prisma/schema.prisma:423-450`.
- `ClassroomMember` (`services/classroom/prisma/schema.prisma:60-70`) is the source of truth for who is in a class; `@@unique([classroomId, userId])` already gives idempotency.
- Public application creation accepts `classroomId` and stores it directly (`services/lifecycle/src/services/admissionService.ts:397`), with no capacity check.
- The public form only collects **grade level** (`src/features/admission-form/schema.ts:11-31`); there is no class selector at all. Registrar review has a plain class dropdown (`src/features/registrar/components/ApplicationReviewModal.tsx:373-390`).
- Enrollment adds members unconditionally: `services/lifecycle/src/services/admissionService.ts:663-672` (`enroll`), `:932-943` (`assignClassroom`), `:1058-1097` (`bulkEnroll`); roster UI is `src/features/enrollment/Page.tsx:300-379`.
- Existing "full" patterns to copy: PTA meeting capacity (409 at `services/comms/src/services/ptaService.ts:607-612`) and room capacity (`services/campus/src/services/campusService.ts:299-322`).
- Authorization already fits: admissions create/enroll/assign-class are `["SCHOOL_ADMIN","REGISTRAR"]` (`services/lifecycle/src/routes/admissionRoutes.ts:14, 40-46, 96-102, 152-158`); classroom write roles are in `services/classroom/src/routes/classroomRoutes.ts:9-19, 61-99`.

### A.2 Data model and migrations

1. Add to `Classroom` in `services/classroom/prisma/schema.prisma` (and mirror in legacy `prisma/schema.prisma`):
   - `capacity Int?` — `null` = unlimited (backward compatible for existing schools).
   - Optional `allowOverfill Boolean @default(false)` if the school must be able to exceed the limit deliberately.
2. Migration:
   - `npx prisma migrate dev --schema services/classroom/prisma/schema.prisma --name add_classroom_capacity`
   - Apply the equivalent change to the monolith schema; regenerate both clients.
3. No new table needed: occupancy = count of `ClassroomMember` rows where `role = "STUDENT"`.

### A.3 Backend — classroom service (owner of capacity)

Files: `services/classroom/src/services/classroomService.ts`, `.../controllers/classroomController.ts`, `.../routes/classroomRoutes.ts`, `services/classroom/src/lib/...` (shared validators).

1. Validation on create (`POST /api/schools/:schoolId/classrooms`) and update (`PATCH /api/classrooms/:id`):
   - `capacity` must be `null` or an integer `>= 1`.
   - On update, reject `capacity < currentStudentCount` with `409 CLASS_BELOW_OCCUPANCY` unless `allowOverfill = true`.
   - Roles: School Admin / Principal via existing classroom admin roles; additionally allow `REGISTRAR` for capacity-only edits (add a narrow `PATCH /api/classrooms/:id/capacity` route with `["SCHOOL_ADMIN","REGISTRAR"]` if reusing the full update route is too broad).
2. Expose occupancy on classroom responses:
   - Add `studentCount`, `capacity`, `seatsLeft` to `GET /api/classrooms/:id`, `GET /api/schools/:schoolId/classrooms`, and the internal classroom endpoints (`services/classroom/src/routes/classroomRoutes.ts:301-350`).
   - Compute with a grouped `ClassroomMember.count` query, not N+1.
3. **Atomic seat claim** (the critical piece — enrollment happens in lifecycle, membership lives here):
   - New internal endpoint `POST /api/internal/classrooms/:id/members/claim`, body `{ userId, applicationId? }`, guarded by `authenticateInternal`.
   - Implementation in one `prisma.$transaction`:
     1. Lock the classroom row (`SELECT id FROM classroom."Classroom" WHERE id = $1 FOR UPDATE`) so concurrent claims for the same class serialize.
     2. If membership already exists → return `{ ok: true, alreadyMember: true }` (safe re-enrollment/retry).
     3. Count STUDENT members; if `capacity != null && count >= capacity` → `409 CLASS_FULL` with `{ capacity, occupied }`.
     4. Create `ClassroomMember` with `role: "STUDENT"`.
   - Keep the existing plain membership endpoints for teachers/other roles and for removals.

### A.4 Backend — lifecycle service (enforcement on all paths)

Files: `services/lifecycle/src/lib/classroomClient.ts`, `services/lifecycle/src/services/admissionService.ts`, `services/lifecycle/src/domain/` (new `classCapacity.ts`).

1. Add a pure helper `assertSeatAvailable(classroom, studentCount)` in a new `services/lifecycle/src/domain/classCapacity.ts` returning `{ ok } | { ok: false, reason: "CLASS_FULL" | "CLASS_UNKNOWN" | "GRADE_MISMATCH" }`. Use it for early, cheap validation with clear API errors; the authoritative check remains the classroom claim endpoint.
2. Switch every student-seat write to the claim endpoint:
   - `enroll()` (`:663-672`) → claim before/within the enrollment claim update.
   - `assignClassroom()` (`:932-943`) → claim; if the student already holds a homeroom seat elsewhere, remove the old membership **after** the new claim succeeds (avoid temporary overfill, log+retry on cleanup failure).
   - `bulkEnroll()` (`:1058-1097`) → per-student claim; return per-row results so partial success is visible (frontend already has `BulkMemberResult` support).
   - `createApplication()` (`:301-402`) → if `data.classroomId` is present, check availability and reject with `409 CLASS_FULL` before creating the row (applications do **not** reserve seats).
   - `PATCH /api/applications/:id` review patch and `buildReviewPatch` (`:79`) → same check when a class is selected.
3. Map classroom-service `CLASS_FULL` (409) into a stable lifecycle error code `CLASSROOM_CAPACITY_REACHED` with `{ classroomId, className, capacity, occupied }`.
4. Preserve the existing `classAssignFailed` flag and `placement-summary` (`admissionService.ts:945-1014`) behavior; extend the summary with full-class counts.

### A.5 Public endpoint and gateway

1. New public endpoint in `services/lifecycle/src/routes/admissionRoutes.ts` (public section around `:168-174`):
   - `GET /api/public/schools/:slug/classrooms?gradeLevelId=...` → `{ items: [{ id, name, gradeLevelId, gradeLevelName, capacity, occupied, seatsLeft }] }`.
   - Only homeroom classes (`subjectId == null`), only the requested grade, only `seatsLeft > 0`, no staff/teacher data. Apply the existing public rate limiter and turn-away on closed admission (`assertPublicApplyAllowed`, `services/lifecycle/src/lib/identityClient.ts:246-289`).
   - Reuse `classroomClient` + `identityClient.getSchoolBySlug`; expose a small DTO — never return raw classroom rows.
2. Gateway (`services/gateway/src/server.ts`): add a **specific** mapping for `/api/public/schools/:slug/classrooms` → lifecycle **before** the generic `/api/public/schools*` → identity mapping (`:156-168`), otherwise the request is routed to the wrong service.
3. Server re-checks availability on `POST /api/public/applications`; a stale/full class ID from the browser is rejected, not silently accepted.

### A.6 Frontend

1. **Classroom setup** — `src/features/classrooms/components/CreateClassroomModal.tsx` (`CreateClassroomFormData` at `:18-26`) and the edit modal:
   - Add "Maximum students" numeric input (blank = unlimited) with helper text and validation (positive integer).
   - Add to `src/features/classrooms/api.ts` payloads; show ` students` in classroom lists/cards.
2. **Public apply** — `src/pages/PublicApply.tsx` + `src/features/admission-form/schema.ts:11-31`, `AdmissionApplicationFields.tsx:150-190`:
   - Add optional "Preferred class" select shown after a grade is chosen; fetch available classes from the new public endpoint; refetch on grade change; show "X seats left" and disable/hide full classes.
   - Clear the selected class when grade changes; include `classroomId` in `buildAdmissionApiPayload` (`:271-339`); show a note that a seat is confirmed only after enrollment.
3. **Registrar review** — `src/features/registrar/components/ApplicationReviewModal.tsx:373-390`:
   - Replace the plain select with a class option list showing `name — grade — used/capacity`; disable full classes (except the class already assigned to that application); refresh occupancy when the modal opens.
4. **Enrollment** — `src/features/enrollment/Page.tsx` (`handleAssign` at `:300-356`, cards at `:750-812`):
   - Show `occupied / capacity` on class cards and in the assignment modal; disable "Place selected student(s)" with an explanatory toast on `CLASSROOM_CAPACITY_REACHED`.
   - Handle partial bulk results (already supported) by listing the students that failed due to full classes.
5. Use existing conventions: `api` wrapper (`src/services/api.ts`), `unwrapItems` (`src/lib/apiEnvelope.ts`), `showSwal`/toast helpers (`src/lib/swal.ts`), and i18n keys in `src/i18n/catalogs/*.ts` (add keys in all supported locales).

### A.7 Error contract and UX messages

| Code | HTTP | Where | User-facing message |
| :--- | :--- | :--- | :--- |
| `CLASS_FULL` | 409 | classroom claim | "This class has reached its maximum number of students." |
| `CLASSROOM_CAPACITY_REACHED` | 409 | lifecycle create/review/enroll | "The selected class is now full. Choose another class." |
| `CLASS_BELOW_OCCUPANCY` | 409 | classroom PATCH | "Capacity cannot be lower than the current class size (N)." |
| `CLASS_UNKNOWN` | 404 | lifecycle | "This class is no longer available." |
| `GRADE_MISMATCH` | 422 | lifecycle | "This class belongs to a different grade level." |

### A.8 Acceptance criteria — Part A

- Admin/Registrar can set or clear a per-class limit; existing classes remain unlimited until a limit is set.
- A full class is absent from the public class list and disabled in Registrar/Enrollment selectors.
- Submitting a stale `classroomId` for a full class returns 409 instead of creating the application.
- Enrollment and re-enrollment of an existing member never exceed the limit; two concurrent claims for the last seat yield exactly one success and one 409.
- Lowering a limit below current occupancy is rejected with the current count shown.
- Returning students and bulk enrollment follow the same rules; partial failures are reported per student.

---

## Part B — Admission Email + Secure Entrance Scheduling

### B.1 Current state (verified)

- On public submit, `admissionController.publicCreate` (`:277-285`) fire-and-forgets `sendApplicationReceivedEmail`.
- `services/lifecycle/src/lib/applicationEmail.ts:34-73` builds the status URL (`:12-14`) and renders the `applicationReceived` template; recipient is `studentEmail || parentEmail` (`:50`) — the parent address is only a fallback.
- Template text (English at `services/identity/src/i18n/emailCatalogs.ts:105-124`) already includes status-check instructions and `{{statusUrl}}`, but **no entrance link**.
- The status token primitive already exists: raw token generated at `admissionService.ts:373`, only its SHA-256 hash stored in `AdmissionApplication.statusTokenHash` (`:41, 396`), verified in `publicStatus` / `publicStatusByReference` (`:844-878`).
- Status page: `src/pages/PublicApplyStatus.tsx` + `src/components/OnboardingStepper.tsx` (steps `:23`, no entrance stage).
- **No entrance booking/slot model or endpoint exists.** Interview data is free-form JSON in `notes` (`src/features/registrar/hooks/usePageActions.ts:238-250`). "Entrance" in code today means entrance **fee** only.
- Reusable secure-token patterns: `InviteToken` with `expiresAt`/`usedAt` (`services/identity/prisma/schema.prisma:148-161`), password-reset TTL (`services/identity/src/services/emailAuthService.ts:11, 134-146`), receipt HMAC + `timingSafeEqual` (`services/finance/src/services/receiptService.ts:104-109, 391-400`).
- Admission policy is a JSON string on `School` (`services/identity/prisma/schema.prisma:44-45`), parsed for lifecycle via `services/lifecycle/src/domain/admissionPolicy.ts` and fetched internally at `services/lifecycle/src/lib/identityClient.ts:103-114`.
- Post-submit page (`src/pages/PublicApply.tsx:248-336`) currently exposes the raw access code, a copy-code button, and a status URL containing `id` + `token`.
- Status lookup (`src/pages/PublicApplyStatus.tsx:281-329`) asks for a pasted link, reference number, **and** access code; the API requires all three (`services/lifecycle/src/services/admissionService.ts:855-878`).
- Reference numbers are currently predictable (`APP-<4 chars of schoolId>-<6 base36 chars of Date.now()>`, `services/lifecycle/src/domain/admissionStates.ts:75-79`) and have no DB uniqueness constraint.
- The form collects separate `fatherEmail` and `motherEmail` (`src/features/admission-form/schema.ts:21-26`), but `buildAdmissionApiPayload` collapses them into one `parentEmail = fatherEmail || motherEmail` (`:296`) — the mother's address is lost for delivery, though both remain in the notes JSON (`:311-316`).

### B.2 School configuration of entrance dates

1. Extend the admission policy JSON (identity-owned) with:
   - `entranceSchedulingEnabled: boolean`
   - `entranceSlots: [{ id, startAt, endAt, capacity, location?, instructions? }]`
    - `entranceBookingDeadline?: string`
    - `entranceRescheduleCutoffHours?: number` (default 24)
    - `entranceAvailableFrom?: string` (`YYYY-MM-DD`, inclusive)
    - `entranceAvailableTo?: string` (`YYYY-MM-DD`, inclusive)
    - `entranceAvailableWeekdays?: number[]` (`0` = Sunday … `6` = Saturday; default `1,2,3,4,5`)
    - `entranceAvailabilityNote?: string` — shown on the scheduling page, status page, and confirmation email
 2. Update parsers/types: `services/lifecycle/src/domain/admissionPolicy.ts`, the identity policy parser, and frontend `AdmissionPolicyPayload` (`src/features/registrar/api.ts:4-13`).
 3. Registrar UI: extend `src/features/registrar/components/OnlineRegistrationCard.tsx` with an "Entrance scheduling" section — enable toggle, date range, allowed weekdays, note, deadline, and an add/edit/remove list of dates with capacity/location. Save through the existing `GET|PATCH /api/schools/:schoolId/admission-policy`.
 4. Booking validation: `entranceService` rejects slots outside the configured range/weekdays, past slots, full slots, and slots after the booking deadline. Families see the school's availability rule before choosing a slot.

### B.3 Data model and secure token

Add to `AdmissionApplication` in `services/lifecycle/prisma/schema.prisma` (and mirror in legacy `prisma/schema.prisma`; create a migration):

- `entranceTokenHash String? @unique`
- `entranceTokenExpiresAt DateTime?`
- `entranceStatus String @default("NOT_SCHEDULED")` — `NOT_SCHEDULED | SCHEDULED | SAT | CANCELLED | EXEMPT`
- `entranceSlotId String?`, `entranceScheduledAt DateTime?`, `entranceLocation String?` (snapshot at booking)
- `entranceRescheduleCount Int @default(0)`, `entranceNotes String?`
- `@@index([schoolId, entranceSlotId])` for slot occupancy counts.

Token rules:

- Generate at application creation next to the status token (`:373`): `crypto.randomBytes(24).toString("hex")`; store only `hashToken(raw)` plus expiry (`min(bookingDeadline, appliedAt + 30 days)`).
- Return the raw `entranceToken` in the create response so the email can be sent without re-deriving it.
- At verification, hash the supplied token and compare with `crypto.timingSafeEqual`; invalid/expired/revoked → generic `404 NOT_FOUND` (no PII, no enumeration). Rescheduling keeps the same token; a new token can be issued via a staff "resend link" action (clears the old hash).
- The entrance token lives **only inside the emailed link URL**. It is never shown as a separate "access code" on the confirmation page, status page, or email body.
- Harden the reference number because it becomes the sole credential for status lookup: change `generateApplicationNumber` (`services/lifecycle/src/domain/admissionStates.ts:75-79`) to `APP-<school prefix>-<12+ chars from crypto.randomBytes>`, add `@unique` on `applicationNumber` in both Prisma schemas, and add an index on `[schoolId, applicationNumber]`. Rate-limit reference lookups per IP/school and return a generic 404 on miss.

### B.4 Public endpoint contract (lifecycle)

Mount under gateway `/api/public/entrance/*` (new specific gateway mapping → lifecycle). All routes: per-IP rate limit, generic 404 on bad token, Zod validation, no auth required. The token travels as a path segment in the emailed link only — no token is ever typed or displayed as an "access code".

| Method | Path | Purpose |
| :--- | :--- | :--- |
| GET | `/api/public/entrance/:token` | Validate token; return school name, student first name, grade, deadline, booking (if any), and available slots with `seatsLeft`. |
| POST | `/api/public/entrance/:token/book` | `{ slotId }` → book a slot. |
| POST | `/api/public/entrance/:token/reschedule` | `{ slotId }` → move to another slot before cutoff. |
| POST | `/api/public/entrance/:token/cancel` | Release the seat before cutoff. |

Booking rules enforced server-side in one Prisma transaction:

1. Token valid, unexpired; application not `WITHDRAWN`/`REJECTED`/`ENROLLED`.
2. Slot exists in the **current** policy, is in the future, and deadline has not passed.
3. Count applications with `entranceSlotId = slot.id AND entranceStatus IN ("SCHEDULED","SAT")`; reject `409 ENTRANCE_SLOT_FULL` if `>= slot.capacity`. Serialize with a Postgres advisory lock on `(schoolId, slotId)` (`pg_advisory_xact_lock`) because slot capacity lives in JSON, not a row.
4. Update the application (`entranceStatus = SCHEDULED`, slot snapshot, increment reschedule count when moving).
5. Notify the school (B.7) after commit.

New files (suggested): `services/lifecycle/src/routes/entranceRoutes.ts`, `services/lifecycle/src/controllers/entranceController.ts`, `services/lifecycle/src/services/entranceService.ts`, `services/lifecycle/src/domain/entranceBooking.ts` (pure validation helpers).

### B.5 Email changes

1. `services/identity/src/i18n/emailCatalogs.ts` — rewrite `applicationReceived` in **all 7 locales** (en, fr, ar, es, de, zh-Hans, hi; English at `:105-124`) with **no access code anywhere**:
   - `{{referenceNumber}}` — the only credential the parent needs: "Your reference number is {{referenceNumber}}. Keep it safe; you will use it to check your admission status."
   - `{{statusUrl}}` — a token-free link to `/apply/{{slug}}/status`, with instructions "Open this link and type your reference number to check your status at any time."
   - `{{entranceUrl}}` — "Choose your entrance date: {{entranceUrl}}" with `{{entranceDeadline}}`; fallback "The registrar will contact you with entrance details" when scheduling is disabled.
   - `{{parentRole}}` / `{{parentEmail}}` — a closing line stating exactly which parent address received the message, e.g. "This message was sent to the mother's email address: mother@example.com."
   - Delete every `{{statusToken}}` placeholder from the template and all locale variants.
2. `services/lifecycle/src/lib/applicationEmail.ts`:
   - Add `buildEntranceUrl(slug, token)` → `${APP_URL}/entrance/${slug}/${token}`.
   - Add `buildStatusUrl(slug)` → `${APP_URL}/apply/${slug}/status` (no `id`, no `token`).
   - Extend `sendApplicationReceivedEmail` opts with `entranceToken?`, `entranceDeadline?`, `entranceEnabled?`, `schoolSlug?`, and `recipients: Array<{ email: string; role: "FATHER" | "MOTHER" | "GUARDIAN" }>`.
   - Render and send **one personalized email per supplied parent address** (fatherEmail and motherEmail from the form), passing that recipient's `role` and `email` into the template so each email states which parent it was sent to. Fall back to `studentEmail` only when no parent email exists, labelled "student".
   - Keep the fire-and-forget, never-throw behavior (`:70-72`).
3. Capture both parent addresses at submit time:
   - Extend the create payload from `buildAdmissionApiPayload` (`src/features/admission-form/schema.ts:271-339`) with `parentEmails: [{ email: form.fatherEmail, role: "FATHER" }, { email: form.motherEmail, role: "MOTHER" }]` (dedupe, drop blanks; keep `parentEmail = fatherEmail || motherEmail` for backward compatibility).
   - Persist as `parentContacts String?` (JSON) on `AdmissionApplication` in both Prisma schemas; return the normalized recipient list in the create response so the confirmation page can display delivery details without re-parsing notes.
4. Trigger for **both** submission paths:
   - Keep the public call in `admissionController.publicCreate` (`:277-285`).
   - Add the same call to the staff/direct-admission create handler (`:118-127`), passing the school slug and generated entrance token. Gate only the entrance paragraph on `entranceSchedulingEnabled`; status instructions always go out.
   - Ensure emails are sent **after** the application row is committed so a failed insert never produces a dead link.

### B.6 Public scheduling page

1. New public route in `src/App.tsx` near `/apply/:slug` (`:270-272`): `/entrance/:slug/:token` → `EntranceSchedulePage` (new file under `src/pages/`). No auth; token is the credential.
2. UX states: loading → valid (school banner, applicant name, deadline, slot cards grouped by date with remaining seats, location/instructions) → confirm (submit) → success (booking summary + "Check my admission status" link to `/apply/:slug/status`, where the parent types the reference number) → invalid/expired → error/full-slot recovery.
3. Reuse `publicPortalLayout.ts`, `PublicApplyBackground.tsx`, `FriendlyDateField.tsx`-style formatting, `showSwal` toasts, and the shared i18n catalogs. Use the public `fetch` pattern from `PublicApply.tsx:161-169` (no bearer token).
4. Do **not** use `buildApplyStatusUrl`/`saveApplyStatusCredentials` (`src/lib/publicApplyStatus.ts:1-52`) for this flow: status URLs carry no `id` or `token`. If those helpers become unused after Part C, delete them rather than leave dead credential-handling code.

### B.7 School-side receipt of the details

1. After a successful booking/reschedule/cancel, call the existing in-app fan-out helper `services/lifecycle/src/lib/admissionNotifications.ts:21-81` (`REGISTRAR`, `SCHOOL_ADMIN`, `PRINCIPAL`) with an `ENTRANCE_SCHEDULED` notification containing student name, grade, date/time, location, and a deep link to the application in `/:slug/admissions`.
2. Add a new email template key `entranceScheduled` in `emailCatalogs.ts` and send it via `services/identity/src/routes/userRoutes.ts:193-194` internal mail API (`services/lifecycle/src/lib/mailClient.ts:21-41`) to the same staff roles if they have opted into email notifications (phase 2 if in-app is sufficient for launch).
3. Registrar UI:
   - Add an "Entrance" section to `src/features/registrar/components/ApplicationReviewModal.tsx` near the evaluation section (`:331-366`): status badge, scheduled date/time/location, `seatsLeft`, "Resend link" action, and staff actions `Mark as SAT`, `EXEMPT`, record score/decision (aligns with `docs/ADMISSION_UX_IMPLEMENTATION_PLAN.md:48-58`).
   - Add an "Entrance needed / Scheduled / SAT" filter or column in `AdmissionsTab.tsx:144-183` so the office can prepare for upcoming dates.
4. Status page: add an "Entrance" card to `src/pages/PublicApplyStatus.tsx` (near the fee card at `:372-410`) showing booking details and a link to rebook; extend `src/components/OnboardingStepper.tsx` next-action mapping (`:49-66`) with an `ENTRANCE_SCHEDULE` action without removing existing steps. Its lookup UI is replaced by the reference-number-only flow in Part C.

### B.8 Acceptance criteria — Part B

- A newly submitted application sends one email per provided parent address (father and/or mother), each containing status-check instructions, a tokenized scheduling link, and a line stating exactly which parent email received it (see Part C).
- Invalid, expired, or tampered tokens return a generic 404 and reveal no applicant data.
- Only dates configured by the school are offered; full or past slots cannot be booked (409).
- Booking/reschedule/cancel updates the application state and slot counts correctly; two parents cannot take the last seat.
- School staff see the selected date, time, location and applicant details in-app (and by email if phase 2) immediately after booking.
- Staff can mark entrance `SAT`/`EXEMPT` and the status page reflects the current stage.
- All 7 email locales render the new template variables without raw `{{...}}` placeholders.

---

## Part C — Reference-Number-Only Confirmation & Status Lookup

### C.1 Post-submission confirmation page

Rewrite the `result` view in `src/pages/PublicApply.tsx:248-336`:

1. **Keep only** the application reference number in a highlighted card with a single "Copy reference number" button.
2. **Remove:** the `accessCodeLabel` block (`:285-293`), the "Copy access code" button (`:305-314`), the tokenized status-link copy button (`:315-324`), the `(reference)` interpolation of a raw token, and the `statusToken` session-storage effect (`:107-115`). The raw access code must never appear on screen, in copyable text, or in `src/` user-facing strings.
3. Add a primary link **"Check my admission status"** → `/apply/${slug}/status` with **no query parameters**. The next page asks the user to type the reference number.
4. Add a link **"Schedule my entrance"** → `/entrance/${slug}/${result.entranceToken}` (shown when entrance scheduling is enabled). The token lives only in the `href`; it is never displayed as text or labelled an "access code".
5. Add a delivery line: **"Admission details were sent to: {role} — {email}"**, rendered from `result.parentEmails` returned by the create API (e.g. "Mother — mother@example.com; Father — father@example.com"). If no parent address was supplied, show "No parent email was provided — please contact the school for your details."
6. Keep the existing success heading, school name, background, and language selector; remove any other status/score/fee detail from this page.
7. i18n: remove `public:apply.accessCodeLabel`, `accessCodeHint`, `copyAccessCode`, and `copyLink` usages from `src/i18n/catalogs/*`; add `referenceOnlyHint`, `checkStatusHint`, `scheduleEntrance`, and `detailsSentTo` keys.

### C.2 Status page — type the reference number only

Rewrite `src/pages/PublicApplyStatus.tsx`:

1. Replace the lookup form (`:281-329`) with a single labelled input **"Application reference number"** plus the submit button. Delete the "paste status link" input (`:284-295`, `statusLinkPaste` state) and the "access code" input (`:312-324`, `accessCode` state). The emailed link lands directly on this page; the user types the number.
2. Delete token-based status loading: `fetchStatusById` (`:51-60`), `fetchStatusByReference`'s `token` argument (`:62-78`), `loadFromCredentials` (`:125-146`), the `id`/`token` URL params and effect (`:84-86, 148-151`), and `setParams` writes that put credentials in the URL. `lookupMode` becomes "no data loaded yet"; optionally prefill the reference from session storage (reference only).
3. Keep the school lookup by `slug` (`:105-116`), fee payment (`:153-192`), receipt link, entrance card (Part B), and `OnboardingStepper`.
4. Public document upload currently authorizes with a typed token in the status page (`admissionController.ts:315-316, 326-328, 365-366`). Since no access code is shown to users, change `formatPublicStatus` (`services/lifecycle/src/services/admissionService.ts`) to return a scoped, tokenized `documentUploadUrl` in the status payload and have the UI use that URL directly; alternatively hide public document upload on the status page until a tokenized email link is added. Do not leave a code-typing field behind.
5. Keep generic "not found" errors; do not disclose whether a reference number exists.

### C.3 Backend changes

1. `publicStatusByReference(schoolId, applicationNumber)` (`admissionService.ts:855-878`): drop the `rawToken` parameter and token comparison; validate reference format; return 404 on miss. Simplify `admissionController.publicStatusLookup` (`:241-251`) to read `schoolId` + `number` only, and add/verify a per-IP + per-school rate limiter on `GET /api/public/applications/lookup` (same pattern as `verifyReturning` at `:300`).
2. Keep `publicStatus(id, token)` (`:844-853`) for tokenized URL-based actions (entrance link, document upload URLs); it is no longer a user-typed credential.
3. `generateApplicationNumber` (`admissionStates.ts:75-79`): use `crypto.randomBytes` for at least 12 URL-safe characters; add `@unique` on `applicationNumber` plus `@@index([schoolId, applicationNumber])` in both `services/lifecycle/prisma/schema.prisma` and legacy `prisma/schema.prisma`, with a migration.
4. Persist `parentContacts` JSON from the create payload (Part B.5) and include the normalized recipient list in the create response and in `formatPublicStatus` (read-only: role + address, no tokens).
5. Require at least one parent/guardian email in `validateAdmissionForm` (`src/features/admission-form/schema.ts:240-251`) and surface the validation message in the guardians section of `AdmissionApplicationFields.tsx:236-320`.
6. Remove the now-unused credential helpers `buildApplyStatusUrl`, `parseApplyStatusUrl`, and `saveApplyStatusCredentials` from `src/lib/publicApplyStatus.ts` once all call sites are migrated.

### C.4 Parent email delivery indication

- **Email:** one message per supplied parent address; each body states "This message was sent to the {father/mother/guardian}'s email address: {email}" via `{{parentRole}}` / `{{parentEmail}}`.
- **Confirmation page:** the same role + address list from the create response, so the parent can immediately see where the details went.
- **Registrar:** show the captured parent contacts (and which address received the admission email) in `ApplicationReviewModal.tsx` so staff can confirm delivery.

### C.5 Acceptance criteria — Part C

- The post-submit page shows only the reference number, a "Check my admission status" link, a "Schedule my entrance" link, and the parent-email delivery line — no access code, token text, or copy-code controls.
- The status page has exactly one input (reference number); a valid reference returns the application, an unknown reference returns a generic not-found error; no access code or pasted link is required anywhere.
- Reference numbers are unique and not derivable from school ID + timestamp alone.
- Admission details are emailed to **every** parent email provided (father and mother); each email and the confirmation page name the exact recipient role and address.
- The entrance link books a date without the user typing any code.
- Public document upload still functions via a server-issued tokenized URL, with no user-facing access code.

---

## Testing Plan

Follow existing conventions: standalone `tsx` assert scripts in `tests/` (no Jest/Vitest) plus Playwright in `e2e/`.

1. New unit scripts:
   - `tests/class-capacity.test.ts` — capacity helper: null = unlimited, full, below occupancy, grade mismatch, already-member idempotency.
   - `tests/entrance-booking.test.ts` — token hashing/expiry, slot selection, deadline/past-slot rejection, capacity race (last seat), reschedule/cancel seat accounting, terminal-status rejection.
   - `tests/entrance-email.test.ts` — render `applicationReceived` with new vars in all locales; assert no `{{statusToken}}` or unreplaced placeholders; verify one email per parent address with the correct role/address line.
   - `tests/reference-lookup.test.ts` — reference number entropy/uniqueness, token-free lookup success, generic 404 on miss, rate-limit behavior, parent contact normalization from father/mother emails.
2. Extend existing scripts: `tests/admission-funnel.test.ts`, `tests/public-apply-policy.test.ts`, `tests/role-access.test.ts` (capacity settings limited to Admin/Registrar), `tests/email-i18n.test.ts`, `tests/public-apply.test.ts` (confirmation page shows reference only; no access-code keys).
3. Add npm scripts in `package.json` and include them in `test:unit`.
4. Integration/manual QA:
   - Set a class limit to 1 → two public applications select it → second sees it disabled → enroll first → enroll second → 409.
   - Re-enroll the same returning student → no duplicate member, no seat consumed twice; move student A→B frees A's seat.
   - Submit application → confirmation page shows only reference + links + parent delivery line → parent email(s) arrive with role/address stated → open entrance link → pick a slot → registrar sees notification and booking details → status page (reference number only) shows entrance stage.
   - Verify mother-only, father-only, and both-parent submissions: correct number of emails, correct recipient labels, confirmation page matches.
   - Tamper with the token and reuse an expired token → generic error; look up with an unknown reference → generic not found.
5. Verification commands: `npm run lint` (`tsc --noEmit`), `npm test` (unit aggregate), `npm run test:e2e`, and `prisma validate` for each changed schema.

## Delivery Order

1. Classroom capacity schema + atomic claim endpoint (foundation).
2. Lifecycle enforcement + public class listing + gateway route (backend complete before UI).
3. Classroom/Registrar/Enrollment/PublicApply capacity UI.
4. Entrance policy config + application fields/token + secure endpoints.
5. Email template/builder/trigger changes.
6. Reference-number hardening + parent email capture/delivery + confirmation page and status lookup simplification (Part C).
7. Public scheduling page + staff/status UI + notifications.
8. Tests, then rollout behind `entranceSchedulingEnabled` (default off) and `capacity = null` (unlimited) so existing schools are unaffected.

## Risks / Open Decisions

- **Seat reservation at application time:** recommended **no** — applications only filter full classes; the authoritative check is at enrollment because seats can fill later. If parents need a guaranteed seat, add a separate timed hold with expiry.
- **Gateway route precedence:** the specific `/api/public/schools/:slug/classrooms` mapping must be registered before the generic identity mapping or it will be swallowed.
- **Slot capacity in policy JSON:** serialized with advisory locks here; if volumes grow, normalize into lifecycle `EntranceSlot` / `EntranceBooking` tables.
- **Email recipient:** one personalized email per provided parent address (father and mother) is now planned, with the recipient role/address stated in the email and on the confirmation page; a student-email copy is only a fallback when no parent address exists. Confirm whether a student copy is also wanted when parents are present.
- **Scope of "new admission":** plan covers both public and staff/direct admissions; confirm if staff-created applications should also email parents.
- **Entrance required or optional:** `entranceSchedulingEnabled` is a school policy; decide whether `SAT`/`EXEMPT` should block enrollment (ties into `docs/ADMISSION_UX_IMPLEMENTATION_PLAN.md` document-eligibility rules).
- **Reference number as sole credential:** removing the access code shifts all public status authorization to the reference number. Mitigations are in Part C.3 (entropy, uniqueness, rate limits, generic 404). If this is judged insufficient, the secure alternative is to keep a hidden token in the emailed status link while still showing the user only a reference-number input — no visible access code either way.
- **Parent email coverage:** the shared form has only father/mother email fields. Guardian-only households should set the guardian's address in one of those fields (or add an explicit `guardianEmail` field if required); at least one parent/guardian email becomes mandatory.
