# 🏗️ Production Architecture

## Overview
The GNET School Management System is architected as a **micro-service application** running on Docker, deployable to AWS Lightsail. This document outlines the production architecture, service communication, and data flow.

---

## 1. Service Topology

### 1.1 Service Diagram
```
┌─────────────────────────────────────────────────────────────────────┐
│                            AWS LIGHTSAIL                              │
│                                                                       │
│  +------------+     +------------+     +------------+     +----------+│
│  |  Frontend  | --> |  API-GW    | --> |  Identity  |│ Health   ││
│  |  (nginx)   |     |  (port 8081)│     |  (port 3011)│├──────────┤│           ││
│  +------------+     +------------+     +------------+│          ││           ││           ││
│        ▲                  ▲                  ▲            │          ││           ││           ││
│        │                  │                  │            │          ││           ││           ││
│        │                  │                  │            │          ││           ││           ││
│  +------------+     +------------+     +------------+│          ││           ││           ││
│  |   Lifecycle│     |   Ops      |   |  Staff   |│          ││           ││           ││
│  |  (port 3010)│     |  (port 3012)│   |  (port 3013)│├──────────┤│           ││           ││
│  +------------+     +------------+     +------------+│          ││           ││           ││
│        ▲                  ▲                  ▲            │          ││           ││           ││
│        │                  │                  │            │          ││           ││           ││
│  +------------+     +------------+     +------------+│          ││           ││           ││
│  |   Classroom│     |  Academic  |   |  Finance ││   MinIO  ││           ││           ││
│  |  (port 3014)│     |  (port 3015)│   |  (port 3016)│├──────────┤│           ││           ││
│  +------------+     +------------+     +------------+│          ││           ││           ││
│        ▲                  ▲                  ▲            │          ││           ││           ││
│        │                  │                  │            │          ││           ││           ││
│  +--------------------------------------------------------------+│           ││           ││
│  |                    PostgreSQL (single cluster)               ││  SMS DB   ││
│  |    Schemas: public, identity, lifecycle, staff, classroom, ││           ││           ││
│  |    academic, finance, comms, campus                        ││           ││           ││
│  +--------------------------------------------------------------+│           ││           ││
│        │                  │                  │            │          ││           ││           ││
│  +------------+     +------------+     +------------+│          │└─────────────────────────────┘│
│  |   Comms    |     |  Campus    |                              │                   │
│  |  (port 3017)│     |  (port 3018)│                              │                   │
│  +------------+     +------------+                              │                   │
│                                                                       │
│  +------------+                                                    │                   │
│  |   MinIO    | S3-compatible storage (admissions, classroom,     │                   │
│  |  (port 9000)│  exams, receipts)                              │                   │
│  +------------+                                                    │                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Service Responsibilities

| Service | Port | Responsibility | DB Schema |
|---------|------|---------------|-----------|
| **frontend-spa** | 80 | React/Vite SPA, serves UI | N/A |
| **api-gateway** | 8081 | Request routing, auth, rate limiting | N/A |
| **identity** | 3011 | Auth, users, MFA, admissions | identity |
| **lifecycle** | 3010 | Admissions, document flow, virus scan | lifecycle |
| **ops** | 3012 | Operations, staff tools | ops |
| **staff** | 3013 | Staff management, scheduling | staff |
| **classroom** | 3014 | Classrooms, sections, enrollment | classroom |
| **academic** | 3015 | Exams, grading, report cards | academic |
| **finance** | 3016 | Fees, receipts, billing | finance |
| **comms** | 3017 | Notifications, emails, SMS | comms |
| **campus** | 3018 | Campus management, roles | campus |
| **postgres** | 5432 | Central PostgreSQL cluster - Internal only, not exposed to host | sms_db |
| **redis** | 6379 | Internal caching - Not exposed to host | sms_db |
---

## 2. Data Flow

### 2.1 Admission Document Flow
```
Student Uploads Document
        ↓
SPA (frontend-spa) → Presigned URL (MinIO)
        ↓
Lightsail: MinIO stores file
        ↓
API Gateway → Identity Service
        ↓
Lifecycle Service → confirmDocumentUpload
        ↓
runVirusScan (ClamAV REST)
        ↓
INFECTED → 400 error + VIRUS_DETECTED code
        ↓
