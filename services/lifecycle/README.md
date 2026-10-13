# Student Lifecycle (`@sms/lifecycle`)

**Owns:** `AdmissionApplication`, `Attendance`, `AttendanceRecord`.

**Replaces (eventually):** monolith `admissionController` / `admissionService`, `attendanceController` / `attendanceService`.

**Status:** Phase 3 **scaffold only**. Handlers return `501`. Monolith routes are **unchanged** and still serve production traffic.

## What this package is

A parallel Express service that mounts the same path surface as the monolith:

| Method | Path |
| :--- | :--- |
| GET/POST | `/api/schools/:schoolId/applications` |
| PATCH | `/api/applications/:id` |
| GET/POST | `/api/schools/:schoolId/attendance` |
| GET | `/api/schools/:schoolId/attendance/stats` |
| GET | `/api/attendance/:id` |

Plus `/health/live` and `/health/ready`. Default listen port: **3010**.

## Stub vs full port

| Area | State |
| :--- | :--- |
| Express app + route table | **Present** (same paths as monolith) |
| Auth / tenant middleware | **Stub** (passthrough) — see `src/middleware/auth.ts`; real logic stays in monolith / Identity |
| Controllers | **Stub** — `501` with cutover message |
| Domain services | **Stub** — throw until prisma is wired; TODOs point at monolith files |
| Prisma schema | **Present** — three owned models; cross-domain IDs are plain `String` UUIDs (no School/User/Classroom/GradeLevel relations) |
| Prisma client | **Not wired** — `src/lib/prisma.ts` is a placeholder |

Enrollment-side effects (creating `User` / `ParentStudent` on `ENROLLED`) must **not** be copied into this service; they become Identity events/APIs on cutover.

## Local run

```bash
cd services/lifecycle
npm install
npm run dev
# → http://localhost:3010/health/live
```

## Cutover via gateway

1. Keep monolith admissions/attendance routes live (current state).
2. Wire prisma (`DATABASE_URL` → `lifecycle` schema), port services, replace auth stubs with Identity service tokens.
3. Point the gateway (see `services/gateway`) suffix rules at this service:
   - prefix `/api/applications`, `/api/attendance`
   - suffix `/api/schools/:schoolId/{applications,attendance}`
4. Verify traffic (shadow or percentage split).
5. Only then remove the routes from the monolith (`src/server/routes/admissionRoutes.ts`, `attendanceRoutes.ts`).

See `MICROSERVICES_ROADMAP.md` §3 (routing) and §12 Phase 3.
