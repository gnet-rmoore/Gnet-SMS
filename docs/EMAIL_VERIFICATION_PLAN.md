# Email support & verification

**Status:** Done (Phases 0–3)  
**Owning service:** `identity` (+ `comms`, `frontend-spa`, `api-gateway`)

## Goal

Production transactional email with five popular providers, finish registration confirm + forgot-password flows, and optional user email verification at login.

## Providers (`EMAIL_PROVIDER`)

| Provider | Env vars |
| :--- | :--- |
| `console` | (default — logs to stdout) |
| `smtp` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` |
| `sendgrid` | `SENDGRID_API_KEY`, `EMAIL_FROM` |
| `ses` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `EMAIL_FROM` |
| `mailgun` | `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_REGION` (`us`\|`eu`), `EMAIL_FROM` |
| `resend` | `RESEND_API_KEY`, `EMAIL_FROM` |

Shared: `EMAIL_FROM`, `APP_URL` (link base).

## Verification flows

| Flow | Status |
| :--- | :--- |
| School registration confirm (`/register-school/confirm`) | Done |
| Forgot / reset password (`/forgot-password`, `/reset-password`) | Done |
| User email verify (`/verify-email`, `REQUIRE_EMAIL_VERIFICATION=true`) | Done |
| Invite accept marks email verified | Done |
| Comms notification email (announcements, fees) | Done |

## Comms notification email (Phase 3)

When a school’s notification preference has **email** enabled for an event key, Comms sends transactional mail through Identity:

- `POST /api/internal/mail/send` (Identity, `x-internal-token`) wraps `sendMail`.
- `inAppNotificationService.create` fans out email independently of in-app delivery.
- Announcements target role members with `ANNOUNCEMENT` prefs.
- Fee reminders (`FEE_DUE`) from Finance use the same Comms internal notification path.

Configure the provider on **Identity** — either `.env` or **Super Admin → Settings → Credentials → Transactional email** (saved in `PlatformSettings`, overrides env when set).

## Key files

- `services/identity/src/lib/mailer.ts`
- `services/identity/src/lib/mailProviders/*`
- `services/identity/src/services/emailAuthService.ts`
- `services/identity/src/routes/authRoutes.ts`
- `services/gateway/src/server.ts` (`/api/auth/*` → identity)
- `services/identity/src/services/emailSettingsService.ts`
- `src/pages/SuperAdmin/components/EmailSettingsPanel.tsx`
- `services/comms/src/services/notificationEmailService.ts`
- `src/pages/ForgotPassword.tsx`, `ResetPassword.tsx`, `VerifyEmail.tsx`
- `src/pages/RegisterSchool.tsx` (confirm handler)

## Acceptance

- [x] Five providers selectable via `EMAIL_PROVIDER`
- [x] Register-school email link confirms applicant email
- [x] Forgot password sends reset link; reset updates password
- [x] User verification optional via `REQUIRE_EMAIL_VERIFICATION`
- [x] Gateway routes new auth endpoints to Identity
- [x] Comms event email when school prefs allow (`ANNOUNCEMENT`, `FEE_DUE`, etc.)

## Verify

1. `EMAIL_PROVIDER=console` — submit `/register-school`, confirm link, forgot password.
2. Set real provider creds in `.env` + `docker compose up -d identity api-gateway frontend-spa`.
3. `npm run test:email-providers && npm run test:email-auth && npm run test:notification-email`
4. Post an announcement or send a fee reminder with `ANNOUNCEMENT` / `FEE_DUE` email enabled — check Identity logs or provider dashboard.
