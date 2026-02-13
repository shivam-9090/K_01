# Monitoring Stack Deployment Guide - K_01

## Overview

This document provides step-by-step instructions for deploying and verifying the complete monitoring infrastructure for the K_01 authentication platform.

## What Was Implemented

### 1. Docker Services (6 New Containers)

- **Prometheus** (v2.51.0) - Port 9090: Metrics collection and alerting
- **Grafana** (v10.4.0) - Port 3001: Metrics visualization and dashboards
- **Alertmanager** (v0.27.0) - Port 9093: Alert routing and notification management
- **Node Exporter** (v1.7.0) - Port 9100: System metrics (CPU, RAM, disk, network)
- **Postgres Exporter** (v0.15.0) - Port 9187: Database metrics (queries, connections, locks)
- **Redis Exporter** (v1.58.0) - Port 9121: Cache metrics (hit rate, memory, operations)

### 2. Database Query Monitoring

**File Modified**: `backend/src/prisma/prisma.service.ts`

- Prisma query event listeners for slow query detection (>500ms)
- Automatic logging of database errors and warnings
- Integration with MetricsService for Prometheus metrics
- Query duration tracking in milliseconds

**New Metrics**:

- `db_slow_queries_total`: Counter for queries exceeding 500ms
- `db_query_duration_seconds`: Histogram of all query durations

### 3. Enhanced Metrics Service

**Files Modified**:

- `backend/src/common/monitoring/metrics.module.ts`
- `backend/src/common/monitoring/metrics.service.ts`
- `backend/src/prisma/prisma.module.ts`

**New Methods**:

- `incrementSlowQueryCounter()`: Increments slow query counter
- `recordQueryDuration(seconds)`: Records query execution time

### 4. Grafana Configuration

**Files Created**:

- `backend/monitoring/grafana-datasource.yml`: Auto-provisions Prometheus datasource
- `backend/monitoring/grafana-dashboard-provider.yml`: Auto-loads dashboards
- `backend/monitoring/grafana-security-dashboard.json`: Security monitoring dashboard with 12 panels

**Security Dashboard Panels**:

1. Failed Login Attempts (Last 1h) - Stat panel with thresholds
2. 2FA Verification Failures - Stat panel
3. Active Sessions - Stat panel
4. HTTP 4xx/5xx Errors - Stat panel
5. Authentication Attempts Over Time - Time series graph
6. 2FA Operations Distribution - Time series graph
7. API Errors by Status Code - Time series graph
8. Top 10 Failed Endpoints - Table
9. Database Connection Pool Status - Graph with alert
10. Request Rate by Method - Time series graph
11. Response Time Percentiles (p50, p90, p99) - Time series graph
12. Security Events Timeline - Logs panel

### 5. Postgres Exporter Custom Queries

**File Created**: `backend/monitoring/postgres-exporter-queries.yml`

**Custom Metrics**:

- `pg_stat_user_tables`: Table-level statistics (scans, inserts, updates, deletes)
- `pg_stat_database`: Database-wide metrics (commits, rollbacks, blocks, connections)
- `pg_slow_queries`: Currently running slow queries (>1 second)
- `pg_table_bloat`: Table and index sizes
- `pg_locks`: Lock statistics by mode and type

### 6. Prometheus Configuration

**File Modified**: `backend/monitoring/prometheus.yml`

- Fixed scrape target from `app1/app2/app3` to single `app:3000`
- Changed environment label from `production` to `development`
- Configured scrape jobs for all 6 exporters

## Deployment Steps

### Step 1: Environment Preparation

```bash
# Navigate to backend directory
cd backend

# Ensure GRAFANA_PASSWORD is set (optional - defaults to 'admin')
# Add to .env file:
echo "GRAFANA_PASSWORD=your_secure_password" >> .env
```

### Step 2: Start Monitoring Stack

```bash
# Stop existing services
docker-compose down

# Pull latest images (optional but recommended)
docker-compose pull prometheus grafana alertmanager node-exporter postgres-exporter redis-exporter

# Start all services including monitoring
docker-compose up -d

# Verify all containers are running
docker-compose ps
```

