# Parent Alternate Login — Implementation Plan

> **Status:** Proposed — reviewed against source on 2026-11-25  
> **Revision:** 3. Adds the concrete two-tab login UX and fixes the remaining model/policy issues found in the second review.  
> **Scope:** Add a second login credential for all `PARENT` users and an opt-in, school-scoped phone-number login path.  
> **Non-goals:** Changing staff/student login, replacing `ParentStudent` child authorization, building a new parent portal, or storing recoverable plaintext passwords.  
> **Companion:** `docs/PARENT_PORTAL_AND_PTA_PLAN.md`, `CREDENTIALS.md`, `FRONTEND_GUIDELINES.md`

---

## 0. Critical correctness and security fixes in this revision

1. **PAC moved off `User` into a school-scoped model.** A single PAC on `User` cannot support parents linked to students in multiple schools or parents with `schoolId = null` (`services/identity/prisma/schema.prisma:175`, `services/identity/src/services/userService.ts:503-546`). Use `ParentAccessCode` keyed by `(userId, schoolId)`.
2. **Phone login also moved into a school-scoped model.** A global toggle set by one school admin would leak into other schools for multi-school parents. Use `ParentPhoneLogin` keyed by `(userId, schoolId)`.
3. **Phone verification is now explicit.** Add `PARENT_PHONE_VERIFY` and a verification endpoint before an admin can approve `phoneVerifiedAt`.
4. **MFA policy is now explicit.** PAC replaces the password factor only; phone OTP replaces password + MFA only when SMS sign-in is allowed by school policy.
5. **Login success handling is canonicalized.** Password, MFA, PAC, and phone flows all use one client helper with the same ordering.
6. **Admin surface must reach four roles.** The role-access page is restricted to `SCHOOL_ADMIN`/`IT_ADMIN`; add a dedicated parent-access page with `action.parent_access.manage` and `nav.parent-access`.
7. **Gateway mappings are chosen, not left as alternatives.** Add Identity mappings for the new non-auth routes.
8. **SMS remains a release blocker.** Comms currently logs the code and only supports console mode.

---

## 1. Product intent and chosen UX

Keep email + password unchanged. Add two parent-only alternatives.

| Method | Availability | Parent experience | Factor |
| :--- | :--- | :--- | :--- |
| Email + password | All users, unchanged | Email + password | Password |
| **Parent Access Code (PAC)** | **All parents** | Choose school → enter 6-digit code | School-scoped PAC |
| **Phone sign-in** | **Opt-in per parent per school** | Choose school → phone → SMS code | Registered phone + OTP |

### Best login-page UX decision

Use **two top-level tabs**, not three:

1. **Email & password** — default tab, existing form.
2. **Parent code** — parent-only tab.

Inside the **Parent code** tab, use a small secondary selector:

- `6-digit code` — default; enter school + PAC.
- `Mobile number` — shown only when the global flag `PARENT_PHONE_LOGIN_ENABLED=true`; enter school + phone → send code → enter SMS code.

Why this is best:

- Keeps the login card calm and familiar (`FRONTEND_GUIDELINES.md:64-74`).
- Avoids a third tab that most schools will not enable.
- Pac and phone both need school context, so they belong in the same tab.
- Email/password users are unaffected.

Phone number alone is never a credential. The mobile sub-mode always requires school + phone + SMS code.

---

## 2. Current state

### Reusable pieces

- Login route: `services/identity/src/routes/authRoutes.ts:16`
- School-login JWT minting is duplicated in password/MFA paths and should be consolidated:
  - `services/identity/src/services/authService.ts:21-127`
  - `services/identity/src/services/mfaService.ts:352-385`
  - Refresh (`authService.ts:129-216`) and Super Admin minting (`authService.ts:218-265`, `mfaService.ts:327-350`) stay separate by design.
- JWT payload: `{ id, email, role, schoolId, schoolStatus, capabilities }` at `services/identity/src/services/authService.ts:87-98`
- Login audit logging: `services/identity/src/controllers/authController.ts:5-16,20-143`
- Login rate limiter: `services/identity/src/middleware/rateLimit.ts:135-140`
- SMS challenge table: `services/identity/prisma/schema.prisma:255-267`
- Identity-to-Comms SMS client: `services/identity/src/lib/smsOtpClient.ts:4-28`
- Parent creation helper: `services/identity/src/services/userService.ts:899-1028`
- Parent linking: `services/identity/src/services/userService.ts:1030-1036`
- School user list: `services/identity/src/services/userService.ts:338-381`
- Parent directory API: `services/identity/src/services/superAdminService.ts:140-187` — currently misses `schoolId = null` parents linked by `ParentStudent`.
- Parent children lookup: `services/identity/src/services/userService.ts:824-888` — still has a legacy email/`parentPhone` fallback.
- Login UI: `src/pages/Login.tsx:35-219,280-452`.
- Existing tab pattern: `src/features/gradebook/components/GradebookModeSwitch.tsx:19-42`.
- Auth i18n source: `src/i18n/catalogs/en.ts:337-408`; locale files `src/i18n/catalogs/locales/{fr,ar,es,de,zh-Hans,hi}.ts:305-366`; curated overrides `src/i18n/catalogs/translations.ts:216,1717,2151,2594,3037,3464`.

