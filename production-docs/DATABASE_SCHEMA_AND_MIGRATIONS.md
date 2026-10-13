# 🗄️ Database Schema & Migrations

## Overview
This document covers the PostgreSQL database schema, Prisma ORM configuration, migration strategy, backup procedures, and restore operations for the GNET School Management System.

---

## 1. Database Architecture

### 1.1 Single Cluster, Multiple Schemas
```
PostgreSQL Cluster: sms_db
└── Schemas (8 total):
    ├── public        → admin/monolith tooling
    ├── identity      → users, auth, MFA, admissions
    ├── lifecycle     → admissions, documents, virus scan
    ├── staff         → staff management, scheduling
    ├── classroom     → classrooms, sections, enrollment
    ├── academic      → exams, grades, report cards
    ├── finance       → fees, receipts, billing
    └── comms         → notifications, emails, SMS
    └── campus        → campus management, roles
```

### 1.2 Connection Strings (per service)

| Service | Connection String |
|---------|------------------|
| **API Gateway** | `postgresql://sms:sms@postgres:5432/sms_db?schema=public` |
| **Identity** | `postgresql://sms_identity:sms_identity@postgres:5432/sms_db?schema=identity` |
| **Lifecycle** | `postgresql://sms_lifecycle:sms_lifecycle@postgres:5432/sms_db?schema=lifecycle` |
| **Staff** | `postgresql://sms_staff:sms_staff@postgres:5432/sms_db?schema=staff` |
| **Classroom** | `postgresql://sms_classroom:sms_classroom@postgres:5432/sms_db?schema=classroom` |
| **Academic** | `postgresql://sms_academic:sms_academic@postgres:5432/sms_db?schema=academic` |
| **Finance** | `postgresql://sms_finance:sms_finance@postgres:5432/sms_db?schema=finance` |
| **Comms** | `postgresql://sms_comms:sms_comms@postgres:5432/sms_db?schema=comms` |
| **Campus** | `postgresql://sms_campus:sms_campus@postgres:5432/sms_db?schema=campus` |

### 1.3 Per-Service Roles (db-roles)
The `db-roles` service in docker-compose applies these roles on every `docker compose up`:
- `sms` superuser on `public` schema
- `sms_identity` with SELECT/INSERT/UPDATE on identity schema
- `sms_lifecycle` with full access on lifecycle schema
- And similarly for all 8 schemas

**Migration note**: The `db-roles` service runs `psql -f /apply-roles.sql` after PostgreSQL is healthy. This is idempotent.

---

## 2. Prisma Schema

### 2.1 Root Schema (`prisma/schema.prisma`)
```prisma
generator client {
  provider = "postgresql"
  previewFeatures = ["relationships"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["public", "identity", "academic", "classroom", "lifecycle", "staff", "finance", "ops", "comms", "campus"]
}

// Shadow tables for internal tracking
model _metadata {
  id        String   @id @default(uuid())
  updatedAt DateTime @default(now())
}
```

### 2.2 Key Models (per schema)
Each schema has its own set of domain models:
- **identity**: User, MfaToken, Session, PasswordReset
- **lifecycle**: AdmissionApplication, AdmissionDocument, EntranceFee
- **staff**: Teacher, Class, Timetable, Attendance
- **classroom**: Section, Student, Enrollment, Grade
- **academic**: Exam, Question, Submission, GradeSheet
- **finance**: Fee, Receipt, Payment, Transaction
- **comms**: Notification, EmailTemplate, SMSRecord
- **campus**: Campus, Role, UserRole

### 2.3 Relationship Patterns
```prisma
// Example: User ↔ Enrollment (identity schema)
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String?
  role          String    @default("STUDENT")
  classrooms    Classroom[]
  admissions    AdmissionApplication[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Classroom {
  id            String    @id @default(uuid())
  name          String
  gradeLevel    String
  teacherId     String?
  teacher       User?     @relation(fields: [teacherId], references: [id])
  students      Student[]
  createdAt     DateTime  @default(now())
}
```

---

## 3. Migration Strategy

### 3.1 Local Development Workflow
```bash
# 1. Create migration
npx prisma migrate dev --name add_student_email

# 2. Migration creates:
#   - migration directory in prisma/migrations/
#   - up.sql / down.sql
#   - Runs migration against local DB

# 3. Generate client
npx prisma generate

# 4. Apply to production (after test)
npx prisma migrate deploy
```

