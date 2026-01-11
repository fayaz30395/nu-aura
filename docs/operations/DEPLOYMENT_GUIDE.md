# Deployment Guide

## 1. Overview

This document provides comprehensive deployment instructions for the NU-AURA HRMS platform across different environments.

### 1.1 Deployment Options

| Option | Best For | Complexity |
|--------|----------|------------|
| Docker Compose | Development, Testing | Low |
| Kubernetes (GKE) | Production | High |
| Railway | Quick Deployments | Low |
| Render | Small Deployments | Low |

### 1.2 Prerequisites

| Component | Version | Purpose |
|-----------|---------|---------|
| Java | 17 or 21 | Backend runtime |
| Node.js | 18+ | Frontend build |
| Docker | 24+ | Containerization |
| kubectl | 1.28+ | Kubernetes CLI |
| Maven | 3.8+ | Build tool |
| PostgreSQL | 14+ | Database |
| Redis | 6+ | Cache |

---

## 2. Environment Configuration

### 2.1 Backend Environment Variables

Create `.env` file in `hrms-backend/`:

```bash
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/hrms
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=your_secure_password

# Redis Cache
SPRING_REDIS_HOST=localhost
SPRING_REDIS_PORT=6379
SPRING_REDIS_PASSWORD=

# JWT Security
JWT_SECRET=your_64_character_minimum_secret_key_here_for_production_use_only
JWT_EXPIRATION=3600000
JWT_REFRESH_EXPIRATION=86400000

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# CORS
APP_CORS_ALLOWED_ORIGINS=http://localhost:3000,https://app.yourdomain.com

# Email (SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=noreply@yourdomain.com

# File Storage (MinIO/S3)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=hrms-documents

# Optional Integrations
OPENAI_API_KEY=sk-xxx
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
```

### 2.2 Frontend Environment Variables

Create `.env.local` file in `hrms-frontend/`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Feature Flags
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# WebSocket
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

### 2.3 Production Environment Variables

```bash
# Production-specific settings
SPRING_PROFILES_ACTIVE=production
LOGGING_LEVEL_ROOT=INFO
SERVER_PORT=8080

# SSL/TLS
SERVER_SSL_ENABLED=true
SERVER_SSL_KEY_STORE=classpath:keystore.p12
SERVER_SSL_KEY_STORE_PASSWORD=your_keystore_password

# Performance Tuning
SPRING_JPA_PROPERTIES_HIBERNATE_JDBC_BATCH_SIZE=50
SPRING_JPA_PROPERTIES_HIBERNATE_ORDER_INSERTS=true
SPRING_JPA_PROPERTIES_HIBERNATE_ORDER_UPDATES=true
```

---

## 3. Local Development Setup

### 3.1 Database Setup

```bash
# Start PostgreSQL with Docker
docker run -d \
  --name hrms-postgres \
  -e POSTGRES_DB=hrms \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16

# Start Redis with Docker
docker run -d \
  --name hrms-redis \
  -p 6379:6379 \
  redis:7
```

### 3.2 Backend Setup

```bash
# Navigate to backend directory
cd hrms-backend

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Build the application
mvn clean install -DskipTests

# Run the application
mvn spring-boot:run

# Or run with specific profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### 3.3 Frontend Setup

```bash
# Navigate to frontend directory
cd hrms-frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev

# Build for production
npm run build
```

### 3.4 Verify Installation

```bash
# Backend health check
curl http://localhost:8080/actuator/health

# Expected response:
# {"status":"UP","components":{"db":{"status":"UP"},"redis":{"status":"UP"}}}

# Frontend
# Open http://localhost:3000 in browser
```

---

## 4. Docker Deployment

### 4.1 Docker Compose (Development)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: hrms-postgres
    environment:
      POSTGRES_DB: hrms
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    container_name: hrms-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: hrms-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: hrms-backend
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/hrms
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: postgres
      SPRING_REDIS_HOST: redis
      MINIO_ENDPOINT: http://minio:9000
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./hrms-frontend
      dockerfile: Dockerfile
    container_name: hrms-frontend
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_URL: http://backend:8080/api/v1
    ports:
      - "3000:3000"

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### 4.2 Build and Run

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### 4.3 Production Docker Compose

```yaml
version: '3.8'