### Gaps and unsafe patterns

- No PAC/phone-login model, generation, or login path.
- `generateSmsCode()` uses `Math.random` (`services/identity/src/services/mfaService.ts:52-54`).
- Comms logs the OTP and only supports console mode (`services/comms/src/services/smsOtpService.ts:29-42`).
- `findOrCreateUser` returns full rows including `passwordHash` (`services/identity/src/services/userService.ts:917-954,1027`).
- Seed/demo parent creation bypasses `findOrCreateUser` (`services/identity/prisma/seed.ts:25-46,129-152`).
- Current MFA input has no `maxLength`/digit sanitization (`src/pages/Login.tsx:291-303`).
- Current MFA success path has no school-slug guard and hardcodes Super Admin redirect (`src/pages/Login.tsx:203-205`).

---

## 3. Target behavior

### 3.1 Parent Access Code

1. Every `PARENT` gets one active 6-digit PAC **for every school context** where that parent is registered/linked.
2. PACs are created by `findOrCreateUser`, seed, and an idempotent backfill job.
3. Store only:
   - `codeHash` — bcrypt for verification.
   - `codeLookupHash` — HMAC-SHA256 for indexed lookup.
4. The plaintext code is returned once and optionally emailed/SMSed.
5. Admin can regenerate a PAC. Regeneration invalidates the old code immediately and clears counters/locks.
6. PAC login requires `schoolSlug`; the lookup hash is unique globally and the resolved row's school is verified against the slug.
7. PAC replaces the password factor only. If school MFA policy requires/challenges PARENT, the existing MFA step still runs after PAC.

### 3.2 Phone sign-in

1. Parent submits a request with school + phone from `/:slug/profile` Security tab.
2. System sends `PARENT_PHONE_VERIFY` OTP; parent verifies the number.
3. `SCHOOL_ADMIN`, `REGISTRAR`, `PRINCIPAL`, `IT_ADMIN` approve/reject via the parent-access capability. Approval requires `verifiedAt`.
4. `SUPER_ADMIN` uses a separate audited support path with `users.parent_access.manage`.
5. Parent signs in with school + phone + `PARENT_PHONE_LOGIN` OTP.
6. Phone OTP counts as password + MFA only when school SMS sign-in is allowed; otherwise login is blocked with a clear, non-enumerating message.
7. Disabling phone login stops new sign-ins. Existing JWTs remain valid for up to 8 hours; document this.

---

## 4. Data model

Authoritative schema: `services/identity/prisma/schema.prisma`.

### 4.1 `ParentAccessCode` (new)

```prisma
model ParentAccessCode {
  id                 String    @id @default(cuid())
  userId             String
  schoolId           String
  codeHash           String
  codeLookupHash     String    @unique
  codeHint           String
  secretVersion      Int       @default(1)
  issuedAt           DateTime  @default(now())
  deliveredAt        DateTime?
  failedCount        Int       @default(0)
  lockedUntil        DateTime?
  revokedAt          DateTime?

  user               User      @relation("ParentAccessCodes", fields: [userId], references: [id], onDelete: Cascade)
  school             School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@unique([userId, schoolId])
  @@index([schoolId, issuedAt])
  @@schema("identity")
}
```

Back-relations:

- `User.parentAccessCodes ParentAccessCode[] @relation("ParentAccessCodes")`
- `School.parentAccessCodes ParentAccessCode[]`

Rules:

- `codeLookupHash = HMAC-SHA256(PARENT_PAC_SECRET, secretVersion + ":" + schoolId + ":" + code)`.
- `codeHash = bcrypt(code, 10)`.
- `codeHint` is at most `••••42`.
- Retry generation on the rare unique-hash collision.
- Regeneration overwrites hashes/hint/version, resets `deliveredAt`, `failedCount`, `lockedUntil`, and audits.
- Secret rotation requires full regeneration of all rows; the backfill filter “no hash” is not enough.

### 4.2 `ParentPhoneLogin` (new)

```prisma
model ParentPhoneLogin {
  id               String    @id @default(cuid())
  userId           String
  schoolId         String
  phoneE164        String
  verifiedAt       DateTime?
  enabled          Boolean   @default(false)
  failedCount      Int       @default(0)
  lockedUntil      DateTime?
  lastCodeSentAt   DateTime?
  codesSentWindow  Int       @default(0)
  windowStartedAt  DateTime?

  user             User      @relation("ParentPhoneLogins", fields: [userId], references: [id], onDelete: Cascade)
  school           School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@unique([userId, schoolId])
  @@unique([schoolId, phoneE164])
  @@index([schoolId, enabled])
  @@schema("identity")
}
```

