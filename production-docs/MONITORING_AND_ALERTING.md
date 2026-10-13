# 📊 Monitoring & Alerting

## Overview
This document covers monitoring, metrics, health checks, alerting, and observability for the GNET School Management System running on AWS Lightsail.

---

## 1. Health Check Endpoints

### 1.1 Standard Health Checks (All Services)
Each service exposes `/health/live` and `/health/ready` endpoints:

```bash
# Liveness probe - service is running
curl http://localhost:3000/health/live

# Readiness probe - service ready to receive traffic
curl http://localhost:3000/health/ready
```

### 1.2 Expected Response Codes
| Endpoint | 200 Means | 503 Means | Purpose |
|----------|-----------|-----------|---------|
| `/health/live` | Service responding | Service unhealthy | Kubernetes/liveness probe |
| `/health/ready` | Ready for traffic | Not ready (DB down, etc.) | Kubernetes/readiness probe |

### 1.3 Service-Specific Health Checks

| Service | Port | Additional Checks |
|---------|------|------------------|
| **frontend-spa** | 80 | Nginx status, static files accessible |
| **api-gateway** | 8081 | Upstream service health, rate limiter status |
| **identity** | 3011 | Database connectivity, JWT validation |
| **lifecycle** | 3010 | MinIO connectivity, ClamAV status |
| **ops** | 3012 | Redis connectivity, notification queue |
| **staff** | 3013 | DB queries, internal token validation |
| **classroom** | 3014 | MinIO bucket access, enrollment counts |
| **academic** | 3015 | Exam paper access, PDF generation |
| **finance** | 3016 | Receipt generation, Stripe webhook status |
| **comms** | 3017 | Email send status, SMS gateway health |
| **campus** | 3018 | Role assignments, user counts |

### 1.4 Docker Compose Health Status
```bash
# Check all service health statuses
docker compose ps --format "table {{.Name}}\t{{.Status}}"

# Example output:
# NAME               STATUS
# postgres           healthy
# redis              healthy
# minio              healthy
# app                unhealthy  ← needs attention
# identity           healthy
# lifecycle          healthy
```

### 1.5 Health Check Configuration (Dockerfile)
All Dockerfiles include:
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:PORT/health/live || exit 1
```

---

## 2. Prometheus Metrics

### 2.1 Exposed Metrics (via Node.js pino-metrics)
Each service exposes Prometheus-compatible metrics at `/metrics`:

```bash
# Example metrics endpoint
curl http://localhost:3000/metrics
```

### 2.2 Key Metrics Catalog

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `http_requests_total` | Counter | Total HTTP requests | `method`, `route`, `status`, `service` |
| `http_requests_duration_seconds` | Histogram | Request latency (seconds) | `method`, `route`, `service` |
| `http_requests_errors_total` | Counter | Error count | `method`, `route`, `error_type`, `service` |
| `active_connections` | Gauge | Current concurrent connections | `service` |
| `db_connection_pool_used` | Gauge | Used DB connections / max | `service` |
| `db_query_duration_seconds` | Histogram | Individual query latency | `query_type`, `service` |
| `vmem_used_bytes` | Gauge | Virtual memory used | `service` |
| `rss_used_bytes` | Gauge | Resident set size (physical memory) | `service` |
| `container_restarts_total` | Counter | Total restarts | `service` |
| `clamav_scan_duration_seconds` | Histogram | Virus scan duration | `result` (CLEAN/INFECTED/TIMEOUT) |
| `minio_uploads_total` | Counter | Total file uploads | `bucket`, `status` (SUCCESS/FAILED) |
| `email_sent_total` | Counter | Total emails sent | `provider` (sendgrid/resend/console), `status` |
| `admission_applications_total` | Gauge | Total admissions | `status` (NEW/APPROVED/REJECTED/ENROLLED) |

### 2.2 Sample Metrics Output
```text
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/exams",status="200",service="api-gateway"} 1234
http_requests_total{method="POST",route="/api/admissions",status="400",service="lifecycle"} 56