CLEAN → prisma.admissionDocument.create(status="UPLOADED")
        ↓
Document visible in student portal
```

### 2.2 Exam Grade Sheet Flow
```
Teacher uploads exam paper
        ↓
Academic Service → presigned URL (MinIO)
        ↓
MinIO stores PDF
        ↓
Student requests gradesheet PDF
        ↓
API Gateway → Academic Service → PDF service (Puppeteer)
        ↓
Render HTML → PDF → Return to student
```

---

## 3. Inter-Service Communication

### 3.1 Environment Variables (per service)
Each service receives these core env vars:
```env
NODE_ENV=production
DATABASE_URL=postgresql://sms_<schema>:sms_<schema>@postgres:5432/sms_db?schema=<schema>
REDIS_URL=redis://redis:6379
JWT_ACCESS_SECRET=... (from GitHub Secrets)
SUPER_ADMIN_JWT_SECRET=... (from GitHub Secrets)
INTERNAL_SERVICE_TOKEN=... (from GitHub Secrets)
```

### 3.2 Service Dependencies (docker-compose.yml)
```
api-gateway → identity, lifecycle, ops, staff, classroom, academic, finance, comms, campus
frontend-spa → api-gateway
lifecycle → postgres, db-roles, redis, identity, classroom, academic, minio, minio-init
identity → postgres, db-roles, redis
staff → postgres, db-roles, redis, identity, academic, finance, comms
classroom → postgres, db-roles, redis, minio, minio-init
academic → postgres, db-roles, identity
finance → postgres, db-roles, minio, minio-init
comms → postgres, db-roles, redis, identity
campus → postgres, db-roles, identity, ops
```

### 3.3 CORS Configuration
- **frontend-spa**: `http://localhost:3000` (dev), `https://domain.com` (prod)
- **MinIO**: `MINIO_API_CORS_ALLOW_ORIGIN: "${APP_URL}"` - explicit origins from APP_URL env var
- **API Gateway**: Configures CORS for all downstream services
- **All services**: Production CORS origins must come from `APP_URL` env var, never `*`

---

## 4. Security Zones

### 4.1 Network Segmentation
```
┌──────────────────────────────────────┐
│      Lightsail Instance              │
│  (Firewall: ports 22, 80, 443 only) │
└──────────────────────────────────────┘
         ▲
         │ Docker Bridge Network (private)
┌──────────────────────────────────────┐
│  Internal Services (ports 3010-3018) │
│  - Not exposed to internet           │
│  - Only accessible within docker net │
└──────────────────────────────────────┘
         ▲
         │ Port mappings (host → container)
┌──────────────────────────────────────┐
│  Public Ports (exposed on host)      │
│  - 80 → frontend-spa                 │
│  - 443 → edge (Caddy/HTTPS)          │
│  - 22 → SSH (Lightsail firewall)    │
└──────────────────────────────────────┘
```

### 4.2 Secrets Management
| Secret Source | Used By | Storage |
|--------------|---------|---------|
| **GitHub Actions** | CI/CD workflow | GitHub Secrets |
| **Lightsail env** | Runtime | AWS SSM Parameter Store |
| **Docker labels** | Docker compose | .env file (not committed) |

### 4.3 HTTPS & TLS
- **Edge/Caddy**: Let's Encrypt auto-certificates
- **Redirect**: HTTP → HTTPS
- **HSTS**: 1 year preload
- **Cipher strength**: TLS 1.2+, ECDHE-RSA with AES-256-GCM

---

## 5. Scaling Strategy

### 5.1 Vertical Scaling (Lightsail)
| Plan | RAM | CPU | Price/month | Use Case |
|------|-----|-----|-------------|----------|
| Basic | 1GB | 0.5 vCPU | $5 | Development / Small school |
| Professional | 2GB | 1 vCPU | $10 | Production / Medium school |
| Premium | 4GB | 2 vCPU | $20 | Large school / High traffic |
| Elite | 8GB | 4 vCPU | $40 | Enterprise / Multi-branch |

**Upgrade path**: Stop → Change plan → Start (no data loss)

### 5.2 Horizontal Scaling (Advanced)
- **Not initially required** - start vertical
- **When needed**: Deploy multiple Lightsail instances + AWS ALB + EFS for shared storage
- **Session affinity**: Required for sticky sessions
- **Database**: Read replica on separate RDS (migration from Lightsail PostgreSQL)

