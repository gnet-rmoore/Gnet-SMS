# Classroom Management (Teacher & Student) — Plan

> **Status:** Phases 1–5 shipped (2026-07-23) — workspace + assignments + topics/attachments + comments/realtime + parent read-only  
> **Follow-ups (2026-07-24):** TipTap rich text; multi-file drag-drop attachments; teacher banner color / image; **roster add/remove is staff-only** (teachers view People)  
> **Scope:** Google Classroom–style experience for **Teacher** and **Student** accounts on subject/homeroom rooms they already belong to; **Parent** read-only of child’s rooms  
> **Non-goal this plan:** Replacing admin Classrooms / Curriculum / Exam Gradebook  
> **Companion:** `docs/CURRICULUM_CLASSROOMS_PLAN.md`, `docs/grade-level-vs-class-group.md`, `docs/TEACHER_GRADEBOOK_PLAN.md`, `ONBOARDING_AND_ADMISSION_PLAN.md`, `IMPLEMENTATION_STATUS.md`

---

## 0. Product intent

Give teachers and students a **class workspace** that feels like Google Classroom:

| Google Classroom | Gnet SMS equivalent |
| :--- | :--- |
| Teacher creates class + share code | **Admin** creates class groups / subject rooms (`/{slug}/classrooms`); teacher is assigned as owner / co-teacher |
| Student joins with class code | **No student class codes.** Students are placed during **admission enroll** and/or **Enrollment / Students / Registrar** roster tools |
| Stream (posts) | Classroom stream: announcements + assignment cards |
| Classwork | Topics + materials + assignments |
| People | Roster (teachers + students) — already largely works |
| Grades (assignment) | Assignment submissions + teacher marks — **separate from Exam Gradebook** |

### Hard product rules

1. **Students never enter a class code** for normal enrollment. Class codes may remain for rare admin recovery / invite-only edge cases, but the primary student UX has **no Join-with-code** requirement.
2. **Membership is authoritative.** A student sees a class only if `ClassroomMember` exists (from enroll saga, Enrollment page, subject-room copy, or **school staff** roster add). Teachers may **view** People but cannot add/remove students or co-teachers.
3. **Do not conflate systems:**
   - **Classroom assignments** = homework / classwork posts → `Submission` in Classroom service  
   - **Exam Gradebook** = formal assessment components → Academic service (`docs/TEACHER_GRADEBOOK_PLAN.md`)
4. **Honest UI.** No fake comment counts, Meet buttons, or “View details” that do nothing.
5. **Executive Slate** for all new/updated teacher & student classroom surfaces (`FRONTEND_GUIDELINES.md`).

---

## 1. Current state (honest)

### What already works

| Area | Where | Notes |
| :--- | :--- | :--- |
| Admin Classrooms | `/{slug}/classrooms` | Class groups + subject rooms, roster, quick assign |
| Membership list | `GET /api/classrooms` | Teacher/student see rooms they belong to |
| Roster CRUD | `…/members` | School staff only (`SCHOOL_ADMIN`, `PRINCIPAL`, `VPI`, `VPA`, `REGISTRAR`) — not TEACHER |
| Admission → class | Lifecycle enroll + optional `classroomId` | Failure → `classAssignFailed`; late assign on Enrollment |
| Enrollment page | `/{slug}/enrollment` | Deferred placement without class codes |
| Create announcement / assignment post | `POST …/posts` | Thin; author names not enriched |
| Exam Gradebook / My Grades | Academic | Formal grades path (keep) |

### What is broken / incomplete (My Classes feed)

Legacy UI: `src/pages/School/ClassroomList.tsx`, `ClassroomFeed.tsx`.