# HELP http_requests_duration_seconds Request duration in seconds
# TYPE http_requests_duration_seconds histogram
http_requests_duration_seconds_bucket{method="GET",route="/",service="frontend-spa",le="0.1"} 567
http_requests_duration_seconds_bucket{method="GET",route="/",service="frontend-spa",le="0.5"} 890
http_requests_duration_seconds_bucket{method="GET",route="/",service="frontend-spa",le="1.0"} 950
http_requests_duration_seconds_bucket{method="GET",route="/",service="frontend-spa",le="+Inf"} 950
http_requests_duration_seconds_sum{method="GET",route="/",service="frontend-spa"} 320
http_requests_duration_seconds_count{method="GET",route="/",service="frontend-spa"} 950

# HELP active_connections Current concurrent connections
# TYPE active_connections gauge
active_connections{service="api-gateway"} 45

# HELP db_connection_pool_used Used DB connections
# TYPE db_connection_pool_used gauge
db_connection_pool_used{service="identity"} 23

# HELP container_restarts_total Total container restarts
# TYPE container_restarts_total counter
container_restarts_total{service="lifecycle"} 3
```

### 2.3 Prometheus Scrape Configuration
```yaml
# prometheus.yml (if using external Prometheus)
scrape_configs:
  - job_name: "gnet-sms"
    static_configs:
      - targets:
          - "localhost:3000"    # frontend-spa
          - "localhost:8081"    # api-gateway
          - "localhost:3010"    # lifecycle
          - "localhost:3011"    # identity
          - "localhost:3012"    # ops
          - "localhost:3013"    # staff
          - "localhost:3014"    # classroom
          - "localhost:3015"    # academic
          - "localhost:3016"    # finance
          - "localhost:3017"    # comms
          - "localhost:3018"    # campus
    metrics_path: /metrics
    scrape_interval: 15s
    honor_labels: true