Back-relations:

- `User.parentPhoneLogins ParentPhoneLogin[] @relation("ParentPhoneLogins")`
- `School.parentPhoneLogins ParentPhoneLogin[]`

`phoneE164` validation: `/^\+[1-9]\d{7,14}$/`, shared with `services/identity/src/services/mfaService.ts:205-208`.

### 4.3 `ParentPhoneLoginRequest` (new)

```prisma
model ParentPhoneLoginRequest {
  id                    String    @id @default(cuid())
  schoolId              String
  parentId              String
  phoneE164             String
  status                String    @default("PENDING") // PENDING | VERIFIED | APPROVED | REJECTED
  requestedAt           DateTime  @default(now())
  verifiedAt            DateTime?
  verificationChallenge String?
  reviewedAt            DateTime?
  reviewedById          String?
  reviewNote            String?

  school                School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  parent                User      @relation("ParentPhoneLoginRequests", fields: [parentId], references: [id], onDelete: Cascade)
  reviewedBy            User?     @relation("ReviewedParentPhoneLoginRequests", fields: [reviewedById], references: [id], onDelete: SetNull)

  @@index([schoolId, status])
  @@index([parentId, requestedAt])
  @@schema("identity")
}
```

Back-relations:

- `User.phoneLoginRequests ParentPhoneLoginRequest[] @relation("ParentPhoneLoginRequests")`
- `User.reviewedPhoneLoginRequests ParentPhoneLoginRequest[] @relation("ReviewedParentPhoneLoginRequests")`
- `School.parentPhoneLoginRequests ParentPhoneLoginRequest[]`

Add a raw partial unique index in the migration:

```sql
CREATE UNIQUE INDEX "parent_phone_login_request_one_pending"
ON "identity"."ParentPhoneLoginRequest" ("parentId", "schoolId")
WHERE "status" = 'PENDING';
```

Do not use `@@unique([parentId, status])`: it would block multiple historical `REJECTED` rows and allow races without the partial index.

### 4.4 SMS challenge purposes

Use shared purpose constants:

- `ENROLL` — existing SMS MFA enrollment
- `LOGIN` — existing staff MFA
- `PARENT_PHONE_VERIFY` — verify a newly requested phone
- `PARENT_PHONE_LOGIN` — parent phone sign-in

Add `scopeKey String?` to `MfaSmsChallenge` and index `[userId, purpose, phoneE164, scopeKey]`. For parent purposes, `scopeKey` is the resolved `schoolId`.

Do not call `verifyLoginCode()` directly; it also accepts TOTP/backup codes (`services/identity/src/services/mfaService.ts:282-300`). Existing helpers delete/find challenges by `(userId, purpose)` only (`mfaService.ts:56-78`, `schema.prisma:255-267`), which would let two school-scoped phone requests overwrite each other. Implement parent-specific create/verify helpers scoped by `(userId, purpose, phoneE164, scopeKey)` with a matching index, and do not reuse the existing helpers.

### 4.5 Root schema

Root `prisma/schema.prisma` is stale and has no MFA models (`prisma/schema.prisma:1-11,258-319`). Treat identity schema as authoritative. Mirror only if root tooling must compile.

---

## 5. Domain logic, capabilities, and policy

Create `services/identity/src/domain/parentAccess.ts`.

Functions:

- `generateParentAccessCode()` — `crypto.randomInt(0, 1_000_000)`, zero-padded.
- `makeParentAccessLookupHash(schoolId, code, secretVersion)` — HMAC-SHA256.
- `hashParentAccessCode(code)` / `verifyParentAccessCode(code, hash)` — bcrypt cost 10.
- `maskParentAccessCode(code)`.
- `normalizePhone(input, defaultCountryCode?)` — E.164.
- `canManageParentAccess(actor, targetSchoolId)` — four school roles when tenant matches.

Capability changes:

- Add `action.parent_access.manage` and `nav.parent-access` to:
  - `services/identity/src/lib/capabilities.ts:9-418` catalog
  - `services/identity/src/lib/capabilities.ts:420-773` defaults
  - `src/lib/capabilities.ts` matching SPA copies
- Default both enabled for `SCHOOL_ADMIN`, `REGISTRAR`, `PRINCIPAL`, `IT_ADMIN`.
- Do not add to `LOCKED_KEYS_FOR_SCHOOL_ADMIN` (`services/identity/src/lib/capabilities.ts:775-801`) unless required.
- Add Super Admin capability `users.parent_access.manage` to `SA_CAPABILITY_LABELS`, `BY_ROLE` (`services/identity/src/domain/saCapabilities.ts:33-91`), and grant it explicitly to `OWNER` (via `ALL`) and `SUPPORT`. A missing label will fail type-checking because labels are typed as `Record<SaCapability, string>`.
- `shared/role-capability-defaults.json` is drifted and has no runtime importer; regenerate it from TS and add a drift test, or remove it from implementation steps.