### 5.3 Resource Limits (Docker Compose)
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
```

---

## 6. High Availability

### 6.1 Docker Restart Policies
All services: `restart: unless-stopped`
- Automatically restarts on daemon crash
- Starts on Docker Engine restart
- Manual stops respected (`docker stop` works)

### 6.2 Lightsail Auto-Start
```bash
# Enable auto-start after reboot
aws lightsail enable-instance-auto-start \
  --instance-name gnet-sms \
  --auto-start-type automatic
```

### 6.3 Health Check Endpoints
Each service exposes `/health/live`:
```bash
# Check all services
for port in 80 8081 3010 3011 3012 3013 3014 3015 3016 3017 3018; do
  echo "Port $port: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:$port/health/live)"
done
```

**Expected codes**: 200 (healthy), 503 (unhealthy)

### 6.4 Deployment Strategy
**Blue-Green via GitHub Actions**:
1. New deployment pulls `gnet-sms:latest`
2. Lightsail creates new container
3. Health check verifies success (200 response)
4. Traffic switches to new version
5. Old version kept for 5 minutes as rollback target
6. If health check fails: previous version remains running

---

## 7. Observability

### 7.1 Metrics (via cAdvisor / Portainer)
- Container CPU/Memory usage
- Network I/O per service
- Disk usage per container
- Restart counts

### 7.2 Logs
- `docker compose logs -f <service>` - real-time logs
- JSON format output (default node.js winston)
- Log aggregation optional: CloudWatch / ELK

### 7.3 Alerts (recommended)
| Metric | Threshold | Alert |
|--------|-----------|-------|
| Container restart rate | > 3/restart/5min | Critical |
| PostgreSQL connections | > 80% of max | Warning |
| Redis memory > 80% | Warning |
| Custom `/health/live` returns non-200 | Critical |
| MinIO storage > 90% | Warning |

### 7.4 Uptime Monitoring
- **External**: UptimeRobot (check `/health/live` every minute)
- **Internal**: Docker compose health status
- **Alert channels**: Email (configured via GitHub Actions or SMTP)

---

## 8. Deployment Lifecycle

### 8.1 Local Development → Production
```
Local machine → git push → GitHub Actions → Docker Hub → Lightsail
                 ↑                                      ↓
               test locally                          gnet-sms:latest
```

### 8.2 Rollback Procedure
```bash
# Option 1: GitHub Actions
# Set DOCKER_TAG to previous SHA in workflow dispatch

# Option 2: Manual SSH to Lightsail
docker image ls | grep gnet-sms
# Note previous image SHA
docker stop gnet-sms-new
docker start gnet-sms-old
# Or: docker compose down && docker compose up -d (compose remembers)
```

### 8.3 Database Migration Handling
- **Entrypoint** (`scripts/service-entrypoint.sh`): runs `npx prisma migrate deploy` on container start
- **Schema changes**: `npx prisma migrate dev --name <name>` locally, then `npx prisma migrate deploy` to production
- **Production**: `npx prisma migrate deploy` (no `--accept-data-loss`, no `--skip-generate`)
- **Seed data**: `RUN_SEED=true` env var controls seeding (conditional `prisma db seed` in entrypoint)
- **Zero-downtime**: Migrations run inside container before server starts; `prisma migrate deploy` will fail if migrations are out of order or conflicting, preventing bad deployments

### 8.4 Backup & Restore Cycle
```
Daily: pg_dump → S3 (automated, via GitHub Actions)
Weekly: Full database export + MinIO data copy
Monthly: Test restore in staging environment
Quarterly: Disaster recovery drill
```

---

## 9. Environment Parity

### 9.1 Feature Flags
| Flag | Description | Default |
|------|-------------|---------|
| `DISABLE_MONOLITH` | Disable monolith fallback | `true` |
| `VIRUS_SCAN_FAIL_OPEN` | Fail-closed vs fail-open ClamAV | `false` (prod) |
| `REQUIRE_EMAIL_VERIFICATION` | New user email verify | `false` |
| `REQUIRE_REGISTRATION_EMAIL_CONFIRM` | Registration CTA | `true` |

### 9.2 Domain Configuration
```env
# Required for CORS & redirects
APP_URL=http://localhost:8080,http://localhost:3000
APP_DOMAINS=https://yourdomain.com

