# 🆘 Disaster Recovery

## Overview
This document provides the disaster recovery (DR) plan for the GNET School Management System on AWS Lightsail. It covers backup strategies, restore procedures, failover scenarios, and business continuity.

---

## 1. Disaster Recovery Objectives

### 1.1 Recovery Time Objective (RTO)
| Scenario | Target RTO | Actual Typical | Notes |
|----------|------------|----------------|-------|
| **Service restart** (container crash) | < 5 minutes | 1-2 minutes | `docker compose restart <service>` |
| **Full service outage** | < 30 minutes | 10-15 minutes | DNS propagation + service restart |
| **Database restore** (from backup) | < 20 minutes | 2-5 minutes | pg_restore from daily backup |
| **Full DR drill** (database + MinIO) | < 2 hours | 45-60 minutes | Scheduled, documented procedure |
| **Complete region failover** | N/A (Lightsail single region) | N/A | Not applicable - single AWS region |

### 1.2 Recovery Point Objective (RPO)
| Data Type | Target RPO | Actual | Backup Frequency |
|-----------|------------|--------|------------------|
| **PostgreSQL data** | < 24 hours | < 4 hours (daily) | `pg_dump` at 02:00 UTC daily |
| **MinIO uploads (admissions)** | < 24 hours | < 4 hours (daily) | MinIO auto-sync + daily backup |
| **MinIO uploads (classroom/exams/receipts)** | < 24 hours | < 4 hours (daily) | Same as above |
| **Configuration (.env, Docker)** | < 1 hour | On redeploy | Git + GitHub Actions |
| **Application code** | < 1 hour | On `git push` | Git repository |

### 1.3 DR Scope
**In Scope:**
- PostgreSQL database (sms_db, all 8 schemas)
- MinIO object storage (all 4 buckets: admissions, classroom, exam-papers, receipts)
- Application configuration (env vars, secrets via GitHub Secrets)
- Docker container images (via Docker Hub automation)

**Out of Scope:**
- Custom domain DNS (managed separately via Route 53 or Lightsail DNS)
- Third-party integrations (email providers, Stripe - handled per-service)
- Student/staff devices (BYOD - not within system control)
- Local network infrastructure (Lightsail host - AWS managed)

---

## 2. Backup Inventory

### 2.1 Daily Backups (Automated)
| Component | Format | Location | Retention |
|-----------|--------|----------|-----------|
| PostgreSQL | `.sql` dump | MinIO bucket `sms-backups` | 7 days |
| MinIO metadata | Database export | MinIO bucket `sms-backups` | 7 days |
| Application config | `.env.production` | GitHub repo (versioned) | Indefinite |
| Docker images | `gnet-sms:latest` | Docker Hub | Latest + tagged |

### 2.2 Weekly Backups
| Component | Format | Location | Retention |
|-----------|--------|----------|-----------|
| Full database schema | `schema_export_YYYY-MM-DD.sql` | MinIO `sms-backups/weekly/` | 4 weeks |
| MinIO bucket snapshots | Tar archive | MinIO `sms-backups/weekly/` | 4 weeks |
| Docker compose config | `docker-compose.yml.dump` | Git repo | Indefinite |

### 2.3 Monthly Backups
| Component | Format | Location | Retention |
|-----------|--------|----------|-----------|
| Full database + MinIO combined | `full_disaster_recovery_YYYY-MM.sql.tar.gz` | MinIO `sms-backups/monthly/` | 3 months |
| Pre-deployment snapshots | `pre_deploy_YYYYMMDD_{db,minio}.tar` | MinIO | As needed |
| Audit log export | `audit_log_YYYYMMDD.json` | MinIO | 1 year |

---

## 3. Restore Procedures

### 3.1 Prerequisites for Restore
```bash
# 1. Access Lightsail via SSH
ssh -i ~/lightsail-key.pem sms-user@lightsail-instance-name.lightsaillink.com

# 2. Verify Docker is running
docker ps
docker compose ps

# 3. Have backup files ready
ls -la /backups/  # or MinIO bucket
```

### 3.2 Restore PostgreSQL Database

