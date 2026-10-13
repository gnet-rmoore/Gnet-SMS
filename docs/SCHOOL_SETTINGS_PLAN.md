# School settings — Plan

> **Status:** Phases 0–5 implemented (2026-07-23)  
> **Scope:** Make School Admin Settings tabs work end-to-end (School info, Academic calendar, Appearance, Grading, Security, Notifications)  
> **UI:** `/{slug}/settings` · `src/features/settings/`  
> **Companion:** `IMPLEMENTATION_STATUS.md`, `docs/ACADEMIC_GRADING_PLAN.md`, `docs/ATTENDANCE_INTEGRATION_PLAN.md`, `docs/COMMS_DOCUMENTS_PLAN.md`, multi-language prefs in `docs/I18N_PLAN.md`

## 0. Goal

School Admins (and other settings-capable roles) should be able to **configure, save, reload, and see applied** every Settings tab — not just see honest empty states or values that persist without affecting the product.

---

## 1. Current state (audit)

| Tab / card | Persist today? | Applied in product? | Verdict |
| :--- | :---: | :---: | :--- |
| **School info** (name, contact, address, country, TZ) | Yes — Identity `PATCH /api/schools/:id` | Yes (login gate TZ, country filters, contact) | **Works** — fix sync bugs |
| **Attendance & payroll** (on School info) | Yes — `payrollAttendanceRules` | Yes — Lifecycle + Staff | **Partial** — save UX + form hydrate bugs |
| **Academic calendar** | N/A on this page | Full editor at `/{slug}/settings/academic-calendar` | **Link-only by design** — polish CTA only |
| **Appearance** (logo, brand, templates) | Yes — Identity | Logo: Layout + receipts. Brand: receipts only. Templates: grade/report sheets when those pages read school | **Partial** — brand + templates must apply consistently |
| **Grading** (legends + gradebook weights) | Yes — Academic legends + Identity `gradebookConfig` | Gradebook / sheets use config; report-card letter bands still hard-coded in places | **Mostly works** — close apply gaps |
| **Security** | No | No | **Stub** |
| **Notifications** | No | No | **Stub** |
| **Plan & modules** (read-only) | N/A — Super Admin assigns | Yes — nav gating uses entitlements from login | **Done** (2026-08-04) — `GET /api/schools/:id/subscription` + Settings **Plan & modules** tab |

### Known bugs (fix in Phase 0)

1. **`formSynced` one-shot** (`Page.tsx`) — form fills once; API school after auth school can leave stale/missing fields (esp. `payrollAttendanceRules`). Reset sync when `schoolId` changes; prefer API `schoolData` over auth school when both exist.
2. **Attendance card** — depends on chrome **Save changes** (GENERAL only). Easy to miss; add card-level Save or clearer copy.
3. **Default brand mismatch** — UI default `#4f46e5` vs Identity schema default `#2563eb`.
4. **Logo as large data URL** on PATCH — keep for v1 (same as photo); document size limit (already 2MB client-side).

---

## 2. Owning services

| Concern | Service | Routes / fields |
| :--- | :--- | :--- |
| School profile, branding, templates, gradebookConfig, attendance rules, **security policy JSON** | **Identity** | `GET/PATCH /api/schools/:id` |
| **SaaS plan read-only** (plan, billing status, entitlements, quotas) | **Identity** | `GET /api/schools/:id/subscription` — `SCHOOL_ADMIN`, `PRINCIPAL`, `IT_ADMIN` |
| Grade legends / scales | **Academic** | `/api/schools/:id/grade-legends` |
| Academic calendar | **Academic** | existing calendar APIs + dedicated settings wizard |
| School notification defaults | **Comms** (new) | prefs CRUD; senders check before email |
| Brand on fee PDFs | **Finance** | already uses `brandColor` / logo |
| Settings SPA | **frontend-spa** | `src/features/settings/` |

---

## 3. Phased delivery

### Phase 0 — Reliability (no new product surface)

**Intent:** Existing tabs save/load correctly every time.

| Work | Detail |
| :--- | :--- |
| Form hydrate | Drop brittle `formSynced` gate; sync whenever `schoolData` updates (or when `schoolId` changes); Refresh always re-applies |
| Attendance UX | Explicit “Save attendance rules” **or** sticky hint that GENERAL Save includes them; after save, toast lists what changed |
| Chrome Save | Keep Save on GENERAL + APPEARANCE; Grading keeps its own Save structure / legend modal |
| Defaults | Align brand default with schema (`#2563eb`) or migrate schema to indigo — pick one |
| Verify | Change TZ + attendance rules → Save → hard refresh → values match; switch school (if multi) rehydrates |

