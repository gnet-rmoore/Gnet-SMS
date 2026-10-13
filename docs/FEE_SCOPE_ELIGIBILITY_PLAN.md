# Fee scope: Grade Level, Division & eligibility — Plan

> **Status:** Phases A–D implemented (2026-07-23)  
> **Scope:** Fee templates scoped to Grade Level / Division / New vs Returning; batch apply; reject wrong-target charges with clear accountant feedback  
> **Companion:** `docs/FINANCE_BILLING_PLAN.md`, `docs/grade-level-vs-class-group.md`, `IMPLEMENTATION_STATUS.md`  
> **UI:** `/{slug}/fees` (Templates, Batch, Ledger / Collect); Curriculum → Grade levels (Divisions); Students enroll/edit (fee cohort)

### 2026-07-29 — Template edit

- **Change:** `PATCH …/fee-templates/:id` + Fees Templates edit UI for SCHOOL_ADMIN and ACCOUNTANT
- **Services:** finance, frontend-spa
- **Status:** done
- **Verify:** Edit scoped template → batch apply still uses updated amount/scope

---

## 0. Product intent (plain English)

Today, fee templates are **school-wide amount presets**. Accountants pick students by hand or by classroom. The system does **not** know that “Grade 8 New Student Tuition” only belongs on Grade 8 new students, or that “High School Sports Fee” only belongs on High School grades.

**Goal:** Fees Management can:

1. **Define templates** for a **Grade Level** (e.g. Grade 8) and optionally a **cohort** (New vs Returning), then **apply** that fee to every matching student in one action.
2. **Define templates** for a **Division** (Elementary, Middle School, High School, Preparatory, …) and apply to every student whose grade sits in that division.
3. **Reject** create / collect / batch lines when the student’s Grade Level, Division, or cohort **does not match** the template (or explicit scope on the invoice) — and **notify** the accountant with a clear error (toast + API message), not a silent success.

Vocabulary (aligned with `docs/grade-level-vs-class-group.md`):

| Term | Meaning | Today in code |
| :--- | :--- | :--- |
| **Division** | Broad stage (Elementary, Middle, High, Prep, …) | Documented only — **no DB model** |
| **Grade Level** | Year/standard (Grade 8) | Academic `GradeLevel` |
| **Class Group / Classroom** | Homeroom section (8-A) | Classroom service |
| **Cohort** | New vs Returning (same grade, different fee) | **Does not exist** |

---

## 1. Current gaps (audit)

| Area | Today | Gap |
| :--- | :--- | :--- |
| `FeeTemplate` | `name`, `type`, `amount`, `description` | No grade / division / cohort scope |
| `FeePayment` | student + amount; no `templateId` | Cannot audit “which schedule was applied” |
| Batch billing | All students **or one classroom**; client loops `createFee` | No “by grade” / “by division” |
| Student | `User.gradeLevelId` | No New/Returning flag |
| GradeLevel | `id`, `name`, `schoolId` | No `divisionId` |
| Create / collect | Amount + status only | No eligibility check |
| Notify | Reminder toast is honest (“email not configured”) | No mismatch-specific message path |

---

## 2. Target behavior

### 2.1 Template scopes (combinable)

Each fee template has a **scope mode**:

| Mode | Meaning | Example |
| :--- | :--- | :--- |
| `SCHOOL` | Any enrolled student (current behavior) | Generic late fine |
| `GRADE` | Students with matching `gradeLevelId` (+ optional cohort) | Grade 8 New tuition |
| `DIVISION` | Students whose grade belongs to that division | High School lab fee |
| `CLASSROOM` *(optional later)* | Homeroom membership | 8-A trip fee |

**Cohort** (optional filter on `GRADE` or `DIVISION` modes):

| Value | Meaning |
| :--- | :--- |
| `null` / `ALL` | All students in the grade/division |
| `NEW` | First-year / newly admitted in that grade (or school year) |
| `RETURNING` | Continuing students |

So: **“Grade 8 New”** and **“Grade 8 Returning”** are two templates with the same `gradeLevelId` and different `cohort`.

