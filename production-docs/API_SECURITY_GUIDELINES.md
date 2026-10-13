# 🔐 API Security Guidelines

## Overview
This document covers security best practices for the GNET School Management System APIs. All inter-service communication and external API access must follow these guidelines.

---

## 1. Authentication & Authorization

### 1.1 JWT Token Strategy
```yaml
# Token Specifications
- Algorithm: HS256 (HS256 for access, RS256 considered for future)
- Access Token TTL: 15 minutes (900 seconds)
- Refresh Token TTL: 30 days (optional, not yet implemented)
- Signing Secret: 32+ random bytes from GitHub Secrets
- Token Format: Bearer <jwt-token>

# Per-Service Token Validation
| Service | Validates Token | Token Source |
|---------|----------------|--------------|
| API Gateway | ✅ Yes (all requests) | Authorization header |
| Identity | ✅ Yes (auth endpoints) | Auth service internal |
| Lifecycle | ✅ Yes (document operations) | Internal service token |
| Staff | ✅ Yes (staff-only endpoints) | Internal service token |
| Classroom | ✅ Yes (enrollment ops) | Internal service token |
| Academic | ✅ Yes (exam operations) | Internal service token |
| Finance | ✅ Yes (fee operations) | Internal service token |
| Comms | ✅ Yes (notification ops) | Internal service token |
| Campus | ✅ Yes (role ops) | Internal service token |
```

### 1.2 Internal Service Tokens
Each service uses a shared `INTERNAL_SERVICE_TOKEN` for inter-service calls:

```env
# In all services .env.production
INTERNAL_SERVICE_TOKEN=super-secret-token-change-at-deployment

# Usage in code (example: identity service)
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

// Call another service
const fetch = require('node-fetch');

async function callIdentity() {
  const response = await fetch('http://identity:3011/api/users', {
    headers: {
      'Authorization': `Bearer ${process.env.JWT_ACCESS_TOKEN}`,
      'x-internal-token': INTERNAL_TOKEN  // Auth check
    }
  });
  // Identity validates both JWT + internal token
}
```

**Rotation**: Rotate `INTERNAL_SERVICE_TOKEN` every 90 days via GitHub Actions.

### 1.3 Role-Based Access Control (RBAC)
```yaml
# Service-Specific Roles

Identity Service:
  - SUPER_ADMIN: Full access + user management
  - ADMIN: School-level operations
  - TEACHER: Class-related operations only
  - STUDENT: View own data only

Lifecycle Service:
  - SCHOOL_ADMIN: All admissions operations
  - REGISTRAR: Document management
  - PRINCIPAL: Student enrollment
  - TEACHER: View-only (no write)

Academic Service:
  - PRINCIPAL: Create/modify exams
  - TEACHER: Grade submissions
  - STUDENT: View own grades only

Finance Service:
  - ACCOUNTANT: Fee management
  - ADMIN: View all receipts
  - USER: View own receipts only
```

### 1.4 Permission Denied Responses
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions: TEACHER cannot access FINANCE endpoints",
  "code": "INSUFFICIENT_PERMISSIONS",
  "status": 403
}
```

---

## 2. Input Validation & Sanitization

### 2.1 Zod Validation Schemas
All API endpoints must validate request body/query params using Zod:

```typescript
// Example: Admission Document Upload Schema
const admissionDocumentSchema = z.object({
  docType: z.enum(["SYLLABUS", "IDENTITY_PROOF", "GRADE_CARD", "OTHER"]).optional(),
  fileUrl: z.string().url("Must be a valid URL"),
  fileName: z.string().max(255).optional(),
  mimeType: z.string().refine(
    (mime) => ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(mime),
    "Invalid MIME type"
  ),
  sizeBytes: z.number().int().max(50 * 1024 * 1024).optional(), // 50MB max
  runScan: z.boolean().default(true),
});

type AdmissionDocumentInput = z.infer<typeof admissionDocumentSchema>;