MFA policy:

- PAC login calls `checkLoginMfa` (`services/identity/src/services/mfaService.ts:388-407`) with the school resolved from `schoolSlug`, not `user.school` (which is nullable). For `challenge`, return the existing MFA response; handle the thrown `MFA_ENROLLMENT_REQUIRED` at `:393-398` as the existing enrollment-required error.
- Phone OTP login bypasses `checkLoginMfa` only when school `allowSmsMfa` is true; otherwise block with `PARENT_PHONE_LOGIN_NOT_ALLOWED` after credential verification.
- If `allowSmsMfa` is false, the parent can still use PAC/email login.

---

## 6. Backend implementation

### 6.1 Shared login completion

Scope one helper to **school login completion only** (password, PAC, phone, and their MFA continuation):

```ts
completeSchoolLogin(user, { authMethod, schoolId, requestContext, mfaSatisfied = false })
```

Do **not** fold in `authService.sessionForUserId` (`authService.ts:129-216`, used by `/api/auth/me`) or Super Admin minting (`authService.ts:141-165,218-265`, `mfaService.ts:327-350`); keep separate refresh/Super Admin helpers.

Gate matrix:

| Path | Gates before completion |
| :--- | :--- |
| Password | active → email verification → maintenance → school status/trial → capability resolution → MFA decision |
| PAC | same as password; MFA decision uses school resolved from `schoolSlug` |
| Phone OTP (`allowSmsMfa=true`) | active → email verification → maintenance → school status/trial → capability resolution; skip `checkLoginMfa` because OTP satisfies MFA |
| MFA continuation | re-check active/school status, then complete with `mfaSatisfied=true`; do not call `checkLoginMfa` again |

Entitlements/quotas remain response context, not new blocking gates.

MFA continuation: `mfaService.ts:179-193` signs the pending token with only `{ id, purpose }`. Include a server-signed `authMethod` and resolved `schoolId`/`schoolSlug` in that token (or a server-side challenge record). `mfaController.ts:30-38` keeps forwarding only `mfaToken + code`; the service decodes that signed context and passes it to `completeSchoolLogin` with `mfaSatisfied=true` so audit events remain accurate and no second challenge is issued.

### 6.2 Auth endpoints

Files: `services/identity/src/routes/authRoutes.ts:16-56`, `services/identity/src/controllers/authController.ts`, `services/identity/src/validation/schemas.ts:57-60`, `services/identity/src/services/authService.ts`

Schemas:

```ts
accessCodeLoginSchema   // { schoolSlug, code /^\d{6}$/ }
phoneCodeSendSchema     // { schoolSlug, phone }
phoneLoginSchema        // { schoolSlug, phone, code /^\d{6}$/ }
```

Routes:

| Method | Route | Purpose |
| :--- | :--- | :--- |
| POST | `/api/auth/parent/access-code/login` | PAC login |
| POST | `/api/auth/parent/phone/send-code` | Send `PARENT_PHONE_LOGIN` OTP |
| POST | `/api/auth/parent/phone/login` | Verify OTP and create session |
| GET | `/api/public/parent-login-config` | Expose only `parentPhoneLoginEnabled` for the login UI |

Rules:

- Check global `PARENT_PHONE_LOGIN_ENABLED` in send-code and login.
- Resolve `schoolId` from `schoolSlug` first; never trust a client-supplied school ID.
- PAC lookup: HMAC index → verify bcrypt → verify row school matches slug → verify `user.role === "PARENT"` → check active/school gates.
- Phone lookup: `(schoolId, phoneE164)` → `enabled && verifiedAt` → verify challenge with `scopeKey = schoolId` → gates.
- Generic failure before credential verification: `INVALID_CREDENTIALS`.
- After valid credential/code, explicit `CODE_EXPIRED` / `TOO_MANY_ATTEMPTS` are acceptable.
- `send-code` always returns the same response and rate-limits by HMAC(`ip|schoolSlug|phoneHash`).

Gateway: `/api/auth/*` already routes to Identity and bypasses API-key auth (`services/gateway/src/server.ts:146-152,417-421`). No gateway change for the three auth endpoints. `/api/public/parent-login-config` is already covered by the public prefix (`services/gateway/src/server.ts:191-193,419`); implement it in `services/identity/src/routes/publicRoutes.ts:1-91` and add a contract test.

### 6.3 Rate limits and lockout

