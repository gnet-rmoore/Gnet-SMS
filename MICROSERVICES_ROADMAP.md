# School Management Portal: Microservices Transition Roadmap & Architecture Guide

> **Status (current architecture): this document is a future-state proposal, not the running system.**
> The running system uses **PostgreSQL only** (no SQLite). Compose runs one Postgres cluster with schema-per-service; the monolith keeps tables in `public` during the strangler. See `Dockerfile`, `docker-compose.yml`, and `k8s/base/`.

>
> **Implementation progress:** Phase 0 hardening + gateway/lifecycle scaffolds have started. Track what has landed in [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md).
>
> This revision grounds every recommendation below in the **actual code** — real route paths, real Prisma models, real dependencies — instead of a generic microservices template, so the plan is directly implementable against this repository.

---

## 0. Current-State Architecture Snapshot

Before splitting anything, this is what exists today. Every later section refers back to these facts.

| Aspect | Current reality |
| :--- | :--- |
| Runtime | One Node.js/Express process (`src/server/app.ts`), built with `esbuild` to `dist/server.cjs`, launched by `server.ts`. |
| Frontend | React 19 + Vite SPA, served by the same process in dev (Vite middleware) and by a separate Nginx container in prod (`Dockerfile.frontend`). |
| Data layer | **PostgreSQL only** — monolith Prisma schema uses `provider = "postgresql"` + multiSchema (`public` + domain schemas). Extracted services each use their named schema. SQLite is not supported. |

| Multi-tenancy | Single shared database, tenant-scoped by a `schoolId` foreign key on almost every table (`User`, `Classroom`, `Attendance`, `Exam`, `Payroll`, `FeePayment`, etc.), all pointing back to one `School` row. This is **row-level multi-tenancy in a shared schema**, not database-per-tenant. |
| Auth | Two JWT secrets: `JWT_ACCESS_SECRET` for normal school-scoped users, `SUPER_ADMIN_JWT_SECRET` for the platform Super Admin. `src/server/middleware/auth.ts` tries the access secret first, falls back to the super-admin secret only when `role === "SUPER_ADMIN"`. Tokens are 8h, stateless (no server-side session/refresh-token store). |
| Real-time | `socket.io` runs inside the same process as the HTTP server (`server.ts`), used for classroom live features (`join-classroom` room). No Redis adapter is configured, so it **only works correctly with a single replica** today. |
| Routing style | Routes are **resource-oriented**, not domain-prefixed — e.g. `/api/schools/:schoolId/attendance`, `/api/classrooms/:id/grades`, `/api/students/:studentId/grades`, `/api/users/:userId/payrolls`. There is no existing `/api/<domain>/*` convention to route a gateway on. See §3 for the full inventory and why this matters.
| "Present but unused" dependencies | `package.json` already includes `bullmq`, `ioredis`, `firebase-admin`, `nodemailer`, `@aws-sdk/client-s3`, `node-cron`, and `puppeteer` — **none of these are imported anywhere in `src/`** today. They represent planned integrations (queues, push notifications, email, file storage, scheduled jobs, PDF generation) that should be built out as part of this roadmap rather than replaced with new tooling. |
| Observability | `console.log` request logging only. No structured logger (no `pino`/`winston`), no metrics endpoint (no `prom-client`), no tracing, no rate limiting (no `express-rate-limit`). `helmet` is enabled but `contentSecurityPolicy: false`. |
| Deployable units today | Exactly two: `sms-api` (`k8s/base/sms-api.yaml`) and `frontend-spa` (`k8s/base/frontend-spa.yaml`). `k8s/overlays/production/kustomization.yaml` references only these two. **No `Ingress`, `ConfigMap`, or `Secret` manifest exists in the repo yet** — `sms-api.yaml` already references `school-global-config` and `school-app-secrets`, which must be created before any of this is deployable as-is. |
| CI/CD today | `.github/workflows/deploy.yml` builds exactly two images (`sms-api`, `frontend-spa`) and deploys them to GKE via `kustomize`. |

**Implication:** the domain split proposed below is a *target*, not a description of code that exists. Every service boundary, database, and route prefix mentioned from here on is something to be built, in the phased order given in §12.

---

## 1. Should You Actually Split This Into Microservices?

Be honest about the trade-off before committing months of migration work.

**Arguments for splitting**, specific to this codebase:
- `src/server` already has 16 well-separated route/controller/service triads (`academic`, `admission`, `announcement`, `attendance`, `auth`, `classroom`, `document`, `exam`, `finance`, `logistics`, `payroll`, `school`, `staff`, `superAdmin`, `user`) — the domain seams already exist in code, which is the hard prerequisite for a clean split.
- Fee collection (`financeRoutes`), payroll, and classroom real-time traffic have very different scaling and availability profiles; today they all share fate in one deployment.
- A single Prisma client/connection pool serves every request; a spike in report-card PDF generation or grade processing can starve unrelated traffic (e.g. login, attendance check-in).

**Arguments against splitting right now:**
- The database is genuinely relational and cross-domain: `GradeEntry` joins `Exam`, `Classroom`, and `User`; `Payroll` joins `User`; `Attendance` joins `Classroom` and `User`. Splitting databases without first proving the read patterns tolerate eventual consistency will produce correctness bugs (see §4).
- There is currently **one team and one deployable unit**. Microservices trade development simplicity for independent deployability and fault isolation — that trade only pays off once a single team's velocity is actually blocked by the monolith, or once distinct scaling/on-call needs emerge.
- No observability stack, no service mesh, no contract testing exists yet. Standing up 8 independently deployed services without those first will make debugging materially harder than it is today.

**Recommendation:** treat this roadmap as a **staged plan**, not a rewrite:
1. Harden the monolith first (§8 Observability, §9 Security) — this pays off regardless of the end state.
2. Introduce internal module boundaries and a schema-per-service database layout *inside the current single process and single Postgres instance* (§4) — this is close to free and de-risks the later network split.
3. Only extract a service to its own deployable/database once it has a concrete, named reason (independent scaling, independent release cadence, or a different runtime need) — start with the single best candidate identified in §12, prove the pattern, then repeat.

If the business requirement is "we must be able to scale/deploy/on-call these domains independently," proceed with the full plan below. If the requirement is "the codebase feels big," step 1–2 alone will solve most of the pain at a fraction of the cost.