// Usage in controller
app.post("/api/admissions/:id/documents", async (req, res) => {
  const result = admissionDocumentSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: result.error.format(),
    });
  }
  
  // Safe to use result.data
  const doc = await admissionService.confirmDocumentUpload(req.params.id, result.data);
  res.status(201).json(doc);
});
```

### 2.2 MIME Type Validation (Critical)
```typescript
// Never trust client-supplied MIME types
const allowedMimes = [
  "application/pdf",
  "image/jpeg", 
  "image/png",
  "image/webp",
  "image/gif"
];

function validateMime(mime: string): boolean {
  return allowedMimes.includes(mime);
}

// In MinIO presign generation
if (!validateMime(req.body.mimeType)) {
  throw new Error("INVALID_MIME_TYPE");
}
```

### 2.3 File Size Limits
| Document Type | Max Size | Enforced By |
|--------------|----------|-------------|
| Admission documents | 50 MB | Lifecycle service + ClamAV |
| Exam PDFs | 100 MB | Academic service |
| Receipts | 10 MB | Finance service |
| Profile images | 2 MB | Identity service |
| Syllabus PDFs | 50 MB | Classroom service |

**Enforcement**:
```typescript
// In presign URL generation
if (fileSize > MAX_ALLOWED_SIZE) {
  throw new Error(`File too large: ${fileSize} bytes (max: ${MAX_ALLOWED_SIZE})`);
}
```

### 2.4 SQL Injection Prevention
- **Always use Prisma** - never raw SQL queries
- **Parameterized queries** - Prisma handles this automatically
- **Input escaping** - Zod schemas prevent malicious input
- **Connection settings**: `statement_timeout = '30s'` in PostgreSQL

```typescript
// ❌ BAD - Raw SQL (never do this)
const result = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// ✅ GOOD - Prisma (always use this)
const user = await prisma.user.findUnique({
  where: { email },
});
```

### 2.5 XSS Prevention (Frontend)
```typescript
// ✅ GOOD - Sanitize before rendering
import DOMPurify from 'dompurify';

function renderSafeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty);
}