#### Scenario A: Restore from Daily Backup (most common)
```bash
# 1. Create fresh database
createdb sms_restore

# 2. Restore from backup (MinIO or local)
mc cp myminio/backups/sms_db_2026-01-15.sql /tmp/
# OR if local: pg_dump -U sms -d sms_db > /tmp/backup.sql

# 3. Restore
psql -U sms -d sms_restore < /tmp/sms_db_2026-01-15.sql

# 4. Verify restoration
psql -U sms -d sms_restore -c "
  SELECT 'Users:' as table_name, count(*) FROM users UNION ALL
  SELECT 'Applications:', count(*) FROM admission_applications UNION ALL
  SELECT 'Documents:', count(*) FROM admission_documents UNION ALL
  SELECT 'Fees:', count(*) FROM fee_payment;
"

# 5. If successful, replace production
# Option 1: Rename databases
psql -U postgres -c "ALTER DATABASE sms OWNER TO sms_old;"
psql -U postgres -c "ALTER DATABASE sms_restore OWNER TO sms;"
psql -U postgres -c "ALTER DATABASE sms_old RENAME TO sms_archived;"

# Option 2: Full replace (faster, riskier)
dropdb sms
psql -U postgres -c "ALTER DATABASE sms_restore RENAME TO sms;"
```

#### Scenario B: Restore from Latest Tagged Backup
```bash
# If using Docker Hub tagged images
docker pull your-dockerhub-id/gnet-sms:2026-01-15

# Restore with specific version
docker compose -f docker-compose.yml up -d --no-deps

# Or manual restore
docker run --rm \
  -v pgdata:/var/lib/postgresql/data \
  your-dockerhub-id/gnet-sms:2026-01-15 \
  sh -c "pg_dump -U sms -d sms_db > /backup.sql"

# Restore the dump
psql -U sms -d sms_db < /backup.sql
```

### 3.3 Restore MinIO Files

#### Restore Admission Documents
```bash
# From weekly backup
mc rb myminio/sms-admissions  # Remove current bucket (destructive)
mc mb myminio/sms-admissions  # Recreate

# Restore from weekly backup archive
mc tar myminio/sms-admissions restore /backup/weekly/sms-admissions_2026-01_15.tar

# Or file-by-file restore
mc cp myminio/backup-weekly/sms-admissions/student.pdf myminio/sms-admissions/
```

#### Restore All MinIO Buckets
```bash
# Restore entire bucket from tar.gz
mc tar myminio/sms-admissions restore \
  /backup/monthly/full_disaster_recovery_2026-01.sql.tar.gz

# Or restore each bucket separately
for bucket in sms-admissions sms-classroom sms-exam-papers sms-receipts; do
  mc tar myminio/$bucket restore /backup/monthly/full_disaster_recovery_2026-01_$bucket.tar
done
```

### 3.4 Complete System Restore (Database + MinIO + Application)

#### Full DR Procedure
```bash
#!/bin/bash
# disaster-recover.sh - Full system restoration
set -e

echo "=== GNET SMS Disaster Recovery ==="
echo "Starting at: $(date -u)"
echo ""

# Step 0: Preparation
echo "📋 Step 0: Preparation"
echo "   - Verify SSH access"
echo "   - Confirm backup availability"
echo "   - Scale up Lightsail if needed (more RAM/CPU)"
echo ""

# Step 1: Restore Database
echo "🗄️ Step 1: Restore PostgreSQL"
createdb sms_restore
psql -U sms -d sms_restore < /backups/sms_db_$(date -d '-1 day' +%F).sql

# Verify
echo "   Verifying restoration..."
psql -U sms -d sms_restore -c "SELECT count(*) FROM users;"

# Step 2: Restore MinIO
echo "📦 Step 2: Restore MinIO storage"
mc mb myminio/sms-admissions
mc mb myminio/sms-classroom
mc mb myminio/sms-exam-papers
mc mb myminio/sms-receipts

# Restore from weekly backup (most recent full)
mc tar myminio/sms-admissions restore /backup/monthly/full_disaster_recovery_$(date -d '-7 day' +%F).tar
mc tar myminio/sms-classroom restore /backup/monthly/full_disaster_recovery_$(date -d '-7 day' +%F)_classroom.tar
mc tar myminio/sms-exam-papers restore /backup/monthly/full_disaster_recovery_$(date -d '-7 day' +%F)_exams.tar
mc tar myminio/sms-receipts restore /backup/monthly/full_disaster_recovery_$(date -d '-7 day' +%F)_receipts.tar

# Step 3: Restart Application
echo "🚀 Step 3: Restart Application"
docker compose down
docker compose up -d

# Wait for health checks
echo "   Waiting for health checks..."
sleep 30

# Verify
for port in 80 8081 3010 3011 3012 3013 3014 3015 3016 3017 3018; do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health/live)
  if [ "$code" = "200" ]; then
    echo "   ✅ Port $port healthy"
  else
    echo "   ❌ Port $port unhealthy (HTTP $code)"
  fi
done

# Step 4: Verify Data Integrity
echo "🔍 Step 4: Data Integrity Check"
echo "   Admission applications: $(psql -U sms -d sms -tAc "SELECT count(*) FROM admission_applications;")"
echo "   Users: $(psql -U sms -d sms -tAc "SELECT count(*) FROM users;")"
echo "   MinIO buckets: $(mc ls myminio/ | wc -l) buckets"

# Step 5: Final Status
echo ""
echo "=== DR Complete at: $(date -u) ==="
if docker compose ps | grep -q "healthy"; then
  echo "🟢 Full system restored successfully"
else
  echo "🟡 Restored but some services need attention"
  exit 1
fi
```