services:
  backend:
    image: gcr.io/your-project/hrms-backend:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    environment:
      SPRING_PROFILES_ACTIVE: production
      JAVA_OPTS: >-
        -XX:+UseContainerSupport
        -XX:MaxRAMPercentage=75.0
        -XX:+UseG1GC
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

---

## 5. Kubernetes Deployment

### 5.1 Namespace and ConfigMap

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: hrms
  labels:
    app: hrms

---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hrms-config
  namespace: hrms
data:
  SPRING_PROFILES_ACTIVE: "production"
  SERVER_PORT: "8080"
  SPRING_REDIS_HOST: "redis-service"
  SPRING_REDIS_PORT: "6379"
```

### 5.2 Secrets

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: hrms-secrets
  namespace: hrms
type: Opaque
stringData:
  DB_PASSWORD: "your_secure_password"
  JWT_SECRET: "your_64_char_jwt_secret_here"
  GOOGLE_CLIENT_SECRET: "your_google_secret"
  REDIS_PASSWORD: ""
```

### 5.3 Backend Deployment

```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hrms-backend
  namespace: hrms
  labels:
    app: hrms-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hrms-backend
  template:
    metadata:
      labels:
        app: hrms-backend
    spec:
      containers:
        - name: hrms-backend
          image: gcr.io/your-project/hrms-backend:latest
          ports:
            - containerPort: 8080
          envFrom:
            - configMapRef:
                name: hrms-config
          env:
            - name: SPRING_DATASOURCE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: hrms-secrets
                  key: DB_PASSWORD
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: hrms-secrets
                  key: JWT_SECRET
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "2Gi"
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
          securityContext:
            runAsNonRoot: true
            runAsUser: 1001
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}

---
# backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: hrms-backend-service
  namespace: hrms
spec:
  selector:
    app: hrms-backend
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

### 5.4 Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hrms-backend-hpa
  namespace: hrms
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hrms-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### 5.5 Ingress Configuration

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hrms-ingress
  namespace: hrms
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
    - hosts:
        - api.yourdomain.com
        - app.yourdomain.com
      secretName: hrms-tls
  rules:
    - host: api.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: hrms-backend-service
                port:
                  number: 80
    - host: app.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: hrms-frontend-service
                port:
                  number: 80
```

### 5.6 Deploy to Kubernetes

```bash
# Apply all configurations
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/secrets.yaml
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/backend-deployment.yaml
kubectl apply -f kubernetes/frontend-deployment.yaml
kubectl apply -f kubernetes/hpa.yaml
kubectl apply -f kubernetes/ingress.yaml

# Check deployment status
kubectl get pods -n hrms
kubectl get services -n hrms
kubectl get ingress -n hrms

# View logs
kubectl logs -f deployment/hrms-backend -n hrms

# Scale manually
kubectl scale deployment hrms-backend --replicas=5 -n hrms
```

---

## 6. Google Cloud Platform (GCP)

### 6.1 Cloud Build Configuration

```yaml
# cloudbuild.yaml
steps:
  # Build backend
  - name: 'maven:3.9-eclipse-temurin-21'
    entrypoint: 'mvn'
    args: ['clean', 'package', '-DskipTests']
    dir: 'hrms-backend'

  # Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/hrms-backend:$COMMIT_SHA'
      - '-t'
      - 'gcr.io/$PROJECT_ID/hrms-backend:latest'
      - '.'

  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/hrms-backend:$COMMIT_SHA']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/hrms-backend:latest']

  # Deploy to GKE
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - 'run'
      - '--filename=kubernetes/'
      - '--image=gcr.io/$PROJECT_ID/hrms-backend:$COMMIT_SHA'
      - '--location=us-central1'
      - '--cluster=hrms-cluster'

images:
  - 'gcr.io/$PROJECT_ID/hrms-backend:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/hrms-backend:latest'

timeout: '1800s'
```

### 6.2 Cloud SQL Setup

```bash
# Create Cloud SQL instance
gcloud sql instances create hrms-db \
  --database-version=POSTGRES_14 \
  --tier=db-custom-2-4096 \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=100GB \
  --backup-start-time=02:00

# Create database
gcloud sql databases create hrms --instance=hrms-db

# Create user
gcloud sql users create hrms-user \
  --instance=hrms-db \
  --password=your_secure_password
```