```

---

## 3. Grafana Dashboards

### 3.1 Recommended Dashboards

#### 3.1.1 Overall System Health Dashboard
```
┌─────────────────────────────────────┐
│  GNET SMS - System Health           │
├─────────────────────────────────────┤
│ PostgreSQL: ✅ Healthy              │
│ Redis: ✅ Healthy                   │
│ MinIO: ✅ Healthy                   │
│ API Gateway: ✅ Healthy             │
│ Frontend: ✅ Healthy                │
├─────────────────────────────────────┤
│ CPU Usage: 𝟤𝟦%   │  Memory: 𝟣𝟣𝟢%   │
│ Disk Usage: 𝟥𝟢%   │  Swap: 𝟦%       │
├─────────────────────────────────────┤
│ Service Uptime: 𝟡𝟵.𝟵%           │
│ Last Restart: 2024-01-15 08:00 UTC │
└─────────────────────────────────────┘
```

#### 3.1.2 API Performance Dashboard
```
┌─────────────────────────────────────┐
│  GNET SMS - API Performance         │
├─────────────────────────────────────┤
│ Requests/min: 𝟦𝟤𝟦          │  Errors/min: 𝟥         │
│ Avg Response: 𝟤𝟭ms            │  P95: 𝟨𝟩ms             │
│ P99: 𝟩𝟦ms                        │                         │
├─────────────────────────────────────┤
│ Top 5 Slow Endpoints:             │
│ 1. /api/exams/pdf - 𝟩𝟭ms       │
│ 2. /api/upload - 𝟦𝟪ms         │
│ 3. /api/auth/login - 𝟨𝟮ms     │
│ 4. /api/admissions - 𝟥𝟭ms     │
│ 5. /api/receipts - 𝟥𝟭ms       │
└─────────────────────────────────────┘
```

#### 3.1.3 Database Monitoring Dashboard
```
┌─────────────────────────────────────┐
│  GNET SMS - PostgreSQL Monitoring   │
├─────────────────────────────────────┤
│ Active Connections: 𝟨𝟩/𝟣𝟢𝟦   │  Wait Type: 𝟮𝟮𝟮       │
│ Transactions/sec: 𝟦𝟦𝟦𝟦       │  Deadlocks: 𝟢          │
│ Long Queries (>1s): 𝟦 per min    │  Cache Hit: 𝟡𝟬%        │
│ Replication Lag: N/A (single)      │  Disk Usage: 𝟤𝟢%        │
├─────────────────────────────────────┤
│ Top 5 Slow Queries:               │
│ 1. SELECT * FROM admissions...    │  𝟨.𝟭s avg               │
│ 2. INSERT INTO fees...            │  𝟭.𝟮s avg               │
│ 3. UPDATE students...             │  𝟮.𝟮s avg               │
│ 4. COUNT(*) FROM students...      │  𝟬.𝟱s avg               │
│ 5. JOIN exams...                  │  𝟯.𝟭s avg               │
└─────────────────────────────────────┘
```

#### 3.1.4 File Uploads & Storage Dashboard
```
┌─────────────────────────────────────┐
│  GNET SMS - Storage & Uploads       │
├─────────────────────────────────────┤
│ MinIO Total: 𝟭𝟮𝟬𝟬𝟬 GB       │  Used: 𝟦𝟱𝟬𝟬 GB (𝟯𝟬%)   │
│ Uploads Today: 𝟯𝟰𝟬        │  Failures: 𝟭          │
│ Avg Upload Size: 𝟮.𝟯 MB      │  Viruses Detected: 𝟬   │
│ Bucket: admissions - 𝟭𝟮𝟬𝟬 GB  │  Used: 𝟮𝟬𝟬 GB (𝟭%)     │
│ Bucket: classroom - 𝟮𝟱𝟬𝟬 GB  │  Used: 𝟭𝟱𝟬 GB (𝟱%)     │
│ Bucket: receipts - 𝟭𝟬𝟬𝟬 GB  │  Used: 𝟭𝟬𝟬 GB (𝟬%)     │
│ Bucket: exam-papers - 𝟭𝟬𝟬𝟬 GB │  Used: 𝟮𝟬 GB (𝟬%)     │
└─────────────────────────────────────┘
```

### 3.2 Grafana Alert Rules

```yaml
# alerts.yaml (Grafana alerting)
apiVersion: 1

