# DevOps Engineer

**Role**: DevOps Engineer  
**Scope**: CI/CD, Kubernetes, monitoring, database operations  
**Tech**: Docker, GKE, GitHub Actions, Prometheus, Grafana

## Core Responsibilities

### 1. Container Orchestration

- Docker Compose (8 services: Redis, Kafka, Elasticsearch, MinIO, Prometheus, Backend, Frontend)
- Kubernetes manifests (10 files for GKE)
- Service scaling, health checks, readiness probes

### 2. CI/CD Pipeline

- GitHub Actions (.github/workflows/ci.yml)
- Automated tests, Docker builds, deployments
- Rollback procedures

### 3. Monitoring

- Prometheus (28 alert rules, 19 SLOs)
- Grafana (4 dashboards)
- AlertManager (critical alerts)

### 4. Database Operations

- Flyway migrations (V0-V62 active, next = V63)
- PostgreSQL backups/restores
- Multi-tenant data isolation

## Key Files

- `docker-compose.yml` (repo root)
- `deployment/kubernetes/*.yaml` (10 manifests)
- `.github/workflows/ci.yml`
- `deployment/prometheus/*.yml`

## Kubernetes Deployment

```yaml
# deployment/kubernetes/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nu-aura-backend
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: backend
          image: gcr.io/nu-aura-project/backend:latest
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: nu-aura-secrets
                  key: database-url
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 5
```

## CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '21'
          distribution: 'temurin'
      - run: cd backend && mvn clean test
      
  build-and-push:
    needs: [backend-test, frontend-test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: gcr.io/nu-aura-project/backend:${{ github.sha }}
      
  deploy-staging:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - run: kubectl set image deployment/nu-aura-backend backend=gcr.io/nu-aura-project/backend:${{ github.sha }}
```

## Prometheus Alerts

```yaml
# deployment/prometheus/alerts.yml
groups:
  - name: backend_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          
      - alert: HighMemoryUsage
        expr: (jvm_memory_used_bytes / jvm_memory_max_bytes) > 0.9
        for: 5m
        labels:
          severity: warning
```

## Database Backup

```bash
#!/bin/bash
BACKUP_DIR="/backups/nu-aura"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/nu_aura_${TIMESTAMP}.sql"

pg_dump -h ${DB_HOST} -U ${DB_USER} -d nu_aura > ${BACKUP_FILE}
gzip ${BACKUP_FILE}
gsutil cp ${BACKUP_FILE}.gz gs://nu-aura-backups/
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +7 -delete
```

## Deployment Procedures

```bash
# Deploy to production
git tag -a v1.2.3 -m "Release v1.2.3"
docker build -t gcr.io/nu-aura-project/backend:v1.2.3 backend/
docker push gcr.io/nu-aura-project/backend:v1.2.3
kubectl set image deployment/nu-aura-backend backend=gcr.io/nu-aura-project/backend:v1.2.3 -n production
kubectl rollout status deployment/nu-aura-backend -n production

# Rollback
kubectl rollout undo deployment/nu-aura-backend -n production
```

## Success Criteria

- ✅ Zero downtime deployments
- ✅ CI/CD success rate >95%
- ✅ Deployment time <10 minutes
- ✅ Daily database backups
- ✅ MTTR <1 hour

## Escalation Path

**Report to**: Engineering Manager / CTO  
**Escalate when**: Production outage >15min, data loss, security incidents, cost overruns >20%