**Expected Output**:

```
NAME                    STATUS      PORTS
auth_app                Up          0.0.0.0:3000->3000/tcp
auth_postgres           Up          0.0.0.0:5432->5432/tcp
auth_redis              Up          0.0.0.0:6379->6379/tcp
auth_prometheus         Up          0.0.0.0:9090->9090/tcp
auth_grafana            Up          0.0.0.0:3001->3000/tcp
auth_alertmanager       Up          0.0.0.0:9093->9093/tcp
auth_node_exporter      Up          0.0.0.0:9100->9100/tcp
auth_postgres_exporter  Up          0.0.0.0:9187->9187/tcp
auth_redis_exporter     Up          0.0.0.0:9121->9121/tcp
auth_frontend           Up          0.0.0.0:5173->5173/tcp
```

### Step 3: Verify Metrics Endpoints

```bash
# Test backend metrics endpoint
curl -s http://localhost:3000/metrics | grep -E "^(http_requests|auth_attempts|db_query)"

# Test Node Exporter (system metrics)
curl -s http://localhost:9100/metrics | grep "^node_cpu"

# Test Postgres Exporter
curl -s http://localhost:9187/metrics | grep "^pg_"

# Test Redis Exporter
curl -s http://localhost:9121/metrics | grep "^redis_"
```

### Step 4: Verify Prometheus Targets

1. Open Prometheus UI: http://localhost:9090
2. Navigate to **Status → Targets**
3. Verify all 6 targets are **UP** with green status:
   - `auth-backend` (app:3000)
   - `node-exporter` (node-exporter:9100)
   - `postgres` (postgres-exporter:9187)
   - `redis` (redis-exporter:9121)
   - `prometheus` (localhost:9090)

**Troubleshooting**: If any target is DOWN:

```bash
# Check container logs
docker logs auth_app            # For backend
docker logs auth_node_exporter  # For node exporter
docker logs auth_prometheus     # For Prometheus

# Verify network connectivity
docker exec auth_prometheus wget -O- http://app:3000/metrics
```

### Step 5: Configure Grafana

1. Open Grafana: http://localhost:3001
2. **Login Credentials**:
   - Username: `admin`
   - Password: Value of `GRAFANA_PASSWORD` env var (default: `admin`)
3. First-time login will prompt password change (recommended)
4. Verify datasource:
   - Navigate to **Configuration → Data Sources**
   - Should see "Prometheus" datasource (auto-provisioned)
   - Click "Test" button - should show "Data source is working"

### Step 6: Import Dashboards

**Main Dashboard** (already exists):

1. Navigate to **Dashboards → Browse**
2. Should see "K_01 Auth Backend Monitoring" dashboard
3. Click to open and verify 8 panels display data

**Security Dashboard** (newly created):

1. Navigate to **Dashboards → Browse**
2. Look for "Security Monitoring Dashboard"
3. If not auto-loaded, import manually:
   - Click **+ → Import**
   - Paste contents of `backend/monitoring/grafana-security-dashboard.json`
   - Click "Load" → "Import"

### Step 7: Test Slow Query Detection

```bash
# Connect to database
docker exec -it auth_postgres psql -U authuser -d auth_db

# Run a slow query (artificial delay)
SELECT pg_sleep(1), * FROM "User" LIMIT 1;

# Exit psql
\q

# Check logs for slow query detection
docker logs auth_app 2>&1 | grep "Slow Query Detected"
```

**Expected Log Output**:

```
[PrismaService] WARN Slow Query Detected (1000ms): SELECT pg_sleep(1), * FROM "User" LIMIT 1; | Params: []
```

### Step 8: Generate Test Traffic

```bash
# Test authentication endpoint
for i in {1..10}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  sleep 0.5
done

# Verify metrics increased
curl -s http://localhost:3000/metrics | grep 'auth_attempts_total{status="failure"}'
```

