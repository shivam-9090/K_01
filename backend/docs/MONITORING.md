# Monitoring and Logging Documentation

## Overview

This backend implements comprehensive observability following the three pillars:

- **Monitoring** (Prometheus + Grafana) - Is it broken?
- **Logging** (Winston) - What happened?
- **Tracing** (Future: OpenTelemetry) - Where did it break?

## Architecture

```
Application Metrics → Prometheus → Alertmanager → Notifications
                   ↓
                Grafana (Dashboards)

Application Logs → Winston → Log Files → ELK/OpenSearch (Future)
```

## Monitoring Stack

### Prometheus (Port 9090)

**What it does**: Collects and stores time-series metrics from the application and infrastructure.

**Metrics collected**:

- `http_requests_total` - Total HTTP requests (method, route, status)
- `http_request_duration_seconds` - Request latency histogram
- `auth_attempts_total` - Authentication attempts (success/failure)
- `auth_failures_total` - Failed authentication attempts by reason
- `twofa_attempts_total` - 2FA verification attempts
- `twofa_failures_total` - Failed 2FA attempts
- `active_sessions` - Current active user sessions
- `db_connections` - Active database connections
- `api_errors_total` - API errors by endpoint and type

**Access**: http://localhost:9090

**Key queries**:

```promql
# Request rate
rate(auth_backend_http_requests_total[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(auth_backend_http_request_duration_seconds_bucket[5m]))

# Error rate
rate(auth_backend_api_errors_total[5m])
```

### Grafana (Port 3001)

**What it does**: Visualizes metrics with beautiful dashboards.

**Access**: http://localhost:3001

- Default user: `admin`
- Default password: `admin` (change in `.env` with `GRAFANA_PASSWORD`)

**Dashboard includes**:

- HTTP request rate and latency
- Authentication success/failure rates
- 2FA metrics
- Active sessions and DB connections
- Memory and CPU usage
- Error rates

**Location**: Pre-configured dashboard at `monitoring/grafana-dashboard.json`

### Alertmanager (Port 9093)

**What it does**: Manages alerts from Prometheus and routes them to notification channels.

**Configured alerts**:

- High error rate (>5% for 5min)
- Authentication failures spike (>10/sec for 2min)
- 2FA failures spike (>5/sec for 2min)
- High response time (p95 > 2s for 5min)
- Database/Redis down
- Service down
- High memory/CPU usage
- Too many active sessions (>10k)

**Configuration**: `monitoring/alertmanager.yml`

**Notification channels** (configure in alertmanager.yml):

- Webhook to backend `/webhooks/alerts`
- Slack (commented out - add your webhook)
- Email (commented out - add SMTP config)

### Exporters

**Node Exporter (Port 9100)**

- System metrics: CPU, memory, disk, network

**Redis Exporter (Port 9121)**

- Redis performance metrics

**Postgres Exporter (Port 9187)**

- PostgreSQL database metrics

## Logging Stack

### Winston

**What it does**: Structured logging with log rotation and multiple transports.

**Log files** (in `logs/` directory):

1. **`error-YYYY-MM-DD.log`** - Error logs only
   - Retention: 14 days
   - Max size: 20MB per file
   - Format: JSON with stack traces

2. **`combined-YYYY-MM-DD.log`** - All logs
   - Retention: 7 days
   - Max size: 20MB per file
   - Format: JSON

3. **`access-YYYY-MM-DD.log`** - HTTP access logs
   - Retention: 7 days
   - Max size: 50MB per file
   - Format: JSON

4. **`audit-YYYY-MM-DD.log`** - Security audit logs
   - Retention: 90 days
   - Max size: 20MB per file
   - Format: JSON
   - Includes: Auth changes, 2FA events, sensitive operations

**Log levels**:

- `error` - Errors and exceptions
- `warn` - Warnings (4xx errors, rate limits)
- `info` - General information (requests, auth events)
- `debug` - Detailed debugging (development only)

**What gets logged**:
✅ All HTTP requests (method, URL, status, duration, IP)
✅ Authentication attempts (success/failure with reason)
✅ 2FA operations (enable, disable, verify)
✅ Authorization failures
✅ API errors with stack traces
✅ Rate limit hits
✅ Security-sensitive actions (audit log)

**What NEVER gets logged**:
❌ Passwords
❌ JWT tokens
❌ 2FA secrets
❌ API keys
❌ Full request bodies

### Database Audit Log

**Table**: `auditLog` (Prisma schema)

Stores security-sensitive actions:

- User ID
- Action (HTTP method + URL)
- Resource accessed
- IP address
- User agent
- Timestamp

**Queried for**:

- Forensics after security incidents
- User activity tracking
- Compliance requirements

## Health Checks

### Endpoints

**`GET /health`** - Full health check

- Database connectivity
- Disk usage (threshold: 90%)
- Memory heap (threshold: 200MB)
- Memory RSS (threshold: 300MB)

**`GET /health/live`** - Liveness probe (Kubernetes)

- Basic app health

**`GET /health/ready`** - Readiness probe (Kubernetes)

- Database connectivity