**Services:** frontend-spa (maybe identity only if default tweak)  
**Status:** done

---

### Phase 1 — Appearance “applied”

**Intent:** What you set in Appearance is what users see on branded surfaces.

| Work | Detail |
| :--- | :--- |
| Brand color in shell | After school login only: Layout remaps indigo/violet via `--school-brand-*` from `school.brandColor`. Platform default is modern blue `#2563eb` (login, public, Super Admin). |
| Public apply | Logo may show; CTAs stay platform blue — school brand does **not** apply before login |
| Grade / report templates | Confirm Grades / Transcripts / Report Card pages read `school.gradeSheetTemplate` / `reportCardTemplate` from auth/session after Settings save; fix any hard-coded `TEMPLATE_1` |
| Preview = product | Template preview IDs must match renderer IDs used in production sheets |
| Remove logo | Allow clear logo (null) like profile photo |

**Out of scope:** Full white-label theme system, dark mode.

**Services:** frontend-spa (+ Finance already OK)  
**Status:** done

---

### Phase 2 — Grading “applied”

**Intent:** Legends and gradebook structure drive scoring UI, not just Settings.

| Work | Detail |
| :--- | :--- |
| Gradebook columns | Teacher grade entry / gradebook views load Identity `gradebookConfig` (parse helper already exists) |
| Legends | Letter/GPA mapping uses school legends where categories apply (CLASS / etc.) |
| Report cards | Replace hard-coded A–F bands with active legend when present; else keep default scale |
| Validation | Keep weights = 100% gate; reject empty legend names / overlapping scale ranges (light validation) |

**Services:** frontend-spa, academic (if legend fetch missing on grade pages)  
**Status:** done  
**Companion:** `docs/ACADEMIC_GRADING_PLAN.md`

---

### Phase 3 — Security (school-wide policy MVP)

**Intent:** Admins configure enforceable password / session policy — not full SSO/MFA product.

| Setting | Behavior |
| :--- | :--- |
| `passwordMinLength` | Default 6 (current); clamp 6–32; enforced on password change + staff create |
| `requireStrongPassword` | Optional: letter + number (and optionally symbol) |
| `sessionIdleMinutes` | Optional idle hint for SPA; JWT TTL stays server-configured for MVP |
| `forcePasswordChangeDays` | Optional; `0` = off. Soft: flag `mustChangePassword` on next login when exceeded (if `passwordChangedAt` exists or add field) |

**Storage:** Identity `School.securityPolicy` JSON (parse/serialize like payroll rules) — avoid many columns.

**UI:** Replace Security empty state with form + Save → `PATCH` school.

**Enforce:** Identity password update / create user paths; document what is *not* enforced yet (true MFA, device trust).

**Out of scope for MVP:** TOTP/SMS 2FA, IP allowlists, SSO — **implementation plan:** `docs/SCHOOL_MFA_2FA_PLAN.md`.

**Services:** identity, frontend-spa  
**Status:** done

---

### Phase 4 — Notifications (school defaults MVP)

**Intent:** School Admin toggles which **event classes** send email (and optionally in-app) for the tenant.

| Event key (examples) | Typical sender |
| :--- | :--- |
| `ADMISSION_STATUS` | Lifecycle |
| `FEE_DUE` / `FEE_PAID` | Finance |
| `ANNOUNCEMENT` | Comms |
| `ATTENDANCE_ALERT` | Lifecycle (if/when emailed) |
| `LEAVE_DECISION` | Staff |

**Storage (Comms):**

```text
SchoolNotificationPreference
  schoolId, eventKey, label?, description?, emailEnabled, inAppEnabled
  @@unique([schoolId, eventKey])
```

Built-in keys are defined in code. Schools may add **custom** categories (label + key); producers that send that `eventKey` respect email / in-app toggles.

**API:** `GET/PATCH /api/schools/:id/notification-preferences` (gateway → Comms).

**UI:** Notifications tab — toggle matrix + Save; School Admin can **Add category** (custom event key + label); honest note that user-level mute is later.

**Wire:** Update 1–2 real send paths first (e.g. announcement email + admission status) to check prefs; others follow.

**Out of scope:** Push providers, SMS, per-user digest schedule.

**Services:** comms, frontend-spa (+ announcement create checks prefs)  
**Status:** done  
**Companion:** `docs/COMMS_DOCUMENTS_PLAN.md`

---

### Phase 5 — Polish / IA (optional)

- Unsaved-changes guard when switching tabs
- Deep-link `?tab=APPEARANCE` (and GRADING / SECURITY / NOTIFICATIONS)
- Move Attendance & payroll to its own nav item if GENERAL feels crowded
- Role gate: confirm only `SCHOOL_ADMIN` / `IT_ADMIN` (and any intentional extras) see Settings