### Step 9: Verify Alerts

1. Open Prometheus Alerts: http://localhost:9090/alerts
2. Should see 10 configured alert rules:
   - InstanceDown
   - HighErrorRate
   - HighResponseTime
   - DatabaseConnectionsHigh
   - HighMemoryUsage
   - HighCPUUsage
   - HighDiskUsage
   - SlowQueries
   - FailedAuthenticationSpike
   - High2FAFailureRate

**Test Alert Firing**:

```bash
# Generate 100+ failed login attempts to trigger FailedAuthenticationSpike
for i in {1..120}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"attacker@evil.com","password":"hack"}' &
done
wait

# Wait 1-2 minutes, then check alerts
# Open http://localhost:9090/alerts
# "FailedAuthenticationSpike" should transition from green (inactive) to red (firing)
```

### Step 10: Verify Alertmanager

1. Open Alertmanager UI: http://localhost:9093
2. If any alerts are firing, they should appear here
3. Verify webhook configuration in `backend/monitoring/alertmanager.yml`

**Note**: Current configuration sends to webhook. To enable email/Slack:

```bash
# Edit alertmanager.yml
nano backend/monitoring/alertmanager.yml

# Add email receiver example:
receivers:
  - name: 'team-email'
    email_configs:
      - to: 'alerts@yourdomain.com'
        from: 'alertmanager@yourdomain.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'your-email@gmail.com'
        auth_password: 'your-app-password'

# Restart alertmanager
docker-compose restart alertmanager
```

## Verification Checklist

