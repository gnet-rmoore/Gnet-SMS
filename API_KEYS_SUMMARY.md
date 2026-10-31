GNET-2026 API Keys & Credentials Configuration
================================================

EMAIL PROVIDERS (6 supported, console for dev):

1. console - Built-in development provider (no external keys needed)
2. smtp - SMTP server credentials
3. sendgrid - SendGrid API key
4. resend - Resend API key
5. mailgun - Mailgun API key + domain
6. ses - AWS SES access key + secret key

SECRET KEYS STORED in platformSettings (database):

| Secret Key | Description | Used By |
|-----------|-------------|---------|
| sendgridApiKey | SendGrid API key | SendGrid provider |
| resendApiKey | Resend API key | Resend provider |
| mailgunApiKey | Mailgun API key | Mailgun provider |
| mailgunDomain | Mailgun domain | Mailgun provider |
| mailgunRegion | Mailgun region (us/eu) | Mailgun provider |
| awsAccessKeyId | AWS Access Key ID | SES provider |
| awsSecretAccessKey | AWS Secret Access Key | SES provider |
| awsRegion | AWS Region | SES provider |
| smtpHost | SMTP host address | SMTP provider |
| smtpPort | SMTP port (typically 587) | SMTP provider |
| smtpUser | SMTP username | SMTP provider |
| smtpPass | SMTP password | SMTP provider |
| smtpSecure | SMTP TLS/SSL (true/false) | SMTP provider |

ENVIRONMENT VARIABLES (fallback if not in database):

| Env Var | Description |
|---------|-------------|
| EMAIL_PROVIDER | Default: "console" - sets default provider |
| EMAIL_FROM | Default: "noreply@yoursms.local" - sender email |
| SENDGRID_API_KEY | SendGrid API key (env fallback) |
| RESEND_API_KEY | Resend API key (env fallback) |
| MAILGUN_API_KEY | Mailgun API key (env fallback) |
| MAILGUN_DOMAIN | Mailgun domain (env fallback) |
| MAILGUN_REGION | Mailgun region (env fallback) |
| AWS_ACCESS_KEY_ID | AWS Access Key ID (env fallback) |
| AWS_SECRET_ACCESS_KEY | AWS Secret Access Key (env fallback) |
| AWS_REGION | AWS Region (env fallback) |
| SMTP_HOST | SMTP host (env fallback) |
| SMTP_PORT | SMTP port (env fallback) |
| SMTP_USER | SMTP username (env fallback) |
| SMTP_PASS | SMTP password (env fallback) |
| SMTP_SECURE | SMTP TLS/SSL (env fallback) |

SUPER ADMIN CREDENTIALS MANAGEMENT (src/pages/SuperAdmin/Settings.tsx):

- Tab: CREDENTIALS
- Adds/edits system credentials with: name, provider, key, secret
- Providers: STRIPE, AWS, TWILIO, SENDGRID, RESERND, MAILGUN, AWS_SES, SMTP, CUSTOM
- Each credential has: name, provider, key, secret fields
- Stores in database via /api/super-admin/credentials endpoint

PLATFORM SETTINGS (accessed via Platform Ops tab):

- Email settings: provider, emailFrom, requireEmailVerification, secrets
- Maintenance mode: on/off + optional message
- Default security policy: password policy, MFA, session settings
- JWT access TTL: "8h" (env-controlled)
- Operator MFA: require for Super Admin login
- Registration email confirmation: require email confirmation
- Platform logo: PNG/JPEG/WebP/GIF up to 1MB

NOTES:
- Secrets are masked in UI (showing **** with last 4 chars visible)
- Database stores encrypted/secrets in emailSecretsJson field
- Environment variables serve as fallback if DB secrets not set
- All 6 email providers supported with full configuration
- Platform logo upload already implemented (auth bug just fixed)