### 6.3 Cloud Run Deployment

```bash
# Build and push image
gcloud builds submit --tag gcr.io/$PROJECT_ID/hrms-backend

# Deploy to Cloud Run
gcloud run deploy hrms-backend \
  --image gcr.io/$PROJECT_ID/hrms-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="SPRING_PROFILES_ACTIVE=production" \
  --set-secrets="DB_PASSWORD=hrms-db-password:latest" \
  --min-instances=1 \
  --max-instances=10 \
  --memory=2Gi \
  --cpu=2
```

---

## 7. Railway Deployment

### 7.1 Railway Configuration

```json
// railway.json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "java -jar target/hrms-backend.jar",
    "healthcheckPath": "/actuator/health",
    "healthcheckTimeout": 60,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 7.2 Deploy via CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to existing project
railway link

# Deploy
railway up

# View logs
railway logs
```

---

## 8. Render Deployment

### 8.1 Render Blueprint

```yaml
# render.yaml
services:
  - type: web
    name: hrms-backend
    env: docker
    dockerfilePath: ./Dockerfile
    region: oregon
    plan: standard
    healthCheckPath: /actuator/health
    envVars:
      - key: SPRING_PROFILES_ACTIVE
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: hrms-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true

  - type: web
    name: hrms-frontend
    env: static
    buildCommand: npm run build
    staticPublishPath: ./out
    headers:
      - path: /*
        name: X-Frame-Options
        value: DENY

databases:
  - name: hrms-db
    databaseName: hrms
    plan: standard
    region: oregon
```

---

## 9. Database Migration

### 9.1 Liquibase Execution

```bash
# Run migrations manually
mvn liquibase:update

# Generate changelog from existing database
mvn liquibase:generateChangeLog

# Rollback last changeset
mvn liquibase:rollbackCount -Dliquibase.rollbackCount=1

# Validate changelog
mvn liquibase:validate
```

### 9.2 Production Migration

```bash
# Dry run (preview changes)
mvn liquibase:updateSQL > migration-preview.sql

# Review the SQL
cat migration-preview.sql

# Apply migrations
mvn liquibase:update -Dspring.profiles.active=production
```

---

## 10. Monitoring Setup

### 10.1 Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'hrms-backend'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['hrms-backend:8080']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
```

### 10.2 Grafana Dashboard

```json
{
  "dashboard": {
    "title": "HRMS Backend Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_server_requests_seconds_count[5m])",
            "legendFormat": "{{uri}}"
          }
        ]
      },
      {
        "title": "Response Time (P95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m]))",
            "legendFormat": "P95"
          }
        ]
      },
      {
        "title": "JVM Memory",
        "type": "graph",
        "targets": [
          {
            "expr": "jvm_memory_used_bytes",
            "legendFormat": "{{area}}"
          }
        ]
      }
    ]
  }
}
```

### 10.3 AlertManager Rules

```yaml
# alerting-rules.yml
groups:
  - name: hrms-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_server_requests_seconds_count{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High latency detected

      - alert: PodDown
        expr: up{job="hrms-backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: HRMS Backend pod is down
```

---

## 11. Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Database migrations tested
- [ ] Secrets stored securely (not in code)
- [ ] SSL certificates valid
- [ ] CORS origins configured for production
- [ ] Rate limiting enabled
- [ ] Health checks configured
- [ ] Backup strategy in place
- [ ] Rollback plan documented

### Post-Deployment

- [ ] Health endpoints responding
- [ ] Metrics being collected
- [ ] Logs flowing correctly
- [ ] SSL certificate working
- [ ] Authentication working
- [ ] Database connections stable
- [ ] Cache connections stable
- [ ] Email notifications working
- [ ] File upload/download working

### Rollback Procedure

```bash
# Kubernetes rollback
kubectl rollout undo deployment/hrms-backend -n hrms

# Docker rollback
docker-compose down
docker-compose pull
docker tag hrms-backend:previous hrms-backend:latest
docker-compose up -d

# Database rollback (if needed)
mvn liquibase:rollbackCount -Dliquibase.rollbackCount=1
```

---

*Document Version: 1.0*
*Last Updated: January 11, 2026*