# Edge/Caddy
PLATFORM_EDGE_HOSTNAME=yourdomain.com
PLATFORM_CNAME_TARGET=yourdomain.com
PLATFORM_HOSTS=yourdomain.com,www.yourdomain.com

# Per-service origins
IDENTITY_URL=http://identity:3011
ACADEMIC_URL=http://academic:3015
FINANCE_URL=http://finance:3016
```

### 9.3 Port Conflicts (Lightsail)
Only expose these host ports:
- **22** SSH (Lightsail managed, not in compose)
- **80** → frontend-spa
- **443** → edge (Caddy, HTTPS)
- **9000** → MinIO (optional, for console access)
- **9001** → MinIO console

All other service ports (3010-3018) are **internal only** - accessible within docker bridge network only.
- **PostgreSQL (5432)** and **Redis (6379)**: NOT exposed to host - internal only for inter-service communication
- No host port mappings for database or cache services

---

## 10. Compliance & Auditing

### 10.1 Data Retention
- **Application logs**: 30 days (docker prune)
- **Database backups**: 7 daily + 4 weekly + 3 monthly
- **MinIO file retention**: Configurable via lifecycle rules
- **Audit logs**: Indefinite (prisma `createdAt`, `updatedAt`)

### 10.2 Log Structure
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "service": "identity",
  "request_id": "c3f0f6a7-8b21-4eab-9e3d-7f2e9d1a2b3c",
  "user_id": "usr_12345",
  "action": "login",
  "status": "success",
  "ip": "203.0.113.45"
}
```

### 10.3 Key Compliance Checks
- ✅ GDPR: Data export/delete via API
- ✅ SOC 2: Access logs, secret rotation
- ✅ ISO 27001: Asset inventory, change management
- ✅ FERPA: Student data protection (FERPA-compliant features)

---

## 11. Emergency Procedures

### 11.1 Complete Outage
1. **Check status**: `docker compose ps` - verify all services running
2. **Health checks**: `curl http://localhost:8081/health/live`
3. **Logs**: `docker compose logs -f` - identify error
4. **Restart**: `docker compose restart`
5. **Rollback**: If new deployment, revert to previous image

### 11.2 Database Outage
1. **Check PostgreSQL**: `pg_isready -U sms -d sms_db`
2. **Restart DB**: `docker compose restart postgres`
3. **Verify data**: `pg_dump -U sms -d sms_db | head -5`
4. **Restore from backup** if corruption suspected

### 11.3 Storage Full (MinIO)
1. **Check usage**: `docker exec minio mc admin info minio`
2. **Add storage**: Scale Lightsail instance (vertical) or add disk
3. **Cleanup**: `mc ilm remove minio/admissions` (if lifecycle configured)
4. **Upgrade bucket**: Create new larger bucket, migrate files

### 11.4 Security Incident
1. **Rotate secrets**: Update GitHub Secrets, redeploy
2. **Revoke tokens**: If JWT compromise, invalidate sessions
3. **Update firewall**: Check Lightsail network rules
4. **Audit logs**: Review access patterns
5. **Notify stakeholders**: Email/SMS if PII exposed

---

## 12. Glossary

| Term | Definition |
|------|------------|
| **SMS** | School Management System (this application) |
| **Lightsail** | AWS entry-level VPS service |
| **Micro-service** | Independent Docker container per domain |
| **Prisma ORM** | Node.js database toolkit |
| **MinIO** | S3-compatible object storage |
| **ClamAV** | Open-source virus scanner |
| **Caddy** | HTTP server with auto-HTTPS |
| **GitHub Actions** | CI/CD automation platform |
| **Docker Hub** | Container image registry |
| **Blue-Green** | Deployment strategy with parallel versions |
| **Fail-closed** | Security: block if uncertain (VIRUS_SCAN_FAIL_OPEN=false) |
| **Fail-open** | Convenience: allow if uncertain (dev only) |
| **idempotency** | Same request same result (safe to retry) |
| **CORS** | Cross-Origin Resource Sharing (browser security) |
| **HA** | High Availability (uptime > 99.9%) |
| **RLB** | Rate Limiting & Blocking |