### 2.2 Apply (batch)

From Fees → Batch (or Template → “Apply to eligible students”):

1. Accountant selects a **scoped template** (and due date / school year if needed).
2. System resolves eligible students:
   - `GRADE` → Identity students with that `gradeLevelId` (+ cohort)
   - `DIVISION` → students whose grade’s `divisionId` matches
3. Creates **PENDING** invoices for each eligible student who does not already have an open invoice for the same template + school year (idempotency rule — see §4).
4. Returns a summary: created / skipped (already billed) / failed (ineligible or error).

Classroom-based batch remains available for one-off section fees.

### 2.3 Reject wrong charges (hard gate)

Whenever an accountant (or API client) creates or collects a fee that is tied to a scoped template (or passes explicit scope fields):

| Check | Fail if |
| :--- | :--- |
| School | Student not in same school |
| Grade | Template mode `GRADE` and student’s `gradeLevelId` ≠ template |
| Division | Template mode `DIVISION` and student’s grade’s division ≠ template |
| Cohort | Template has `NEW`/`RETURNING` and student’s cohort ≠ template |

**Response:** HTTP `409` (or `422`) with stable `code` e.g. `FEE_SCOPE_MISMATCH` and human message:

> This fee is for **Grade 8 — New students**. Selected student is **Grade 7 — Returning**. Transaction rejected.

**UI:** Toast (error) with that message; batch row shows failure reason; **do not** create PENDING / **do not** mark PAID.

Collect/pay on an **already valid** PENDING invoice created under the correct scope remains allowed (student grade change after invoice is a soft-warn — Phase C).

### 2.4 Notify the accountant

| Channel | MVP | Later |
| :--- | :--- | :--- |
| Immediate UI toast / batch error list | **Required** | — |
| API error body for integrations | **Required** | — |
| In-app notification / Comms email | Optional | Wire to Notifications prefs (`FEE_DUE` already exists; add `FEE_SCOPE_REJECTED` if useful) |

MVP = **reject + clear toast**. Do not claim email was sent unless Comms is actually wired.

---

## 3. Data model (proposed)

### 3.1 Academic — Division

```text
Division
  id, schoolId, name, code?, sortOrder, isActive
  // e.g. Elementary | Middle School | High School | Preparatory

GradeLevel
  … existing …
  divisionId String?   // UUID to Division (same school)
```

Seed/helpers: map existing Grade 1–5 → Elementary, 6–8 → Middle, 9–12 → High (configurable per school; do not hardcode forever).

### 3.2 Identity — Student cohort

```text
User (STUDENT)
  gradeLevelId String?     // existing
  feeCohort    String?     // NEW | RETURNING | null
```

- Set on enroll / edit student / admission → enroll saga.
- Admin can change on Students / Registrar screens.
- `null` = only matches templates with cohort `ALL`.

### 3.3 Finance — Template + invoice linkage

```text
FeeTemplate
  … existing …
  scopeMode     String   // SCHOOL | GRADE | DIVISION  (default SCHOOL)
  gradeLevelId  String?  // when GRADE
  divisionId    String?  // when DIVISION
  cohort        String?  // ALL | NEW | RETURNING (default ALL)
  schoolYearKey String?  // optional “2025-2026” for idempotency

FeePayment
  … existing …
  templateId    String?
  scopeSnapshot String?  // JSON copy of scope at create (audit)
  schoolYearKey String?
```

Cross-service IDs stay plain strings (no Prisma FK across schemas), same pattern as today.

---

## 4. Rules & edge cases

1. **Eligibility** is evaluated **server-side** on create (and on batch create). UI filters are convenience only.
2. **Idempotent apply:** skip student if PENDING/PAID invoice already exists for same `templateId` + `schoolYearKey` (or same type+amount+due month if no year key — document chosen rule).
3. **SCHOOL-scoped templates** never fail grade/division checks (only school membership).
4. **Manual invoice without template:** **Recommendation:** ACCOUNTANT must pick a template (or explicit scope); SCHOOL_ADMIN may override with confirm.
5. **Student missing gradeLevelId:** ineligible for GRADE/DIVISION templates → reject with “Student has no grade level assigned.”
6. **Division without grades:** apply creates zero invoices; UI empty state.
7. **Grade moved to another division:** future invoices use new division; old PENDING invoices soft-warn on collect (Phase C).

