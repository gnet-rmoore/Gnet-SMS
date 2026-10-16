# Super Admin Credentials — hardening & governance

> **Status:** Shipped (2026-10-16) — capability enforcement, input validation, AES-256-GCM encryption at rest, and unit coverage for every Super Admin credential service.
> **Owning service:** Identity (`SystemCredential`, `PlatformSettings`) + SPA `/super-admin/settings` (Credentials tab)
> **UI:** Super Admin → Settings → Credentials
> **Companion:** `docs/SUPER_ADMIN_PLATFORM_PLAN.md`, `docs/SA_PLATFORM_SECURITY_AND_ACTIVITY_PLAN.md`, `docs/SCHOOL_API_KEYS_PLAN.md`

### Changelog

| Date | Note |
| :--- | :--- |
| 2026-10-16 | Capability enforcement, zod validation, AES-256-GCM encryption at rest, tests, docs |
| 2026-10-16 | Email-settings endpoints gated by `settings.manage`; key-derivation + production-key tests; credential services reference |

---

## 0. Scope

Super Admin **credential services** are the code paths that create, read, rotate, or
delete secrets on behalf of the platform. This document covers the two families:

| Family | Store | Owner module |
| :--- | :--- | :--- |
| Platform API credentials | `identity.SystemCredential` | `superAdminService` |
| Email/SMS provider secrets | `identity.PlatformSettings.emailSecretsJson` | `emailSettingsService` |
| School-user / operator password reset | `identity.User.passwordHash` | `superAdminService` / `platformOpsService` |

### Credential services reference

What each service/module in this family does:

| Module | What it does |
| :--- | :--- |
| `services/identity/src/services/superAdminService.ts` (credential CRUD) | Lists, creates, and deletes `SystemCredential` rows. `getCredentials` decrypts then masks every secret before returning (the API never emits raw secrets or ciphertext); `createCredential` validates name/key, encrypts the secret, enforces unique `key` (409 on `P2002`); `deleteCredential` 404s on missing rows. All mutations write `api_key_added` / `api_key_removed` audit events. |
| `services/identity/src/lib/credentialCrypto.ts` | AES-256-GCM encryption at rest for `SystemCredential.secret` (`enc:v1:<base64(iv|tag|ciphertext)>`). Key resolution: `CREDENTIAL_ENCRYPTION_KEY` → `MFA_ENCRYPTION_KEY` → dev-only derived key (production throws if neither is set). Short keys are SHA-256 derived; base64 keys are decoded. Legacy plaintext rows pass through reads unchanged. |
| `services/identity/src/services/emailSettingsService.ts` | Manages transactional-email provider configuration (SendGrid / Resend / Mailgun / SES / SMTP / console) in `PlatformSettings.emailSecretsJson`. `getPublicSettings` returns secrets only as masked placeholders; `updateSettings` merges non-masked secret updates, invalidates the 30s mail runtime cache, and audits `email_settings_updated` (provider + from only, never secrets); `sendTestEmail` sends a probe via the active provider and audits the result. |
| `services/identity/src/lib/mailRuntimeConfig.ts` | Loads the effective mail config (DB first, env fallback) for the mailer; provides `maskSecret` (last-4 reveal) and `parseEmailSecrets` used by the email settings service. |
| `services/identity/src/services/superAdminService.ts` (`resetUserPassword`) / `platformOpsService.resetOperatorPassword` | Credential-adjacent: password resets gated by `users.password_reset` / `operators.manage`, audited, with optional forced change on next login. |
| `services/identity/src/domain/saCapabilities.ts` | The capability matrix (`credentials.manage`, `settings.manage`, …) that every credential endpoint is checked against. |
| `services/identity/src/validation/schemas.ts` (`credentialCreateSchema`) | Zod schema for `POST /credentials`; the `validateBody` middleware strips unknown fields before the controller runs. |
| SPA: `src/pages/SuperAdmin/Settings.tsx` (Credentials tab) + `components/EmailSettingsPanel.tsx` | UI for the credential vault and email provider settings; surfaces API errors as toasts, never renders raw secrets. |

---

## 1. Capability enforcement

Every credential endpoint requires a Super Admin **capability** (Phase E operator
sub-roles). Enforcement happens in the controller via
`platformOpsService.assertSaCapability(actorFromReq(req), cap)`, which resolves the
actor's `platformRole` (from the token or DB) and throws `SaCapabilityDeniedError`
(`403`, code `SA_CAPABILITY_DENIED`) when missing.

| Endpoint | Capability | OWNER | SUPPORT | BILLING | ANALYST |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `GET /api/super-admin/credentials` | `credentials.manage` | ✅ | — | — | — |
| `POST /api/super-admin/credentials` | `credentials.manage` | ✅ | — | — | — |
| `DELETE /api/super-admin/credentials/:id` | `credentials.manage` | ✅ | — | — | — |
| `GET /api/super-admin/email-settings` | `settings.manage` | ✅ | — | — | — |
| `PATCH /api/super-admin/email-settings` | `settings.manage` | ✅ | — | — | — |
| `POST /api/super-admin/email-settings/test` | `settings.manage` | ✅ | — | — | — |
| `POST /api/super-admin/users/:id/reset-password` | `users.password_reset` | ✅ | ✅ | — | — |
| `POST /api/super-admin/operators/:id/reset-password` | `operators.manage` | ✅ | — | — | — |