// ❌ BAD - Direct interpolation
dangerous.innerHTML = userInput; // XSS vulnerability
```

---

## 3. Rate Limiting & DDoS Protection

### 3.1 API Gateway Rate Limits
Configured in `nginx.conf` or API gateway middleware:

| Endpoint | Rate Limit | Burst | Purpose |
|----------|------------|-------|---------|
| `POST /api/auth/login` | 5/min | 10 | Prevent brute force |
| `POST /api/auth/register` | 3/min | 5 | Prevent spam |
| `GET /api/public/status` | 30/min | 50 | Public status checks |
| `GET /api/exams/:id/gradesheet` | 10/min | 20 | Exam access |
| `POST /api/*` (internal) | 100/min | 200 | Service-to-service |
| `GET /` (SPA) | 60/min | 100 | General page views |
| `POST /api/upload` | 5/min | 10 | File upload prevention |

### 3.2 Rate Limit Headers (Response)
All API responses include:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 57
X-RateLimit-Reset: 1672531200
Retry-After: 60
```

### 3.3 IP Blocking (Automated)
```yaml
# Lightsail Firewall Rules (immutable)
- Port 22 (SSH): Source IP restricted to corporate VPN only
- Port 80/443: All IPs (with rate limiting)
- Automatic block: 4+ failed login attempts from same IP → 24h block
- AbuseIPDB integration (optional)
```

### 3.4 DDoS Mitigation
- **Lightsail built-in**: AWS Shield Basic (included)
- **Caddy edge**: Rate limiting + IP blocking
- **Cloudflare** (optional): Full DDoS protection
- **GraphQL depth limiting** (if API evolves to GraphQL)

---

## 4. Secret Management

### 4.1 Secret Never-Checklist
| ❌ Never Do | ✅ Do Instead |
|------------|---------------|
| Commit `.env` to git | Use `.env.example` + GitHub Secrets |
| Hardcode JWT secrets | Generate at deployment via `openssl rand -hex 32` |
| Print secrets to logs | Use `pino` with `logLevel: warn` in prod |
| Share secrets via Slack/Email | Use GitHub Actions secrets or AWS SSM |
| Use default/dev secrets in prod | Always override with production values |

### 4.2 GitHub Secrets (15 required)
```yaml
# Required for deployment
AWS_ACCESS_KEY_ID          # AWS API access
AWS_SECRET_ACCESS_KEY      # AWS API secret
AWS_REGION                 # e.g., us-east-1
LIGHTSAIL_SERVICE_NAME     # e.g., gnet-sms
DOCKERHUB_USERNAME         # Your Docker Hub user
DOCKERHUB_PASSWORD         # Docker Hub password/token
PLATFORM_EDGE_HOSTNAME     # Custom domain (optional)
ACME_EMAIL                 # Let's Encrypt email
JWT_ACCESS_SECRET          # 32+ char random string
SUPER_ADMIN_JWT_SECRET     # 32+ char random string
RECEIPT_HMAC_SECRET        # 32+ char random string
INTERNAL_SERVICE_TOKEN     # 32+ char random string
MINIO_ROOT_USER            # smsminio
MINIO_ROOT_PASSWORD        # smsminio-secret
VIRUS_SCAN_FAIL_OPEN       # true/false (prod: false)
```

### 4.3 Secret Rotation Schedule
| Secret | Rotation Frequency | Method |
|--------|-------------------|--------|
| JWT_ACCESS_SECRET | Every 90 days | GitHub Actions + redeploy |
| SUPER_ADMIN_JWT_SECRET | Every 90 days | GitHub Actions + redeploy |
| INTERNAL_SERVICE_TOKEN | Every 90 days | GitHub Actions + redeploy |
| MINIO_ROOT_PASSWORD | Every 180 days | SSH to Lightsail + update .env |
| AWS Secrets | Annually or on compromise | AWS Console + update codes |
| ClamAV REST password | On compromise only | Minimal exposure |

### 4.4 Environment Variable Loading Order
```
1. Docker compose .env file (lowest priority)
2. .env.production in project root
3. GitHub Actions environment overrides (highest priority)
4. Lightsail instance environment variables
```

---

## 5. HTTPS & TLS Configuration

### 5.1 Caddyfile (Edge Service)
```caddyfile
your-domain.com {
  # Automatic Let's Encrypt certificate
  tls your@email.com {
    automatic {
      disable       # Disable if using custom cert
      dns cloudflare
    }
  }
  
  # Reverse proxy to internal services
  reverse_proxy http://localhost:8080
  
  # Security headers
  header {
    X-Content-Type-Options "nosniff"
    X-Frame-Options "DENY"
    X-XSS-Protection "1; mode=block"
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Referrer-Policy "origin-when-cross-origin"
    Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
  }
  
  # Gzip compression
  gzip
  
  # Root directory listing (optional)
  root * /var/www
}
```

### 5.2 TLS Certificate Management
- **Let's Encrypt**: Automatic via Caddy, renews every 90 days
- **Custom certificates**: Place in `docker/edge/certs/` and reference in Caddyfile
- **Certificate chain**: Full chain (cert + intermediate + root)
- **Key size**: RSA 4096-bit minimum, ECDSA P-256 acceptable

### 5.3 HTTP Strict Transport Security (HSTS)
```http
# Caddy automatically adds:
Strict-Transport-Security: max-age=31536000; includeSubDomains

# Additional recommended settings (via header directive):
# Preload list inclusion (requires separate submission to https://hstspreload.org)
```

### 5.3 Mixed Content Prevention
- **All API calls**: Use `https://` protocol
- **Asset loading**: Ensure all CSS/JS/img URLs are protocol-relative or HTTPS
- **Service internal calls**: Use Docker service names (`http://identity:3011`), not IP addresses
- **MinIO public URL**: `http://localhost:9000` is OK for internal, but use HTTPS for external

```env
# ✅ Correct S3_PUBLIC_URL for production
S3_PUBLIC_URL=https://s3.yourdomain.com

# ❌ Avoid for production (HTTP only)
S3_PUBLIC_URL=http://localhost:9000  # Only for dev
```

---

## 6. Error Handling & Logging

### 6.1 Standard Error Response Format
```json
{
  "error": "ValidationFailed",
  "message": "Required field 'email' is missing or invalid",
  "code": "VALIDATION_ERROR",
  "status": 400,
  "timestamp": "2024-01-15T10:30:45.123Z",
  "path": "/api/auth/register",
  "requestId": "c3f0f6a7-8b21-4eab-9e3d-7f2e9d1a2b3c"
}
```

### 6.2 Error Codes Catalog
| Code | HTTP Status | Meaning | Example |
|------|-------------|---------|---------|
| `VALIDATION_ERROR` | 400 | Input validation failed | Missing required field |
| `AUTHENTICATION_FAILED` | 401 | Invalid/missing JWT token | Expired token |
| `AUTHORIZATION_FAILED` | 403 | Valid token, insufficient permissions | TEACHER accessing FINANCE |
| `NOT_FOUND` | 404 | Resource doesn't exist | Exam ID not found |
| `CONFLICT` | 409 | Duplicate resource | Email already registered |
| `PAYLOAD_TOO_LARGE` | 413 | File size exceeds limit | 100MB exam PDF |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | 60/min exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error | DB connection lost |
| `SERVICE_UNAVAILABLE` | 503 | Dependency down (ClamAV, DB) | Virus scan offline |

### 6.3 Error Logging Format (Pino)
```json
{
  "level": 30,
  "name": "server",
  "hostname": "lightsail-12345",
  "pid": 1234,
  "hostname": "gnet-sms-lightsail",
  "reqId": "c3f0f6a7-8b21-4eab-9e3d-7f2e9d1a2b3c",
  "v": "5",
  "pid": 1234,
  "level": 30,
  "msg": "Request completed",
  "req": {
    "method": "POST",
    "url": "/api/auth/login",
    "headers": {
      "user-agent": "Mozilla/5.0",
      "authorization": "Bearer ***"
    },
    "remoteAddress": "203.0.113.45",
    "remotePort": 49152
  },
  "res": {
    "statusCode": 200,
    "responseTime": 45
  },
  "err": null,
  "time": "2024-01-15T10:30:45.123Z"
}
```

### 6.4 Structured Logging Best Practices
```typescript
// ✅ GOOD - Structured logging with pino
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'warn',
  timestamp: pino.stdTimeFunction(),
  translateTime: true,
  base: {
    pid: process.pid,
  },
  redact: [
    'req.headers.authorization',
    'req.query.password',
    'env.JWT_ACCESS_SECRET',
    'env.SUPER_ADMIN_JWT_SECRET'
  ]
});

// Log with context
logger.info({ userId, action: 'login_success' }, 'User logged in');
logger.error({ error, context: 'login' }, 'Login failed');

// ❌ BAD - String concatenation logging
logger.info('User ' + userId + ' logged in at ' + new Date());
```

### 6.5 Sensitive Data Redaction
```typescript
// ✅ Redact sensitive fields from logs
const redacted = pino.utils.redact({
  ...req.headers,
  'authorization': 'Bearer ***.****.****',
  'x-internal-token': '*****',
}, logger);
```

---

## 7. CORS Configuration

### 7.1 Per-Service CORS Settings
```yaml
# Identity Service CORS
CORS_ORIGIN: http://localhost:3000,http://localhost:8080

# Academic Service CORS  
CORS_ORIGIN: http://localhost:3000,http://localhost:8080,http://localhost:8081

# MinIO CORS (for browser uploads) - must match APP_URL
MINIO_API_CORS_ALLOW_ORIGIN: "${APP_URL}"

# API Gateway CORS (nginx)
add_header 'Access-Control-Allow-Origin' '*' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Content-Range,Range' always;
add_header 'Access-Control-Max-Age' '86400' always;
```

### 7.2 CORS Risks to Avoid
| ❌ Risk | ✅ Fix |
|--------|--------|
| `origins: "*"` in production | Use explicit origins from `APP_URL` env var (e.g. `https://sms.example.com,https://www.sms.example.com`) |
| Allow all methods (`GET, POST, PUT, DELETE, PATCH, OPTIONS`) | Only needed methods |
| Allow credentials + wildcard origin | Incompatible - choose one |
| Dynamic origin from request | Validate against allowlist |
| Missing `Vary: Origin` header | Add for proper caching |

### 7.3 Development vs Production CORS
```env
# Development (.env.development)
CORS_ORIGIN=http://localhost:3000,http://localhost:8080,http://localhost:8081

# Production (.env.production)
CORS_ORIGIN=https://sms.yourdomain.com,https://www.yourdomain.com
```

---

## 8. API Versioning

### 8.1 Version Strategy
```
Current:  v1 (default, stable)
Deprecated: v0 (legacy, maintained for 6 months)

# URL Pattern
GET /api/v1/exams        # v1 endpoint
GET /api/v0/exams        # v0 (legacy, will be removed)

# Or Header-based (alternative)
Accept: application/vnd.gnet-v1+json
```

### 8.2 Deprecation Policy
| Phase | Duration | Action |
|-------|----------|--------|
| **Alpha** | 0-3 months | Internal testing only |
| **Beta** | 3-6 months | Public preview, feedback welcome |
| **Stable v1** | Indefinite | Default, no breaking changes |
| **Deprecate v0** | 6 months | Send deprecation headers, plan removal |
| **Remove v0** | 12 months | Remove routes, update docs |

### 8.3 Deprecation Headers (Response)
```http
# On v0 endpoints
X-Deprecated: true
X-Deletion: 2026-01-01T00:00:00Z
X-Replacement: /api/v1/exams

# Example
HTTP/1.1 200 OK
X-Deprecated: true
X-Deletion: 2026-01-01T00:00:00Z
Content-Type: application/json

{
  "message": "This endpoint is deprecated, use /api/v1 instead",
  "data": { ... }
}
```

---

## 9. API Documentation

### 9.1 OpenAPI/Swagger
```yaml
# openapi.yaml (generated from annotations)
openapi: 3.0.3
info:
  title: GNET SMS API
  version: v1.0.0
  description: School Management System API
  contact:
    name: GNET Support
    email: support@gnet.school
servers:
  - url: https://api.gnet.school
    description: Production server
  - url: http://localhost:8080
    description: Development server

paths:
  /api/v1/auth/login:
    post:
      summary: User login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoginResponse'
        '401':
          description: Invalid credentials

components:
  schemas:
    LoginRequest:
      type: object
      required:
        - email
        - password
      properties:
        email:
          type: string
          format: email
        password:
          type: string
          minLength: 8
    LoginResponse:
      type: object
      properties:
        access_token:
          type: string
        expires_in:
          type: integer
        token_type:
          type: string
          default: "Bearer"
```

### 9.2 Documentation Generation
```bash
# Generate from JSDoc annotations
npm run docs:generate  # or: npx swagger-jsdoc ./src/**/*.ts