---

## 4. “Works as intended” definition

A tab **works** when:

1. Admin can edit fields and get clear validation / toasts  
2. Save persists (reload / Refresh shows same values)  
3. At least one downstream surface **uses** the value (or the tab is explicitly “link to full tool,” e.g. Academic calendar)  
4. Empty / unavailable features are not claimed as live  

| Tab | Done when |
| :--- | :--- |
| School info | Profile + regional + attendance rules survive refresh; TZ drives day bounds as today |
| Academic calendar | Summary accurate; Manage opens working wizard |
| Appearance | Logo in Layout; brand tint in shell; templates drive grade/report renderers |
| Grading | Legends CRUD + structure save; grade entry uses columns; letter maps use legends |
| Security | Policy saved; password create/change enforces min length / strength |
| Notifications | Prefs saved; ≥1 email path respects toggle |

---

## 5. Implementation order (recommended)

```text
Phase 0 (bugs) → Phase 1 (Appearance apply) → Phase 2 (Grading apply)
        → Phase 3 (Security MVP) → Phase 4 (Notifications MVP) → Phase 5 (polish)
```

Ship each phase with: tests (where helpers/API), rebuild touched images (`identity` / `comms` / `frontend-spa`), and a changelog entry below.

---

## 6. Change log

### 2026-08-04 — Require password change on next login (enforcement)

- **Change:** Identity already persisted `mustChangePassword` and returned it on login/session refresh; the SPA did not store or enforce it. Authenticated users with the flag are now redirected to `/change-password-required` until they set a new password (self-service with current password). Works for school users and Super Admin operators.
- **Services:** identity (unchanged), frontend-spa (`MustChangePassword`, `ProtectedRoute`, `authStore`, `Login`)
- **Status:** done
- **Verify:**
  - [ ] Create staff with “Require password change on first login” checked → sign in with temp password → forced change screen → dashboard after new password
  - [ ] Admin reset with checkbox unchecked → user signs in without forced screen
  - [ ] Super Admin operator with temp password → forced change before `/super-admin`
  - [ ] Profile → Security password change clears flag if it was set

### 2026-07-31 — Profile Security tab (self password change)

- **Change:** Profile → Security requires **current password** for self-service password change; enforces school `securityPolicy` (min length + optional letter/number) with live checklist + strength meter; honest session idle / MFA panel. Admins resetting another user’s password still omit `currentPassword`.
- **Services:** identity (`PATCH /api/users/:id` + `code` on errors), frontend-spa (`SecurityTab`)
- **Status:** done
- **Verify:**
  - [ ] Profile → Security: wrong current password → `CURRENT_PASSWORD_INVALID`
  - [ ] Settings → Security raise min length → Profile rejects shorter new passwords
  - [ ] Staff create / admin password set without `currentPassword` still works

### 2026-07-31 — Admin password reset policy (tenant-scoped)

- **Change:** Hardened who may set another user’s password without current password:
  - **School Admin** / **IT Admin**: reset users in **their school only**; cannot reset **School Admin** accounts (including peer School Admins).
  - **Super Admin**: may reset any user, including School Admins. **SA console** (`/super-admin/users` + school detail) exposes `POST /api/super-admin/users/:id/reset-password` — see `docs/SUPER_ADMIN_PLATFORM_PLAN.md` Phase A3.
  - Self-service (Profile) still requires current password for everyone.
  - Registrar/Principal may still edit profile fields but cannot admin-reset passwords.
  - Staff edit modal exposes reset fields for School Admin / IT Admin when allowed; defaults `mustChangePassword: true`.
- **Services:** identity (`domain/passwordResetPolicy.ts`, `PATCH /api/users/:userId` + `IT_ADMIN` on route), frontend-spa (Staff Management)
- **Status:** done
- **Verify:**
  - [ ] School Admin resets Teacher password → succeeds; login with new password works
  - [ ] IT Admin resets Principal/IT Admin → succeeds; IT Admin cannot reset School Admin → `SCHOOL_ADMIN_PASSWORD_PROTECTED`
  - [ ] School Admin A cannot reset School Admin B → same code
  - [ ] Cross-tenant attempt → `PASSWORD_RESET_CROSS_TENANT` (or tenant middleware 403)
  - [ ] `npm run test:password-reset`

### 2026-07-30 — Multi-language prefs (companion)

- **Change:** School `defaultLocale` + user `preferredLocale` and Settings/Profile language pickers are specified in `docs/I18N_PLAN.md` (full SPA translation program). Settings remains the admin home for school default language.
- **Services:** identity, frontend-spa (planned)
- **Status:** plan only
- **Verify:** n/a until I18N Phase 0