### 3.5 Restore Verification Checklist
```bash
# After any restore, verify:
echo "=== Restore Verification ==="

# 1. Database
echo "1. Database row counts:"
psql -U sms -d sms -c "
  SELECT tablename, count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') GROUP BY tablename;
"

# 2. Key data counts
echo ""
echo "2. Key data counts:"
echo "   Admission apps: $(psql -U sms -d sms -tAc "SELECT count(*) FROM admission_applications;")"
echo "   Users: $(psql -U sms -d sms -tAc "SELECT count(*) FROM users;")"
echo "   Exam submissions: $(psql -U sms -d sms -tAc "SELECT count(*) FROM exam_submissions;")"
echo "   Fee payments: $(psql -U sms -d sms -tAc "SELECT count(*) FROM fee_payment;")"
echo "   Receipts: $(psql -U sms -d sms -tAc "SELECT count(*) FROM receipt;")"

# 3. MinIO files
echo ""
echo "3. MinIO object counts:"
mc ls myminio/sms-admissions/ | wc -l | xargs -I{} echo "   Admission docs: {}"
mc ls myminio/sms-classroom/ | wc -l | xargs -I{} echo "   Classroom files: {}"
mc ls myminio/sms-exam-papers/ | wc -l | xargs -I{} echo "   Exam papers: {}"
mc ls myminio/sms-receipts/ | wc -l | xargs -I{} echo "   Receipts: {}"

# 4. Service health
echo ""
echo "4. Service health checks:"
for port in 80 8081 3010 3011 3012 3013 3014 3015 3016 3017 3018; do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health/live)
  echo "   Port $port: HTTP $code"
done

# 5. Login test
echo ""
echo "5. Admin login test:"
echo "   (Manual: visit http://localhost:8080 and login with admin credentials)"

echo ""
echo "=== Verification Complete ==="
```

---

## 4. Failover Scenarios

### 4.1 Single Lightsail Instance Failure
**Scenario**: Lightsail instance becomes unresponsive, hardware failure, or SSH access lost.

**Procedure**:
```bash
# 1. In AWS Console, note the current instance status
# 2. Create new Lightsail instance with same plan
# 3. SSH to new instance
# 4. Deploy docker compose (same as original)
docker compose up -d

# 5. Restore from backup if data loss suspected
#    (pg_restore + mc restore)

# 6. Update DNS if using custom domain
#    Route 53 / Lightsail DNS → point to new instance IP

# 7. Verify all services
#    health checks, key flows (admission, exam, finance)

# 8. Terminate old instance (after confirming new one working)
```

**Timeline**: 15-30 minutes

### 4.2 Database Corruption
**Scenario**: PostgreSQL data corruption, accidental DELETE, dropped tables.

**Procedure**:
```bash
# 1. Immediate: Stop writes
#    - Disable application deployment via GitHub Actions
#    - Put maintenance mode if available

# 2. Assess damage
psql -U sms -d sms_db -c "SELECT count(*) FROM pg_stat_activity WHERE state='active';"
pg_check -U sms -d sms_db  # if available

# 3. Restore from last known good backup
#    (See Section 3.2)

# 4. Point-in-time recovery (if WAL archiving enabled)
#    Not currently configured - use daily backup + transaction logs

# 4. Verify and resume
#    - Run health checks
#    - Test critical flows
#    - Remove maintenance mode
#    - Re-enable deployments
```

