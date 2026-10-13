# School-wide TOTP / SMS 2FA — Implementation plan

> **Status:** Done for v1 scope (2026-08-06) — TOTP + SMS enroll/login, school policy UI; admin MFA reset deferred (Phase D)  
> **Goal:** Optional **school-enforced** second factor at login for staff (and optionally students/parents), starting with **TOTP authenticator apps**; SMS as a later phase when Comms + billing are ready  
> **Companion:** `docs/SCHOOL_SETTINGS_PLAN.md`, `docs/SA_PLATFORM_SECURITY_AND_ACTIVITY_PLAN.md`, `ROLES_DOCUMENTATION.md`, `IMPLEMENTATION_STATUS.md`

---

## 0. Problem today

- School Settings → Security shows honest copy: **MFA / SSO not available yet** (`pages.settings.security.mfaBody`).
- Super Admin Settings → Security shows **“Coming soon”** for platform 2FA — separate epic in `docs/SA_PLATFORM_SECURITY_AND_ACTIVITY_PLAN.md`.
- Identity enforces **password policy** (`School.securityPolicy` JSON) only — no `UserMfaSecret`, no login challenge step.
- JWT remains **8h stateless**; no step-up or refresh-token store.

**Definition of done (this plan):** A school admin can require 2FA for selected roles; enrolled users complete TOTP setup; login returns a short-lived **MFA pending** token until TOTP verifies; audit rows for enroll/verify/fail; honest UI when SMS is not configured.

---

## 1. Scope

### In scope (v1)

| # | Capability | Notes |
| :--- | :--- | :--- |
| 1.1 | **TOTP enroll** (RFC 6238) | QR + manual secret; backup codes (one-time, hashed) |
| 1.2 | **School policy** | `securityPolicy.mfaMode`: `OFF` \| `OPTIONAL` \| `REQUIRED`; `mfaRequiredRoles[]` |
| 1.3 | **Login challenge** | Password OK → `mfaRequired` + pending token → `POST /api/auth/mfa/verify` → access JWT |
| 1.4 | **Profile / Settings UI** | Enroll, disable (with password), regenerate backup codes |
| 1.5 | **Audit** | `mfa_enrolled`, `mfa_disabled`, `mfa_verify_success`, `mfa_verify_failed` in SystemLog |
| 1.6 | **Super Admin bypass** | Platform operators unchanged until SA plan ships platform MFA |

### Phase 2 (same plan doc, later PR)

| # | Capability | Notes |
| :--- | :--- | :--- |
| 2.1 | **SMS OTP** | Comms or Identity sends code; rate limit; school pays via existing mail/SMS provider config |
| 2.2 | **Preferred method** | User picks TOTP vs SMS when both enabled |

### Explicitly out of scope

- SSO / OAuth / SAML  
- WebAuthn / passkeys  
- IP allowlists  
- Per-device “remember this browser” (optional v1.1 — document as follow-up)  
- Student under-13 SMS constraints beyond existing age paths  

---

## 2. Owning services & key files

| Layer | Service | Key paths |
| :--- | :--- | :--- |
| Schema | **identity** | `services/identity/prisma/schema.prisma` — `UserMfaEnrollment`, extend `School.securityPolicy` / parse in `lib/securityPolicy.ts` |
| Auth | **identity** | `services/identity/src/services/authService.ts`, `controllers/authController.ts`, `routes/authRoutes.ts` |
| Policy | **identity** | `services/identity/src/lib/securityPolicy.ts`, `schoolService.ts` PATCH |
| Mail/SMS | **comms** (Phase 2) | Internal send OTP; reuse notification rate limits |
| SPA | **frontend-spa** | `src/pages/School/Settings.tsx` (Security tab), `src/pages/Profile` security section, new `MfaChallenge` route/modal on login |
| Gateway | **api-gateway** | Pass-through `/api/auth/mfa/*` → identity |

---

## 3. Data model (Identity)

```prisma
model UserMfaEnrollment {
  id            String   @id @default(uuid())
  userId        String   @unique
  method        String   // TOTP | SMS (phase 2)
  totpSecretEnc String?  // AES-GCM with MFA_ENCRYPTION_KEY
  phoneE164     String?  // phase 2
  backupCodes   String?  // JSON array of bcrypt hashes
  enrolledAt    DateTime @default(now())
  lastUsedAt    DateTime?
  user          User     @relation(...)
  @@schema("identity")
}
```

Extend `SecurityPolicy` type:

```ts
mfaMode: "OFF" | "OPTIONAL" | "REQUIRED";
mfaRequiredRoles?: string[]; // empty = all staff roles when REQUIRED
allowSmsMfa?: boolean;       // phase 2
```