---

## 2. Target Service Boundaries

Boundaries below are derived directly from the current controllers and Prisma models — not invented from a generic template — and deliberately consolidated into **8 services** (not 16) to avoid a "nanoservice" anti-pattern where operational overhead exceeds the benefit of splitting.

All services are proposed in **Node.js + TypeScript + Express + Prisma**, matching the existing codebase, so the team ships the first extraction with zero new language/runtime risk. Polyglot rewrites (e.g. Go for a hot path) are a valid *later* optimization once a service has a proven, measured need — not a day-one requirement.

| # | Service | Owns (Prisma models) | Replaces these controllers/routes | Notes |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Identity & Platform** | `User`, `ParentStudent`, `School`, `SystemLog`, `SystemCredential` | `authController`, `userController`, `schoolController`, `superAdminController` | Mints both JWT types (§9). Owns the tenant (`School`) directory and the Super Admin console backend. |
| 2 | **Academic & Grading** | `AcademicCalendarPattern`, `AcademicPeriod`, `Subject`, `GradeLevel`, `SyllabusPlan`, `ExamComponent`, `Exam`, `GradeEntry`, `GradeHistory`, `PeriodGradeSummary`, `AnnualGradeSummary`, `GradeLegend`, `GradeScale` | `academicController`, `examController`, `calendarController` | The largest domain; grading stays here even though classrooms and student profiles both surface grades (see cross-domain reads in §5). |
| 3 | **Classroom & Collaboration** | `Classroom`, `ClassroomMember`, `ClassroomPost`, `PostAttachment`, `PostComment`, `Submission`, `SubmissionAttachment`, `ClassroomTopic`, `ClassroomMeeting` | `classroomController` | Owns the Socket.IO real-time gateway; requires a Redis adapter the moment it runs more than one replica (§5). |
| 4 | **Student Lifecycle** | `AdmissionApplication`, `Attendance`, `AttendanceRecord` | `admissionController`, `attendanceController` | Grouped because both track a student's progression (applicant → enrolled → present/absent) and are both comparatively high-write, low-relational-complexity domains — good first extraction candidate (§12). |
| 5 | **Staff & Workforce** | `LeaveRequest`, `StaffTask`, `StaffAttendance`, `Payroll` | `staffController`, `payrollController` | HR-adjacent; payroll's strict-transaction needs (§4) make this a later, not first, extraction. |
| 6 | **Finance & Billing** | `FeePayment`, `Expense` | `financeController` | Strongest consistency requirements in the system (money movement) — extract only after the event-sourcing/outbox pattern in §5 is proven elsewhere. |
| 7 | **Operations & Facilities** | `Vehicle`, `VehicleMaintenance`, `WorkOrder`, `InventoryItem`, `SecurityLog`, `Requisition` | `logisticsController` | `Requisition` exists in `schema.prisma` today but has **no route/controller wired up** — build the API as part of this service rather than leaving it dead code. |
| 8 | **Communications & Documents** | `Announcement`, `SchoolDocument` | `announcementController`, `documentController` | Natural home for the unused `nodemailer`/`firebase-admin`/`@aws-sdk/client-s3` dependencies — this is where email, push notifications, and S3-backed document storage should actually get wired up. |

Two things intentionally **not** turned into services:
- **API Gateway / BFF** — a thin Node/Express (or Envoy) layer terminating auth and routing; not a domain owner, described in §3.
- **Frontend SPA** — already its own deployable (`frontend-spa`), unchanged by this migration.

### Updated System Diagram

