# Bulk roster import (CSV / Excel) — Plan

> **Status:** Phases 1–2 done (2026-07-30) — Identity preview/import + SPA wizards; Phase 3 classroom column deferred  
> **Scope:** School Admin (and allowed roles) import **students** or **staff** from a CSV or Excel spreadsheet into an **existing school**, creating Identity accounts in one atomic batch  
> **Companion:** `ONBOARDING_AND_ADMISSION_PLAN.md`, `docs/STAFF_WORKFORCE_PLAN.md`, `IMPLEMENTATION_STATUS.md`  
> **UI:** `/{slug}/students` (Import students); `/{slug}/staff` (Import staff)

---

## 0. Product intent (plain English)

Schools that already have a paper or spreadsheet roster should not re-type every person. An authorized staff member uploads a **CSV** or **Excel (.xlsx)** file. The system:

1. Parses and **previews** every row (errors highlighted before anything is saved).
2. On confirm, **atomically creates all valid accounts** for that batch — if any row fails, **no** accounts from that import are created.
3. Returns a **credentials download** (email + temporary password) so the school can distribute logins.
4. Supports the same for **students** and **staff** (separate templates and endpoints).

**Out of scope for this plan (later):** admission-pipeline import (applications + fee/docs gates), parent login accounts from spreadsheet, update/upsert of existing users, photo/document bulk upload, invite-email blast.

---

## 1. Current gaps (audit)

| Area | Today | Gap |
| :--- | :--- | :--- |
| Student create | One-at-a-time `POST …/students` (`createStudent`) | No batch / file import |
| Staff create | One-at-a-time `POST …/staff` (`createStaff`) | No batch / file import |
| CSV | Export only (admissions, payroll, reports) | No import parser |
| Excel | MIME allowlist in classroom storage only | No `xlsx` / `exceljs` dependency for roster import |
| Atomicity | Single-row Identity commits | No all-or-nothing multi-row transaction |
| Classroom | Optional after single create (soft-fail) | No column-driven class assign in batch |
| Credentials | Shown once in modal for one user | No batch credentials export |

---

## 2. Target behavior

### 2.1 Mental model

| Concept | Meaning |
| :--- | :--- |
| **Template** | Downloadable CSV/XLSX with required headers + example row |
| **Parse** | Client reads file → normalized row objects (server re-validates) |
| **Preview / dry-run** | Server validates every row against school data; returns row errors; **writes nothing** |
| **Commit** | Same payload; Identity runs one DB transaction; all creates or none |
| **Credentials file** | One-time download of `email,temporaryPassword,name,role` for the batch |
| **Atomic** | All Identity `User` inserts for the batch succeed together, or the transaction rolls back |

**Product rule for “atomic”:** Guaranteed for **Identity account creation** (the source of truth for students and staff logins). Optional classroom membership is **not** part of the atomic boundary (same honesty as today’s single enroll: user can exist without a class seat). Phase B may soft-assign classrooms after a successful commit.

### 2.2 Which create path?

| Import type | Path | Why |
| :--- | :--- | :--- |
| Students | **Direct Identity create** (same rules as Students → Enroll new student) | Existing-school roster migration; no admission fee/docs gates |
| Staff | **Direct Identity create** (same rules as Add staff member) | Staff microservice is leave/payroll, not hiring |

Do **not** create `AdmissionApplication` rows or run the Lifecycle enroll saga for bulk import. Registrar / public apply remain the path when fee/docs policy matters.

### 2.3 Who can import

| Import | Roles (match create APIs) |
| :--- | :--- |
| Students | `SCHOOL_ADMIN`, `REGISTRAR` |
| Staff | `SCHOOL_ADMIN`, `PRINCIPAL`, `VPA` |

School-scoped: actor’s `schoolId` must match the target school (same guards as existing create routes).

### 2.4 File formats & size

| Format | Extension | Notes |
| :--- | :--- | :--- |
| CSV | `.csv` | UTF-8; comma-separated; header row required |
| Excel | `.xlsx` | First worksheet only; header row = row 1 |