- Account-level counters in `ParentAccessCode` / `ParentPhoneLogin` are authoritative: 5 failed attempts / 15m, then 15m lock.
- PAC IP limiter: HMAC(`ip|schoolSlug`), because code rotation would weaken a code-based key.
- Phone send limiter: HMAC(`ip|schoolSlug|phoneHash`), 3 codes / 10m with 60s cooldown.
- Phone login limiter: HMAC(`ip|schoolSlug|phoneHash`), 5 / 15m.
- `keyFn` stays synchronous and pure; its result is logged on 429 (`services/identity/src/middleware/rateLimit.ts:53,78,116`), so never include raw code/phone.
- Reconcile Comms’ in-memory 5/hour OTP cap (`services/comms/src/services/smsOtpService.ts:6-16`) with the 3/10m rule; make it configurable or bypass it for parent purpose.

### 6.4 Request and admin endpoints

| Method | Route | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| POST | `/api/parents/me/phone-login-request` | `PARENT` self | Submit request |
| GET | `/api/parents/me/phone-login-request` | `PARENT` self | View status |
| POST | `/api/parents/me/phone-login-request/:id/send-code` | `PARENT` self | Send `PARENT_PHONE_VERIFY` |
| POST | `/api/parents/me/phone-login-request/:id/verify` | `PARENT` self | Verify phone |
| GET | `/api/schools/:schoolId/parent-phone-login-requests` | four roles + capability | Review queue |
| POST | `/api/parent-phone-login-requests/:id/approve` | four roles + capability | Enable phone login |
| POST | `/api/parent-phone-login-requests/:id/reject` | four roles + capability | Reject |
| PATCH | `/api/users/:userId/parent-login` | four roles + capability | Direct toggle/correction |
| POST | `/api/users/:userId/parent-access-code/regenerate` | four roles + capability | Regenerate PAC |
| POST | `/api/users/:userId/parent-login/reset-lockout` | four roles + capability | Reset counters |

Middleware:

- Add `requireRoles(["SCHOOL_ADMIN","REGISTRAR","PRINCIPAL","IT_ADMIN"])` **and** `requireCapability("action.parent_access.manage", [...])`; capability alone is insufficient (`services/identity/shared/src/middleware/auth.ts:159-175`).
- Use `requireTenant` for school-scoped list routes; use `requireResourceTenant` with a null-school-aware loader elsewhere (`services/identity/src/services/userService.ts:503-546`).
- Self routes force `parentId = req.user.id`.
- Super Admin routes use `/api/super-admin/schools/:id/parents/:userId/...` (match existing `:id` style at `services/identity/src/routes/superAdminRoutes.ts:15-18`) and call `assertSaCapability(normalizeSaPlatformRole(actor.platformRole), "users.parent_access.manage")` (`services/identity/src/domain/saCapabilities.ts:119-126`) or `platformOpsService.assertSaCapability(actor, cap)` (`services/identity/src/services/platformOpsService.ts:276`).

Approval:

- Require request `status === "VERIFIED"` and `verifiedAt != null`.
- Upsert `ParentPhoneLogin` for `(userId, schoolId)` with phone/verified/enabled.
- Reject duplicate phone in that school.
- Audit.

Toggle-off:

- Set `enabled = false`; delete pending `PARENT_PHONE_LOGIN` challenges.

### 6.5 Gateway changes

Chosen scheme: add mappings, do not rename endpoints.

- `/api/parents/...` already resolves to Identity (`services/gateway/src/server.ts:191-193`).
- Add `/api/parent-phone-login-requests` to Identity prefixes.
- Add `"parent-phone-login-requests": "identity"` to `SCHOOL_SUFFIX_TO_SERVICE` (`services/gateway/src/server.ts:59-135`).
- Add a gateway contract test.

### 6.6 Generation hooks and backfill

Primary hook: `findOrCreateUser` (`services/identity/src/services/userService.ts:899-1028`).

- Call idempotent `ensureParentAccessCode(userId, schoolId)` for both new and existing parents. An existing parent returned early at `:917-954` still needs a PAC when a new school context appears.
- Hook `createParentLink(parentId, studentId)` (`:1030-1036`) to call `ensureParentAccessCode(parentId, student.schoolId)` so later links also get a PAC.
- Use transaction/upsert; current `findUnique` + `create` is racy (`:917,972`).
- Propagate `parentAccessCode` through createStudent, bulk import, lifecycle enrollment, internal find-or-create, and seed.
- Add seed generation or run backfill after seed (`services/identity/prisma/seed.ts:25-46,129-152`).

Backfill job:

- Insert `ParentAccessCode` rows for every `(parent, school)` context.
- Resolve `schoolId` from explicit parent school or distinct linked student schools.
- Create one code per school context; no “first linked student”.
- Support `--regenerate-all` for secret rotation.
- Produce a secure per-school distribution CSV: `userId, name, email, schoolSlug, accessCode`. This is the only allowed code-bearing CSV: one-off, access-controlled, encrypted at rest, expiring, and generated by this backfill job only.
- Never print codes to logs.