### 4.3 MinIO Storage Full or Corrupted
**Scenario**: MinIO disk full, data corruption, bucket deletion.

**Procedure**:
```bash
# 1. Assess situation
mc admin info minio  # health status
mc rb myminio/sms-admissions  # if bucket needs recreation

# 2. Restore from backup
mc mb myminio/sms-admissions
mc tar myminio/sms-admissions restore /backup/weekly/sms-admissions_2026-01_15.tar

# 3. If data lost beyond backup:
#    - Check if MinIO has erasure coding enabled
#    - Restore from oldest available backup
#    - Contact AWS support if MinIO metadata corrupted

# 4. Prevent recurrence
#    - Set up lifecycle rules for auto-cleanup
#    - Monitor disk usage (alert at 70%, critical at 85%)
#    - Upgrade Lightsail plan for more disk space
```

### 4.4 Complete Service Outage
**Scenario**: All services down, no response on any port.

**Procedure**:
```bash
# 1. Check infrastructure
#    - Lightsail console: instance status, metrics
#    - Ping Lightsail IP
#    - Check SSH access

# 2. Restart Docker
sudo systemctl restart docker

# 3. Restart compose
docker compose down
docker compose up -d --build

# 3. Wait for health checks (2-5 minutes)

# 4. Verify services
docker compose ps --format "table {{.Name}}\t{{.HealthStatus}}"

# 5. Key flow tests
#    - Login as admin
#    - Create test admission application
#    - Upload test document
#    - Create test exam

# 6. Monitor for 30 minutes
#    - Check logs for recurring errors
#    - Verify metrics returning to normal

# 7. Incident report
#    - Document root cause
#    - Update monitoring if needed
#    - Schedule retrospective
```

---

## 5. DR Drill Schedule

### 5.1 Drill Types & Frequency

| Drill Type | Frequency | Duration | Scope | Owner |
|------------|-----------|----------|-------|-------|
| **Backup Verification** | Monthly | 30 min | Restore DB + MinIO from daily backup | DevOps |
| **Full DR Drill** | Quarterly | 60-90 min | Full system restore (DB + MinIO + app) | DevOps Lead |
| **Service-Specific** | Monthly | 15 min | Individual service restore (e.g., just admissions) | Service Owner |
| **Emergency Simulation** | Semi-annually | 2-3 hrs | Complete outage scenario + communication | All Stakeholders |

### 5.2 DR Drill Record Template

```yaml
dr_drill_record:
  drill_id: "dr-2024-01-15-001"
  date: "2024-01-15"
  type: "full_restore"
  triggered_by: "scheduled_monthly"
  
  # Timeline
  start_time: "2024-01-15T02:00:00Z"
  backup_age: "23 hours 45 minutes"  # How old was the backup
  restore_duration: "47 minutes"
  
  # What was restored
  database: "postgresql://sms:sms@host:5432/sms_db"
  minio_buckets: ["sms-admissions", "sms-classroom", "sms-exam-papers", "sms-receipts"]
  application_config: "docker-compose.yml + .env.production"
  
  # Success criteria (all must be ✅)
  database_restored: "✅"
  minio_restored: "✅"
  services_up: "✅"
  data_integrity: "✅"
  admin_login: "✅"
  
  # Issues encountered
  issues: |
    - Minor: pg_restore took 5 min longer than expected
    - Fixed: Added index after restore for performance
  
  # Action items
  action_items:
    - owner: "devops-lead"
      due: "2024-02-15"
      description: "Optimize pg_dump to reduce backup time by 20%"
    
    - owner: "security-team"
      due: "2024-02-15"
      description: "Test restore with encrypted backups"
  
  # Sign-off
  signed_by: "ops-lead@gnet.school"
  approved_by: "school-principal@gnet.school"
```

### 5.3 DR Drill Communication

#### Pre-Drill Notification (24 hours before)
```
Subject: 📅 Scheduled DR Drill - GNET SMS - {{DATE}}

Team,

A disaster recovery drill will be conducted on {{DATE}} at 02:00 UTC.

What to expect:
- Estimated downtime: 45-60 minutes
- Affected systems: All GNET SMS services
- Action required: Avoid critical operations during window
- Backup will be taken prior to drill

If you have concerns or need to reschedule, reply to this email by {{DEADLINE}}.

The drill is essential for ensuring our ability to recover from incidents.

Thanks,
GNET Operations Team
```