### 3.2 Production Migration Workflow
```bash
# 1. Test migration locally first
npx prisma migrate dev --name <migration_name>

# 2. If changes are safe, apply to production
# Option A: Via GitHub Actions
#   - workflow runs npx prisma migrate deploy (after docker compose up)
# Option B: SSH to Lightsail
#   - docker compose exec postgres pg_isready
#   - npx prisma migrate deploy

# 3. Verify schema changed
npx prisma migrate status

# 4. Generate client (if types changed)
npx prisma generate
```

### 3.3 Migration Best Practices
| Practice | Reason |
|----------|--------|
| **Always write down.sql** | Enables rollback if needed |
| **Test on staging first** | Catch breaking changes |
| **One migration = one logical change** | Easier debugging |
| **Avoid data loss in up.sql** | Use `IF NOT EXISTS`, `COPY WITH` |
| **Run `prisma generate` after** | Keep types in sync |
| **Monitor `prisma migrate status`** | Detect pending migrations |
| **Do NOT use `--accept-data-loss` in production** | Controlled migration process required |
| **Use `prisma migrate deploy` not `prisma db push`** | Production-ready migration workflow |

### 3.4 Common Migration Patterns

#### 3.4.1 Adding a Column
```sql
-- up.sql
ALTER TABLE "User" ADD COLUMN "phone" VARCHAR(20);

-- down.sql
ALTER TABLE "User" DROP COLUMN "phone";
```

#### 3.4.2 Changing a Column Type
```sql
-- up.sql
ALTER TABLE "User" ALTER COLUMN "email" TYPE VARCHAR(255);

-- down.sql
-- Revert: need to know original type
```

#### 3.4.3 Creating a New Table
```sql
-- up.sql
CREATE TABLE "AuditLog" (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  entity      VARCHAR   NOT NULL,
  entity_id   UUID      NOT NULL,
  action      VARCHAR   NOT NULL,
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- down.sql
DROP TABLE "AuditLog";
```

---

## 4. Backup Procedures

### 4.1 Automated Daily Backups (GitHub Actions or Lightsail Cron)

**⚠️ Important**: A GitHub-hosted Actions runner cannot directly back up a Docker volume that exists only on the Lightsail server. The backup must be initiated from within the Lightsail server itself.

#### Option A: GitHub Actions with SSH (recommended) - runs backup on production server

Create `.github/workflows/backup.yml`:

```yaml
name: Database & Object Backup

on:
  schedule:
    - cron: "0 2 * * *"  # Daily at 2 AM UTC
  workflow_dispatch:

jobs:
  backup:
    name: Backup Production PostgreSQL and MinIO
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Verify SSH key is available
        run: |
          if [ -z "${{ secrets.LIGHTSAIL_SSH_KEY }}" ]; then
            echo "::error ::LIGHTSAIL_SSH_KEY secret not configured"
            exit 1
          fi
          mkdir -p ~/.ssh
          echo "${{ secrets.LIGHTSAIL_SSH_KEY }}" > ~/.ssh/lightsail-key.pem
          chmod 600 ~/.ssh/lightsail-key.pem

      - name: Setup SSH to Lightsail
        uses: infinite-reach/ssh-composite-action@v1
        with:
          hostname: ${{ secrets.LIGHTSAIL_HOSTNAME }}
          username: ${{ secrets.LIGHTSAIL_SSH_USER }}
          private_key: ${{ secrets.LIGHTSAIL_SSH_KEY }}
          port: 22

      - name: Run PostgreSQL backup from production server
        run: |
          echo "🗄️ Starting PostgreSQL backup..."
          BACKUP_DIR="/tmp/backups-$(date +%F)"
          mkdir -p "$BACKUP_DIR"

          # pg_dump runs inside the Docker network on the production server
          docker compose exec postgres pg_dump -U sms -d sms_db > "$BACKUP_DIR/sms_db_$(date +%F).sql" \
            2>&1 || echo "::warning ::Backup script had issues"

          # Verify the backup was created
          if [ -f "$BACKUP_DIR/sms_db_$(date +%F).sql" ]; then
            BACKUP_SIZE=$(wc -c < "$BACKUP_DIR/sms_db_$(date +%F).sql")
            echo "✅ PostgreSQL backup created: $BACKUP_SIZE bytes"
          else
            echo "❌ PostgreSQL backup failed - no dump file found"
            exit 1
          fi

      - name: Backup MinIO objects
        run: |
          echo "📦 Starting MinIO backup..."
          mc ls myminio/ | while read bucket; do
            BUCKET_NAME=$(echo "$bucket" | awk '{print $1}')
            mc tar myminio/$BUCKET_NAME "/tmp/minio-backup-${BUCKET_NAME}-$(date +%F).tar" \
              2>&1 || echo "::warning ::MinIO backup for $BUCKET_NAME had issues"
          done
          echo "MinIO backup completed"

      - name: Encrypt and upload backups to AWS S3
        run: |
          echo "🔐 Encrypting and uploading backups to AWS S3..."
          sudo apt-get update -y && sudo apt-get install -y gnupg
          ENCRYPT_PASSPHRASE="${{ secrets.BACKUP_ENCRYPT_PASSPHRASE }}"
          for backup in /tmp/backups-$(date +%F)/*.sql /tmp/minio-backup-*.tar; do
            if [ -f "$backup" ]; then
              filename=$(basename "$backup")
              gpg --batch --yes --passphrase "$ENCRYPT_PASSPHRASE" --symmetric --cipher-algo AES256 "$backup" -o "$backup.gpg"
              aws s3 cp "$backup.gpg" "s3://sms-backups-prod/${filename}.gpg" \
                --sse AES256 --metadata-directive REPLACE
              shred -u "$backup" "$backup.gpg" 2>/dev/null || true
              echo "✅ Uploaded encrypted backup: $filename.gpg to s3://sms-backups-prod/"
            fi
          done

      - name: Verify backup integrity
        run: |
          echo "✅ Verifying backup integrity..."
          ENCRYPTED_COUNT=$(aws s3 ls s3://sms-backups-prod/ --sum | grep -c ".gpg" || echo "0")
          echo "Encrypted backups in S3: $ENCRYPTED_COUNT"
          if [ "$ENCRYPTED_COUNT" -gt 0 ]; then
            echo "✅ Backup verification: $ENCRYPTED_COUNT encrypted backup(s) present in S3"
          else
            echo "❌ No encrypted backups found in S3 - backup may have failed"
            exit 1
          fi
```
```

#### Option B: Cron on Lightsail instance

Run a daily cron job on the Lightsail Linux VM itself:
```bash
# In crontab (run: crontab -e)
0 2 * * * /usr/local/bin/backup-script.sh
```

Where `backup-script.sh` contains:
```bash
#!/bin/bash
BACKUP_DIR="/tmp/backups-$(date +%F)"
mkdir -p "$BACKUP_DIR"

# PostgreSQL backup
docker compose exec postgres pg_dump -U sms -d sms_db > "$BACKUP_DIR/sms_db_$(date +%F).sql"

# MinIO backup
mc tar admissions "/tmp/minio-backup-admissions-$(date +%F).tar" 2>/dev/null || true
mc tar classroom "/tmp/minio-backup-classroom-$(date +%F).tar" 2>/dev/null || true
mc tar exam-papers "/tmp/minio-backup-exam-papers-$(date +%F).tar" 2>/dev/null || true
mc tar receipts "/tmp/minio-backup-receipts-$(date +%F).tar" 2>/dev/null || true

# Encrypt and upload to S3 (separate from Lightsail)
...
```

### 4.2 Manual Backup from Lightsail SSH
```bash
# Create backup
docker compose exec postgres pg_dump -U sms -d sms_db > backup_$(date +%F).sql

# Verify backup
pg_dump -U sms -d sms_db --schema=public | wc -l lines

# List backups
ls -la backup_*.sql