### 6.7 Delivery

Email:

- Add `parent_access_code` to `EmailMessageKey` and all seven catalogs (`services/identity/src/i18n/emailCatalogs.ts:3,5-16,21`).
- Use `tEmail(locale, "parent_access_code", { schoolName, name, code, loginUrl })`.
- Extend `tests/email-i18n.test.ts:5-8,24-43`.

SMS:

- Extend Comms internal payload for purpose/school name.
- Remove/gate code logging.
- Add `COMMS_URL` to `.env.example`.
- Real SMS provider is a production blocker.

### 6.8 Directory DTOs

Extend parent directory/admin APIs with non-secret metadata from the new models:

- PAC: `codeHint`, `issuedAt`, `deliveredAt`, `lockedUntil`
- Phone: `phoneE164`, `verifiedAt`, `enabled`, `lockedUntil`

Files:

- `services/identity/src/services/superAdminService.ts:81-93,140-187`
- `services/identity/src/services/userService.ts:360-381,503-546`
- `src/features/role-access/api.ts:3-12`
- `src/pages/SuperAdmin/SchoolDetail.tsx:66-74`

Rules:

- No hashes/full codes in list APIs or the general CSV export (`services/identity/src/services/platformOpsService.ts:1005-1033`); the backfill distribution CSV is the sole documented exception.
- Fix Super Admin parent directory `where` to include `schoolId = null` parents linked by `ParentStudent`.
- Phone is PII; expose only to authorized staff/support.

---

## 7. Frontend implementation

### 7.1 Two-tab login page

File: `src/pages/Login.tsx`

State:

```ts
type LoginTab = "password" | "parentCode";
type ParentCodeMode = "code" | "phone";
```

Layout:

- Tabs inserted at `:280`, before the `mfaToken ?` branch.
- Hide tabs while `mfaToken` is set; show “Back to password/parent code” in the MFA form.
- Reuse segmented-control pattern from `src/features/gradebook/components/GradebookModeSwitch.tsx:19-42`, but use login blue (`FRONTEND_GUIDELINES.md:95`), not indigo.

**Tab 1 — Email & password**

- Existing form at `:358-451`, unchanged fields.
- Default active tab.
- Keep “Forgot password?”.

**Tab 2 — Parent code**

- School field in both sub-modes:
  - Prefill from `hostSchool` (`Login.tsx:51-73`) or `?school=` query param.
  - Editable because parents may use a generic domain.
  - Store `schoolSlug`, submit as `schoolSlug`.
- Sub-selector: `6-digit code` / `Mobile number`.
- `6-digit code` form:
  - Label: “Parent access code”.
  - Use a shared `SixDigitInput` with `font-mono tracking-widest text-center`, `inputMode="numeric"`, `autoComplete="one-time-code"`, `maxLength={6}`, `pattern="[0-9]*"`, digit-only sanitization, and paste handling.
  - Apply the same `SixDigitInput` to the existing MFA code field at `Login.tsx:291-303` so the documented `maxLength`/sanitization gap is closed.
  - Submit disabled until exactly 6 digits.
  - Helper: “Ask your school for your 6-digit parent code.”
  - Link: “Forgot your code? Contact your school.”
- `Mobile number` form:
  - Show only if `PARENT_PHONE_LOGIN_ENABLED=true` is exposed via a public config endpoint.
  - Phone input + “Send code”; after send, show masked phone + 6-digit SMS input + resend cooldown.
  - Submit disabled until exactly 6 digits.
- Error alert uses existing `LoginErrorAlert` (`src/pages/LoginErrorAlert.tsx:13-157`).

Accessibility:

- `role="tablist"`, `role="tab"`, `aria-selected`, arrow-key navigation.
- Focus first input on tab/sub-mode change.
- `aria-live="assertive"` already in `LoginErrorAlert`.
- Distinct input IDs: `login-parent-code`, `login-parent-phone`, `login-parent-phone-code`.

### 7.2 Canonical success handler

Extract `completeClientLogin(data, { activeTab })` and use it from password, MFA, PAC, and phone flows.

Ordering:

1. Handle `SCHOOL_SUSPENDED` / `TRIAL_EXPIRED` (existing password logic at `Login.tsx:121-133`).
2. For non-`SUPER_ADMIN`, require `data.school?.slug` before `setAuth`.
3. `setAuth(...)` with same arguments as `:151-158`.
4. `changeAppLocale(resolveEffectiveLocale(...))`.
5. `navigate(getPostLoginPath(data.user, data.school ?? null))` (`src/lib/postLoginPath.ts:6-11`).

Remove the MFA hard reload at `Login.tsx:203-205`; use `getPostLoginPath` for all roles.

### 7.3 Error classification and i18n

Extend `src/lib/loginError.ts:10-57` before status fallback (`:67-83`):