#### Post-Drill Summary (Within 24 hours)
```
Subject: ✅ DR Drill Complete - GNET SMS - {{DATE}}

Team,

The disaster recovery drill conducted on {{DATE}} is now complete.

**Results:**
- Duration: {{DURATION}}
- Backup age: {{BACKUP_AGE}}
- Restore time: {{RESTORE_DURATION}}
- Success rate: {{SUCCESS_RATE}} ({{PASSED}}/{{TOTAL}} checks)

**What went well:**
{{WHAT_WENT_WELL}}

**Areas for improvement:**
{{IMPROVEMENTS}}

**Action items:**
{{ACTION_ITEMS}}

**Next drill:** {{NEXT_DRILL_DATE}}

Thanks,
GNET Operations Team
```

---

## 6. Business Continuity

### 6.1 Maintenance Mode
During DR drills or actual incidents, put system in maintenance mode:

```typescript
// ✅ Maintenance mode middleware
app.use('/api/', async (req, res, next) => {
  if (req.path.startsWith('/api/') && !req.path.startsWith('/api/health')) {
    return res.status(503).json({
      error: "System under maintenance",
      message: "GNET SMS is temporarily unavailable for scheduled maintenance",
      maintenance_expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  next();
});
```

### 6.2 Read-Only Mode
For certain scenarios, allow read-only access:

```typescript
// ✅ Read-only mode
app.use('/api/', async (req, res, next) => {
  if (req.headers['x-maintenance-mode'] === 'true') {
    // Allow GET/HEAD requests only
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(503).json({
        error: "System read-only",
        message: "GNET SMS is in read-only mode. Write operations paused.",
      });
    }
  }
  next();
});
```

### 6.3 Communication Templates

#### Scheduled Maintenance Notice
```
Subject: 🛠️ Scheduled Maintenance - GNET SMS - {{DATE}} {{TIME}}

Hello {{NAME}},

GNET SMS will undergo scheduled maintenance on {{DATE}} at {{TIME}} UTC.

**Expected downtime:** 2-4 hours
**Start time:** {{START_TIME}} UTC
**Estimated restoration:** {{END_TIME}} UTC

**During maintenance:**
- System will be temporarily unavailable
- No new admissions, exams, or fee processing
- Existing data remains intact
- Read-only access may be available for viewing reports

**What's being maintained:**
- Database optimization
- Dependency updates
- Performance improvements
- Backup system testing

**Post-maintenance:**
- System will be fully operational
- New features may be included
- You may need to log in again

**Questions?** Reply to this email or contact {{SUPPORT_EMAIL}}.

We apologize for any inconvenience and appreciate your patience.

Best,
GNET Operations Team
```

#### Emergency Outage Notice
```
Subject: 🚨 GNET SMS Outage - {{SEVERITY}} - Started {{TIME}}

Hello {{NAME}},

An incident has been detected affecting GNET SMS.

**Severity:** {{SEVERITY}} ({{SEVERITY_DEFINITION}})
**Start Time:** {{START_TIME}} UTC
**Status:** {{CURRENT_STATUS}} (e.g., "Investigating", "Partial outage")

**Affected Services:**
- {{AFFECTED_SERVICE_1}} 
- {{AFFECTED_SERVICE_2}}
- {{AFFECTED_SERVICE_3}}

**What's happening:**
{{INCIDENT_DESCRIPTION}}

**What we're doing:**
{{ACTIONS_TAKEN}}
- Investigating root cause
- Restoring from backup if needed
- Working to restore service

**Expected resolution:** {{ESTIMATED_RESOLUTION}} UTC

**Status updates:** Will be provided every 30 minutes until resolution.

**For urgent matters:** Contact {{ON_CALL_NAME}} at {{ON_CALL_PHONE}}

We understand this is disruptive and appreciate your patience. We'll provide regular updates as we make progress.

Best,
GNET Operations Team
```

---

## 7. Post-Incident Review

### 7.1 Incident Report Template