# Serve locally
npm run docs:serve     # http://localhost:3000/api-docs

# Deploy to GitHub Pages
npm run docs:deploy    # GitHub Actions pushes to gh-pages branch
```

### 9.3 Essential API Endpoints (Must Document)
| Category | Endpoints |
|----------|-----------|
| **Auth** | POST /api/auth/login, POST /api/auth/register, POST /api/auth/logout, GET /api/auth/me |
| **Admissions** | POST /api/admissions, GET /api/admissions/:id, POST /api/admissions/:id/documents, GET /api/admissions/:id/status |
| **Exams** | POST /api/exams, GET /api/exams/:id, POST /api/exams/:id/questions, GET /api/exams/:id/gradesheet/:studentId/pdf |
| **Students** | GET /api/students, GET /api/students/:id, PATCH /api/students/:id |
| **Grades** | GET /api/grades, POST /api/grades, GET /api/report-card/:studentId/pdf |
| **Finance** | POST /api/fees, GET /api/receipts/:id, POST /api/payments |
| **Notifications** | GET /api/notifications, POST /api/notifications/send |

---

## 9. Monitoring & Observability

### 9.1 Health Check Endpoints (All Services)
```
GET /health/live  - Kubernetes-style liveness probe
  - Returns 200 if service responding
  - Returns 503 if service unhealthy