- `CODE_EXPIRED` → `codeExpired`
- `TOO_MANY_ATTEMPTS` → `rateLimited`
- `PARENT_PHONE_LOGIN_NOT_ALLOWED` → `forbidden`
- `PARENT_PHONE_VERIFICATION_REQUIRED` → `form`

Extend `LoginErrorAlert.tsx` cases and add keys under `auth:loginError.*`.

Add tabs/copy keys to every auth catalog:

- `src/i18n/catalogs/en.ts:337-408`
- `src/i18n/catalogs/locales/{fr,ar,es,de,zh-Hans,hi}.ts:305-366`
- `src/i18n/catalogs/translations.ts:216,1717,2151,2594,3037,3464`

Suggested keys:

- `tabs.password`, `tabs.parentCode`
- `parentCode.title`, `parentCode.school`, `parentCode.code`, `parentCode.codeHint`, `parentCode.forgot`
- `parentCode.mode.code`, `parentCode.mode.phone`
- `parentCode.phone`, `parentCode.sendCode`, `parentCode.resend`, `parentCode.smsHint`
- `loginError.codeExpiredTitle/Message/Hint`

Run `npm run i18n:check` (`package.json:108`).

### 7.4 Parent request UI

Target: `/:slug/profile` Security tab (`src/App.tsx:310-333,347`, `src/pages/School/Profile.tsx:479-501,731-737`, `src/features/profile/components/SecurityTab.tsx`), not `/settings`.

States: `None → PENDING → VERIFIED → APPROVED` or `REJECTED`.

Show which phone is used for sign-in. Do not conflate with MFA SMS phone in `MfaProfilePanel.tsx:169-205`.

### 7.5 Admin UI

Use a dedicated `/parents` page for the four approver roles, not only `src/features/role-access/Page.tsx:249-318`.

Update:

- `src/App.tsx` route near the current roles route (`:688-695`) with roles four + `requiredCapability="action.parent_access.manage"`.
- `src/constants/navByRole.ts:69-112` add `parents` to four role maps; `:139-193` add nav section.
- `src/lib/capabilities.ts:812-816` route-segment mapping.
- i18n labels and `tests/spa/route-matrix.test.ts:20-36`.

Page contains:

- parent search/filter by school
- PAC hint/status + regenerate action (shows new code once)
- phone status + toggle
- request review queue with verify evidence
- reset-lockout action

Super Admin support stays in `src/pages/SuperAdmin/SchoolDetail.tsx:66-74,696-799` via the support endpoint with `users.parent_access.manage`.

### 7.6 Bulk import and enrollment

- `src/features/bulk-import/parseSpreadsheet.ts:127-158`: add `parentAccessCode?: string` and `PARENT_ACCESS_CODE` column; update `tests/bulk-import.test.ts:14,214-230`.
- `src/features/registrar/components/EnrollCredentialsModal.tsx:6-12,88-110`: add `parentAccessCode?: string`.
- Keep canonical field name `parentAccessCode`; existing password keys unchanged.

---

## 8. Audit events

Use `logSystemEvent` (`services/identity/src/controllers/authController.ts:5-16`) and `SystemLog` (`services/identity/prisma/schema.prisma:300-365`). Add `ACCESS_CODE` / `PHONE_OTP` to the `authMethod` comment at `:320`.

Required events:

- `parent_access_code_issued`
- `parent_access_code_regenerated`
- `parent_access_code_login_success` / `_failed`
- `parent_phone_login_requested`
- `parent_phone_verified`
- `parent_phone_login_enabled` / `_disabled`
- `parent_phone_code_sent`
- `parent_phone_login_success` / `_failed`
- `parent_login_lockout_reset`

Never log raw code/OTP. Extend logger redaction (`services/identity/src/utils/logger.ts:48-52`) for `code`, `accessCode`, `parentAccessCode`, `codeLookupHash`, `phoneE164`. Use `SECRET`/`PII` sensitivity correctly (`services/identity/src/domain/auditCategories.ts:47-48`).

---

## 9. Security requirements

1. PAC stored only as HMAC lookup hash + bcrypt verification hash in school-scoped row.
2. Phone sign-in stored only in school-scoped verified/enabled row.
3. OTP stored only as existing hashed challenge.
4. No codes/hashes in logs, list APIs, general CSV exports, or rate-limit keys; the one-off encrypted backfill distribution CSV is the sole exception.
5. School slug is always resolved server-side; client school IDs are ignored.
6. New methods reject non-`PARENT` users explicitly.
7. Tenant checks handle `schoolId = null` parents via `ParentStudent`.
8. Generic errors before credential verification.
9. Account lockouts are authoritative; IP limiters are supplementary.
10. Regeneration/secret rotation invalidates old PACs and clears locks.
11. Phone approval requires verification evidence.
12. Child authorization unchanged; do not rely on the legacy parent fallback (`userService.ts:845-870`).
13. Existing JWTs remain valid up to 8 hours; document or add `securityVersion` later.