| Gap | Detail |
| :--- | :--- |
| Schema ahead of API | `PostComment`, `PostAttachment`, `Submission`, `SubmissionAttachment`, `ClassroomTopic`, `ClassroomMeeting` exist in Prisma with **little or no HTTP** |
| Student submit | No create-submission API → Grades tab empty |
| Comments / materials / topics / Meet | UI stubs or cosmetic |
| Author hydration | Posts return `authorId` only; UI expects `author.name` |
| Join-with-code | Still promoted to students — **remove from primary STUDENT UX** per this plan |
| Design | Legacy tokens; not extracted under `src/features/` |

---

## 2. Target experience

### Teacher

1. **My Classes** — cards for owned / co-taught rooms (subject + class group names hydrated).
2. Open a room → tabs: **Stream | Classwork | People | Marks** (assignment marks, not exam gradebook).
3. Post **Announcement** or **Assignment** (title, body, due date, points, optional topic, optional attachments).
4. Post **Material** (read-only resource; optional link/file).
5. Open an assignment → see **roster submissions**, mark score + feedback, return / reopen.
6. **People** is view-only for teachers. School staff manage students / co-teachers via People, Classrooms, Enrollment, or Registrar.
7. Shortcut to **Exam Gradebook** for formal assessments (link, not merge).

### Student

1. **My Classes** — only rooms they are members of. **No “Join with class code”** button.
2. Empty state if unassigned: plain copy (“Your school will place you in classes”) + optional link if parent/support contact exists — **not** a code entry form.
3. Stream: read announcements / assignments / materials; comment if enabled in phase.
4. Assignment detail: instructions, due date, **Turn in** (text and/or file), see status (Assigned / Turned in / Returned) and score when returned.
5. **Marks** tab: assignment scores for this classroom only. Formal report cards stay on **My Grades**.

### Parent (optional later)

View child’s class list + returned marks (read-only). Out of Phase 1–3; route already allows classroom for PARENT but nav does not.

---

## 3. Architecture

```text
SPA  src/features/classroom-workspace/   (new — replaces legacy ClassroomList/Feed pages)
  │
  ├─ list (My Classes)
  └─ room/:id  Stream | Classwork | People | Marks
         │
         ▼
Classroom service (:3014)  schema `classroom`
  Classroom, ClassroomMember
  ClassroomPost (+ attachments, comments)
  ClassroomTopic
  Submission (+ attachments)
  ClassroomMeeting (defer)

Identity  — user name/photo enrichment for authors, roster, submitters
Academic  — subject / grade level labels (client or thin enrich)
Lifecycle — unchanged enroll/assign membership (source of student placement)
MinIO/Comms (optional) — file storage for attachments (Phase 2+)
```

### Owning services

| Concern | Service |
| :--- | :--- |
| Rooms, roster, posts, submissions, topics | **Classroom** |
| User display (name, photo) | **Identity** (enrich on read) |
| Subject / grade labels | **Academic** (IDs already on Classroom) |
| Student placement into rooms | **Lifecycle** enroll + Enrollment/Students/Registrar UIs |
| Formal exam grades | **Academic** Gradebook (unchanged) |

### Membership & codes

| Actor | How they get into a class |
| :--- | :--- |
| Student | Admission enroll (`classroomId`), Enrollment bulk assign, Students/Registrar roster, subject-room copy from class group |
| Teacher | Admin sets `ownerTeacherId` / co-teacher members when creating or editing room |
| Class code | Keep generating `classCode` for uniqueness / support; **hide Join UI from STUDENT primary flows**. Optionally restrict `POST /api/classrooms/join` to admin-assisted recovery or deprecate student self-join in a later phase |

---

## 4. Data model (existing — extend usage, not reinvent)

Already in `services/classroom/prisma/schema.prisma`:

| Model | Use in this plan |
| :--- | :--- |
| `Classroom` | Room metadata; `subjectId` / `gradeLevelId` / `ownerTeacherId` |
| `ClassroomMember` | Roster roles: `STUDENT`, `TEACHER`, `CO_TEACHER` |
| `ClassroomPost` | `type`: `ANNOUNCEMENT` \| `ASSIGNMENT` \| `MATERIAL` |
| `ClassroomTopic` | Classwork folders |
| `PostAttachment` / `SubmissionAttachment` | Files (Phase 2+) |
| `PostComment` | Stream comments (Phase 2) |
| `Submission` | Existing fields: `status` (schema default `SUBMITTED`), `grade`, `feedback`, `submittedAt`, `returnedAt`. Normalize statuses in API to `SUBMITTED` / `RETURNED` / `REOPENED` (no row = not started) |
| `ClassroomMeeting` | **Defer** (no fake Meet button until real) |

### Suggested status conventions (document in API)

**Post types:** `ANNOUNCEMENT`, `ASSIGNMENT`, `MATERIAL`  
**Submission status:** `SUBMITTED`, `RETURNED`, `REOPENED` (absence of row = not started / assigned)

---

## 5. API plan (Classroom service)

### Phase A — Foundation (ship first)

| Method | Path | Behavior |
| :--- | :--- | :--- |
| GET | `/api/classrooms` | Memberships + enrich subject/grade/teacher labels (or SPA enrich) |
| GET | `/api/classrooms/:id` | Room detail + membership check |
| GET/POST | `/api/classrooms/:id/members` | Existing; ensure teacher can list enriched names |
| GET/POST | `/api/classrooms/:id/posts` | List/create; **enrich `author`** via Identity |
| PATCH/DELETE | `/api/posts/:id` | Edit/archive/delete own or teacher-owned posts |
| GET | `/api/classrooms/:id/grades` | Existing snapshot; enrich student names |

### Phase B — Assignments & submissions (core GC parity)

| Method | Path | Behavior |
| :--- | :--- | :--- |
| GET | `/api/posts/:id` | Post detail + submission summary for teacher / own for student |
| POST | `/api/posts/:id/submissions` | Student turn in (body text; files later); upsert per student |
| PATCH | `/api/submissions/:id` | Student update while not RETURNED; teacher set grade/feedback + RETURNED |
| POST | `/api/submissions/:id/return` | Teacher return with grade |
| POST | `/api/submissions/:id/reopen` | Allow student to resubmit |

Guards: only `ClassroomMember` of that room; students only touch own submission; teachers/co-teachers/owner grade any.

### Phase C — Classwork structure & engagement

| Method | Path | Behavior |
| :--- | :--- | :--- |
| CRUD | `/api/classrooms/:id/topics` | Topic folders |
| PATCH | posts `topicId` | File under topic |
| CRUD | `/api/posts/:id/comments` | Threaded comments |
| POST | attachments | Upload metadata + storage URL (MinIO) |

### Phase D — Polish / realtime (optional)

- Socket.IO: emit `post.created`, `submission.updated` to `classroom:{id}` (infra already joins rooms).
- Soft-hide or role-gate `POST /api/classrooms/join` for STUDENT once placement flows are trusted.

---

## 6. Frontend plan

### File placement

| Kind | Location |
| :--- | :--- |
| Routes | Keep `/{slug}/classroom` and `/{slug}/classroom/:id` |
| Feature | `src/features/classroom-workspace/` (`Page.tsx` list, `RoomPage.tsx`, `api.ts`, hooks, components) |
| Thin pages | `src/pages/School/ClassroomList.tsx` / `ClassroomFeed.tsx` re-export feature |
| Delete/stop using | Student-facing `JoinClassroomModal` on My Classes; dead Meet / View Details handlers |

### Screens

1. **My Classes (list)** — Executive Slate cards; teacher vs student empty states; no join-code CTA for students.  
2. **Room shell** — banner, subject/class title, tabs.  
3. **Stream** — chronological posts; compose (teacher); open assignment card.  
4. **Classwork** — by topic; create material/assignment.  
5. **People** — teachers / students; add/remove where permitted.  
6. **Marks** — teacher matrix or student personal scores for **classroom assignments only**.  
7. **Assignment detail** — instructions, due, turn-in panel (student), grading panel (teacher).

### UX principles