# Download from Lightsail (SCP)
scp -i ~/.ssh/lightsail-key.pem sms-user@lightsail-instance:/home/sms-user/backup_2026-01-15.sql ./backups/
```

### 4.3 Backup Retention Policy
| Tier | Count | Description |
|------|-------|-------------|
| Daily | 7 keep | Last 7 days (automated, via GitHub Actions or Lightsail cron) |
| Weekly | 4 keep | Last 4 weeks (renamed with week number) |
| Monthly | 3 keep | Last 3 months (labeled with month/year) |
| **Total** | **14 SQL files** | Rotating retention |

### 4.4 Backup Verification
```bash
# Verify backup can restore
pg_dump -U sms -d sms_db > /tmp/verify_backup.sql
psql -U sms -d sms_db_new < /tmp/verify_backup.sql

# Check backup integrity
pg_dump -U sms -d sms_db --check -f /tmp/verify_backup.sql

# Test restore to new database
createdb sms_restore
pg_dump -U sms -d sms_db | psql -U sms -d sms_restore
psql -U sms -d sms_restore -c "SELECT count(*) FROM users;"  # Verify row counts
dropdb sms_restore
```

---

## 5. Restore Procedures

### 5. Restore Procedures

### 5.1 Restore from Backup (Full Database)
```bash
# 1. Create new empty database
createdb sms_restore

# 2. Restore from backup
psql -U sms -d sms_restore < backup_2026-01-15.sql

# 3. Verify restoration
psql -U sms -d sms_restore -c "
  SELECT 'Users:' as table_name, count(*) as count FROM users
  UNION ALL
  SELECT 'Applications:', count(*) FROM admission_applications
  UNION ALL
  SELECT 'Documents:', count(*) FROM admission_documents;
"

# 4. If successful, swap production database
# Option A: Rename (safer)
psql -U postgres -c "ALTER DATABASE sms OWNER TO sms_old;"
psql -U postgres -c "ALTER DATABASE sms_restore OWNER TO sms;"
psql -U postgres -c "ALTER DATABASE sms_old RENAME TO sms_archived;"

# Option B: Full replace (faster, riskier)
dropdb sms
psql -U postgres -c "ALTER DATABASE sms_restore RENAME TO sms;"
```

### 5.2 Restore Specific Schema
```bash
# Restore only identity schema
pg_dump -Usms -dsms_db -N 'public|lifecycle|staff|...' -t 'identity.*' > identity_backup.sql
psql -U sms_identity -d sms_db < identity_backup.sql
```

### 5.3 Restore MinIO Files
```bash
# List backed up files
mc ls myminio/backups/

# Restore specific file
mc cp myminio/backups/sms-admissions-student.pdf myminio/sms-admissions/

# Or restore entire bucket from backup
mc pipe myminio/backup-bucket.tar | mc untar myminio/
```

### 5.4 Point-in-Time Recovery (PITR)
**Not currently configured** - requires:
- PostgreSQL WAL archiving
- Continuous backup mode
- Recovery target specification
- **Recommendation**: Use daily full backups + manual transaction logs for critical operations

---

## 6. Database Health Checks

### 6.1 PostgreSQL Health Endpoint
```bash
# From Lightsail SSH
pg_isready -U sms -d sms_db

# Via compose
docker compose exec postgres pg_isready -U sms -d sms_db

# HTTP health check (from Dockerfile)
curl http://localhost:5432/  # Returns PostgreSQL status
```

### 6.2 Connection Pool Monitoring
```bash
# Check active connections
psql -U sms -d sms_db -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"

# Check long-running queries
psql -U sms -d sms_db -c "
  SELECT pid, query, state, wait_event_type, wait_event
  FROM pg_stat_activity
  WHERE state = 'active'
  AND query_start < now() - interval '5 minutes';
"

# Check total connections vs max
psql -U sms -d sms_db -c "
  SELECT setting::int as current, 
         (SELECT setting::int FROM pg_settings WHERE name='max_connections') as max_conn
  FROM pg_settings WHERE name='max_connections';
"
```

### 6.3 Recommended max_connections
- **Lightsail $10 plan**: `max_connections = 100`
- **Lightsail $20 plan**: `max_connections = 200`
- **Monitor**: Set up alert if > 80% utilized

---

## 7. Schema Versioning

### 7.1 Migration Directory Structure
```
prisma/migrations/
├── 20240115000001_init/
│   ├── migration.toml
│   ├── 00000000000000_create_schema.up.sql
│   └── 00000000000000_create_schema.down.sql
├── 20240120000002_add_student_phone/
│   ├── migration.toml
│   ├── 00000000000000_add_student_phone.up.sql
│   └── 00000000000000_add_student_phone.down.sql
└── ... (chronological)
```

### 7.2 Migration TOML Format
```toml
version = 1
name = "add_student_phone"
description = "Add phone column to Student model"