---

## 5. Owning services & APIs

| Concern | Service |
| :--- | :--- |
| Division CRUD; GradeLevel.divisionId | **academic** |
| Student `feeCohort`; list students by grade | **identity** |
| Template scope fields; createFee eligibility; batch apply | **finance** |
| Enrich student grade/division/cohort for checks | finance → identity + academic HTTP clients |
| Gateway routes | **api-gateway** |
| Fees UI | **frontend-spa** |
| Optional reject email | **comms** (later) |

### Suggested endpoints

| Method | Path | Purpose |
| :--- | :--- | :--- |
| CRUD | `/api/schools/:id/divisions` | Division management (Academic) |
| PATCH | `/api/schools/:id/grade-levels/:id` | Set `divisionId` |
| CRUD | `/api/schools/:id/fee-templates` | Extended body with scope |
| POST | `/api/schools/:id/fees/batch-apply` | Body: `{ templateId, dueDate, schoolYearKey? }` → summary |
| POST | `/api/schools/:id/fees` | Existing create + eligibility when `templateId` / scope present |
| PATCH | `/api/users/:id` | Allow `feeCohort` for staff roles |

---

## 6. UI (Fees Management)

### Templates tab

- Scope selector: School / Grade / Division  
- Grade dropdown (Academic grades)  
- Division dropdown  
- Cohort: All / New / Returning  
- Preview: “Eligible students: N” (live count)

### Batch tab

- Mode: Classroom (existing) | **By template (recommended)** | All (admin only?)  
- Select template → show eligibility count → Run → results table (created / skipped / rejected)

### Ledger / Collect / New invoice

- Prefer template picker first  
- On mismatch: error toast with grade/division/cohort detail  
- Show student’s grade + cohort + division chip on invoice form for confirmation

### Students / Enroll

- Fee cohort field (New / Returning)  
- Grade level required before GRADE-scoped billing is useful

### Curriculum / Settings (Academic)

- Divisions list + assign grades to divisions  
- (Optional) link from Fees empty state: “Set up divisions”

---

## 7. Phased delivery

```text
Phase A — Grade + cohort + reject
Phase B — Division model + division templates + batch-by-division
Phase C — Soft-warn on stale invoices + optional Comms notify
Phase D — Polish (server batch progress, school-year keys, reports)
```

### Phase A — Grade Level + New/Returning (MVP)

**Ship value without waiting for Division.**

| Work | Detail |
| :--- | :--- |
| Identity | `feeCohort` on User; enroll/edit UI |
| Finance | Template `scopeMode` GRADE\|SCHOOL, `gradeLevelId`, `cohort`; `templateId` on FeePayment |
| Finance | `createFee` eligibility vs Identity student |
| Finance | Batch apply by grade (+ cohort) — server endpoint preferred |
| SPA | Template form + batch-by-template + toast on mismatch |
| Docs | This plan status → partial |

**Out of Phase A:** Division entity; email notify.

### Phase B — Divisions

| Work | Detail |
| :--- | :--- |
| Academic | `Division` + `GradeLevel.divisionId`; seed defaults; Curriculum UI |
| Finance | `scopeMode` DIVISION; resolve students via grade→division |
| SPA | Division template scope + batch-by-division |
| Docs | Update `grade-level-vs-class-group.md` “implemented” |

### Phase C — Stale scope + notify

| Work | Detail |
| :--- | :--- |
| Collect | If student’s current grade/cohort no longer matches `scopeSnapshot`, require confirm or block (product choice: **block** for ACCOUNTANT, confirm for SCHOOL_ADMIN) |
| Comms | Optional `FEE_SCOPE_REJECTED` / accountant digest — only if prefs + mailer exist |