Email provider secrets are a credential family, so the email-settings endpoints
(read masked settings, save provider + secrets, send a test email) require the
same OWNER-only `settings.manage` capability as other secret-bearing settings.

An unset/unknown `platformRole` normalizes to `OWNER` (full access), preserving
back-compat with the pre-Phase-E super admin account.

Matrix source of truth: `services/identity/src/domain/saCapabilities.ts`.

---

## 2. Input validation

`POST /api/super-admin/credentials` is guarded by `validateBody(credentialCreateSchema)`
(`services/identity/src/validation/schemas.ts`) before the controller runs:

| Field | Rule |
| :--- | :--- |
| `name` | required, trimmed, 1–120 chars |
| `key` | required, trimmed, 1–200 chars, unique |
| `provider` | optional, 1–40 chars, upper-cased |
| `secret` | optional, ≤ 2000 chars |
| `metadata` | optional, passthrough JSON |

Unknown keys are stripped by the middleware. Duplicate `key` is mapped to
`409 CREDENTIAL_KEY_EXISTS` (Prisma `P2002`); delete of a missing row maps to
`404 CREDENTIAL_NOT_FOUND`.

---

## 3. Encryption at rest

`SystemCredential.secret` is encrypted with **AES-256-GCM**
(`services/identity/src/lib/credentialCrypto.ts`).

- Stored format: `enc:v1:<base64(iv | authTag | ciphertext)>` (12-byte IV, 16-byte tag).
- Key: `CREDENTIAL_ENCRYPTION_KEY`, else `MFA_ENCRYPTION_KEY`. If neither is set,
  a dev-only derived key is used; **production throws** so secrets can never be
  written insecurely.
- Legacy plaintext rows are returned unchanged (read back-compat); they are
  re-encrypted the next time they are written.
- `getCredentials` decrypts then masks (`maskSecret`) so the UI never receives
  ciphertext in place of a masked secret.
- GCM authentication rejects tampered ciphertext on read.

Secrets are write-only from the API's perspective: `GET` returns masked values and
the raw secret is never returned by any endpoint.

---

## 4. Audit trail

| Action | Event | Notes |
| :--- | :--- | :--- |
| Create credential | `api_key_added` (SETTINGS) | `after: { name, provider, key }` — secret never logged |
| Delete credential | `api_key_removed` (SETTINGS) | `before: { name, provider, key }` |
| Update email provider | `email_settings_updated` (SETTINGS) | provider + from only, no secrets |
| Send test email | `email_test_sent` (SUPER_ADMIN) | `userId: actorId`, `after: { provider, ok }` |

All rows land in `identity.SystemLog` (see `docs/SA_SYSTEM_AUDIT_LOGS_PLAN.md`).

---

## 5. Tests

`npm run test:super-admin-credentials` (`tests/super-admin-credentials.test.ts`),
also part of `test:unit`. Pure (no DB, no network) and green in both dev and
production mode (`NODE_ENV=production` pins a test key when none is configured,
so the crypto assertions are deterministic in CI). Covers:

- Crypto: prefix/round-trip, random IV, `null`/`undefined`, legacy passthrough,
  tamper rejection.
- Key derivation: explicit ≥32-byte key used verbatim, short key SHA-256 derived,
  base64 key decoded, wrong-key GCM failure, `MFA_ENCRYPTION_KEY` fallback.
- Production enforcement: encrypt/decrypt of encrypted values throw without a
  configured key; legacy plaintext passthrough still works.
- Schema: accepts valid + optional fields, rejects missing/blank name & key,
  over-long name/secret.
- Capability matrix: `credentials.manage`, `settings.manage`, and
  `operators.manage` are OWNER-only; `users.password_reset` is OWNER + SUPPORT;
  unset role → OWNER.

Last run (2026-10-16): **48 passed, 0 failed** (dev and `NODE_ENV=production`).

---

## 6. Production verification runbook

Encryption changes behavior on **write** only; existing rows stay readable. After
deploying to production:

1. Confirm `CREDENTIAL_ENCRYPTION_KEY` (or `MFA_ENCRYPTION_KEY`) is set in the
   identity service environment — otherwise creates will throw by design.
2. Create a throwaway credential and confirm the stored row starts with `enc:v1:`.
3. Confirm `GET /api/super-admin/credentials` returns a masked value, not ciphertext.
4. Rotate one real credential (create new, delete old) and verify both the
   `api_key_added` / `api_key_removed` audit rows and continued API access.
5. Legacy plaintext rows are re-encrypted on next write; optionally run a
   one-time re-save pass if you require all rows encrypted immediately.