### 2026-07-24 — Custom notification categories (School Admin)

- **Change:** Settings → Notifications lets School Admin add custom categories (name, optional description, event key) and remove them. Built-in events remain toggle-only. Pref rows store optional `label` / `description`. PATCH accepts `removeEventKeys` for custom deletes.
- **Who:** School Admin / IT Admin / Principal (existing settings roles)
- **Services:** comms, frontend-spa
- **Status:** done
- **Verify:** Add “Bus delay” → Save → refresh shows custom row; toggle email off → save persists; Remove → save clears row; built-in keys cannot be deleted

### 2026-07-24 — Platform blue; school brand post-login only

- **Change:** Platform action color is modern blue (`#2563eb`). School `brandColor` remaps the portal only after school login (Layout). Public apply no longer applies school brand. Super Admin stays platform blue.
- **Services:** frontend-spa, finance (PDF fallback hex)
- **Status:** done
- **Verify:** Logged out / login / `/apply/:slug` are blue; school user with Emerald brand sees emerald after login; Super Admin stays blue

### 2026-07-23 — Global brand color theming

- **Change:** School `brandColor` drives full indigo/violet palette (`--school-brand-*`) so buttons, forms, focus rings, tabs, SweetAlert confirm, and public apply match Appearance settings
- **Services:** frontend-spa
- **Status:** superseded (see 2026-07-24 — public apply no longer branded; platform default is blue)
- **Verify:** Settings → Appearance → pick Emerald → Save → sidebar, Save buttons, and form focus rings all emerald

### 2026-07-23 — Settings tabs work end-to-end (Phases 0–5)

- **Change:** Form hydrate fix; attendance card Save; brand color in Layout + public apply; report cards use grade legends; Security policy (`securityPolicy` JSON) enforced on password change; Notification prefs in Comms with Settings UI; `?tab=` deep links
- **Services:** identity, comms, api-gateway, frontend-spa
- **UI / API:** `/{slug}/settings?tab=…`; `PATCH` school `securityPolicy`; `GET/PATCH /api/schools/:id/notification-preferences`
- **Status:** done
- **Verify:**
  - [ ] School info + attendance rules survive hard refresh
  - [ ] Appearance brand updates sidebar active tint after Save
  - [ ] Security: raise min length → Profile password change rejects short passwords
  - [ ] Notifications: disable ANNOUNCEMENT email → create announcement returns `notification.emailEnabled: false`

### 2026-07-23 — Full Settings “make it work” roadmap

- **Change:** Audited all Settings tabs; documented gaps; phased plan (0–5) for reliability, Appearance/Grading apply, Security + Notifications MVP
- **Services:** identity, academic, comms, frontend-spa (by phase)
- **Status:** plan only (not implemented)
- **Verify (after implementation):** checklist in §4 per phase

### 2026-07-23 — Settings professional polish

- **Change:** Live `GET /api/schools/:id`; persist `country`; ISO→name country resolve; Executive Slate chrome; toasts; Layout Settings link roles
- **Services:** identity, frontend-spa
- **UI:** `/{slug}/settings`
- **Status:** done (superseded scope by roadmap above)

### 2026-07-22 — Settings polish + calendar visibility

- **Change:** Executive Slate settings shell; toast save feedback; form sync; academic calendar summary
- **Status:** done

---

## 7. Acceptance (cumulative)

### Already done
- [x] `GET /api/schools/:schoolId` returns tenant school for admins  
- [x] `country` on PATCH survives refresh  
- [x] CountryTimezoneFields English names / TZ filter  
- [x] No `window.alert` on gradebook save  
- [x] Settings chrome Executive Slate tokens  
- [x] Attendance rules persist on school (`payrollAttendanceRules`)

### Phase 0
- [x] Form rehydrates from API after refresh without stale auth-first state  
- [x] Attendance rules visibly saveable and reload correctly  

### Phase 1
- [x] Brand color visible in Layout (or documented shell accents) after Appearance save  
- [x] Grade/report template choice matches printed/previewed layout  

### Phase 2
- [x] Gradebook structure columns appear in grade entry  
- [x] Active legend used for letter mapping where applicable  

### Phase 3
- [x] Security policy form saves; short password rejected on change when min length raised  

### Phase 4
- [x] Notification toggles persist; disabling an event stops that email path  

### Explicitly deferred
- [ ] School-wide TOTP/SMS 2FA  
- [ ] Per-user notification mute / digests  
- [ ] Inline academic calendar editor inside Settings tab  