GET /health/ready  - Kubernetes-style readiness probe
  - Returns 200 if service ready to traffic
  - Checks DB connectivity, deps

GET /metrics  - Prometheus metrics (optional)
  - Request count, response time, error rate
```

### 9.2 Key Metrics to Track
| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| `http_requests_total` | Counter | N/A (baseline) |
| `http_requests_duration_seconds` | Histogram | p95 > 2s |
| `http_requests_errors_total` | Counter | sudden spike > 5/min |
| `active_connections` | Gauge | > 80% of max |
| `db_connection_pool_used` | Gauge | > 80% |
| `vmem_used` | Gauge | > 90% of RAM |
| `container_restarts_total` | Counter | > 3 in 5min |
| `clamav_scan_duration_seconds` | Histogram | p95 > 30s |

### 9.3 Logging Correlation
```yaml
# Add request ID to all logs
# Flow: Client → API Gateway → Service → DB → MinIO
# Each hop adds: X-Request-Id or X-Request-ID header

# Example flow:
# 1. Client: curl -H "X-Request-Id: corr-123" https://sms.yourdomain.com/api/exams
# 2. API Gateway: forwards corr-123 header
# 3. Identity service: logs include corr-123
# 4. Lifecycle service: logs include corr-123
# 5. MinIO: object metadata includes corr-123 (via user tags)
```

### 9.4 Alerting Integration
```yaml
# Example: PagerDuty integration for critical alerts
# In GitHub Actions or monitoring system:
# - Critical: HTTP 500 rate > 5/min → PagerDuty
# - Warning: HTTP 403 rate > 20/min → Email
# - Info: Health check failure → Slack