**Secrets:** `MFA_ENCRYPTION_KEY` (32-byte base64) required in production; never store plain TOTP secret.

---

## 4. Phased delivery

### Phase A — Backend TOTP core (1–2 weeks)

| # | Work | Acceptance |
| :--- | :--- | :--- |
| A.1 | Prisma model + migration push | Seed user can enroll TOTP in dev |
| A.2 | `POST /api/auth/mfa/enroll/start` → `{ qrDataUrl, secret, backupCodes }` (authenticated) | QR scans in Google Authenticator |
| A.3 | `POST /api/auth/mfa/enroll/confirm` with first TOTP code | Enrollment persisted |
| A.4 | Login: if policy requires MFA and user enrolled → `{ mfaRequired: true, mfaToken, methods: ["totp"] }` | No full JWT until verify |
| A.5 | `POST /api/auth/mfa/verify` with `mfaToken` + code → normal session | `npm run test:security` extended |
| A.6 | Backup code path (consumes one hash) | Single use |
| A.7 | `DELETE /api/auth/mfa` with password | Audit `mfa_disabled` |

**Tests:** `tests/mfa-totp.test.ts` (unit: TOTP window, backup hash); HTTP smoke policy for challenge flow.

### Phase B — School policy + SPA (1 week)

| # | Work | Acceptance |
| :--- | :--- | :--- |
| B.1 | PATCH school `securityPolicy` with MFA fields; validate roles | IT Admin / School Admin only |
| B.2 | Settings → Security: mode + role checkboxes; honest SMS “Phase 2” | No fake toggle |
| B.3 | Profile → Security: enroll / status / backup codes | Teacher can self-enroll when OPTIONAL |
| B.4 | Login SPA: MFA step after password | E2E: enroll + login with TOTP (nightly) |
| B.5 | Block admin-created users until enrolled when REQUIRED | Clear error + link to Profile |

**Docs:** Update `docs/SCHOOL_SETTINGS_PLAN.md` § Security — check off TOTP; `ROLES_DOCUMENTATION.md` note.

### Phase C — SMS OTP (optional, 1–2 weeks)

| # | Work | Acceptance |
| :--- | :--- | :--- |
| C.1 | Comms internal `POST /api/internal/sms/otp` or reuse email for MVP | Rate limited |
| C.2 | Enroll phone + verify | School `allowSmsMfa` + provider configured |
| C.3 | Login method selection | TOTP preferred when both enrolled |

### Phase D — Hardening

| # | Work |
| :--- | :--- |
| D.1 | Lockout after N failed MFA attempts (reuse login rate limit bucket) |
| D.2 | Recovery: admin reset MFA enrollment (audited) |
| D.3 | `IMPLEMENTATION_STATUS.md` + remove “MFA not available” copy when Phase B ships |

---

## 5. API sketch

| Method | Path | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/mfa/enroll/start` | JWT | Begin TOTP setup |
| POST | `/api/auth/mfa/enroll/confirm` | JWT | Confirm with 6-digit code |
| POST | `/api/auth/mfa/verify` | `mfaToken` | Complete login |
| DELETE | `/api/auth/mfa` | JWT + password | Disable MFA |
| POST | `/api/auth/mfa/backup/regenerate` | JWT + password | New backup codes |

---

## 6. Verification

```bash
npm run test:security
npm run test:profile-security   # extend for MFA enroll
# With compose:
npm run test:http-smoke         # add mfa policies when gateway up
```

Manual:

1. School Admin → Settings → Security → set MFA REQUIRED for TEACHER  
2. Teacher enrolls TOTP on Profile  
3. Logout → login → MFA step → dashboard  
4. `/super-admin/logs` or school audit → `mfa_*` events  

**Rebuild:** `identity`, `api-gateway`, `frontend-spa`.

---

## 7. Risks & honesty

| Risk | Mitigation |
| :--- | :--- |
| Locked out users | Backup codes + admin reset MFA |
| SMS cost / deliverability | Phase C only; TOTP-first |
| Stateless JWT + MFA pending | Short-lived `mfaToken` (5 min), single use |
| Student MFA | Default REQUIRED roles = staff only; parents optional product call |

---

## 8. Change log

| Date | Note |
| :--- | :--- |
| 2026-08-06 | Plan authored — school TOTP v1 + SMS phase 2 |
| 2026-08-06 | **Shipped:** TOTP + SMS OTP (Comms internal route, console + email fallback), login MFA step, Settings policy + Profile enroll, `allowSmsMfa` |
