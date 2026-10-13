# Missing Imports & Out-of-Scope Identifiers Audit

**Date:** 2026-07-22  
**Scope:** `src/features/`, `src/pages/`, `src/components/`  
**Total TSX files scanned:** 180 (116 feature + 54 pages + 10 shared components)

## Summary

| Result | Count |
|--------|------:|
| Files with **runtime/build-breaking** missing imports or out-of-scope identifiers | **0** |
| Files fixed in this audit | **0** (codebase already clean) |
| Truncated / unbalanced JSX files | **0** |
| Wrong `./components/` imports inside `components/` folders | **0** |

### TypeScript / build / test (verified 2026-07-22 via Docker `node:20-alpine`)

| Check | Command | Result |
|-------|---------|--------|
| Prisma client | `npx prisma generate` | ✅ |
| Full project lint | `npm run lint` (`tsc --noEmit`) | ✅ **0 errors** |
| Frontend pages build | `npx vite build` | ✅ built |
| Backend bundle | `esbuild server.ts` | ✅ |
| Backend security tests | `npm run test:security` | ✅ **ALL PASSED** |
| Gateway lint | `services/gateway` `npm run lint` | ✅ |
| Lifecycle lint | `services/lifecycle` `npm run lint` | ✅ |

Note: `npm run lint` failed earlier only because `@prisma/client` had not been generated in `node_modules` (`PrismaClient` missing). After `prisma generate`, examService and seed typing errors cleared.

---

## Search patterns applied

For every `.tsx` file under the three directories:

1. **Chart/router/motion/lucide usage** — `AreaChart`, `BarChart`, `ResponsiveContainer`, `CartesianGrid`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `PieChart`, `LineChart`, `Cell`, `Link`, `useNavigate`, `useParams`, `motion`, `AnimatePresence`, and lucide icon JSX tags used without import or prop.
2. **Page → extract prop scope** — `prop={ident}` where `ident` is not declared in Page scope (e.g. `subject={subject}` only valid inside `.map()`).
3. **Truncated JSX** — files ending mid-element or with unbalanced `<`/`>`/`{`/`}`.
4. **Wrong relative imports** — `from "./components/X"` when the file is already under `components/`.
5. **Presentational extracts** — identifiers used in component bodies (function calls, JSX expressions) not covered by imports, props, or local declarations.

Automated checker saved at `scripts/check_missing_imports.py`.

---

## Broken files (fixes applied)

**None.** All targeted patterns pass in the current tree.

Previously reported issues (from earlier extract refactors) are **already fixed**, including:

| Area | Was broken | Current state |
|------|------------|---------------|
| `fees/Page.tsx` | `type={type}`, `templ={templ}` undefined | Removed |
| `fees/Page.tsx` | `FeeDetailDrawer` payment props | Destructured from `usePageActions` |
| `payroll/Page.tsx` | `S`, `dossier`, `Card`, `symbol`, `netSalary` undefined props | Removed |
| `maintenance/Page.tsx` | `Alert`, `asset`, `isLow` undefined props | Removed |
| `expenses/Page.tsx` | `summary` not passed to `OverviewTab` | Passed |
| `expenses/BudgetsTab.tsx` | `expenses` used but not in props | Prop added + passed from Page |
| `payroll/RecordsTab.tsx` | `payrolls` vs `filteredPayrolls` | Uses `filteredPayrolls` in stats |
| `classrooms/EditClassroomModal.tsx` | `gradeLevels`, `staff` missing | Passed from Page |
| `academic-calendar` | `T={T}`, missing period/component handlers | Handlers passed; `T` removed |
| `staff-portal/AttendanceTab.tsx` | `AnimatePresence` missing import | Imported |
| `staff-portal/LeaveTab.tsx` | `CalendarDays` missing import | Imported |
| `work-orders/Page.tsx` | `isCurrent={isCurrent}` undefined | Removed |
| `exam-details/ResultsModal.tsx` | `generateReportCard` not in props | Prop wired from Page |
| `dashboard/DefaultRoleDashboard.tsx` | recharts + `useNavigate`/`useParams` | Fixed in prior pass |

---

## Feature modules — status

All 19 feature areas checked (**clean**):

| Feature | Page | Component TSX | Status |
|---------|------|--------------:|--------|
| academic-calendar | `Page.tsx` | 6 | ✅ Clean |
| admissions | `Page.tsx` | 2 | ✅ Clean |
| attendance | `Page.tsx` | 2 | ✅ Clean |
| calendar-page | `Page.tsx` | 4 | ✅ Clean |
| classrooms | `Page.tsx` | 8 | ✅ Clean |
| curriculum | `Page.tsx` | 9 | ✅ Clean |
| dashboard | `Page.tsx` | 3 | ✅ Clean |
| exam-details | `Page.tsx` | 2 | ✅ Clean |
| expenses | `Page.tsx` | 9 | ✅ Clean |
| fees | `Page.tsx` | 8 | ✅ Clean |
| maintenance | `Page.tsx` | 8 | ✅ Clean |
| payroll | `Page.tsx` | 5 | ✅ Clean |
| registrar | `Page.tsx` | 10 | ✅ Clean |
| security | `Page.tsx` | 2 | ✅ Clean |
| settings | `Page.tsx` | 5 | ✅ Clean |
| staff-portal | `Page.tsx` | 9 | ✅ Clean |
| student-records | `Page.tsx` | 2 | ✅ Clean |
| students | `Page.tsx` | 2 | ✅ Clean |
| work-orders | `Page.tsx` | 2 | ✅ Clean |