# Alert rules:
groups:
  - name: sms-alerts
    rules:
      - alert: SmsHighErrorRate
        expr: rate(http_requests_errors_total[1m]) > 0.5
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "GNET SMS high error rate"
          description: "Error rate is {{ $value }} errors/minute"

      - alert: SmsServiceDown
        expr: up{service="gnet-sms"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "GNET SMS service down"
          description: "Service {{ $labels.service }} is down"
```

---

## 9. Compliance & Legal

### 9.1 Data Protection (GDPR/FERPA)
| Data Type | Retention | User Rights |
|-----------|-----------|-------------|
| Student personally identifiable information (PII) | 7 years after graduation | Right to access, right to erasure |
| Parent contact information | 3 years after student graduation | Update consent, opt-out of communications |
| Financial data (fees, receipts) | 7 years (tax compliance) | Right to download, dispute errors |
| Academic records (grades, transcripts) | Permanent (educational record) | Right to view, request correction |
| Attendance records | 3 years | View only, no deletion |
| Discipline records | 7 years | Request review, add commentary |

### 9.2 Data Export API
```typescript
// ✅ Implement GDPR/FERPA data export
app.get('/api/user/data-export', async (req, res) => {
  const userId = req.user.id;
  
  // Collect all user-related data across schemas
  const [user, admissions, exams, fees, attendance] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.admissionApplication.findMany({ where: { userId } }),
    prisma.examSubmission.findMany({ where: { studentId: userId } }),
    prisma.feePayment.findMany({ where: { studentId: userId } }),
    prisma.attendanceRecord.findMany({ where: { studentId: userId } }),
  ]);
  
  // Package as ZIP or JSON
  const exportData = {
    user,
    admissions,
    exams,
    fees,
    attendance,
    exportedAt: new Date().toISOString()
  };
  
  res.download(
    `data-export-${userId}-${Date.now()}.json`,
    'user-data-export.json',
    (err) => {
      if (err) console.error('Export failed:', err);
    }
  );
});
```

### 9.3 Data Erasure (Right to be Forgotten)
```typescript
// ⚠️ CAUTION: Only execute with explicit user consent + admin approval
app.post('/api/user/erasure-request', async (req, res) => {
  const { userId, confirm } = req.body;
  
  if (confirm !== 'ERASE_MY_DATA') {
    return res.status(400).json({
      error: "Confirmation required - type 'ERASE_MY_DATA' to proceed"
    });
  }
  
  // Begin erasure in transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Anonymize user data (keep audit trail)
    await tx.user.update({
      where: { id: userId },
      data: { 
        email: `deleted_${userId}@gnet.school`,
        name: 'Deleted User',
        phone: null,
        address: null
      }
    });
    
    // 2. Remove personal identifiers from related tables
    await tx.admissionApplication.updateMany({
      where: { userId },
      data: { userId: null, consentGiven: false }
    });
    
    // ... similar for other schemas
    
    return { status: 'partial' };
  });
  
  res.json({ message: 'Data erasure initiated', result });
});
```

---

## 10. Incident Response

### 10.1 Security Incident Classification

| Level | Criteria | Response Time | Example |
|-------|----------|---------------|---------|
| **Critical** | Data breach, SQL injection, unauthorized access | < 1 hour | Password database leaked, DDoS attack |
| **High** | Virus detected, DDoS in progress, API downtime | < 4 hours | ClamAV detects malware, 20% traffic drop |
| **Medium** | Rate limit exceeded, slow performance, minor bug | < 24 hours | 403 errors increasing, page load slow |
| **Low** | Documentation missing, cosmetic UI issue, minor log warning | < 5 days | Typo in error message, non-critical feature broken |

### 10.2 Critical Incident Runbook

#### Step 1: Initial Assessment (0-15 minutes)
```bash
# 1. Verify scope
docker compose ps  # Which services down?
curl http://localhost:8081/health/live  # API gateway?