```markdown
# Incident Report: {{INCIDENT_ID}}

**Date:** {{DATE}}
**Time:** {{START_TIME}} - {{END_TIME}} UTC
**Duration:** {{DURATION}}
**Severity:** {{SEVERITY}} (Critical/High/Medium/Low)

**1. Summary**
{{2-3 sentence summary of what happened}}

**2. Timeline**
| Time (UTC) | Event |
|------------|-------|
| {{START_TIME}} | Incident detected/started |
| {{MILESTONE_1}} | First alert triggered |
| {{MILESTONE_2}} | Team notified |
| {{MILESTONE_3}} | Root cause identified |
| {{END_TIME}} | Incident resolved |

**3. Impact**
- **Users affected:** {{NUMBER}} (estimated)
- **Services impacted:** {{LIST}}
- **Data loss:** {{NONE/SPECIFY}}
- **Financial impact:** ${{AMOUNT}} (if any)
- **Reputation impact:** {{DESCRIPTION}}

**4. Root Cause**
{{DETAILED analysis of what caused the incident}}
- Immediate cause:
- Contributing factors:
- Systemic issues:

**5. Root Cause Analysis (5 Whys)**
1. Why did this happen? → {{ANSWER}}
2. Why did that happen? → {{ANSWER}}
3. Why did that happen? → {{ANSWER}}
4. Why did that happen? → {{ANSWER}}
5. Why did that happen? → {{ANSWER}}

**6. Resolution**
{{What was done to fix the incident}}
- Immediate fix:
- Secondary fix:
- Configuration changes:

**7. Prevention**
{{What will be done to prevent recurrence}}
- Short-term (≤ 30 days):
- Medium-term (≤ 90 days):
- Long-term (≤ 365 days):

**8. Action Items**
| # | Owner | Due Date | Status | Description |
|---|-------|----------|--------|-------------|
| 1 | {{NAME}} | {{DATE}} | Open | {{DESCRIPTION}} |
| 2 | {{NAME}} | {{DATE}} | In Progress | {{DESCRIPTION}} |

**9. Sign-off**
| Role | Name | Date |
|------|------|------|
| Incident Commander | {{NAME}} | {{DATE}} |
| Technical Lead | {{NAME}} | {{DATE}} |
| Operations Lead | {{NAME}} | {{DATE}} |
| Principal/Owner | {{NAME}} | {{DATE}} |
```

### 7.2 Lessons Learned Meeting
```yaml
# Post-incident meeting agenda (60 minutes)
- 10 min: What happened (timeline review)
- 15 min: What went well (successes)
- 15 min: What could improve (gaps)
- 15 min: Action items and owners
- 5 min: Next meeting / close

# Meeting participants (required)
- Incident Commander
- Technical Lead (service owner)
- Operations Lead
- Principal/Owner (if Critical/High severity)
- Affected team members (as needed)
```

### 7.3 Metrics Post-Incident
```yaml
# Track for continuous improvement
incident_metrics:
  total_incidents_last_12_months: 3
  mean_time_to_resolve (MTTR): 24 minutes
  mean time between failures (MTBF): 240 hours
  customer impact score: 7.5/10 (survey)
  root cause distribution:
    - Infrastructure: 40%
    - Code bug: 30%
    - Human error: 20%
    - Third-party: 10%
  prevention_actions_completed: 8/8 (100%)
```

---

## 8. Emergency Contacts

### 8.1 Internal Contacts
| Role | Name | Email | Phone | Availability |
|------|------|-------|-------|--------------|
| **Incident Commander** | {{NAME}} | ops@gnet.school | {{PHONE}} | 24/7 |
| **Technical Lead (Identity)** | {{NAME}} | identity@gnet.school | {{PHONE}} | 9-5 PST |
| **Technical Lead (Academic)** | {{NAME}} | academic@gnet.school | {{PHONE}} | 9-5 PST |
| **Operations Lead** | {{NAME}} | operations@gnet.school | {{PHONE}} | 24/7 on-call |
| **School Principal** | {{NAME}} | principal@gnet.school | {{PHONE}} | 9-5 PST |
| **DevOps Engineer** | {{NAME}} | devops@gnet.school | {{PHONE}} | 24/7 on-call |

### 8.2 External Contacts (as needed)
| Service | Provider | Contact | Notes |
|---------|----------|---------|-------|
| **AWS Support** | AWS Premium | aws-premium@amazon.com | Case number required |
| **Docker Hub** | Docker | dashboard@docker.com | For image push issues |
| **PostgreSQL Community** | pgforum@postgresql.org | Community forum |
| **MinIO Support** | support@min.io | For storage corruption |
| **Let's Encrypt** | certbot@eff.org | For SSL certificate issues |