---

## 10. Tests

### Unit tests

Create `tests/parent-access-code.test.ts` as a plain `tsx` script.

Cover:

- 6-digit generation/zero-padding
- HMAC lookup + bcrypt verify
- collision retry
- masking
- phone normalization
- `canManageParentAccess` matrix
- regeneration resets
- lockout transitions

Extend:

- `tests/identity-capabilities.test.ts`
- `tests/email-i18n.test.ts`
- `tests/bulk-import.test.ts`
- capability drift test for TS ↔ JSON
- `tests/spa/route-matrix.test.ts` for `/parents`

Add `"test:parent-access": "tsx tests/parent-access-code.test.ts"` and append to `package.json:110` `test:unit`.

### Integration/API tests

Create `tests/contracts/parent-access.test.ts`.

Cover:

- PAC per school context; null-school parent resolves correctly
- PAC returned once and absent from later reads
- PAC login school mismatch rejected
- PAC + MFA policy behavior
- phone request → verify → approve → send → login
- phone login blocked when flag off / school policy disallows SMS
- challenge purposes cannot be mixed (`ENROLL`, `LOGIN`, `PARENT_PHONE_VERIFY`, `PARENT_PHONE_LOGIN`)
- four-role + capability enforcement; Super Admin support capability
- lockout/reset behavior
- DTO secret stripping
- gateway route resolution
- i18n `i18n:check`

### Manual QA

- Two tabs render correctly RTL/LTR; tab keyboard navigation works.
- PAC tab: school prefills from host, can be changed; 6 digits required.
- Phone sub-mode hidden when global flag off; visible with cooldown when on.
- Regenerated PAC stops working; new one works.
- Multi-child parent sees only linked children after alternate login.

---

## 11. Rollout

| Phase | Work | Exit criteria |
| :--- | :--- | :--- |
| 0 | Decisions, SMS provider, feature flag | Real SMS path or phone login disabled in prod |
| 1 | Schema/models/migration, capability, gateway | Migration + unit tests pass |
| 2 | Generation hooks, seed/backfill, DTOs | Every parent has PAC per school; no secret leaks |
| 3 | Auth endpoints, rate limits, audit | Integration tests pass |
| 4 | Parent request UI + `/parents` admin UI | Four roles can approve; SA isolated |
| 5 | Two-tab login UI + i18n | E2E manual login succeeds |
| 6 | Pilot one school | Support runbook reviewed |
| 7 | General release | Docs updated |

---

## 12. Configuration

Add to `.env.example` near `SMS_PROVIDER` (`.env.example:35-36`):

```env
PARENT_PAC_SECRET=
PARENT_PAC_SECRET_VERSION=1
PARENT_PHONE_LOGIN_ENABLED=false
PARENT_PHONE_OTP_TTL_MINUTES=10
PARENT_PHONE_OTP_RESEND_SECONDS=60
PARENT_PHONE_OTP_MAX_SENDS=3
PARENT_ACCESS_ATTEMPT_LIMIT=5
PARENT_ACCESS_LOCK_MINUTES=15
DEFAULT_COUNTRY_CODE=
COMMS_URL=http://localhost:3017
```

Notes:

- `PARENT_PAC_SECRET` is **required in production**; fail fast on an empty value when `NODE_ENV=production`, matching the pattern used for `MFA_ENCRYPTION_KEY` (`.env.example:30-31`).
- PAC length is fixed at 6.
- TTL stays 10 minutes to match `mfaService.ts:59`; update Comms copy if changed.
- Rotate `PARENT_PAC_SECRET` by incrementing version and running full regeneration.
- Phone UI/mode is hidden until `PARENT_PHONE_LOGIN_ENABLED=true`.

---

## 13. Acceptance criteria

- [ ] Every `PARENT` has a PAC for every school context.
- [ ] Email/password login unchanged.
- [ ] Two-tab login implemented with parent-code tab and mobile sub-mode.
- [ ] Parent can log in with school + PAC and see only linked children.
- [ ] Phone login is requested, verified, approved per parent per school.
- [ ] All login methods use one success handler and same JWT shape.
- [ ] No secrets in APIs, logs, general CSV exports, or rate-limit keys; backfill distribution CSV is access-controlled and expiring.
- [ ] Gateway, capability, i18n, lockout, and audit tests pass.

---

## 14. Open product items

1. PAC remains valid until regenerated (assumed).
2. PAC emailed at creation + one-time admin reveal (assumed).
3. Super Admin support can regenerate with `users.parent_access.manage` (assumed).
4. Phone changes require a new verified request (assumed).
5. MFA SMS phone remains separate from phone sign-in phone (assumed).
6. Legacy email/`parentPhone` child fallback should be removed in a separate hardening task.