groups:
  - name: gnet-sms
    interval: 30s
    rules:
      # Alert on high error rate
      - alert: "SmsHighErrorRate"
        expr: |
          rate(http_requests_errors_total[5m]) > 0.5
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "GNET SMS high error rate"
          description: |
            Error rate is {{ $value }} errors/minute over last 5 minutes.
            Check {{ $labels.service }} service logs for details.

      # Alert on service down
      - alert: "SmsServiceDown"
        expr: |
          up{service=~"gnet-sms-.*"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "GNET SMS service down"
          description: |
            Service {{ $labels.service }} is down.
            Check Docker health status and restart if needed.

      # Alert on high memory usage
      - alert: "SmsHighMemoryUsage"
        expr: |
          (container_memory_rss_bytes{service=~"gnet-sms-.*"} 
           / container_spec_memory_limit_bytes{service=~"gnet-sms-.*"}) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "GNET SMS high memory usage"
          description: |
            {{ $labels.service }} using {{ $value | printf "%.1f" }}% of allocated memory.

      # Alert on DB connection pool exhaustion
      - alert: "SmsDbConnectionExhaustion"
        expr: |
          db_connection_pool_used{service=~"gnet-sms-identity|gnet-sms-lifecycle"} 
          > 0.85
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "GNET SMS database connection pool near capacity"
          description: |
            DB connection pool at {{ $value | printf "%.1f" }}% usage.
            Consider increasing max_connections or optimizing queries.

      # Alert on slow requests
      - alert: "SmsSlowRequests"
        expr: |
          histogram_quantile(0.95, 
            rate(http_requests_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "GNET SMS slow request detection"
          description: |
            95th percentile request duration is {{ $value | printf "%.2f" }} seconds.
            Investigate slow endpoints: {{ $labels.route }}.

      # Alert on ClamAV scan failures
      - alert: "SmsClamAVFailures"
        expr: |
          rate(clamav_scan_duration_seconds_count{result="INFECTED"}[5m]) > 0
          OR
          rate(clamav_scan_duration_seconds_count{result="TIMEOUT"}[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "GNET SMS ClamAV virus scan issues"
          description: |
            Virus scan result: {{ $labels.result }}.
            Check CLAMAV_URL and VIRUS_SCAN_FAIL_OPEN settings.

      # Alert on MinIO storage near capacity
      - alert: "SmsMinioStorageCritical"
        expr: |
          minio_volume_size_bytes{bucket=~"sms-.*"} 
          / minio_volume_available_bytes{bucket=~"sms-.*"} < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "GNET SMS MinIO storage critical"
          description: |
            MinIO bucket near capacity (< 10% free).
            Consider upgrading Lightsail plan or cleaning up old files.

      # Alert on admission application anomalies
      - alert: "SmsAdmissionAnomaly"
        expr: |
          rate(admission_applications_total{status="ERROR"}[1h]) > 5
          OR
          rate(admission_applications_total{status="PENDING"}[24h]) > 50
        for: 1h
        labels:
          severity: info
        annotations:
          summary: "GNET SMS admission application anomaly"
          description: |
            Unusual admission pattern detected.
            Check: {{ $value }} errors/hour or {{ $value }} pending in 24h.
```

---

## 4. Log Aggregation

### 4.1 Docker Logs Access
```bash
# View real-time logs for a service
docker compose logs -f identity

# View logs with time stamps
docker compose logs --timestamps identity

# View last N lines
docker compose logs --tail=50 identity

# View all services
docker compose logs

# Follow all services
docker compose logs -f
```

### 4.2 Log Format (Pino JSON)
All services use Pino logger with JSON output:

```json
{
  "level": 30,
  "name": "server",
  "hostname": "lightsail-12345",
  "pid": 1234,
  "v": 5,
  "time": "2024-01-15T10:30:45.123Z",
  "pid": 1234,
  "level": 30,
  "msg": "Request completed",
  "req": {
    "method": "POST",
    "url": "/api/auth/login",
    "headers": {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "x-internal-token": " *** REDACTED ***"
    },
    "remoteAddress": "203.0.113.45",
    "remotePort": 49152
  },
  "res": {
    "statusCode": 200,
    "responseTime": 45,
    "x-response-time": "45ms"
  },
  "err": null,
  "traceId": "c3f0f6a7-8b21-4eab-9e3d-7f2e9d1a2b3c",
  "spanId": "a1b2c3d4"
}
```

### 4.3 Log Redaction (Sensitive Data)
Auto-redacted fields in Pino configuration:
```javascript
// From Dockerfile or logger config
redact: [
  'req.headers.authorization',
  'req.headers.x-internal-token', 
  'env.JWT_ACCESS_SECRET',
  'env.SUPER_ADMIN_JWT_SECRET',
  'env.INTERNAL_SERVICE_TOKEN',
  'req.query.password',
  'req.body.password',
  'creditCard',
  'ssn',
]
```

### 4.4 Log Rotation (Docker)
```bash
# Log auto-rotation via Docker logs driver
# Default: json-file driver with max-size and max-file

# Configure in daemon.json (/etc/docker/daemon.json)
{
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}

# Restart Docker daemon
sudo systemctl restart docker
```

### 4.5 Centralized Log Aggregation (Optional)
```
Docker logs → Loki → Grafana  (recommended for Lightsail)
       ↑
CloudWatch (AWS, if migrating from Lightsail)
```

```bash
# Example: Forward logs to external service
# In each service's Docker run:
docker run ... \
  -e LOG_ENDPOINT=https://logs.gnet.school/upload \
  -e LOG_TOKEN=${LOG_GITHUB_SECRET} \
  pino/pino ... 
```

---

## 5. Alerting Workflow

### 5.1 Alert Severity Levels

| Level | Color | Notification | Response Time | Example |
|-------|-------|--------------|---------------|---------|
| **Critical** | 🔴 Red | PagerDuty/SMS/Email | < 1 hour | Service down, data breach, DB outage |
| **Warning** | 🟡 Yellow | Email/Slack | < 4 hours | High memory, disk near full, slow queries |
| **Info** | 🟢 Green | Slack (optional) | < 24 hours | Scheduled maintenance, minor anomaly |
| **Debug** | ⚪ White | None (logs only) | N/A | Routine metrics, configuration changes |

### 5.2 Alert Notification Channels

| Channel | Severity Levels | Use Case |
|---------|----------------|----------|
| **Email** | All | Non-critical warnings, daily summaries |
| **Slack** | Warning + Info | Team awareness, scheduled events |
| **SMS/PagerDuty** | Critical only | On-call escalation, genuine emergencies |
| **GitHub Issues** | Info + Debug | Track maintenance tasks, improvements |

### 5.3 Alert Fatigue Prevention
```yaml
# Deduplication & Cooldown rules

# 1. Never alert twice for same issue within window
- for: 5m  # Wait 5 minutes before re-alerting on same condition

# 2. Silence periods during maintenance
- repeat_interval: 1h  # Don't re-alert for 1 hour

# 3. Require sustained condition
- for: 2m  # Must persist for 2 minutes before alerting

# 4. Escalation path
- escalation: 
    - alert_receiver: team_slack
    - delay: 5m
    - escalation_receiver: oncall_pagerduty
    - delay: 15m
```

### 5.4 Silencing Alerts
```bash
# Temporarily silence alerts during maintenance
# Via Grafana API
curl -X POST http://grafana:3000/api/alertmanager/silence \
  -d '{"starts": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", 
      "ends": "'$(date -u -d '+2h' +%Y-%m-%dT%H:%M:%SZ)'",
      "comment": "Scheduled maintenance: Lightsail plan upgrade",
      "creator": "admin"} \
  -H "Authorization: Bearer ${GRAFANA_API_KEY}"

# Via Prometheus Alertmanager
amtool silence add \
  --alert-name "SmsServiceDown" \
  --starts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --ends "$(date -u -d '+2h' +%Y-%m-%dT%H:%M:%SZ)" \
  --comment "Scheduled Lightsail maintenance" \
  --duration 7200
```

---

## 6. Log Analysis Patterns

### 6.1 Common Log Analysis Queries

#### 6.1.1 Top Error Endpoints (Last 24 Hours)
```text
# Count errors by endpoint
http_requests_errors_total{service=~"gnet-sms-.*"} 
  | label_values service route 
  | sortby - count 
  | head 5
```

#### 6.1.2 Average Response Time by Hour
```text
http_requests_duration_seconds_bucket{service=~"gnet-sms-.*"} 
  | time shift -24h 
  | histogram_quantile(0.5, 
    rate(http_requests_duration_seconds_bucket{service=~"gnet-sms-.*"}[5m]))
  | by (hour, service)
```

#### 6.1.3 Failed Login Attempts
```text
# Count auth failures per IP
http_requests_errors_total{service="identity", 
  error_type="AUTHENTICATION_FAILED"} 
  | by (remoteAddress) 
  | sortby - count 
  | head 10
```

#### 6.1.4 Daily Active Users (approximate)
```text
# Unique IPs making requests per day
http_requests_total{service="frontend-spa"} 
  | by (remoteAddress) 
  | group by (truncHour time) 
  | count
```

### 6.2 Log-Based Metrics Dashboard

```
┌─────────────────────────────────────────────┐
│  GNET SMS - Log Analysis              │
├─────────────────────────────────────────────┤
│ Top 5 Error Endpoints (24h):            │
│ 1. POST /api/auth/login - 𝟦𝟦𝟦 errors   │
│ 2. GET /api/exams/:id - 𝟤𝟢 errors      │
│ 3. POST /api/admissions - 𝟧𝟢 errors    │
│ 4. GET /api/users/:id - 𝟣𝟢 errors     │
│ 5. POST /api/upload - 𝟦 errors         │
├─────────────────────────────────────────────┤
│ Error Distribution by Hour:             │
│ 00:00-06:00: 𝟧𝟦 errors               │
│ 06:00-12:00: 𝟨𝟦 errors               │
│ 12:00-18:00: 𝟩𝟦 errors               │
│ 18:00-23:59: 𝟣𝟢 errors               │
├─────────────────────────────────────────────┤
│ Top 5 User Agents causing errors:       │
│ 1. Mozilla/5.0 - 𝟧𝟦%               │
│ 2. Python-requests/𝟤.𝟮𝟭 - 𝟨𝟦%     │
│ 3. curl/𝟧𝟪.𝟨𝟩 - 𝟣𝟢%               │
│ 4. Chrome/𝟧𝟦.𝟦𝟢𝟦𝟧 - 𝟩%            │
│ 5. Unknown/bot - 𝟦%                 │
├─────────────────────────────────────────────┤
│ Daily Error Trend:                      │
│ Jan 10: 𝟦𝟦 errors                      │
│ Jan 11: 𝟤𝟧 errors                      │
│ Jan 12: 𝟦𝟦 errors                      │
│ Jan 13: 𝟧𝟦 errors                      │
│ Jan 14: 𝟨𝟦 errors                      │
└─────────────────────────────────────────────┘
```

---

## 7. Capacity Planning

### 7.1 Current Resource Usage (Baseline)
| Resource | Current | Warning Threshold | Critical Threshold |
|----------|---------|-------------------|--------------------|
| CPU (avg) | 25% | 50% | 75% |
| Memory (avg) | 40% | 60% | 80% |
| Disk (root) | 30% | 70% | 85% |
| Disk (MinIO) | 25% | 70% | 85% |
| DB Connections | 45/100 | 70/100 | 85/100 |
| Active Connections | 30/200 | 100/200 | 150/200 |
| Requests/min | 150 | 300 | 500 |
| Error rate | 0.5/min | 2/min | 5/min |

### 7.2 Scaling Triggers
| Metric | Scale-Up Trigger | Scale-Down Cooldown |
|--------|------------------|---------------------|
| CPU > 75% for 10m | Upgrade Lightsail plan | 30m at < 50% |
| Memory > 80% for 10m | Upgrade Lightsail plan | 30m at < 60% |
| Disk > 85% for 30m | Add storage / clean up | 1h at < 70% |
| Connections > 80/100 for 5m | Consider pgBouncer | 10m at < 60/100 |
| Requests/min > 400 for 15m | Scale horizontally (multiple instances) | 30m at < 250 |

### 7.3 Lightsail Plan Upgrade Path
```
Current ($5 plan: 1GB, 0.5 vCPU)
    ↓
Professional ($10 plan: 2GB, 1 vCPU) 
    ↓
Premium ($20 plan: 4GB, 2 vCPU)  
    ↓
Elite ($40 plan: 8GB, 4 vCPU)
    
Upgrade steps:
1. Stop non-essential services
2. Lightsail console: Change plan
3. Start services: docker compose up -d
4. Verify health checks passing
5. Monitor for 30m, downgrade if over-provisioned
```

### 7.4 Resource Reservation Strategy
```yaml
# Docker compose resource limits (recommended)

services:
  identity:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.2'
          memory: 512M
  
  lifecycle:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.2'
          memory: 512M
  
  # ... similar for other services
  
  # Total across all services should not exceed:
  # $10 Lightsail plan: 1 vCPU, 2GB RAM (shared across all containers)
  # $20 Lightsail plan: 2 vCPU, 4GB RAM (shared across all containers)
```

---

## 8. disaster Recovery Monitoring

### 8.1 Backup Verification Monitoring
```yaml
# Monthly backup verification alert
- alert: "SmsBackupVerificationFailed"
  expr: |
    !file_exists("/backups/sms_db_$(date +%F).sql")
    OR
    $(pg_dump -U sms -d sms_db /backups/sms_db_$(date +%F).sql 2>&1 | grep -c "ERROR") > 0
  for: 0m
  labels:
    severity: critical
  annotations:
    summary: "GNET SMS backup verification failed"
    description: |
      Daily database backup could not be verified.
      Check: backup script success, MinIO upload, file integrity.
      Last attempted: $(date +%F)
```

### 8.2 DR Drill Tracking
```yaml
# Track DR drill results
- alert: "SmsDRDrillCompleted"
  expr: |
    dr_drill_status{dr_type="full_restore"} == "completed"
  for: 0m
  labels:
    severity: info
  annotations:
    summary: "GNET SMS DR drill completed"
    description: |
      Full restore drill took {{ $value }} minutes.
      Backup age: {{ $annotations.backup_age }}.
      Contact: ops@gnet.school for drill report.
```

---

## 9. Observability Stack Setup (Optional)

### 8.1 Full Stack (if resources allow)
```
┌─────────────────────────────────────────────────────────┐
│  Prometheus + Grafana + Loki + Tempo                 │
│  ┌─────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │  exporters│  │  scrapers     │  │  log collectors│ │
│  │  (nodejs) │  │ (Prometheus)  │  │  (Loki)        │ │
│  └─────────┘  └─────────────┘  └────────────────┘ │
│         │                  │                   │       │
│         ▼                  ▼                   ▼       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  GNET SMS Services (10 micro-services)        │ │
│  │  - Exposes /metrics endpoint                   │ │
│  │  - JSON logs via Pino                          │ │
│  │  - Health checks at /health/live               │ │
│  └─────────────────────────────────────────────────┘ │
│                │                  │                   │
│                ▼                  ▼                   ▼
│         ┌────────────────┐  ┌────────────────┐  ┌────────────┐
│         │  Prometheus    │  │  Grafana       │  │  Loki        │
│         │  (scrapes /metrics) │  │  (dashboards) │  │  (logs)     │
│         └────────────────┘  └────────────────┘  └────────────┘
│                │                  │                   │
│                ▼                  ▼                   ▼
│         ┌────────────────┐  ┌────────────────┐  ┌────────────┐
│         │  Alertmanager  │  │  Tempo         │  │  S3/MinIO  │
│         │  (alerts)      │  │  (traces)     │  │  (backups)  │
│         └────────────────┘  └────────────────┘  └────────────┘
└─────────────────────────────────────────────────────────┘
```

### 8.2 Minimal Stack (Lightsail-recommended)
```
┌─────────────────────────────────────┐
│  Built-in Monitoring                │
│  ┌──────────────────────────────┐ │
│  │  Docker compose health checks │ │
│  │  /health/live endpoints        │ │
│  │  Docker stats (Portainer)     │ │
│  └──────────────────────────────┘ │
│         │                        │
│         ▼                        ▼
│  ┌─────────────────────┐  ┌─────────────────┐
│  │  Grafana (Free tier)│  │  MinIO Console  │
│  │  (self-hosted or     │  │  (storage mgmt) │
│  │   Grafana Cloud free)│  └─────────────────┘
│  └─────────────────────┘
│         │
│         ▼
│  ┌─────────────────────┐
│  │  Lightsail Metrics      │
│  │  (CPU, Disk, Network)   │
│  │  (built-in CloudWatch)  │
│  └─────────────────────┘
└─────────────────────────────────────┘
```

**Recommended minimal setup**: Use Docker health checks + Grafana Cloud free tier + MinIO console. Full Prometheus+Grafana+Loki stack is overkill for Lightsail unless you're already familiar.

---

## 9. Quick Health Check Commands

### 9.1 One-Liner Health Check Script
```bash
#!/bin/bash
# health-check.sh - Run from Lightsail SSH

SERVICES="frontend-spa api-gateway identity lifecycle ops staff classroom academic finance comms campus"

echo "=== GNET SMS Health Check ==="
echo "Timestamp: $(date -u)"
echo ""

all_healthy=true

for service in $SERVICES; do
  # Map service name to port from docker-compose
  case $service in
    frontend-spa) port=80 ;;
    api-gateway) port=8081 ;;
    identity) port=3011 ;;
    lifecycle) port=3010 ;;
    ops) port=3012 ;;
    staff) port=3013 ;;
    classroom) port=3014 ;;
    academic) port=3015 ;;
    finance) port=3016 ;;
    comms) port=3017 ;;
    campus) port=3018 ;;
  esac
  
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health/live)
  
  if [ "$code" = "200" ]; then
    echo "✅ $service: healthy (port $port)"
  else
    echo "❌ $service: unhealthy (HTTP $code, port $port)"
    all_healthy=false
  fi