# 2. Check logs
docker compose logs -f api-gateway  # Recent errors?
docker compose logs -f postgres  # DB issues?

# 3. Identify cause
# - New deployment? (revert)
# - Resource exhaustion? (scale up)
# - Network issue? (check Lightsail firewall)
# - Dependency down? (ClamAV, MinIO, DB)
```

#### Step 2: Containment (15-30 minutes)
```bash
# 1. Stop new deployments
# GitHub Actions: cancel running workflows

# 2. Isolate affected services
docker compose stop <affected-service>

# 3. Block external access (if needed)
# Lightsail firewall: add temporary rule

# 3. Preserve evidence
docker compose cp postgres:/var/lib/postgresql/data /tmp/pg_backup/
mc pipe minio/sms-admissions/ > /tmp/minio_backup.tar
```

#### Step 3: Resolution (30-60 minutes)
```bash
# 1. Apply fix
# - Revert last deployment: docker compose down && docker compose up -d
# - Restart service: docker compose restart <service>
# - Clear cache: docker system prune -a

# 2. Restore from backup if data lost
# - pg_restore from daily backup
# - mc cp from MinIO backup

# 3. Verify fix
# - Health checks passing
# - Key flows working (admission, exam, finance)
# - Logs clean (no new errors)
```

#### Step 4: Post-Incident (60+ minutes)
```bash
# 1. Document incident
# - What happened
# - Root cause
# - Timeline
# - Actions taken

# 2. Notify stakeholders
# - Email to admin team
# - Status page update (if applicable)
# - Incident report in Confluence/Jira

# 3. Retrospective meeting
# - What went well
# - What could improve
# - Action items (assign owners, due dates)

# 4. Update prevention
# - Add monitoring alert if new
# - Update docs if needed
# - Rotate secrets if compromised
```

### 10.3 Communication Templates

#### Incident Status Page Update
```
⏰ {{TIME}} - Incident Started
🔍 Investigating - GNET SMS experiencing issues
📊 Current Status: Partial outage affecting {{AFFECTED_SERVICES}}
👨‍💻 Team investigating, updates every 30 minutes