*(Static fallback if your viewer does not render Mermaid inline:)*
![System Architecture Diagram](https://mermaid.ink/img/Z3JhcGggVEQKICAgIENsaWVudFtXZWIgYW5kIE1vYmlsZSBDbGllbnRzXSAtLT58SFRUUFN8IEluZ3Jlc3NbSW5ncmVzcyBDb250cm9sbGVyXQogICAgSW5ncmVzcyAtLT4gR2F0ZXdheVtBUEkgR2F0ZXdheSAvIEJGRl0KCiAgICBHYXRld2F5IC0tPnxhdXRoLCB1c2Vycywgc2Nob29scywgc3VwZXItYWRtaW58IElkZW50aXR5U2VydmljZVsxLiBJZGVudGl0eSBhbmQgUGxhdGZvcm1dCiAgICBHYXRld2F5IC0tPnxzdWJqZWN0cywgZXhhbXMsIHBlcmlvZHMsIGNhbGVuZGFyfCBBY2FkZW1pY1NlcnZpY2VbMi4gQWNhZGVtaWMgYW5kIEdyYWRpbmddCiAgICBHYXRld2F5IC0tPnxjbGFzc3Jvb21zfCBDbGFzc3Jvb21TZXJ2aWNlWzMuIENsYXNzcm9vbSBhbmQgQ29sbGFib3JhdGlvbl0KICAgIEdhdGV3YXkgLS0-fGFwcGxpY2F0aW9ucywgYXR0ZW5kYW5jZXwgTGlmZWN5Y2xlU2VydmljZVs0LiBTdHVkZW50IExpZmVjeWNsZV0KICAgIEdhdGV3YXkgLS0-fHN0YWZmLCBsZWF2ZSwgcGF5cm9sbHwgU3RhZmZTZXJ2aWNlWzUuIFN0YWZmIGFuZCBXb3JrZm9yY2VdCiAgICBHYXRld2F5IC0tPnxmZWVzLCBleHBlbnNlc3wgRmluYW5jZVNlcnZpY2VbNi4gRmluYW5jZSBhbmQgQmlsbGluZ10KICAgIEdhdGV3YXkgLS0-fHZlaGljbGVzLCBpbnZlbnRvcnksIHdvcmsgb3JkZXJzfCBPcHNTZXJ2aWNlWzcuIE9wZXJhdGlvbnMgYW5kIEZhY2lsaXRpZXNdCiAgICBHYXRld2F5IC0tPnxhbm5vdW5jZW1lbnRzLCBkb2N1bWVudHN8IENvbW1zU2VydmljZVs4LiBDb21tdW5pY2F0aW9ucyBhbmQgRG9jdW1lbnRzXQoKICAgIElkZW50aXR5U2VydmljZSAtLT4gUEdbKFBvc3RncmVTUUw6IG9uZSBjbHVzdGVyLCBzY2hlbWEgcGVyIHNlcnZpY2UpXQogICAgQWNhZGVtaWNTZXJ2aWNlIC0tPiBQRwogICAgQ2xhc3Nyb29tU2VydmljZSAtLT4gUEcKICAgIExpZmVjeWNsZVNlcnZpY2UgLS0-IFBHCiAgICBTdGFmZlNlcnZpY2UgLS0-IFBHCiAgICBGaW5hbmNlU2VydmljZSAtLT4gUEcKICAgIE9wc1NlcnZpY2UgLS0-IFBHCiAgICBDb21tc1NlcnZpY2UgLS0-IFBHCgogICAgQWNhZGVtaWNTZXJ2aWNlIC0uLT58ZXZlbnRzfCBFdmVudEJ1c1tbUmVkaXMgU3RyZWFtcyAvIEJ1bGxNUV1dCiAgICBMaWZlY3ljbGVTZXJ2aWNlIC0uLT58ZXZlbnRzfCBFdmVudEJ1cwogICAgU3RhZmZTZXJ2aWNlIC0uLT58ZXZlbnRzfCBFdmVudEJ1cwogICAgRmluYW5jZVNlcnZpY2UgLS4tPnxldmVudHN8IEV2ZW50QnVzCiAgICBFdmVudEJ1cyAtLi0-fGNvbnN1bWV8IENvbW1zU2VydmljZQogICAgQ2xhc3Nyb29tU2VydmljZSA8LS0-fFNvY2tldC5JTyBhZGFwdGVyfCBSZWFsdGltZVJlZGlzWyhSZWRpcyBQdWIvU3ViKV0=)

```mermaid
graph TD
    Client[Web and Mobile Clients] -->|HTTPS| Ingress[Ingress Controller]
    Ingress --> Gateway[API Gateway / BFF]

    Gateway -->|auth, users, schools, super-admin| IdentityService[1. Identity and Platform]
    Gateway -->|subjects, exams, periods, calendar| AcademicService[2. Academic and Grading]
    Gateway -->|classrooms| ClassroomService[3. Classroom and Collaboration]
    Gateway -->|applications, attendance| LifecycleService[4. Student Lifecycle]
    Gateway -->|staff, leave, payroll| StaffService[5. Staff and Workforce]
    Gateway -->|fees, expenses| FinanceService[6. Finance and Billing]
    Gateway -->|vehicles, inventory, work orders| OpsService[7. Operations and Facilities]
    Gateway -->|announcements, documents| CommsService[8. Communications and Documents]

    IdentityService --> PG[(PostgreSQL: one cluster, schema per service)]
    AcademicService --> PG
    ClassroomService --> PG
    LifecycleService --> PG
    StaffService --> PG
    FinanceService --> PG
    OpsService --> PG
    CommsService --> PG

    AcademicService -.->|events| EventBus[[Redis Streams / BullMQ]]
    LifecycleService -.->|events| EventBus
    StaffService -.->|events| EventBus
    FinanceService -.->|events| EventBus
    EventBus -.->|consume| CommsService
    ClassroomService <-->|Socket.IO adapter| RealtimeRedis[(Redis Pub/Sub)]
```

Note the deliberate change from earlier drafts of this document: **Kafka/RabbitMQ is not proposed.** `ioredis` and `bullmq` are already dependencies of this project and unused — Redis Streams via BullMQ gives durable, retryable async jobs with a fraction of the operational cost of running a Kafka cluster, and is the pragmatic choice for this scale. Revisit Kafka only if a specific service later needs multi-consumer-group fan-out or >10k events/sec sustained throughput.

---

## 3. API Gateway & Routing Reality

This is the section most previous drafts of this document got wrong: **the current API is not domain-prefixed.** A gateway that routes purely on `/api/<domain>/*` will not work against the real route table. Below is the actual inventory (grep'd from `src/server/routes/*.ts`) mapped to its target service.

| Current route (as implemented today) | Target service | Gateway rule needed |
| :--- | :--- | :--- |
| `POST /api/auth/login`, `POST /api/super-admin/auth/login` | Identity & Platform | exact match |
| `GET/PATCH /api/users/:userId`, `/api/parents/:parentId/children`, `/api/schools/:schoolId/staff`, `/api/schools/:schoolId/students` | Identity & Platform | prefix `/api/users`, `/api/parents`; **suffix match** for `/api/schools/:schoolId/staff` and `/api/schools/:schoolId/students` |
| `/api/schools/:schoolId` (root + `/stats`), `/api/super-admin/schools*`, `/api/super-admin/users`, `/api/super-admin/credentials*`, `/api/super-admin/logs`, `/api/super-admin/stats` | Identity & Platform | prefix `/api/super-admin`; exact + suffix rules for `/api/schools/:schoolId` |
| `/api/schools/:schoolId/subjects`, `/api/subjects/:id`, `/api/schools/:schoolId/grade-levels*`, `/api/grade-levels/:id`, `/api/periods/:id`, `/api/periods/:periodId/exam-components`, `/api/exam-components/:id`, `/api/schools/:schoolId/syllabi*`, `/api/syllabi/:id`, `/api/schools/:schoolId/grade-legends*`, `/api/schools/:schoolId/calendar*`, `/api/calendar/events` | Academic & Grading | prefix `/api/subjects`, `/api/grade-levels`, `/api/periods`, `/api/exam-components`, `/api/syllabi`, `/api/calendar`; suffix `/api/schools/:schoolId/{subjects,grade-levels,syllabi,grade-legends,calendar}` |
| `/api/schools/:schoolId/exams`, `/api/exams/:id*`, `/api/grade-entries/:id`, `/api/schools/:schoolId/grades/pending` | Academic & Grading | prefix `/api/exams`, `/api/grade-entries`; suffix `/api/schools/:schoolId/{exams,grades/pending}` |
| `/api/classrooms*` (including `/:id/grades`, `/:id/posts`, `/:id/members`), `/api/schools/:schoolId/classrooms` | Classroom & Collaboration | prefix `/api/classrooms`; suffix `/api/schools/:schoolId/classrooms` |
| `/api/schools/:schoolId/applications`, `/api/applications/:id` | Student Lifecycle | prefix `/api/applications`; suffix `/api/schools/:schoolId/applications` |
| `/api/schools/:schoolId/attendance*`, `/api/attendance/:id` | Student Lifecycle | prefix `/api/attendance`; suffix `/api/schools/:schoolId/attendance` |
| `/api/schools/:schoolId/leave-requests`, `/api/leave-requests/:id`, `/api/schools/:schoolId/staff-tasks`, `/api/staff-tasks/:id`, `/api/schools/:schoolId/staff-attendance` | Staff & Workforce | prefix `/api/leave-requests`, `/api/staff-tasks`; suffix `/api/schools/:schoolId/{leave-requests,staff-tasks,staff-attendance}` |
| `/api/schools/:schoolId/payrolls`, `/api/payrolls/:id`, `/api/users/:userId/payrolls` | Staff & Workforce | prefix `/api/payrolls`; suffix `/api/schools/:schoolId/payrolls` and `/api/users/:userId/payrolls` (cross-domain, see §5) |
| `/api/schools/:schoolId/fees*`, `/api/fees/:id/{pay,remind}`, `/api/schools/:schoolId/expenses*`, `/api/schools/:schoolId/finance/summary` | Finance & Billing | prefix `/api/fees`; suffix `/api/schools/:schoolId/{fees,expenses,finance}` |
| `/api/schools/:schoolId/vehicles`, `/api/schools/:schoolId/inventory`, `/api/inventory/:id`, `/api/schools/:schoolId/work-orders`, `/api/work-orders/:id`, `/api/schools/:schoolId/security-logs` | Operations & Facilities | prefix `/api/inventory`, `/api/work-orders`; suffix `/api/schools/:schoolId/{vehicles,inventory,work-orders,security-logs}` |
| `/api/schools/:schoolId/announcements`, `/api/announcements/:id`, `/api/schools/:schoolId/documents`, `/api/documents/:id` | Communications & Documents | prefix `/api/announcements`, `/api/documents`; suffix `/api/schools/:schoolId/{announcements,documents}` |

**Cross-domain routes that need special handling** — these already live in one controller today but return data owned by another target service:
- `GET /api/students/:studentId/grades` (currently in `userController`) → Identity owns the route, but the payload is Academic & Grading data. Keep the route on the Identity/BFF layer and have it call Academic & Grading internally, or move the route to Academic & Grading and have the frontend call it directly (preferred — see §5).
- `GET/POST /api/classrooms/:id/grades` (currently in `classroomController`) → same pattern between Classroom and Academic & Grading.
- `GET /api/users/:userId/payrolls` (currently in `payrollController`) → Staff & Workforce data, addressed via a `userId` that only Identity can fully resolve.

**Recommendation:**
1. Stand up the gateway to match the **suffix-aware rules above** against the existing paths — do not rename any client-facing route yet, since `src/services/*.ts` on the frontend already calls these exact paths.
2. In parallel, start versioning new endpoints under `/api/v1/<service>/...` so that six months from now the gateway config collapses back down to simple prefix matching. Migrate old paths opportunistically as each screen is touched, not in a single breaking rename.
3. Implement the gateway as a thin Express (or `http-proxy-middleware`) app first — it is one more Node service the team already knows how to operate. Move to Envoy/Kong only if a concrete need (e.g. WASM plugins, gRPC) appears.

---

## 4. Data Ownership & the Shared-Database Problem

This is the highest-risk part of the migration and the part most glossed over in generic microservices guides. `schema.prisma` today has 40+ models in one database, and the foreign keys cross the proposed service boundaries constantly:

| Relationship | Crosses services | Risk if naively split |
| :--- | :--- | :--- |
| `GradeEntry` → `Exam`, `Classroom`, `User` (student) | Academic & Grading ↔ Classroom ↔ Identity | Grade entry needs to validate the classroom roster and the student identity synchronously today via a SQL join; after the split this becomes 2 extra network calls per write, or a locally cached read-model. |
| `Attendance`/`AttendanceRecord` → `Classroom`, `User` | Student Lifecycle ↔ Classroom ↔ Identity | Same pattern — daily roll call needs the current roster. |
| `Payroll`, `LeaveRequest`, `StaffAttendance` → `User` | Staff & Workforce ↔ Identity | Every staff record needs `User.name`/`role` for display; without it every payroll list view needs an N+1 call to Identity. |
| `FeePayment`, `Expense` → `School`, `User` | Finance & Billing ↔ Identity | Money-movement audit trails must never silently lose the "who" — this is the domain where eventual consistency is least acceptable. |
| `Announcement`, `SchoolDocument`, every domain table → `School` | Every service ↔ Identity | `School` (the tenant) is the one row every other service needs to validate tenancy on every request. |

### Phased data strategy (do not jump straight to "one database per service")

**Phase A — Schema-per-service, same Postgres cluster (low risk, do this first):**
- Keep one Postgres instance. Create one schema per service (`identity`, `academic`, `classroom`, `lifecycle`, `staff`, `finance`, `ops`, `comms`).
- Give each service its own Prisma schema file and its own DB role/credentials scoped to `GRANT` access to only its schema — this is enforced logical isolation without the operational cost of N database clusters. **Implemented:** `docker/postgres/init-schemas.sql` + compose `db-roles` + per-service `DATABASE_URL` / K8s `*-db-secret` (roles `sms_<schema>`).
- Cross-schema foreign keys (e.g. `GradeEntry.classroomId`) become **plain UUID columns with no DB-level FK constraint** — referential integrity moves from the database to application code + events. This is the actual moment the monolith "becomes" microservices-ready; do it carefully and test it thoroughly before touching deployment topology at all.
- Tenant validation (`schoolId` belongs to a real, active `School`) becomes each service's own responsibility, checked via a call to Identity or a cached copy of the tenant list (tenant count is small — cache aggressively, invalidate on `school.updated` events).

**Phase B — Read models via events, not synchronous joins:**
- Every service that needs a denormalized slice of another service's data (e.g. Academic & Grading needs `{userId, name, role}` for every student) subscribes to that owner's change events (§5) and maintains its own small, purpose-built read table. This is the standard microservices answer to "I need a join across service boundaries."
- Concretely: Identity publishes `user.created` / `user.updated` / `user.deleted`; Academic & Grading, Classroom, Staff & Workforce, and Finance & Billing each keep a minimal `UserRef(id, name, role, schoolId)` table populated from these events instead of calling Identity synchronously on every read.

**Phase C — Physical database separation (only for services that need it):**
- Once Phase A/B are stable, move a service's schema to its own Postgres instance only when there's a concrete driver: independent scaling, independent backup/retention policy, or a compliance boundary (Finance & Billing is the most likely candidate given audit requirements).
- Do this one service at a time using `pg_dump`/logical replication to cut over with near-zero downtime, never as a big-bang migration.

---

## 5. Inter-Service Communication

### Synchronous (request/response)
- Internal service-to-service HTTP calls use a short-lived **service JWT** signed by Identity (separate signing key from the two user-facing secrets), so every service can verify caller identity without a shared secret sprawl.
- Wrap all internal calls in a small shared `@sms/service-client` package (timeout, retry-with-jitter, circuit breaker via `opossum` or hand-rolled) — without this, one slow service will cascade into every caller.

### Asynchronous (events) — use what's already installed
The project already depends on `ioredis` and `bullmq`; use **Redis Streams via BullMQ** as the event bus rather than introducing Kafka/RabbitMQ. Suggested initial event catalog:

| Event | Producer | Consumers | Payload |
| :--- | :--- | :--- | :--- |
| `user.created` / `user.updated` / `user.deleted` | Identity & Platform | Academic & Grading, Classroom, Staff & Workforce, Finance & Billing | `{ id, name, role, schoolId }` |
| `school.updated` (status change, e.g. suspended) | Identity & Platform | all services | `{ schoolId, status }` |
| `exam.results-released` | Academic & Grading | Communications & Documents | `{ examId, schoolId, classroomIds[] }` — triggers report-card email/push |
| `attendance.recorded` | Student Lifecycle | Communications & Documents | `{ studentId, status, date }` — triggers absence notification to parents |
| `fee.collected` / `fee.overdue` | Finance & Billing | Communications & Documents | `{ feeId, studentId, amount, dueDate }` — triggers receipt/reminder |
| `leave-request.approved` / `.rejected` | Staff & Workforce | Communications & Documents | `{ requestId, staffId, status }` |

Each consumer processes events via a BullMQ worker with a dead-letter queue for failed jobs — this is the natural place to finally wire up the currently-unused `nodemailer` (email), `firebase-admin` (push), and `@aws-sdk/client-s3` (attachments/report-card PDFs generated with the already-installed `puppeteer`) dependencies.

### Real-time (Socket.IO)
Classroom & Collaboration owns the Socket.IO gateway. The moment it runs more than one pod, **it must use `@socket.io/redis-adapter`** so `join-classroom` rooms are shared across replicas — this is not implemented today and will silently break real-time delivery under any horizontal scaling, so treat it as a blocking prerequisite for that service's HPA (§7), not an optional enhancement.

---

## 6. Dockerization Blueprint (per service)

Match the pattern already proven in the repo's own `Dockerfile` (esbuild bundling + Prisma generate against a placeholder URL), rather than a generic template — this is what actually builds correctly against this codebase's Prisma dual-provider setup.

```dockerfile
# services/<service-name>/Dockerfile
# --- Stage 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY services/<service-name>/package.json services/<service-name>/package-lock.json ./
RUN npm ci

COPY services/<service-name>/prisma ./prisma
COPY services/<service-name>/src ./src
COPY services/<service-name>/tsconfig.json ./

ENV NODE_ENV=production
ENV DATABASE_PROVIDER=postgresql
# Placeholder so `prisma generate` can run at build time without a live DB
ENV DATABASE_URL=postgresql://build:build@localhost:5432/placeholder?schema=<service-name>
RUN npx prisma generate \
  && npx esbuild src/server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs

# --- Stage 2: Runtime ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY services/<service-name>/package.json services/<service-name>/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health/live || exit 1

CMD ["node", "dist/server.cjs"]
```

Proposed monorepo layout to support this (extend, don't discard, the current single-package layout):

```
services/
  identity/          (package.json, prisma/, src/, Dockerfile)
  academic/
  classroom/
  lifecycle/
  staff/
  finance/
  ops/
  comms/
  gateway/
packages/
  service-client/    (shared HTTP client: retry, circuit breaker, service-JWT signing)
  event-bus/         (shared BullMQ producer/consumer wrappers + typed event catalog from §5)
frontend/            (current src/pages, src/components, src/store — unchanged)
k8s/
  base/<service-name>/
  overlays/{staging,production}/
```

The frontend (`Dockerfile.frontend`) and its Nginx config do not need to change for this migration — only the API surface it talks to (via the gateway) changes.

---

## 7. Kubernetes Deployment Architecture

The current `k8s/` directory is missing several resources required to actually run this in production; this section provides them, plus the per-service template.

#### Pod & Scaling Layout

![Pod and Scaling Layout Diagram](https://mermaid.ink/img/Zmxvd2NoYXJ0IExSCiAgICBJbmdyZXNzW0luZ3Jlc3MgQ29udHJvbGxlcl0gLS0-fHJvdXRpbmcgcnVsZXN8IFN2Y1tDbHVzdGVySVAgU2VydmljZV0KICAgIFN2YyAtLT58TG9hZCBiYWxhbmNpbmd8IFBvZHNbRGVwbG95bWVudDogUG9kIFJlcGxpY2EgMV0KICAgIFN2YyAtLT58TG9hZCBiYWxhbmNpbmd8IFBvZHMyW0RlcGxveW1lbnQ6IFBvZCBSZXBsaWNhIDJdCiAgICBQb2RzIC0uLT4gQ29uZmlnW0NvbmZpZ01hcCAvIFNlY3JldF0KICAgIFBvZHMgLS4tPiBIUEFbSG9yaXpvbnRhbCBQb2QgQXV0b3NjYWxlcl0)

```mermaid
flowchart LR
    Ingress[Ingress Controller] -->|routing rules| Svc[ClusterIP Service]
    Svc -->|Load balancing| Pods[Deployment: Pod Replica 1]
    Svc -->|Load balancing| Pods2[Deployment: Pod Replica 2]

    Pods -.-> Config[ConfigMap / Secret]
    Pods -.-> HPA[Horizontal Pod Autoscaler]
```

### Missing prerequisites (create these before any service manifest below will apply cleanly)

```yaml
# k8s/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: school-portal
---
# k8s/base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: school-global-config
  namespace: school-portal
data:
  NODE_ENV: "production"
  APP_URL: "https://app.example.com"
  DATABASE_PROVIDER: "postgresql"
```

```yaml
# k8s/base/secrets.yaml — DO NOT commit real values; manage via Sealed Secrets or
# External Secrets Operator pulling from GCP Secret Manager / AWS Secrets Manager.
# This file documents the *shape* only.
apiVersion: v1
kind: Secret
metadata:
  name: school-app-secrets
  namespace: school-portal
type: Opaque
stringData:
  JWT_ACCESS_SECRET: "REPLACE_ME"
  SUPER_ADMIN_JWT_SECRET: "REPLACE_ME"
  SERVICE_JWT_SIGNING_KEY: "REPLACE_ME"
  DATABASE_URL: "REPLACE_ME"
  REDIS_URL: "REPLACE_ME"
```

```yaml
# k8s/base/ingress.yaml — there is no Ingress in the repo today; this is required
# for the "Ingress -> Gateway" hop in every diagram in this document to exist.
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: school-portal-ingress
  namespace: school-portal
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts: ["app.example.com"]
      secretName: school-portal-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api/
            pathType: Prefix
            backend:
              service: { name: api-gateway, port: { number: 80 } }
          - path: /
            pathType: Prefix
            backend:
              service: { name: frontend-spa, port: { number: 80 } }
```

### Per-service manifest template (example: Academic & Grading Service)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: academic-service
  namespace: school-portal
  labels:
    app: academic-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: academic-service
  template:
    metadata:
      labels:
        app: academic-service
    spec:
      containers:
        - name: academic-service
          image: us-central1-docker.pkg.dev/PROJECT_ID/school-portal-images/academic-service:latest
          ports:
            - containerPort: 3000
          resources:
            limits: { cpu: "500m", memory: "512Mi" }
            requests: { cpu: "250m", memory: "256Mi" }
          envFrom:
            - configMapRef: { name: school-global-config }
          env:
            - name: SERVICE_NAME
              value: academic-service
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef: { name: academic-db-secret, key: DATABASE_URL }
            - name: REDIS_URL
              valueFrom:
                secretKeyRef: { name: school-app-secrets, key: REDIS_URL }
            - name: SERVICE_JWT_SIGNING_KEY
              valueFrom:
                secretKeyRef: { name: school-app-secrets, key: SERVICE_JWT_SIGNING_KEY }
          livenessProbe:
            httpGet: { path: /health/live, port: 3000 }
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet: { path: /health/ready, port: 3000 }
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: academic-service
  namespace: school-portal
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 3000
  selector:
    app: academic-service
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: academic-service-hpa
  namespace: school-portal
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: academic-service }
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 75 } }
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: academic-service-pdb
  namespace: school-portal
spec:
  minAvailable: 1
  selector:
    matchLabels: { app: academic-service }
```

Note `/health/live` vs `/health/ready` as **two distinct endpoints per service** — liveness should only fail on an unrecoverable process state (never on a slow downstream DB), readiness should fail whenever the DB pool or Redis connection is unavailable. The current monolith's single `/api/health` conflates both; split this convention in from day one of the first extracted service.

### Supporting infrastructure (net-new, not in the repo today)
- **Redis** — required for the BullMQ event bus (§5) and the Socket.IO adapter (§5). Use a managed instance (e.g. GCP Memorystore) in production rather than an in-cluster `StatefulSet`.
- **PostgreSQL** — use a managed instance (Cloud SQL) with the schema-per-service layout from §4, not an in-cluster database, so backup/restore and failover are handled by the provider.
- **NetworkPolicy per namespace** — default-deny, then explicitly allow gateway → services and services → Postgres/Redis, so a compromised service cannot reach another service's traffic directly.

---

## 8. Observability & Production Readiness (build before or alongside the split)

None of this exists in the monolith today; it is a prerequisite for operating 8 services instead of 1, not an optional nice-to-have.

| Concern | Current state | Required addition |
| :--- | :--- | :--- |
| Logging | `console.log` per request in `app.ts` | Structured JSON logging (`pino`) with a request-id propagated across service calls via a header (`x-request-id`), so one user action can be traced across services. |
| Metrics | None | `prom-client` exposing `/metrics` per service; dashboard the standard RED metrics (rate, errors, duration) per route. |
| Tracing | None | OpenTelemetry SDK, exported to whatever APM the team already uses (or Grafana Tempo/Jaeger) — essential once one request can touch 3+ services. |
| Health checks | One conflated `/api/health` | Split `/health/live` and `/health/ready` per service (§7). |
| Rate limiting | None (`helmet` only) | `express-rate-limit` (or a gateway-level limiter) on the gateway at minimum, especially for `/api/auth/login`. |
| CSP | Explicitly disabled (`contentSecurityPolicy: false` in `src/server/app.ts`) | Re-enable with a real policy once the SPA's asset origins are enumerated — track as a fix independent of this migration but note it here since it will need re-verifying per service. |
| Secrets | Plain env vars via `.env` / raw `k8s Secret` | External Secrets Operator or Sealed Secrets so no plaintext secret YAML is ever committed. |

---

## 9. Security Considerations Specific to This System

- **Dual JWT secrets must survive the split.** Identity & Platform is the only service that should hold `JWT_ACCESS_SECRET` and `SUPER_ADMIN_JWT_SECRET`. Every other service should verify caller identity by validating a **short-lived service-to-service token** issued by Identity after it validates the original user JWT — do not distribute the two long-lived user-facing secrets to all 8 services.
- **Tenant isolation is currently enforced in application code, not the database** (no Postgres row-level security). When splitting, keep `schoolId` checks explicit in every query in every service — this is the single most important invariant to preserve, since a bug here leaks one school's data to another.
- **The Super Admin bypass in `authenticate()`** (`src/server/middleware/auth.ts`, tries `JWT_ACCESS_SECRET` then falls back to `SUPER_ADMIN_JWT_SECRET` only for `role === "SUPER_ADMIN"`) is a deliberate, narrow escape hatch — replicate it precisely (not more broadly) in whatever shared auth middleware package the split services use.
- **CORS defaults to same-origin-only in production** if `APP_URL` is unset (`server.ts`) — make sure the gateway, not each individual service, is the one component responsible for CORS once the frontend talks to a gateway host instead of directly to `sms-api`.

---

## 10. GitHub Actions CI/CD Pipeline

Extends the existing `.github/workflows/deploy.yml` pattern (GCP/GAR/GKE, already in use) rather than replacing it with an unrelated cloud target.

#### CI/CD Deployment Sequence

![CI/CD Deployment Sequence Diagram](https://mermaid.ink/img/c2VxdWVuY2VEaWFncmFtCiAgICBhY3RvciBEZXZlbG9wZXIKICAgIHBhcnRpY2lwYW50IEdpdEh1YiBhcyBHaXRIdWIgUmVwb3NpdG9yeQogICAgcGFydGljaXBhbnQgQWN0aW9ucyBhcyBHaXRIdWIgQWN0aW9ucyBSdW5uZXIKICAgIHBhcnRpY2lwYW50IEdBUiBhcyBHb29nbGUgQXJ0aWZhY3QgUmVnaXN0cnkKICAgIHBhcnRpY2lwYW50IEdLRSBhcyBHb29nbGUgS3ViZXJuZXRlcyBFbmdpbmUKICAgIHBhcnRpY2lwYW50IERCIGFzIENsb3VkIFNRTCBQb3N0Z3JlU1FMCgogICAgRGV2ZWxvcGVyLT4-R2l0SHViOiBQdXNoIHRvIG1haW4gb3IgcmVsZWFzZSB0YWcKICAgIEdpdEh1Yi0-PkFjdGlvbnM6IFRyaWdnZXIgd29ya2Zsb3csIHBhdGgtZmlsdGVyZWQgcGVyIHNlcnZpY2UKICAgIGFjdGl2YXRlIEFjdGlvbnMKICAgIEFjdGlvbnMtPj5BY3Rpb25zOiBMaW50LCB0eXBlY2hlY2ssIHVuaXQgYW5kIGNvbnRyYWN0IHRlc3RzCiAgICBBY3Rpb25zLT4-QWN0aW9uczogQnVpbGQgY2hhbmdlZCBzZXJ2aWNlIGltYWdlcyBvbmx5CiAgICBBY3Rpb25zLT4-R0FSOiBQdXNoIHRhZ2dlZCBpbWFnZXMKICAgIEFjdGlvbnMtPj5HS0U6IEF1dGhlbnRpY2F0ZSB0byBjbHVzdGVyCiAgICBBY3Rpb25zLT4-REI6IFJ1biBwcmlzbWEgbWlncmF0ZSBkZXBsb3kgYXMgYSBKb2IKICAgIEFjdGlvbnMtPj5HS0U6IGt1c3RvbWl6ZSBzZXQgaW1hZ2UgYW5kIGt1YmVjdGwgYXBwbHkgLWsKICAgIEdLRS0-PkdLRTogUm9sbGluZyB1cGRhdGUgd2l0aCByZWFkaW5lc3MgZ2F0ZXMKICAgIEFjdGlvbnMtPj5HS0U6IGt1YmVjdGwgcm9sbG91dCBzdGF0dXMsIGF1dG8tcm9sbGJhY2sgb24gZmFpbHVyZQogICAgQWN0aW9ucy0tPj5EZXZlbG9wZXI6IFBvc3QgZGVwbG95bWVudCBzdW1tYXJ5CiAgICBkZWFjdGl2YXRlIEFjdGlvbnM=)

```mermaid
sequenceDiagram
    actor Developer
    participant GitHub as GitHub Repository
    participant Actions as GitHub Actions Runner
    participant GAR as Google Artifact Registry
    participant GKE as Google Kubernetes Engine
    participant DB as Cloud SQL PostgreSQL

    Developer->>GitHub: Push to main or release tag
    GitHub->>Actions: Trigger workflow, path-filtered per service
    activate Actions
    Actions->>Actions: Lint, typecheck, unit and contract tests
    Actions->>Actions: Build changed service images only
    Actions->>GAR: Push tagged images
    Actions->>GKE: Authenticate to cluster
    Actions->>DB: Run prisma migrate deploy as a Job
    Actions->>GKE: kustomize set image and kubectl apply -k
    GKE->>GKE: Rolling update with readiness gates
    Actions->>GKE: kubectl rollout status, auto-rollback on failure
    Actions-->>Developer: Post deployment summary
    deactivate Actions
```

### Extended workflow (`.github/workflows/deploy-services.yml`)

Key changes from the current monolith workflow: **path-filtered matrix build** (only rebuild/redeploy services whose files changed) and a **migration Job** run before the rollout, per service schema.

```yaml
name: Microservices CI/CD Deployment

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  GAR_LOCATION: us-central1
  GAR_REPOSITORY: school-portal-images
  GKE_CLUSTER: school-portal-production
  GKE_ZONE: us-central1-a

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      services: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            identity: ['services/identity/**', 'packages/**']
            academic: ['services/academic/**', 'packages/**']
            classroom: ['services/classroom/**', 'packages/**']
            lifecycle: ['services/lifecycle/**', 'packages/**']
            staff: ['services/staff/**', 'packages/**']
            finance: ['services/finance/**', 'packages/**']
            ops: ['services/ops/**', 'packages/**']
            comms: ['services/comms/**', 'packages/**']
            gateway: ['services/gateway/**']

  validate-and-test:
    needs: detect-changes
    if: needs.detect-changes.outputs.services != '[]'
    strategy:
      matrix:
        service: ${{ fromJSON(needs.detect-changes.outputs.services) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm', cache-dependency-path: services/${{ matrix.service }}/package-lock.json }
      - run: npm ci
        working-directory: services/${{ matrix.service }}
      - run: npx tsc --noEmit
        working-directory: services/${{ matrix.service }}
      - run: npm test
        working-directory: services/${{ matrix.service }}

  build-and-deploy:
    needs: [detect-changes, validate-and-test]
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/'))
    strategy:
      matrix:
        service: ${{ fromJSON(needs.detect-changes.outputs.services) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with: { credentials_json: '${{ secrets.GCP_SA_KEY }}' }
      - uses: google-github-actions/setup-gcloud@v2
      - run: gcloud auth configure-docker $GAR_LOCATION-docker.pkg.dev

      - name: Build and push ${{ matrix.service }}-service
        run: |
          IMAGE=$GAR_LOCATION-docker.pkg.dev/$PROJECT_ID/$GAR_REPOSITORY/${{ matrix.service }}-service:${{ github.sha }}
          docker build -t $IMAGE -f services/${{ matrix.service }}/Dockerfile .
          docker push $IMAGE

      - name: Scan image for vulnerabilities
        uses: aquasecurity/trivy-action@0.29.0
        with:
          image-ref: $GAR_LOCATION-docker.pkg.dev/$PROJECT_ID/$GAR_REPOSITORY/${{ matrix.service }}-service:${{ github.sha }}
          exit-code: '1'
          severity: 'CRITICAL,HIGH'

      - uses: google-github-actions/get-gke-credentials@v2
        with: { cluster_name: '${{ env.GKE_CLUSTER }}', location: '${{ env.GKE_ZONE }}' }

      - name: Run database migration Job for ${{ matrix.service }}
        run: |
          kubectl apply -f k8s/jobs/${{ matrix.service }}-migrate.yaml -n school-portal
          kubectl wait --for=condition=complete --timeout=120s job/${{ matrix.service }}-migrate -n school-portal

      - name: Deploy ${{ matrix.service }}-service
        run: |
          cd k8s/overlays/production
          kustomize edit set image ${{ matrix.service }}-service=$GAR_LOCATION-docker.pkg.dev/$PROJECT_ID/$GAR_REPOSITORY/${{ matrix.service }}-service:${{ github.sha }}
          kubectl apply -k .
          kubectl rollout status deployment/${{ matrix.service }}-service -n school-portal --timeout=180s || \
            (kubectl rollout undo deployment/${{ matrix.service }}-service -n school-portal && exit 1)
```

This preserves the existing monolith build (`sms-api`, `frontend-spa`) as a separate, unaffected workflow during the transition — both pipelines run side by side until the Strangler Fig migration in §11 fully retires the monolith image.

---

## 11. Testing Strategy for a Distributed System

The repo has exactly one test file today (`tests/security.test.ts`, 166 lines). Splitting into services without expanding this will make regressions much harder to catch than they are now.

- **Per-service unit tests** — extend the existing pattern (`npm run test:security`) into a real per-service `npm test`, covering controllers/services in isolation with a test database schema.
- **Contract tests between services** — before Identity and Academic & Grading are physically separated, write consumer-driven contract tests (e.g. Pact) for the `user.*` events and any synchronous calls, so a change to Identity's event shape fails CI in Identity's own pipeline rather than being discovered by a broken Academic & Grading deploy.
- **End-to-end smoke tests through the gateway** — a small suite that logs in, hits one representative endpoint per service through the real Ingress path, run post-deploy in the CI job before marking a rollout successful.

---

## 12. Incremental Migration Execution Strategy

Adopt the **Strangler Fig Pattern** — no big-bang cutover, ever. Concrete phases against this specific codebase:

1. **Phase 0 — Harden the monolith (1–2 sprints).** Add structured logging, `/health/live` + `/health/ready`, rate limiting on `/api/auth/login`, re-enable a real CSP. None of this blocks on the service split and all of it is needed regardless (§8, §9).

2. **Phase 1 — Introduce the schema-per-service layout inside the current single Postgres instance (§4 Phase A), still inside one deployable.** Reorganize `prisma/schema.prisma` into per-domain `@@schema` blocks (Prisma multi-schema support) without moving any code out of `src/server` yet. This is the highest-leverage, lowest-risk step: it forces every cross-domain query to become explicit before any network boundary exists.

3. **Phase 2 — Stand up the API Gateway in front of the existing monolith**, using the exact routing table in §3, so `sms-api` keeps serving 100% of traffic but the frontend and all clients now go through the gateway host. This decouples "what the client calls" from "what serves it," which is the actual prerequisite for extracting anything later without a client-side breaking change.

4. **Phase 3 — Extract the first service: Student Lifecycle (Admissions + Attendance).** Chosen because, per the table in §4, it has the fewest cross-domain foreign keys of any target service (`AdmissionApplication` and `Attendance` both only join `School`, `GradeLevel`/`Classroom`, and `User` for display — all readable via the `UserRef` event-sourced pattern from §4 Phase B). Move `admissionController`/`admissionService`, `attendanceController`/`attendanceService`, and their Prisma models into `services/lifecycle`, point the gateway's `/api/applications/*` and `/api/attendance/*` rules at it, and delete the routes from the monolith once verified.

5. **Phase 4 — Extract Communications & Documents next**, since it is purely a consumer of events from every other domain (§5) and has almost no inbound cross-domain reads — a good second proof point for the event-bus pattern before tackling anything with strict consistency needs.

6. **Phase 5 — Extract the remaining services in order of increasing coupling**: Operations & Facilities → Staff & Workforce → Classroom & Collaboration (after the Socket.IO Redis adapter is proven, §5) → Academic & Grading → Finance & Billing → Identity & Platform last, since every other service depends on it and it should only move once the `UserRef` read-model pattern has been proven stable across every prior extraction.

7. **Phase 6 — Decommission.** Once every route in §3 is served by its target service, delete `src/server` from the monolith, retire the `sms-api` image and its `k8s/base/sms-api.yaml`, and keep only `frontend-spa` + the 8 services + gateway.

### Effort & risk summary

| Phase | Relative effort | Primary risk | Rollback strategy |
| :--- | :--- | :--- | :--- |
| 0. Harden | Low | None — additive only | N/A |
| 1. Schema-per-service | Medium | Hidden cross-schema queries surface as bugs | Revert `@@schema` change; single migration |
| 2. Gateway in front | Medium | Added network hop latency/misrouting | DNS/Ingress cutover is reversible in minutes |
| 3. Extract Lifecycle | Medium-High | Event lag causes stale `UserRef` data | Keep monolith routes dark (feature-flagged) for one release before deleting |
| 4. Extract Comms | Low-Medium | Missed event type breaks a notification silently | Add dead-letter queue alerting before cutover |
| 5. Extract remaining | High (cumulative) | Socket.IO scaling bugs; payroll/finance consistency bugs | Extract Finance & Billing last among "remaining", after the pattern is proven twice already |
| 6. Decommission | Low | None if all traffic verified migrated first | Keep `sms-api` image in GAR, undeleted, for one release cycle as an emergency fallback |