### Phase D — Hardening

- Server-side batch with progress / resume  
- Reports: billed vs eligible by grade/division  
- School year on templates and idempotency keys  
- Classroom-scoped templates if product still needs them beyond grade

---

## 8. “Works as intended” acceptance

### Phase A

- [x] Create template “Grade 8 — New” → Apply → only Grade 8 + `feeCohort=NEW` get invoices  
- [x] Create template “Grade 8 — Returning” → does not hit New students  
- [x] Accountant creates invoice from Grade 8 New template for a Grade 7 student → **rejected** + toast explaining mismatch  
- [x] SCHOOL-wide template still bills any student in school  
- [x] Re-run apply skips students already invoiced for that template (+ year)

### Phase B

- [x] Divisions CRUD; grades assigned to High School  
- [x] “High School Sports Fee” applies to all HS grades only  
- [x] Elementary student + HS template → reject + notify toast  

### Phase C

- [x] Student grade changed after PENDING invoice → collect policy matches product choice  
- [ ] (If enabled) accountant gets in-app/email notice on reject — **deferred** (toast only)

---

## 9. Explicit non-goals

- Auto-detect New vs Returning from prior-year history (manual/admin set for MVP)  
- Multi-campus or district-wide fee catalogs  
- Partial payments / refunds (still future in `FINANCE_BILLING_PLAN.md`)  
- Claiming SMS/email was sent when mailer is off  

---

## 10. Implementation order (when building)

1. Identity `feeCohort` + SPA enroll/edit  
2. Finance template scope fields + eligibility on `createFee`  
3. Batch-apply by grade API + Fees UI  
4. Academic Division + grade link  
5. Division scope + batch  
6. Stale-invoice policy + optional Comms  

Ship each phase with: tests (eligibility unit + API), rebuild `identity` / `academic` / `finance` / `api-gateway` / `frontend-spa` as touched, and a changelog entry below.

---

## 11. Change log

### 2026-07-23 — Implement Phases A–D

- **Change:** Identity `feeCohort`; Academic `Division` + `GradeLevel.divisionId`; Finance template scope + `createFee` eligibility (`FEE_SCOPE_MISMATCH`); `POST …/fees/batch-apply`; collect stale scope block/confirm; SPA Fees templates/batch/invoice + Students cohort + Curriculum divisions panel; unit tests `tests/fee-scope.test.ts`
- **Who:** Accountants / school admins (fees); registrars (cohort); curriculum admins (divisions)
- **Services:** identity, academic, finance, api-gateway, frontend-spa
- **Status:** done (MVP; Comms reject email not wired)
- **Verify:** `npm run test:fee-scope`; create Grade/Division/New templates → batch-apply → mismatch toast on wrong student; collect after grade change blocks ACCOUNTANT / confirms SCHOOL_ADMIN

### 2026-07-23 — Plan: grade / division / cohort fee scope + reject

- **Change:** Comprehensive plan for scoped fee templates, batch apply by grade/division, New vs Returning cohort, and hard reject + accountant toast on mismatch  
- **Services:** finance, identity, academic, frontend-spa (by phase)  
- **Status:** superseded by implementation entry above  
- **Verify:** N/A until Phase A  

---

## 12. Open decisions (confirm before Phase A code)

| # | Question | Recommendation | Shipped |
| :--- | :--- | :--- | :--- |
| 1 | Must accountants always use a template? | Yes for ACCOUNTANT; SCHOOL_ADMIN may override with confirm | ACCOUNTANT requires `templateId` on create |
| 2 | Where is New/Returning set? | Enroll + student edit; default `NEW` on first create | Done |
| 3 | Collect after grade change? | Block ACCOUNTANT; allow SCHOOL_ADMIN with confirm | Done (`FEE_SCOPE_STALE`) |
| 4 | Default division mapping for Grade 1–12? | Seed once per school; editable | Done (`divisions/seed`) |
| 5 | Idempotency key | `templateId` + `schoolYearKey` + `studentId` |