- One composition per viewport; plain copy; loading skeletons + empty states.
- Toasts + `confirmAction` — no `alert`/`confirm`.
- Role-aware composers (students cannot create assignments).
- Link “Open Gradebook” for formal exams — do not duplicate exam UI inside Marks.

---

## 7. Phased delivery

| Phase | Deliverable | Depends on | Outcome |
| :--- | :--- | :--- | :--- |
| **0 — Plan** | This document + status link | — | Align product |
| **1 — Workspace shell** | Extract feature; Slate My Classes + Room tabs; enrich posts/members; remove student join-code CTA; honest empty states | Existing list/posts/members APIs | Usable, non-lying GC shell |
| **2 — Assignments** | Post detail; student submit; teacher grade/return; Marks tab live | New submission APIs | Core homework loop |
| **3 — Classwork & materials** | Topics; MATERIAL posts; optional file attachments | Topics + storage | **Done** |
| **4 — Comments & realtime** | Comments API/UI; socket events | Phase 2 | **Done** |
| **5 — Parent read-only (optional)** | Child’s classes + returned marks | Phase 2 | **Done** |

**Recommended MVP ship:** Phase 1 + 2.

---

## 8. Role matrix

| Action | Teacher / Co-teacher / Owner | Student | Admin / Registrar / VPI / VPA |
| :--- | :---: | :---: | :---: |
| See My Classes (membership) | ✓ | ✓ | ✓ (if member) |
| Join via class code (primary UX) | — | **✗** | Recovery only / deprecate |
| Place student / co-teacher on roster | **✗** (view only) | — | ✓ |
| Create announcement / assignment / material | ✓ | — | ✓ |
| Comment | ✓ | ✓ (if enabled) | ✓ |
| Turn in work | — | ✓ | — |
| Grade / return | ✓ | — | ✓ |
| Formal exam grades | Gradebook | My Grades | Grade review |

---

## 9. Explicit non-goals (this plan)

- Rebuilding admin **Classrooms** / **Curriculum** wizards (already polished).
- Merging Exam **Gradebook** into classroom Marks.
- Requiring class codes at admission (admission already places members).
- Shipping Meet / video until a real meeting provider exists.
- Full LMS SCORM / quiz engine.

---

## 10. Acceptance / verify (MVP = Phase 1–2)

### Placement (no codes)

- [x] Enroll with `classroomId` → student sees room under My Classes without ever entering a code  
- [x] Enrollment page assigns unplaced student → room appears  
- [x] Student My Classes has **no** Join-with-code control  

### Teacher

- [x] Teacher opens My Classes → only owned/co-taught rooms with readable subject/class names  
- [x] Create announcement → appears on Stream with teacher name  
- [x] Create assignment (due + points) → student sees it  
- [x] Grade submission → student sees Returned + score on Marks  

### Student

- [x] Open assignment → Turn in → status Turned in  
- [x] Cannot post assignments  
- [x] Empty My Classes copy is honest when not placed  

### Integrity

- [x] No fake comment counts / Meet / dead View Details  
- [x] Classroom Marks ≠ Exam Gradebook data  
- [x] Executive Slate tokens on list + room  

---

## 11. Implementation sketch (for builders)

1. Add submission + post detail routes in `services/classroom` (validate membership).  
2. Enrich posts/members/grades with Identity names (batch).  
3. Create `src/features/classroom-workspace/` and migrate routes.  
4. Remove student Join CTA; keep admin Enrollment as placement source of truth.  
5. Wire assignment detail + Marks.  
6. Docs: mark phases done in this file; note in `IMPLEMENTATION_STATUS.md`.  
7. Tests: membership guard on submit/grade; enroll→member→visible class; rebuild `classroom` + `frontend-spa`.

---

## 12. Open decisions (resolve in Phase 1 kickoff)

