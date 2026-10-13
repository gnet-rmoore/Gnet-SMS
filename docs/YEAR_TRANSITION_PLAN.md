# Year Transition + Promotion Statement

> **Status:** MVP implemented (2026-08-03) — census, draft/commit promotion runs, school-wide printable statement, RBAC for School Admin / Principal / VPI / VPA / Registrar. Finance fee-batch handoff is a deep link (apply remains Admin/Accountant). Per-student report-card promotion stamp deferred.

> **Scope:** End-of-year student progression (promote / repeat / graduate / exit) plus institutional **Promotion Statement** (opening census, gender, division/class, pass/fail).

## Who

| Role | Access |
| :--- | :--- |
| `SCHOOL_ADMIN`, `PRINCIPAL`, `VPI`, `VPA`, `REGISTRAR` | Full Year Transition + statement (capture, decide, commit, print) |
| `ACCOUNTANT` / `SCHOOL_ADMIN` | Fee batch after promote (existing Fees RBAC) |
| Teacher / Parent / Student | No access |

Constant: `YEAR_TRANSITION_ROLES` in SPA [`src/constants/roles.ts`](../src/constants/roles.ts) and Academic routes.

## Behavior

1. **Opening census** — `POST /api/schools/:schoolId/promotion/census` snapshots active students (grade, division, class group, gender) for a `schoolYearKey`. Locked after first committed run for that year.
2. **Draft run** — create run; bulk upsert decisions (`PROMOTED` \| `REPEAT` \| `GRADUATED` \| `DO_NOT_RETURN`) with optional next grade / target class group.
3. **Commit** — updates Identity `gradeLevelId` + `feeCohort=RETURNING` (when continuing), moves Classroom membership; run → `COMMITTED`.
4. **Promotion Statement** — `GET …/promotion/statement` assembles opening totals, M/F/unknown, division → grade → class rows, outcome columns. Draft runs print with DRAFT watermark.
5. **UI** — `/{slug}/year-transition`, `/{slug}/promotion-statement`.

## Services

| Concern | Service |
| :--- | :--- |
| Census, runs, decisions, statement | Academic |
| grade / cohort on commit | Identity internal PATCH |
| roster move on commit | Classroom internal add/remove + school list |
| Gateway | `/api/schools/:id/promotion` → academic |

## Verify

- [ ] Five roles see nav and can open Year Transition
- [ ] Teacher gets 403 on promotion APIs
- [ ] Capture census → decide → commit moves grade/class
- [ ] Statement opening totals match census; pass/fail match decisions
- [ ] Fees handoff link includes `schoolYearKey` + promoted count

## Changelog

### 2026-08-03 — MVP ship

- **Change:** Year Transition + school-wide Promotion Statement; RBAC five roles; opening census; commit mutates Identity/Classroom.
- **Who:** Registrar / Admin / Principal / VPI / VPA  
- **Services:** academic, identity (internal patch + **nav capabilities** `nav.year-transition` / `nav.promotion-statement`), classroom (internal list/remove), gateway, SPA  
- **Status:** done (MVP); report-card per-student stamp + auto eligibility deferred  
- **Verify:** see checklist above; School Admin must see **People → Year Transition** after login (capabilities refresh on login)