[prisma]
binaryTarget = "linux-musl-openssl-3.0.x"
```

### 7.3 Applying Migrations Chronologically
```bash
# Check pending migrations
npx prisma migrate status

# Apply all pending
npx prisma migrate deploy

# Apply specific migration
npx prisma migrate reset --force --skip-seed
```

### 7.3 Rolling Back a Migration
```bash
# Rollback last migration
npx prisma migrate resolve --rolled-back <migration_name>

# Or use down.sql manually
psql -U sms -d sms_db -f prisma/migrations/20240120000002/00000000000000_add_student_phone.down.sql
```

---

## 8. Environment-Specific Configurations

### 8.1 Development (.env.development)
```env
DATABASE_URL=postgresql://sms:sms@localhost:5432/sms_db?schema=public
DATABASE_PROVIDER=postgresql
DIRECT_URL=postgresql://sms:sms@localhost:5432/sms_db?proto=proto

# Enable debug logging
LOG_LEVEL=debug

# Skip migrations on start (dev only)
SKIP_MIGRATE=false
```

### 8.2 Staging (.env.staging)
```env
DATABASE_URL=postgresql://sms:sms@staging-db.example.com:5432/sms_db?schema=public
DATABASE_PROVIDER=postgresql
LOG_LEVEL=info
```

### 8.3 Production (.env.production)
```env
DATABASE_URL=postgresql://sms:sms@postgres:5432/sms_db?schema=public
DATABASE_PROVIDER=postgresql
LOG_LEVEL=warn

# Connection pooling (via pgbouncer if needed)
PGPOUR_HOST=pgbouncer:6432
PGPOUR_DATABASE=postgres
PGPOUR_USERNAME=sms
PGPOUR_PASSWORD=... (from secrets)
```

### 8.4 Prisma Schema Differences Per Environment
| Environment | `npx prisma migrate` behavior |
|------------|------------------------------|
| **Development** | Creates new migrations freely, `prisma migrate reset` OK |
| **Staging** | Same as prod, test migrations first |
| **Production** | `prisma migrate deploy` only after review; `prisma migrate reset` PROHIBITED |

---

## 9. Disaster Recovery

### 9.1 Recovery Time Objective (RTO)
- **Target**: < 30 minutes
- **Actual**: Depends on backup size (typically 2-5 minutes for pg_dump restore)

### 9.2 Recovery Point Objective (RPO)
- **Target**: < 24 hours (daily backups)
- **Actual**: Max data loss = 24 hours of transactions since last backup

### 9.3 DR Runbook

#### Step 1: Assess Damage
```bash
# Check what's down
docker compose ps

# Check database status
pg_isready -U sms -d sms_db

# Check MinIO status
mc admin info minio
```

#### Step 2: Restore from Last Known Good Backup
```bash
# 1. Create fresh Lightsail instance (or use existing)
# 2. Deploy docker compose
docker compose up -d

# 3. Restore database
pg_dump -U sms -d sms_db > /tmp/pre_restore.sql  # snapshot current state

# 4. Restore from backup
psql -U sms -d sms_db < backup_2026-01-14.sql  # last daily backup

# 5. Verify data integrity
psql -U sms -d sms_db -c "SELECT count(*) FROM admission_applications;"
```

#### Step 3: Restore MinIO Uploads
```bash
# Restore admission documents
mc cp backup-minio/sms-admissions/ minio/sms-admissions/ -r

# Restore classroom files
mc cp backup-minio/sms-classroom/ minio/sms-classroom/ -r

# Restore exam papers
mc cp backup-minio/sms-exam-papers/ minio/sms-exam-papers/ -r

# Restore receipts
mc cp backup-minio/sms-receipts/ minio/sms-receipts/ -r
```

#### Step 4: Verify Services
```bash
# Check all health endpoints
for port in 80 8081 3010 3011 3012 3013 3014 3015 3016 3017 3018; do
  status=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$port/health/live)
  echo "Port $port: HTTP $status"