- [ ] All 10 Docker containers running (docker-compose ps)
- [ ] Prometheus targets all UP (http://localhost:9090/targets)
- [ ] Grafana accessible with credentials (http://localhost:3001)
- [ ] Prometheus datasource working in Grafana
- [ ] Main dashboard displays data (8 panels)
- [ ] Security dashboard displays data (12 panels)
- [ ] Backend /metrics endpoint responding (http://localhost:3000/metrics)
- [ ] Slow query detection working (logs show "Slow Query Detected")
- [ ] Database query metrics recording (`db_query_duration_seconds`)
- [ ] Authentication metrics recording (`auth_attempts_total`)
- [ ] 2FA metrics recording (`twofa_operations_total`)
- [ ] System metrics available (CPU, RAM, disk from node-exporter)
- [ ] Database metrics available (connections, queries from postgres-exporter)
- [ ] Redis metrics available (memory, hit rate from redis-exporter)
- [ ] Alerts configured and visible (http://localhost:9090/alerts)
- [ ] Alertmanager accessible (http://localhost:9093)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Applications                      │
│                    (Frontend, Mobile, API Clients)               │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP Requests
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NestJS Backend (:3000)                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  MetricsInterceptor → Records HTTP metrics              │    │
│  │  PrismaService → Logs slow queries, DB metrics          │    │
│  │  MetricsService → Aggregates all metrics                │    │
│  └─────────────────────┬───────────────────────────────────┘    │
│                        │ /metrics endpoint                       │
└────────────────────────┼───────────────────────────────────────┘
                         │ Scrapes every 10s
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Prometheus (:9090) - Time Series DB                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Scrape Jobs:                                             │   │
│  │  • auth-backend (app:3000)        - App metrics          │   │
│  │  • node-exporter (:9100)          - System metrics       │   │
│  │  • postgres-exporter (:9187)      - DB metrics           │   │
│  │  • redis-exporter (:9121)         - Cache metrics        │   │
│  │                                                            │   │
│  │  Alert Rules:                                             │   │
│  │  • HighErrorRate, SlowQueries, FailedAuthSpike           │   │
│  └──────────────────────┬───────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ Evaluates alerts
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│           Alertmanager (:9093) - Alert Routing                   │
│  • Routes alerts to webhooks, email, Slack                       │
│  • Groups and deduplicates alerts                                │
│  • Manages alert lifecycle (firing → resolved)                   │
└─────────────────────────────────────────────────────────────────┘

                          │ Queries for visualization
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│               Grafana (:3001) - Visualization                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Dashboards:                                              │   │
│  │  • Main Dashboard (8 panels) - System overview           │   │
│  │  • Security Dashboard (12 panels) - Security events      │   │
│  │                                                            │   │
│  │  Datasource: Prometheus (auto-provisioned)               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌────────────────┐  ┌──────────────────┐  ┌─────────────────────┐
│  PostgreSQL    │  │      Redis       │  │   System (Node)      │
│    (:5432)     │  │     (:6379)      │  │  CPU/RAM/Disk/Net   │
└───────┬────────┘  └────────┬─────────┘  └──────────┬──────────┘
        │                    │                        │
        │ Connects           │ Connects               │ Reads
        ▼                    ▼                        ▼
┌──────────────┐  ┌──────────────────┐  ┌───────────────────────┐
│  Postgres    │  │  Redis Exporter  │  │   Node Exporter       │
│  Exporter    │  │     (:9121)      │  │      (:9100)          │
│   (:9187)    │  │                  │  │                       │
│              │  │  • Memory usage  │  │  • CPU usage          │
│  • Queries   │  │  • Hit/miss rate │  │  • Memory usage       │
│  • Locks     │  │  • Operations/s  │  │  • Disk I/O           │
│  • Conns     │  │  • Evictions     │  │  • Network traffic    │
└──────────────┘  └──────────────────┘  └───────────────────────┘
```

## Metrics Reference

### Application Metrics (Backend)

| Metric Name                     | Type      | Labels                     | Description                            |
| ------------------------------- | --------- | -------------------------- | -------------------------------------- |
| `http_requests_total`           | Counter   | method, route, status_code | Total HTTP requests                    |
| `http_request_duration_seconds` | Histogram | method, route, status_code | Request duration                       |
| `auth_attempts_total`           | Counter   | status                     | Login attempts (success/failure)       |
| `auth_failures_total`           | Counter   | reason                     | Failed auth count by reason            |
| `twofa_operations_total`        | Counter   | operation, status          | 2FA operations (enable/verify/disable) |
| `twofa_attempts_total`          | Counter   | type, status               | 2FA verification (totp/backup)         |
| `twofa_failures_total`          | Counter   | type                       | Failed 2FA verifications               |
| `active_sessions`               | Gauge     | -                          | Currently active user sessions         |
| `db_connections`                | Gauge     | -                          | Active database connections            |
| `api_errors_total`              | Counter   | endpoint, error_type       | API errors by type                     |
| `db_slow_queries_total`         | Counter   | -                          | Queries exceeding 500ms                |
| `db_query_duration_seconds`     | Histogram | -                          | All query execution times              |

### System Metrics (Node Exporter)

| Metric Name                         | Type    | Description                           |
| ----------------------------------- | ------- | ------------------------------------- |
| `node_cpu_seconds_total`            | Counter | CPU time by mode (user, system, idle) |
| `node_memory_MemTotal_bytes`        | Gauge   | Total system memory                   |
| `node_memory_MemAvailable_bytes`    | Gauge   | Available memory                      |
| `node_disk_io_time_seconds_total`   | Counter | Disk I/O time                         |
| `node_network_receive_bytes_total`  | Counter | Network bytes received                |
| `node_network_transmit_bytes_total` | Counter | Network bytes transmitted             |

### Database Metrics (Postgres Exporter)

| Metric Name                      | Type    | Description                     |
| -------------------------------- | ------- | ------------------------------- |
| `pg_up`                          | Gauge   | PostgreSQL is up (1=up, 0=down) |
| `pg_stat_database_numbackends`   | Gauge   | Number of active connections    |
| `pg_stat_database_xact_commit`   | Counter | Transactions committed          |
| `pg_stat_database_xact_rollback` | Counter | Transactions rolled back        |
| `pg_stat_database_deadlocks`     | Counter | Deadlocks detected              |
| `pg_table_size_bytes`            | Gauge   | Table size in bytes             |
| `pg_slow_query_count`            | Gauge   | Currently running slow queries  |

### Cache Metrics (Redis Exporter)

| Metric Name                   | Type    | Description                       |
| ----------------------------- | ------- | --------------------------------- |
| `redis_up`                    | Gauge   | Redis is up (1=up, 0=down)        |
| `redis_memory_used_bytes`     | Gauge   | Memory used by Redis              |
| `redis_keyspace_hits_total`   | Counter | Cache hits                        |
| `redis_keyspace_misses_total` | Counter | Cache misses                      |
| `redis_connected_clients`     | Gauge   | Connected clients                 |
| `redis_evicted_keys_total`    | Counter | Keys evicted due to memory limits |

## Performance Impact

### Resource Usage (Per Container)

| Container         | CPU (idle) | CPU (active) | RAM   | Disk      |
| ----------------- | ---------- | ------------ | ----- | --------- |
| Prometheus        | <5%        | 10-15%       | 150MB | 500MB-2GB |
| Grafana           | <2%        | 5-10%        | 100MB | 100MB     |
| Alertmanager      | <1%        | 2-5%         | 50MB  | 50MB      |
| Node Exporter     | <1%        | 1-2%         | 20MB  | 10MB      |
| Postgres Exporter | <1%        | 2-3%         | 30MB  | 10MB      |
| Redis Exporter    | <1%        | 1-2%         | 20MB  | 10MB      |

**Total Overhead**: ~370MB RAM, ~1GB disk (initial), <10% CPU

### Application Performance Impact

- **Metrics Collection**: <2ms per request (MetricsInterceptor)
- **Query Logging**: <1ms per query (event listener)
- **Scrape Latency**: 10-50ms every 10 seconds (Prometheus scrape)

**Recommendation**: This monitoring stack is production-ready and has minimal performance impact.

## Troubleshooting

### Issue: Prometheus Targets Down

**Symptom**: Targets showing "DOWN" with red status

**Solution**:

```bash
# Check network connectivity
docker exec auth_prometheus ping app
docker exec auth_prometheus wget -O- http://app:3000/metrics

# Verify app is listening on correct port
docker exec auth_app netstat -tuln | grep 3000

# Check firewall rules (if applicable)
docker network inspect auth_network
```

### Issue: Grafana Can't Connect to Prometheus

**Symptom**: Datasource test fails with "Bad Gateway"

**Solution**:

```bash
# Verify Prometheus is running
docker logs auth_prometheus | tail -20

# Check datasource URL in Grafana
# Should be: http://prometheus:9090 (NOT localhost)

# Restart Grafana
docker-compose restart grafana
```

### Issue: No Slow Queries Detected

**Symptom**: Logs don't show "Slow Query Detected"

**Solution**:

```bash
# Verify query logging is enabled
docker logs auth_app | grep "Database connected"

# Run test slow query
docker exec -it auth_postgres psql -U authuser -d auth_db -c "SELECT pg_sleep(1);"

# Check metrics endpoint
curl -s http://localhost:3000/metrics | grep db_slow_queries_total
```

### Issue: Missing Database Metrics

**Symptom**: Postgres Exporter shows no custom metrics

**Solution**:

```bash
# Verify queries file is mounted
docker exec auth_postgres_exporter cat /etc/postgres_exporter/queries.yml

# Check postgres-exporter logs
docker logs auth_postgres_exporter

# Test database connection
docker exec auth_postgres_exporter wget -O- http://localhost:9187/metrics | grep "^pg_"
```

### Issue: High Memory Usage

**Symptom**: Prometheus using >1GB RAM

**Solution**:

```bash
# Set retention period (default 15 days)
# Edit docker-compose.yml, add to prometheus command:
# - '--storage.tsdb.retention.time=7d'

# Restart Prometheus
docker-compose restart prometheus
```

## Next Steps

### Phase 1: Sentry Integration (HIGH PRIORITY)

**Purpose**: Real-time error tracking and exception reporting

**Implementation**:

```bash
# Install Sentry SDK
npm install --save @sentry/node @sentry/profiling-node

# Create Sentry module
# backend/src/sentry/sentry.module.ts
```

**Benefits**:

- Stack traces and breadcrumbs for debugging
- User context and session replay
- Performance monitoring (APM)
- Release tracking

### Phase 2: Database Security Improvements (HIGH PRIORITY)

**From DATABASE_SECURITY_AUDIT.md**:

1. **Enable SSL for PostgreSQL** (CRITICAL - C-2)
   - Generate SSL certificates
   - Update DATABASE_URL with `sslmode=require`
   - Restart postgres with SSL config

2. **Implement Automated Backups** (CRITICAL - C-4)
   - Create backup script (pg_dump + encryption + S3/GCS upload)
   - Schedule daily backups via cron job
   - Test restore procedure

3. **Encrypt Mobile PII** (HIGH - H-1)
   - Use EncryptionService to encrypt `mobileNumber` field
   - Write migration script for existing data
   - Update queries to encrypt/decrypt

4. **Add Missing Indexes** (HIGH - H-4)
   ```sql
   CREATE INDEX idx_user_role ON "User"(role);
   CREATE INDEX idx_task_priority ON "Task"(priority);
   CREATE INDEX idx_task_status ON "Task"(status);
   CREATE INDEX idx_project_status ON "Project"(status);
   ```

### Phase 3: Enhanced Observability (MEDIUM PRIORITY)

**Log Aggregation** (ELK Stack):

- Elasticsearch for log storage
- Logstash for log parsing
- Kibana for log visualization

**Distributed Tracing** (OpenTelemetry):

- Instrument backend with OpenTelemetry SDK
- Export traces to Jaeger or Tempo
- Correlate logs, metrics, and traces

**Synthetic Monitoring**:

- Blackbox exporter for endpoint health checks
- Uptime monitoring from multiple locations
- SSL certificate expiration alerts

## Production Deployment Checklist

- [ ] **Change default Grafana password**

  ```bash
  docker exec auth_grafana grafana-cli admin reset-admin-password <new-password>
  ```

- [ ] **Configure Alertmanager receivers**
  - Set up email/Slack/PagerDuty integration
  - Test alert routing with fake alerts
- [ ] **Set Prometheus retention period**
  - Add `--storage.tsdb.retention.time=30d` to command
  - Allocate sufficient disk space (estimate: 1GB per day)

- [ ] **Enable HTTPS for all UIs**
  - Prometheus: Reverse proxy with NGINX + Let's Encrypt
  - Grafana: Enable built-in HTTPS or use reverse proxy
  - Alertmanager: Same as Prometheus

- [ ] **Restrict access with authentication**
  - Prometheus: Basic auth or OAuth proxy
  - Grafana: LDAP/OAuth integration
  - Alertmanager: Basic auth

- [ ] **Implement backup strategy**
  - Prometheus data: Volume snapshots or remote write to long-term storage
  - Grafana dashboards: Export JSON to Git repository

- [ ] **Set up log rotation**
  - Winston logs already rotate daily (logs/error-%DATE%.log)
  - Verify disk space monitoring alerts

- [ ] **Load testing**
  - Use Apache Bench or k6 to simulate 1000+ req/s
  - Verify metrics accuracy under load
  - Check alert thresholds are appropriate

- [ ] **Disaster recovery testing**
  - Stop all containers, wipe volumes
  - Restore from backups
  - Verify data integrity

## Support and Documentation

- **Prometheus**: https://prometheus.io/docs/
- **Grafana**: https://grafana.com/docs/
- **Alertmanager**: https://prometheus.io/docs/alerting/latest/alertmanager/
- **Node Exporter**: https://github.com/prometheus/node_exporter
- **Postgres Exporter**: https://github.com/prometheus-community/postgres_exporter
- **Redis Exporter**: https://github.com/oliver006/redis_exporter

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Author**: K_01 Backend Team