✅ {{TIME}} - Issue Resolved
🟢 All systems operational
📝 Root cause: {{ROOT_CAUSE}}
📋 Action items: {{ACTIONS}}
```

#### Stakeholder Email
```
Subject: 🚨 GNET SMS Incident - {{SEVERITY}} - {{TIME}}

Hello {{STAKEHOLDER_NAME}},

An incident has been detected affecting the GNET School Management System.

**Severity:** {{SEVERITY}} ({{SEVERITY_DEFINITION}})
**Start Time:** {{START_TIME}} UTC
**Estimated Resolution:** {{ESTIMATED_RESOLUTION}} UTC
**Affected Services:** {{AFFECTED_SERVICES}}

**What's happening:**
{{INCIDENT_DESCRIPTION}}

**What we're doing:**
{{ACTIONS_TAKEN}}

**Expected resolution:** {{EXPECTED_RESOLUTION}}

We'll provide another update by {{NEXT_UPDATE_TIME}}.

Questions? Reply to this email or contact {{SUPPORT_CONTACT}}.

Best,
GNET Operations Team
```

---

## 11. Appendix: Common Security Tasks

### 11.1 Annual Security Checklist
```bash
# Run once per year (or after major deployment)

# 1. Rotate all secrets
openssl rand -hex 32 | tr -d '\n' | pbcopy  # JWT_ACCESS_SECRET
# Update in GitHub Secrets + redeploy

# 2. Scan for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image gnet-sms:latest

# 3. Check Dockerfile for best practices
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy fs --dir .

# 4. Review IAM permissions
# - Lightsail: verify least-privilege IAM roles
# - GitHub: verify team access is minimal
# - AWS: review CloudTrail logs

# 5. Update dependency versions
npm audit --production
npm audit fix --production

# 6. Review firewall rules
# - Lightsail: only ports 22, 80, 443 open
# - Docker: only necessary ports exposed

# 7. Test backup restore
pg_dump -U sms -d sms_db > /tmp/test_restore.sql
psql -U sms -d sms_test < /tmp/test_restore.sql
dropdb sms_test

# 8. Review access logs
# - Failed login attempts
# - Unusual API patterns
# - Off-hours activity

# 9. Verify WAF rules (if using Cloudflare/Shield)
# - SQL injection patterns blocked
# - XSS prevention active
# - Rate limiting effective

# 10. Document findings
# - Security report
# - Action items with owners
# - Next review date
```

### 11.2 Monthly Security Tasks
- [ ] Review failed login attempts (login service logs)
- [ ] Check for unusual API traffic patterns
- [ ] Verify SSL certificate expiry (Certbot/Caddy)
- [ ] Check disk usage (Linux + Docker)
- [ ] Review backup verification results
- [ ] Update dependency versions (minor/patch only)
- [ ] Check ClamAV virus definition updates
- [ ] Test one critical flow end-to-end

### 11.3 Daily Security Habits
- [ ] Monitor health check endpoints
- [ ] Review error logs (high severity only)
- [ ] Check Docker container status
- [ ] Verify SSL is valid (browser padlock)
- [ ] Quick scan of MinIO storage usage
- ] Ensure cron jobs (backups) ran successfully

---

## 🎯 Summary: Security Priority Order

1. **Authentication** - JWT tokens, internal service tokens, RBAC
2. **Input Validation** - Zod schemas, MIME types, file sizes, SQL injection
3. **Transport Security** - HTTPS everywhere, HSTS, TLS 1.2+
4. **Rate Limiting** - API gateway limits, IP blocking, DDoS protection
5. **Secret Management** - GitHub Secrets, rotation, never in code
6. **Error Handling** - Standardized responses, sensitive data redaction
7. **Logging & Monitoring** - Structured logs, metrics, alerting
8. **Compliance** - GDPR/FERPA, data export/erasure, retention
9. **Incident Response** - Runbooks, communication, retrospectives
10. **Continuous Improvement** - Annual review, monthly tasks, daily habits

**Never compromise on #1-3**. These form the foundation of all other security measures.