**Recharts consumers verified (imports present):**

- `features/expenses/components/OverviewTab.tsx`
- `features/expenses/components/AnalyticsTab.tsx`
- `features/fees/components/OverviewTab.tsx`
- `features/fees/components/LedgerTab.tsx`
- `features/dashboard/components/DefaultRoleDashboard.tsx`
- `features/dashboard/Page.tsx`
- `features/security/Page.tsx`
- `pages/School/Reports.tsx`
- `pages/School/Transcripts.tsx`

---

## `src/pages/` — status

### School routes (46)

| Page | Type | Status |
|------|------|--------|
| AcademicCalendar | re-export → `features/academic-calendar` | ✅ |
| Admissions | re-export | ✅ |
| AnnouncementManagement | standalone | ✅ |
| Athletics | standalone | ✅ |
| Attendance | re-export | ✅ |
| BusRoutes | standalone | ✅ |
| Cafeteria | standalone | ✅ |
| CalendarPage | re-export | ✅ |
| Children | standalone | ✅ |
| ClassroomFeed | standalone | ✅ |
| ClassroomList | standalone | ✅ |
| Classrooms | re-export | ✅ |
| Clinic | standalone | ✅ |
| Counseling | standalone | ✅ |
| Curriculum | re-export | ✅ |
| Dashboard | re-export | ✅ |
| DocumentManagement | standalone | ✅ |
| Drivers | standalone | ✅ |
| Enrollment | standalone | ✅ |
| ExamDetails | re-export | ✅ |
| Exams | standalone | ✅ |
| Expenses | re-export | ✅ |
| Fees | re-export | ✅ |
| GradeReview | standalone | ✅ |
| GradeSheet | standalone | ✅ |
| Hostel | standalone | ✅ |
| Inventory | standalone | ✅ |
| LeaveApproval | standalone | ✅ |
| Library | standalone | ✅ |
| Maintenance | re-export | ✅ |
| Payroll | re-export | ✅ |
| Procurement | standalone | ✅ |
| Profile | standalone | ✅ |
| Registrar | re-export | ✅ |
| ReportCard | standalone | ✅ |
| Reports | standalone (recharts) | ✅ |
| Security | re-export | ✅ |
| Settings | re-export | ✅ |
| StaffManagement | standalone | ✅ |
| StaffPortal | re-export | ✅ |
| StudentGrades | standalone | ✅ |
| StudentRecords | re-export | ✅ |
| Students | re-export | ✅ |
| Transcripts | standalone (recharts) | ✅ |
| Transportation | standalone | ✅ |
| VehicleMaintenance | standalone | ✅ |
| WorkOrders | re-export | ✅ |

### Super Admin (6) + Login (1)

| Page | Status |
|------|--------|
| SuperAdmin/Dashboard | ✅ Clean |
| SuperAdmin/Logs | ✅ Clean |
| SuperAdmin/Reports | ✅ Clean |
| SuperAdmin/Schools | ✅ Clean |
| SuperAdmin/Settings | ✅ Clean |
| SuperAdmin/Users | ✅ Clean |
| Login | ✅ Clean |

---

## `src/components/` — status

| File | Status |
|------|--------|
| AvatarGroup.tsx | ✅ Clean |
| CreateClassroomModal.tsx | ✅ Clean |
| GlobalSearch.tsx | ✅ Clean |
| GradeSheetTemplates.tsx | ✅ Clean |
| JoinClassroomModal.tsx | ✅ Clean |
| Layout.tsx | ✅ Clean |
| PageSkeleton.tsx | ✅ Clean |
| ProtectedRoute.tsx | ✅ Clean |
| ReportCardTemplates.tsx | ✅ Clean |
| RichTextEditor.tsx | ✅ Clean |

---

## Non-breaking notes (dead code / hygiene)

These do **not** crash at runtime but are leftover from Page.tsx extractions:

| File | Note |
|------|------|
| `expenses/components/ExpensesChrome.tsx` | Props `File`, `Re`, `T` declared/destructured but unused; `AnimatePresence` imported but unused |
| `expenses/components/OverviewTab.tsx` | Props `L`, `P` unused |
| `payroll/components/RecordsTab.tsx` | Prop `S` unused; `payrolls` prop declared but body uses `filteredPayrolls` |
| `payroll/components/PayslipDrawer.tsx` | Prop `Card` unused |
| `calendar-page/components/CalendarMainGrid.tsx` | Props `Calendar`, `Days` unused (uses `CalendarDays` icon instead) |
| `calendar-page/components/HeaderAndFilters.tsx` | Prop `Calendar` unused |

Safe to remove in a follow-up cleanup PR.

---

## How to re-run this audit

```bash
python3 scripts/check_missing_imports.py
npm run lint
npm run build
```

Expected output when clean: `"broken_count": 0` from the Python script; zero errors from `tsc` and `vite build`.