| Limit | Value |
| :--- | :--- |
| Max rows per commit | **500** (configurable constant; reject above with clear error) |
| Max file size (if server upload later) | 5 MB |
| Empty rows | Ignored |
| Duplicate email **within file** | Fail dry-run / fail commit (treat as row errors) |
| Email already in DB | Fail that row (and thus fail whole atomic commit) |

### 2.5 Column schemas

Headers are **case-insensitive**; aliases allowed (listed). Unknown columns ignored with a preview warning.

#### Students template

| Column | Required | Maps to | Notes |
| :--- | :--- | :--- | :--- |
| `name` | Yes | `User.name` | Trimmed |
| `email` | Yes | `User.email` | Lower-cased; globally unique |
| `gradeLevel` | Yes* | resolve → `gradeLevelId` | Prefer grade **code** or **name** at this school (*or `gradeLevelId` UUID) |
| `gradeLevelId` | Alt | `User.gradeLevelId` | If both present, Id wins |
| `dob` | No | `dob` | ISO `YYYY-MM-DD` preferred |
| `gender` | No | `gender` | As today (free text / school convention) |
| `phone` | No | `phone` | |
| `address` | No | `address` | |
| `parentName` | No | `parentName` | Contact fields only — **no** parent User |
| `parentPhone` | No | `parentPhone` | |
| `feeCohort` | No | `feeCohort` | `NEW` \| `RETURNING` (default `NEW`) |
| `classroom` | No (Phase B) | resolve → classroom id | Soft-assign after commit |
| `password` | No | custom password | Else auto temp (≥8); `mustChangePassword: true` |

#### Staff template

| Column | Required | Maps to | Notes |
| :--- | :--- | :--- | :--- |
| `name` | Yes | `User.name` | |
| `email` | Yes | `User.email` | |
| `role` | No | `role` | Default `TEACHER`; must be school-assignable; **not** `STUDENT` / `PARENT` / `SUPER_ADMIN` |
| `phone` | No | `phone` | |
| `address` | No | `address` | |
| `dob` | No | `dob` | |
| `gender` | No | `gender` | |
| `joiningDate` | No | `joiningDate` | Default = import day |
| `password` | No | custom | Else auto; school `securityPolicy.passwordMinLength` applies |

### 2.6 Resolution rules (server)

1. **Grade levels:** Load Academic grade levels for `schoolId`. Match `gradeLevel` case-insensitively on `code` then `name`. Ambiguous match → row error.
2. **Roles:** Normalize (`teacher` → `TEACHER`); reject invalid via existing `isSchoolAssignableRole`.
3. **Emails:** Trim + lower-case; reject if exists in Identity **or** duplicate in batch.
4. **Passwords:** Reuse `createStudent` / `createStaff` generation + `assertPasswordForSchool` for staff.
5. **Classroom (Phase B):** Resolve by classroom name within school; unknown → row warning after commit (or preview error if strict mode).

### 2.7 Atomic commit algorithm (Identity)

```
1. Authenticate + authorize + assert school scope
2. Normalize + validate all rows (same as dry-run)
3. If any row has errors → 400 with { ok: false, rows: [...] }; write nothing
4. prisma.$transaction(async (tx) => {
     for each row:
       assert email still free (race)
       create User (same fields as createStudent / createStaff)
       collect { user, temporaryPassword }
   })
5. Return { ok: true, created: [...], credentialsDownloadHint }
6. (Phase B) Best-effort classroom member POSTs; report classAssignFailed[] separately
```

On any throw inside the transaction → full rollback → client sees failure and **zero** new users.

### 2.8 Credentials handling

- Response includes `temporaryPassword` per created user (same as single create).
- UI offers **Download credentials CSV** immediately (and warn: passwords shown once).
- Do **not** email passwords in MVP (align with current Add Staff / Enroll Student).
- Optional later: welcome email toggle (reuse admission `sendWelcomeEmail` path).

### 2.9 UI surfaces