## Metrics Endpoint

**`GET /metrics`** - Prometheus metrics

- Available to Prometheus scraper
- Should be blocked from public access (use NGINX)

## Starting the Monitoring Stack

```bash
# Start all services including monitoring
docker-compose up -d

# Start only monitoring services
docker-compose up -d prometheus grafana alertmanager

# View logs
docker-compose logs -f prometheus
docker-compose logs -f grafana
```

## Accessing Dashboards

1. **Grafana**: http://localhost:3001
   - Login: admin / admin
   - Dashboard: "Auth Backend Dashboard"

2. **Prometheus**: http://localhost:9090
   - Query metrics directly
   - Check targets: Status → Targets
   - View alerts: Alerts

3. **Alertmanager**: http://localhost:9093
   - View active alerts
   - Silence alerts

## Monitoring Best Practices

### What to monitor

**The Four Golden Signals**:

1. **Latency** - Request duration (p50, p95, p99)
2. **Traffic** - Requests per second
3. **Errors** - Error rate (4xx, 5xx)
4. **Saturation** - Resource usage (CPU, memory, connections)

**Security-specific**:

- Failed login attempts
- 2FA failures
- Rate limit hits
- Unusual activity patterns

### Alert thresholds

Set thresholds based on:

- Normal baseline (measure over 1 week)
- Business impact (what actually hurts users)
- False positive rate (tune to avoid alert fatigue)

**Current thresholds** (in `monitoring/alerts.yml`):

- Error rate: >5% for 5min
- Auth failures: >10/sec for 2min
- Response time: p95 > 2s for 5min

### Alert fatigue prevention

❌ **Bad alerts**: CPU at 61%, Disk at 43%
✅ **Good alerts**: Error rate spiked, Database unreachable, Service down

**Rules**:

- Every alert must be actionable
- If you ignore it 3 times, delete the alert
- Use inhibit rules (don't alert on downstream failures)

## Log Analysis

### Finding issues

**Error logs**:

```bash
# View recent errors
tail -f logs/error-*.log | jq

# Search for specific error
grep "DatabaseError" logs/error-*.log | jq

# Count errors by type
cat logs/error-*.log | jq '.error_type' | sort | uniq -c
```

**Audit logs**:

```bash
# View user activity
cat logs/audit-*.log | jq 'select(.userId == "user123")'

# Failed login attempts
cat logs/audit-*.log | jq 'select(.action | contains("POST /auth/login"))'
```

### Log retention

- Error logs: 14 days
- Combined logs: 7 days
- Access logs: 7 days
- Audit logs: 90 days

After retention period, consider:

- Archive to S3/Azure Blob
- Send to ELK/OpenSearch for long-term storage
- Delete if not needed

## Future Enhancements

### Distributed Tracing

Add OpenTelemetry for request tracing across services:

```
Client → NGINX → Backend → Database
         [trace-id: abc123]
```

**Package**: `@opentelemetry/sdk-node`
**Backend**: Jaeger or Zipkin

### Centralized Logging

Send logs to ELK stack or OpenSearch:

- **Filebeat**: Ship logs from files
- **Logstash**: Parse and transform logs
- **Elasticsearch**: Store and index logs
- **Kibana**: Search and visualize

### APM (Application Performance Monitoring)

Add detailed performance tracking:

- Function call traces
- Database query performance
- External API call latency

**Tools**: New Relic, Datadog, Elastic APM

## Troubleshooting

### Prometheus not scraping

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check app metrics endpoint
curl http://localhost:3000/metrics
```

### Grafana dashboard not showing data

1. Check Prometheus datasource: Configuration → Data Sources
2. Verify metrics exist: Run query in Prometheus UI
3. Check time range in dashboard

### Logs not appearing

```bash
# Check log directory permissions
ls -la logs/

# Verify Winston is writing
docker-compose exec app ls -la logs/

# Check container logs
docker-compose logs app
```

### Alerts not firing

```bash
# Check alert rules in Prometheus
curl http://localhost:9090/api/v1/rules

# Check Alertmanager
curl http://localhost:9093/api/v1/alerts

# Test alert webhook
curl -X POST http://localhost:3000/webhooks/alerts \
  -H "Content-Type: application/json" \
  -d '{"alerts": [{"labels": {"alertname": "test"}}]}'
```

## Production Checklist

- [ ] Configure alert notification channels (Slack/Email)
- [ ] Set up log shipping to centralized system
- [ ] Configure Grafana with authentication
- [ ] Restrict access to monitoring ports (use VPN/firewall)
- [ ] Set up monitoring for monitoring (monitor Prometheus itself)
- [ ] Configure backup for Grafana dashboards
- [ ] Set up on-call rotation for critical alerts
- [ ] Document incident response procedures
- [ ] Test alert notifications
- [ ] Review and tune alert thresholds after 1 week

## Related Documentation

- [SECURITY.md](../SECURITY.md) - Security implementation details
- [SECRETS_MANAGEMENT.md](../SECRETS_MANAGEMENT.md) - Secrets handling
- [README.md](../README.md) - General project documentation
