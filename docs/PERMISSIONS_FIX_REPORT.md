# Permissions & business-logic fix report

> **Date:** 2026-07-24  
> **Scope:** Who can see / edit / approve what across roles, vs docs, nav, routes, and APIs  
> **Sources:** `ROLES_DOCUMENTATION.md`, `docs/APP_FEATURES_OVERVIEW.md`, `src/constants/navByRole.ts`, `src/App.tsx`, domain services  
> **Status:** **Remediation shipped (2026-07-24)** — P0–P3 addressed in code + docs  
> **Verify:** `npm run test:permissions-fix` (+ rebuild `comms` `classroom` `lifecycle` `staff` `identity` `frontend-spa`)

---

## Decisions locked during implementation

| Item | Decision |
| :--- | :--- |
| VPA leave | **Add UI** — nav + capability `nav.leave-approval` (API already allowed) |
| Counselor students | **Read access** — route + Identity students GET |
| Specialty calendar | **Expand** calendar route roles to match nav |
| Teacher documents | **Not** full-library managers — role-filtered list; create/edit/delete Admin/Principal/VPI/VPA/Registrar only |
| Specialty modules | Honest **StubFeaturePage** empty states (no fake KPIs) |
| PTA API | Narrow `PTA_READ` to Admin / Principal / Parent |
| Fees API | Left broader than SPA (intentional; staff tools may call GETs) |

---

## Shipped fixes

### P0 — Security

1. Documents: ignore spoofed `?role=` for non-managers; Teacher removed from manage set (`comms`)
2. Classroom posts/members: `canViewClassroom` for all roles (`classroom`)
3. Classroom school list scoped by membership/ownership (`classroom`)
4. Attendance create: teacher must teach the class; Admin/Principal/VPI/VPA override (`lifecycle`)
5. Leave list: non-approvers forced to own `userId` (`staff`)

### P1 — Alignment

6. VPA Leave Approvals nav + capability  
7. Counselor Students route + API  
8. Specialty roles can open Calendar  
9. Onboarding guarded (Admin / IT / Principal)  
10. Teacher document manage narrowed (SPA + API)

### P2/P3 — Honesty

11–13. `ROLES_DOCUMENTATION.md` + `APP_FEATURES_OVERVIEW.md` stub language; grade-release myth fixed earlier  
14. PTA API narrowed  
15. Principal PTA nav  
16–17. Transcripts fake cert KPIs removed; Security seed visitors/patrols cleared  
18. `ROUTE_ROLES` calendar/students updated  
Specialty pages → `StubFeaturePage`

---

## Change log

### 2026-08-05 — Campus specialists no longer stubs

- **Change:** Updated `ROLES_DOCUMENTATION.md` and `APP_FEATURES_OVERVIEW.md` — Library, Clinic, Counseling, Athletics, Hostel, Cafeteria, Transport are live (`campus` + Ops). P2 item “Specialty pages → StubFeaturePage” applied only until 2026-08-04 campus cutover.
- **Status:** done (documentation)
- **Verify:** `npm run test:spa-stub`; open `/{slug}/library` — live feature module, not `StubFeaturePage`

### 2026-07-29 — Profile photo sync across app

- **Change:** Session photo always wins for the signed-in user in `UserAvatar` (including remove). Auth persist no longer stores photo/signature data URLs. Layout hydrates `/api/auth/me` on boot. Profile save/apply invalidates directory/classroom query caches. Children page uses `UserAvatar`.
- **Services:** frontend-spa
- **Status:** done
- **Verify:** Change photo → header + classrooms/staff lists show new photo after navigate; remove photo → initials everywhere for self; hard refresh still loads photo from `/me`.

### 2026-07-29 — Profile link for all roles

- **Change:** `ProtectedRoute` no longer maps `/{slug}/profile` to a fake `nav.profile` capability (not in any role matrix), which redirected Teacher/Student/Parent/staff to dashboard. Account routes and unknown segments are skipped unless the capability is known.
- **Services:** frontend-spa
- **Status:** done
- **Verify:** As Teacher/Student/Parent → My Profile opens and loads; save works for self.

### 2026-07-24 — Remediation implemented

- **Change:** Closed P0 ACL gaps; aligned VPA/Counselor/calendar/onboarding/docs; stub honesty for specialty modules.
- **Services:** `comms`, `classroom`, `lifecycle`, `staff`, `identity`, `frontend-spa`
- **Status:** done
- **Verify:** `npm run test:permissions-fix`; Student `?role=` spoof; Teacher foreign classroom posts → 403; Nurse leave list → self only

### 2026-07-24 — Initial audit report

- **Change:** Documented permission/business-logic gaps and prioritized fixes (no code changes).
- **Status:** superseded by remediation above