done
```

#### Step 5: Update DNS (if custom domain)
```bash
# If using custom domain, verify DNS points to new IP
dig yourdomain.com A +short

# Update if needed via Lightsail DNS zone
```

#### Step 6: Post-Recovery Checks
```bash
# 1. Login as admin → verify data accessible
# 2. Create test admission application → verify document upload
# 3. Create test exam → verify grade sheet PDF
# 4. Check logs for errors: docker compose logs -f
# 5. Run smoke test suite: npm run test:online-exam
```

### 9.4 DR Drill Schedule
| Frequency | Activity |
|-----------|----------|
| **Monthly** | Full restore test (database + MinIO) |
| **Quarterly** | DNS failover test (custom domain) |
| **Annually** | Full disaster recovery exercise (new region) |

---

## 10. Performance Optimization

### 10.1 PostgreSQL Tuning (Lightsail)
```ini
# /etc/postgresql/16/main/postgresql.conf (adjust based on plan)

# Memory settings (Lightsail $20: 4GB RAM)
shared_buffers = 1GB        # 25% of RAM
work_mem = 32MB           # Per-sort/temp memory
maintenance_work_mem = 256MB

# Connection settings
max_connections = 100       # $10 plan, adjust for $20 plan
effective_cache_size = 2GB  # 50% of RAM

# WAL settings
wal_buffers = 16MB
checkpoint_completion_target = 0.9

# Logging (production)
log_min_duration_statement = 1000  # Log slow queries > 1s
log_checkpoints = on
log_connections = on
log_disconnections = on
```

### 10.2 Index Recommendations
```sql
-- Common query optimizations

-- Admission applications by status
CREATE INDEX idx_admissions_status ON admission_applications(status);

-- Users by email (already unique, but confirm)
CREATE UNIQUE INDEX idx_users_email ON "User"(email);

-- Exam submissions by exam ID
CREATE INDEX idx_submissions_exam_id ON submission(exam_id);

-- Classroom enrollments by student
CREATE INDEX idx_enrollments_student ON enrollment(student_id);

-- Fee payments by status
CREATE INDEX idx_fees_status ON fee_payment(status);

-- Search performance (if using LIKE)
CREATE INDEX idx_users_name_lower ON "User"(lower(name));
```

### 10.3 Query Performance Patterns
- **Avoid SELECT \*** - specify only needed columns
- **Use WHERE with indexed columns** - `status`, `createdAt`, `email`
- **Paginate with seek pattern** - `WHERE id > last_seen_id` rather than `OFFSET`
- **Batch operations** - use `UNNEST` or `IN` with limited sizes
- **Avoid N+1 queries** - use Prisma `include` efficiently

### 10.4 Connection Pool Sizing
```yaml
# Recommended pgBouncer config for Lightsail

[global]
pool_mode = transaction
default_pool_size = 20
max_pool_size = 50
reserve_pool_size = 10
reserve_pool_timeout = 3

# Per-service limits (via environment)
# identity: max 15 connections
# lifecycle: max 10 connections  
# staff: max 20 connections
# classroom: max 25 connections
# academic: max 15 connections
# finance: max 12 connections
# comms: max 8 connections
# campus: max 10 connections
```

---

## 11. Migration Checklist

### 11.1 Before Deploying Schema Changes
- [ ] Code changes reviewed & tested locally
- [ ] Migration `up.sql` written & `down.sql` written
- [ ] Staging environment tested: `npx prisma migrate dev --name <name>`
- [ ] No data loss in migration (verified with test data)
- [ ] `prisma generate` runs without errors
- [ ] TypeScript types updated: `npx tsc --noEmit`
- [ ] Team notified of schema change
- [ ] Rollback plan documented

### 11.2 Deployment Window
- [ ] Deploy during low-traffic hours ( weekends/evenings )
- [ ] Monitor production metrics before/after
- [ ] 30-minute rollback window available
- [ ] Stakeholder approval obtained
- [ ] Backup taken before migration runs

### 11.3 Post-Deployment
- [ ] `prisma migrate status` shows new migration applied
- [ ] Health checks passing (all services)
- [ ] Key functions verified (admission, exam, finance)
- [ ] Logs reviewed for errors
- [ ] Documentation updated if model names changed