| Surface | Behavior |
| :--- | :--- |
| Students page header | **Import students** → `FeatureModalShell` wizard |
| Staff Management header | **Import staff** → same wizard pattern |
| Wizard steps | (1) Download template (2) Upload file (3) Preview table + errors (4) Confirm import (5) Success + credentials download |
| Empty / errors | Honest copy; no fake progress percentages |
| Confirm | `confirmAction` before commit when preview is clean |
| Toasts | Success count; never `window.alert` |

Follow Executive Slate + `sms-ui-consistency` (PageShell patterns on host pages; modal uses existing FeatureModalShell).

---

## 3. Owning services

| Concern | Service |
| :--- | :--- |
| Parse helpers (shared pure) | Prefer `packages/` or Identity `src/domain/bulkImport.ts` + mirrored SPA validators |
| Dry-run + atomic create | **Identity** |
| Gateway routes | `api-gateway` school suffixes (reuse `students` / `staff` or add `student-imports` / `staff-imports`) |
| Grade level list for resolve | **Academic** (Identity already has patterns / client, or SPA passes resolved ids after preview) |
| Classroom assign (Phase B) | **Classroom** |
| Admission / Lifecycle | **Not used** for this feature |
| Staff leave/payroll | **Not written** on hire |

### Recommended APIs

```
POST /api/schools/:schoolId/students/import/preview
POST /api/schools/:schoolId/students/import
POST /api/schools/:schoolId/staff/import/preview
POST /api/schools/:schoolId/staff/import

GET  /api/schools/:schoolId/students/import/template.csv
GET  /api/schools/:schoolId/staff/import/template.csv
```

**Body (preview & import):**

```json
{
  "rows": [
    { "name": "…", "email": "…", "gradeLevel": "Grade 7", "feeCohort": "NEW" }
  ],
  "sourceFileName": "roster.xlsx"
}
```

**Preview response:**

```json
{
  "ok": true,
  "rowCount": 42,
  "validCount": 40,
  "errorCount": 2,
  "rows": [
    { "index": 0, "ok": true, "normalized": { "…": "…" } },
    { "index": 1, "ok": false, "errors": ["email already exists", "gradeLevel not found"] }
  ]
}
```

**Import response (success):**

```json
{
  "ok": true,
  "createdCount": 40,
  "created": [
    { "id": "…", "name": "…", "email": "…", "role": "STUDENT", "temporaryPassword": "…" }
  ]
}
```

**Import response (reject):** same shape as preview with `ok: false` and HTTP 400 — no partial creates.

Client may parse CSV/XLSX locally and POST JSON (MVP — no multipart on Identity). Server remains authoritative for validation and atomicity.

---

## 4. Implementation phases

### Phase 0 — Spec lock (this doc)

- [x] Product rules: direct create, atomic Identity batch, CSV + XLSX, separate student/staff
- [x] Confirm max rows (500) and column aliases with product owner if needed

### Phase 1 — Backend (Identity) MVP

- [x] Shared row normalize/validate for students & staff
- [x] `preview` endpoints (no writes)
- [x] `import` endpoints with `prisma.$transaction` all-or-nothing
- [x] Template CSV download routes
- [x] Gateway wiring + RBAC parity with create (school suffix `students` / `staff` → identity)
- [x] Unit tests: valid batch, duplicate email in file, existing email, missing grade, rollback on mid-batch failure, staff invalid role, password policy

### Phase 2 — Frontend

- [x] `xlsx` (SheetJS) in SPA for `.xlsx` + simple CSV parser
- [x] Import wizard modal (students + staff)
- [x] Template download buttons
- [x] Preview table (error rows rose / valid emerald muted)
- [x] Commit + credentials CSV download
- [x] Wire Students + Staff Management headers

### Phase 3 — Classroom column (optional)

- [ ] Optional `classroom` on student rows
- [ ] After successful Identity commit, assign members; return `classAssignFailed[]`
- [ ] Document that class assign is best-effort (not atomic with Identity)

### Phase 4 — Hardening (later)