done

echo ""
if $all_healthy; then
  echo "🟢 All services healthy!"
  exit 0
else
  echo "🔴 Some services unhealthy"
  exit 1
fi
```

### 9.2 Quick Status Commands
```bash
# Docker compose status
docker compose ps --filter "health=healthy"

# Restart unhealthy service
docker compose restart <service_name>

# View last 50 lines of all logs
docker compose logs --tail=50

# Disk usage
df -h

# Docker disk usage
docker system df

# Memory/CPU stats
htop  # or: docker stats

# Network connectivity
ping -c 3 google.com

# Check Lightsail firewall (web UI)
# → Networking tab → Inbound rules
```

### 9.3 Escalation Flow
```
Service health check fails
    ↓
Check Docker compose logs (1 min)
    ↓
Restart service (2 min)
    ↓
If still failing → Check health endpoint manually
    ↓
If endpoint returns non-200 → Review recent deployments
    ↓
Rollback to previous version if new deployment
    ↓
If persistent → Open incident (Critical level)
    ↓
Escalate to on-call (within 15 minutes)
```

---

## 📋 Monitoring Checklist

### Daily (Ops Team)
- [ ] Run health check script (`./health-check.sh`)
- [ ] Review error logs (high severity only)
- [ ] Check disk usage (root + MinIO)
- [ ] Verify backup ran successfully (look for completion log)
- [ ] Check CPU/Memory via `docker stats` or Lightsail dashboard
- [ ] Confirm all health endpoints return 200

### Weekly (DevOps)
- [ ] Review alert history (what triggered, how resolved)
- [ ] Check log rotation working properly
- [ ] Verify SSL certificate validity
- [ ] Test one critical flow end-to-end (admission + document upload)
- [ ] Update dependency packages (minor/patch only)
- [ ] Review user activity logs for anomalies

### Monthly (DevOps Lead)
- [ ] Full DR drill (database + MinIO restore)
- [ ] Review and rotate secrets (JWT, internal tokens)
- [ ] Analyze trends (growth, usage patterns)
- [ ] Update monitoring dashboards if needed
- [ ] Review and update this documentation
- [ ] Assess Lightsail plan needs (upgrade/downgrade)
- [ ] Check ClamAV virus definition updates

### Quarterly (Security Review)
- [ ] Full security audit (OWASP Top 10)
- [ ] Penetration test (if resources allow)
- [ ] Review access control permissions
- [ ] Audit trail verification
- [ ] Update disaster recovery documentation
- [ ] Compliance checklist (GDPR/FERPA)
- [ ] Stakeholder review meeting

---

## 🎯 Summary: Monitoring Priority Order

1. **Health Checks** - `/health/live` endpoints (immediate visibility)
2. **Service Availability** - Docker compose status + uptime
3. **Resource Usage** - CPU, Memory, Disk (capacity planning)
4. **Error Rates** - HTTP 5xx rates, application errors
5. **Business Metrics** - Admissions, exam submissions, revenue
6. **Backup Verification** - Daily restore test capability
7. **Security Events** - Failed logins, suspicious activity
8. **Traceability** - Request IDs through entire call flow

**Never ignore #1-3**. These provide the earliest warning of issues before they impact users.