| Question | Options | Recommendation |
| :--- | :--- | :--- |
| Can teachers add students to roster? | Yes / admin-only | **Resolved:** staff-only — teachers view People; staff use People / Classrooms / Enrollment / Registrar |
| Deprecate `POST /classrooms/join` for STUDENT? | Hide UI only / reject API | **Done:** UI removed; API returns 403 with placement message |
| Attachments storage | MinIO now / links-only first | Links + text in Phase 2; MinIO in Phase 3 |
| Homeroom vs subject in My Classes | Separate sections / flat list | Flat list with badges (Class group vs Subject) |

---

## Change log

### 2026-07-24 — Teachers cannot manage classroom roster

- **Change:** Teachers (including owners / co-teachers) can only **view** People. Add/remove students and co-teachers requires school staff (`SCHOOL_ADMIN`, `PRINCIPAL`, `VPI`, `VPA`, `REGISTRAR`). API `POST/DELETE …/members` rejects `TEACHER`.
- **Who:** Teachers (view-only roster); school staff (roster managers)
- **Services:** `classroom`, `frontend-spa`
- **Status:** done
- **Verify:** Teacher My Classes → People has no Add/Remove; School Admin can still add student/co-teacher; `POST /api/classrooms/:id/members` as TEACHER → 403

### 2026-07-24 — Rich text, multi-file attach, class banner

- **Change:** Replaced fragile contentEditable/`execCommand` editor with TipTap (bold/italic/lists/align/colors/link/image/source). Compose + turn-in support **multiple** attachments via click browse **and** drag-and-drop. Teachers/admins can set class banner to a **solid color** (hex) or **custom image** (`bannerImageUrl` on Classroom; co-teachers may update banner only).
- **Who:** Teachers (compose/banner), students (turn-in attachments), anyone reading posts
- **Services:** `classroom` (schema + `PATCH /api/classrooms/:id`), `frontend-spa`
- **Status:** done
- **Verify:** Post with formatting + 2 dragged files; student turn-in with dropzone; Customize banner → color and image; list card strip reflects color/image

### 2026-07-23 — Phases 3–5 implemented

- **Change:** Topics CRUD + Classwork grouping; post/submission file attachments (MinIO presign, bucket `sms-classroom`) + link attachments; comments CRUD with Identity author enrich; Socket.IO `post.created` / `submission.updated` / `comment.*` to `classroom:{id}`; parent My Classes nav + `?studentId=` read-only list/room/marks (Identity parent-child verify)
- **Who:** Teachers, students, parents
- **Services:** `classroom` (+ MinIO env), `api-gateway` (`/api/topics`, `/api/comments`), `frontend-spa`
- **Status:** done
- **Verify:** `npm run test:classroom`; create topic + attach file to assignment; comment appears live for another member; parent selects child → opens class Marks read-only

### 2026-07-23 — Phases 1–2 implemented

- **Change:** Teacher/Student My Classes workspace (Executive Slate); Stream / Classwork / People / Marks; assignment turn-in + teacher return/reopen; Identity author/student enrichment; student class-code join disabled (API + UI); gateway routes `/api/posts` + `/api/submissions`
- **Who:** Teachers, students (members via admission/Enrollment)
- **Services:** `classroom`, `api-gateway`, `frontend-spa`
- **UI / API:** `/{slug}/classroom`, `/{slug}/classroom/:id`; `GET/POST …/posts`, `GET/PATCH/DELETE /api/posts/:id`, `POST …/submissions`, `POST …/return|reopen`
- **Status:** done (MVP); Phase 3+ topics/attachments/comments still open
- **Verify:** `npm run test:classroom`; teacher posts assignment → student turns in → teacher returns grade on Marks; student My Classes has no Join CTA

### 2026-07-23 — Plan created

- **Change:** Full teacher/student Classroom Management plan (GC-like, no student class codes; admission/Enrollment placement)  
- **Services:** classroom (+ identity enrich, SPA); lifecycle placement unchanged  
- **UI / API:** `/{slug}/classroom`, `/{slug}/classroom/:id`  
- **Status:** draft (implementation not started)  
- **Verify:** N/A until Phase 1  