- [ ] Server-side multipart upload (large files / untrusted clients)
- [ ] Audit log row: who imported N users, filename, timestamp
- [ ] Optional welcome emails
- [ ] Upsert / “skip existing” mode (explicit, non-default — breaks strict atomic create semantics; document carefully)
- [ ] Parent User + link columns (ties to admission parent model)

---

## 5. Acceptance / verify

### Students

- [ ] Download student template; fill 3 rows; preview shows 3 valid
- [ ] Introduce bad email + unknown grade → preview errors; Import disabled or Confirm rejected; **zero** new students
- [ ] Fix file; Import → 3 students appear on Students list with correct grade / fee cohort
- [ ] Credentials CSV downloads and passwords allow login with must-change
- [ ] Duplicate email vs existing user → whole import rejected
- [ ] Registrar can import; Teacher cannot (403)

### Staff

- [ ] Staff template; roles TEACHER / ACCOUNTANT etc.; invalid `STUDENT` role rejected
- [ ] Atomic fail on one bad row leaves staff count unchanged
- [ ] Successful import appears on Staff Management; credentials download works
- [ ] Principal/VPA/Admin can import; Registrar cannot (403)

### Regression

- [ ] Single Enroll student / Add staff still work
- [ ] Admission apply / enroll unchanged
- [ ] `npm run test` (scoped identity + new bulk-import tests) green; rebuild `identity` + `api-gateway` + `frontend-spa`

---

## 6. Engineering notes

| Topic | Decision |
| :--- | :--- |
| Parser location | SPA parses file → JSON; Identity validates (keeps Identity free of Excel deps in MVP) |
| Excel library | `xlsx` (SheetJS) in frontend `package.json` only for Phase 2 |
| Transaction timeout | Size batch for 500 bcrypt hashes — may need longer interactive transaction timeout or pre-hash outside loop carefully (hash before `create` inside tx is fine; watch duration) |
| Idempotency | No silent skip; re-import same emails fails (emails exist). Client should not double-submit (disable button) |
| Events | Optional later `user.bulk_imported`; not required for MVP |
| Docs on ship | Flip this banner to Done; update APP_FEATURES_OVERVIEW Students/Staff rows; changelog below |

### Why not Lifecycle / admission bulk?

Admission enroll enforces fee/docs policy, creates applications, and may create parent users. Roster migration for an **already operating school** matches **direct enroll**, not public apply. Mixing them would surprise admins (“why didn’t my 200 students import?” because entrance fee unpaid).

### Honest atomicity boundary

```
[ CSV / XLSX ]
      │
      ▼
[ SPA parse + preview UI ]
      │  POST rows JSON
      ▼
[ Identity preview / import ]
      │  prisma.$transaction  ← ATOMIC boundary
      ▼
[ User rows committed or none ]
      │
      ▼ (Phase B, optional, best-effort)
[ Classroom membership ]
```

---

## 7. Change log

### 2026-07-30 — Phases 1–2 shipped

- **Change:** Schools can import students and staff from CSV/Excel via preview + atomic Identity batch create; credentials CSV download; templates on Students and Staff Management.
- **Services:** identity, frontend-spa
- **UI / API:** `/{slug}/students`, `/{slug}/staff`; `POST …/students|staff/import(/preview)`; `GET …/import/template.csv`
- **Status:** done (Phases 1–2); Phase 3 classroom column open
- **Verify:**
  - [ ] Download template → fill → preview → import; credentials download works
  - [ ] One bad row rejects whole batch (zero creates)
  - [ ] `npm run test:bulk-import`

### 2026-07-30 — Plan authored

- **Change:** Defined CSV/Excel bulk import for students and staff with atomic Identity batch create, preview/dry-run, templates, and credentials download; classroom assign deferred as best-effort Phase B.
- **Services:** identity, api-gateway, frontend-spa (planned)
- **UI / API:** `/{slug}/students`, `/{slug}/staff`; `…/students/import*`, `…/staff/import*`
- **Status:** superseded — Phases 1–2 shipped 2026-07-30 (see header status)
- **Verify:** n/a until Phase 1–2 land