---

## 9. Quick Reference: DR Commands Cheat Sheet

```bash
# === IMMEDIATE RESPONSE ===

# Check instance status
docker compose ps

# Restart all services
docker compose down && docker compose up -d

# Restart single service
docker compose restart <service_name>

# Check health endpoints
for port in 80 8081 3010 3011 3012 3013 3014 3015 3016 3017 3018; do
  curl -s -o /dev/null -w "%{http_code} http://localhost:$port/health/live\n"
done

# View logs
docker compose logs -f <service_name>

# === DATABASE ===

# Backup database
pg_dump -U sms -d sms_db > backup_$(date +%F).sql

# Restore database
createdb sms_restore
psql -U sms -d sms_restore < backup.sql

# Verify row counts
psql -U sms -d sms -c "SELECT count(*) FROM table_name;"

# === MINIO ===

# Check MinIO health
mc admin info minio

# List buckets
mc ls myminio/

# Restore bucket from tar
mc tar myminio/bucket restore /path/to/backup.tar

# Copy file
mc cp s3/bucket/file.pdf local-path/

# === SYSTEM ===

# Restart Docker daemon
sudo systemctl restart docker

# Check disk space
df -h

# Docker system info
docker system df

# Memory/CPU stats
docker stats

# Lightsail (via SSH)
# - Reboot instance: sudo reboot
# - Change plan: AWS Console → instance → Change plan
# - View metrics: AWS Console → Monitoring tab
```

---

## 10. Compliance Checklist

### 10.1 DR Compliance Requirements
| Requirement | Standard | Status | Last Verified |
|-------------|----------|--------|---------------|
| **Backup frequency** | Daily database backups | ✅ Compliant | 2024-01-15 |
| **Backup retention** | 7 daily + 4 weekly + 3 monthly | ✅ Compliant | 2024-01-15 |
| **RTO definition** | Documented and tested | ✅ Compliant | 2024-01-15 |
| **RPO definition** | Documented and tested | ✅ Compliant | 2024-01-15 |
| **DR drill frequency** | Quarterly full drill | ✅ Scheduled | 2024-01-15 |
| **Backup integrity** | Monthly verification | ✅ Scheduled | 2024-02-15 |
| **Contact list** | Updated quarterly | ✅ Current | 2024-01-15 |
| **Test restores** | Annual full drill | ✅ Scheduled | 2024-06-15 |
| **Audit trail** | Maintained 1 year | ✅ Compliant | 2024-01-15 |

### 10.2 Audit Log Integrity
```bash
# Verify audit logs are intact and readable
ls -la /var/log/gnet/audit/*.log
wc -l /var/log/gnet/audit/*.log  # Should have entries

# Check oldest and newest entries
head -3 /var/log/gnet/audit/system.log
tail -3 /var/log/gnet/audit/system.log

# Verify log file permissions
ls -la /var/log/gnet/audit/
# Expected: -rw-r----- root adminsys  (restricted access)
```

---

## 🎯 DR Summary Checklist

### Before Any Major Change
- [ ] Document current state (screenshots, configs)
- [ ] Take backup before deploying
- [ ] Verify backup restoration works
- [ ] Inform stakeholders of maintenance window
- [ ] Have rollback plan ready

### DR Drill Schedule
- [ ] Monthly: Backup verification (30 min)
- [ ] Quarterly: Full DR drill (60-90 min)
- [ ] Semi-annually: Emergency simulation
- [ ] Annually: Full compliance review

### Key Metrics Tracked
- [ ] RTO: < 30 minutes (target)
- [ ] RPO: < 24 hours (target)
- [ ] Backup success rate: 100% (goal)
- [ ] DR drill success rate: 100% (goal)
- [ ] Data loss incidents: 0 (goal)

### Emergency Buttons
- [ ] `docker compose down && docker compose up -d` (restart all)
- [ ] `pg_dump -U sms -d sms_db > backup.sql` (backup DB)
- [ ] `mc rb/myadd/minio` (remove + recreate bucket)
- [ ] AWS Console → Lightsail → Reboot instance
- [ ] Incident Commander pager (SMS/Call)

**Remember: The best DR plan is one that's tested regularly. Schedule your first drill today!**