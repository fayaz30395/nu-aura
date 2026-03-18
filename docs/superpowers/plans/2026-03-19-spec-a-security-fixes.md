# Spec A: Security & Critical Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve 7 security and infrastructure issues that block production deployment.

**Architecture:** Infrastructure-only changes — Dockerfiles, CI config, K8s manifests, .gitignore. No application code changes. No database migrations.

**Tech Stack:** Docker, GitHub Actions CI, Kubernetes YAML, .gitignore

**Spec:** `docs/superpowers/specs/2026-03-19-deep-codebase-analysis-design.md` (Spec A section)

---

## File Map

| File | Action | Task |
|------|--------|------|
| `Dockerfile` (root) | Modify lines 3, 25 | Task 1 |
| `backend/Dockerfile` | Modify lines 6, 30, 55 | Task 1 |
| `.github/workflows/ci.yml` | Modify line 10 | Task 1 |
| `docker-compose.yml` | Modify lines 7, 104-107 | Task 2 |
| `backend/.env.example` | Modify (add Neon placeholders) | Task 2 |
| `backend/src/main/resources/application-dev.yml` | Verify (no Neon creds) | Task 2 |
| `deployment/kubernetes/backend-deployment.yaml` | Modify lines 40-46 | Task 3 |
| `deployment/kubernetes/ingress.yaml` | Modify line 48 | Task 4 |
| `deployment/kubernetes/network-policy.yaml` | Modify (document Cloud Armor prerequisite) | Task 5 |
| `.gitignore` | Modify (add patterns) | Task 6 |
| `client_secret_*.json` | Delete (untracked local file) | Task 7 |

---

### Task 1: Align Java Version to 17 (A2 — P0)

**Files:**
- Modify: `Dockerfile:3,25`
- Modify: `backend/Dockerfile:6,30,55`
- Modify: `.github/workflows/ci.yml:10`

- [ ] **Step 1: Update root Dockerfile**

```dockerfile
# Line 3: Change FROM maven:3.9-eclipse-temurin-21-alpine AS build
# To:
FROM maven:3.9-eclipse-temurin-17-alpine AS build

# Line 25: Change FROM eclipse-temurin:21-jre-alpine
# To:
FROM eclipse-temurin:17-jre-alpine
```

- [ ] **Step 2: Update backend Dockerfile**

```dockerfile
# Line 6: Change FROM maven:3.9-eclipse-temurin-21-alpine AS build
# To:
FROM maven:3.9-eclipse-temurin-17-alpine AS build

# Line 30: Change FROM maven:3.9-eclipse-temurin-21-alpine AS development
# To:
FROM maven:3.9-eclipse-temurin-17-alpine AS development

# Line 55: Change FROM eclipse-temurin:21-jre-alpine
# To:
FROM eclipse-temurin:17-jre-alpine
```

- [ ] **Step 3: Update CI workflow**

```yaml
# .github/workflows/ci.yml line 10
# Change: JAVA_VERSION: '21'
# To:
JAVA_VERSION: '17'
```

- [ ] **Step 4: Verify pom.xml already targets Java 17**

Run: `grep -n 'java.version\|<source>\|<target>' backend/pom.xml`

Expected: Line 22 shows `<java.version>17</java.version>`, lines 325-326 show `<source>17</source>` and `<target>17</target>`.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile backend/Dockerfile .github/workflows/ci.yml
git commit -m "fix(infra): align Java version to 17 across Dockerfiles and CI

Root Dockerfile, backend Dockerfile, and CI workflow all referenced Java 21
but pom.xml compiles for Java 17. This causes class version mismatches."
```

---

### Task 2: Remove Real Credentials from docker-compose Defaults (A3 — P1)

**Files:**
- Modify: `docker-compose.yml:7,104-107`
- Modify: `backend/.env.example`
- Verify: `backend/src/main/resources/application-dev.yml`

- [ ] **Step 1: Remove Neon endpoint comment from docker-compose.yml**

```yaml
# Line 7: Remove this comment entirely:
# Connection: ep-green-flower-anmsqzxh-pooler.c-6.us-east-1.aws.neon.tech/neondb
```

- [ ] **Step 2: Replace Neon credential defaults with empty placeholders**

```yaml
# Lines 104-107: Replace real Neon credentials with forced-explicit vars
# FROM:
      SPRING_DATASOURCE_URL: ${NEON_JDBC_URL:-jdbc:postgresql://ep-green-flower-anmsqzxh.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require}
      SPRING_DATASOURCE_USERNAME: ${NEON_DB_USERNAME:-neondb_owner}
      SPRING_DATASOURCE_PASSWORD: ${NEON_DB_PASSWORD:-npg_p3Nnmrd9PvhB}
# TO:
      SPRING_DATASOURCE_URL: ${NEON_JDBC_URL:?Set NEON_JDBC_URL in .env}
      SPRING_DATASOURCE_USERNAME: ${NEON_DB_USERNAME:?Set NEON_DB_USERNAME in .env}
      SPRING_DATASOURCE_PASSWORD: ${NEON_DB_PASSWORD:?Set NEON_DB_PASSWORD in .env}
```

Note: `${VAR:?message}` syntax causes docker-compose to fail with an error if the var is unset, forcing explicit `.env` configuration.

- [ ] **Step 3: Update .env.example with Neon setup instructions**

Add to the Database Configuration section of `backend/.env.example`:

```properties
# For Neon cloud PostgreSQL (docker-compose):
NEON_JDBC_URL=jdbc:postgresql://your-endpoint.neon.tech/neondb?sslmode=require
NEON_DB_USERNAME=neondb_owner
NEON_DB_PASSWORD=your_neon_password
```

- [ ] **Step 4: Verify application-dev.yml has no Neon credentials**

Run: `grep -in 'neon\|npg_\|ep-green' backend/src/main/resources/application-dev.yml`

Expected: No matches. (Dev config uses `${DEV_DATABASE_URL:jdbc:postgresql://localhost:5432/hrms}` which is safe.)

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml backend/.env.example
git commit -m "fix(security): remove real Neon DB credentials from docker-compose defaults

Replaced hardcoded Neon endpoint, username, and password with required
env var syntax that forces explicit .env configuration. Updated
.env.example with setup instructions."
```

---

### Task 3: Fix K8s Init Container (A5 — P1)

**Files:**
- Modify: `deployment/kubernetes/backend-deployment.yaml:38-47`

- [ ] **Step 1: Replace netcat init container with pg_isready**

```yaml
# Lines 38-47: Replace the entire initContainers section
# FROM:
      initContainers:
      - name: wait-for-db
        image: busybox:1.36
        command: ['sh', '-c', 'until nc -z ${DB_HOST} ${DB_PORT}; do echo waiting for database; sleep 2; done;']
        env:
        - name: DB_HOST
          value: "REPLACE_DB_HOST"
        - name: DB_PORT
          value: "5432"
# TO:
      initContainers:
      - name: wait-for-db
        image: postgres:17-alpine
        command: ['sh', '-c', 'until pg_isready -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER}; do echo "Waiting for PostgreSQL..."; sleep 2; done;']
        resources:
          requests:
            cpu: 50m
            memory: 32Mi
          limits:
            cpu: 100m
            memory: 64Mi
        env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: hrms-config
              key: DB_HOST
        - name: DB_PORT
          value: "5432"
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: hrms-secrets
              key: DB_USERNAME
```

- [ ] **Step 2: Commit**

```bash
git add deployment/kubernetes/backend-deployment.yaml
git commit -m "fix(k8s): replace netcat init container with pg_isready

Uses postgres:17-alpine for proper PostgreSQL readiness checks instead of
busybox netcat which only tests port reachability. Adds resource limits
and pulls DB host from ConfigMap instead of hardcoded placeholder."
```

---

### Task 4: Tighten Ingress CSP (A6 — P2)

**Files:**
- Modify: `deployment/kubernetes/ingress.yaml:48`

- [ ] **Step 1: Replace CSP header with stricter policy**

```yaml
# Line 48: Replace the Content-Security-Policy line
# FROM:
      more_set_headers "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';";
# TO:
      more_set_headers "Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://accounts.google.com https://*.googleapis.com; frame-ancestors 'none';";
```

Note: `style-src 'unsafe-inline'` is kept because Mantine UI injects inline styles. `script-src` removes both `unsafe-inline` and `unsafe-eval`. `connect-src` allows Google OAuth endpoints. If Next.js inline scripts break, add a nonce-based approach or specific hashes.

- [ ] **Step 2: Commit**

```bash
git add deployment/kubernetes/ingress.yaml
git commit -m "fix(security): tighten CSP header in K8s ingress

Remove unsafe-inline and unsafe-eval from script-src. Keep unsafe-inline
for style-src (required by Mantine UI). Add explicit connect-src for
Google OAuth, img-src for data URIs, frame-ancestors none."
```

---

### Task 5: Document Network Policy Cloud Armor Prerequisite (A4 — P1)

**Files:**
- Modify: `deployment/kubernetes/network-policy.yaml`

- [ ] **Step 1: Add Cloud Armor prerequisite comment to network policy**

Add a comment block at the top of the backend ingress rule section explaining the prerequisite:

```yaml
# SECURITY NOTE (2026-03-19):
# The 0.0.0.0/0 CIDR on port 8080 is required for GKE GCE ingress which
# bypasses in-cluster controllers and connects directly to node IPs.
# To restrict this:
#   1. Configure Cloud Armor security policy 'hrms-security-policy' in GCP
#   2. Verify Cloud Armor is active on the backend backend-config
#   3. Then replace 0.0.0.0/0 with GCP LB health check ranges:
#      - 130.211.0.0/22
#      - 35.191.0.0/16
# DO NOT tighten without Cloud Armor — it will break production ingress.
```

- [ ] **Step 2: Commit**

```bash
git add deployment/kubernetes/network-policy.yaml
git commit -m "docs(k8s): document Cloud Armor prerequisite for network policy tightening

Added security note explaining why 0.0.0.0/0 is currently required for
GKE GCE ingress and the steps needed before it can be restricted."
```

---

### Task 6: Clean Up .gitignore (A7 — P2)

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add missing patterns to .gitignore**

Append to the Environment section (after line 45):

```gitignore
# Binary documents
*.docx
*.doc
*.xlsx
*.pptx

# SSL/TLS certificates
*.pem
*.key
*.crt
*.p12

# MCP configuration
.mcp.json

# Production environment files
.env.production
.env.production.local
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "fix(security): add binary docs, certs, and MCP config to .gitignore

Prevents accidental commit of Word documents, SSL certificates/keys,
MCP configuration, and production environment files."
```

---

### Task 7: Rotate OAuth Secret and Delete Local File (A1 — P1)

**Files:**
- Delete: `client_secret_*.json` (untracked local file)

- [ ] **Step 1: Delete the local untracked OAuth secret file**

```bash
rm -f client_secret_514794327964-8lm67aeibugoqi8aafidleuejngtchst.apps.googleusercontent.com.json
```

- [ ] **Step 2: Verify .gitignore coverage**

Run: `grep 'client_secret' .gitignore`

Expected: `**/client_secret*.json` (line 58) — already covered.

- [ ] **Step 3: Rotate secret in Google Cloud Console (manual)**

1. Go to Google Cloud Console → APIs & Credentials
2. Find OAuth 2.0 Client ID: `514794327964-8lm67aeibugoqi8aafidleuejngtchst`
3. Click "Reset Secret" → Confirm
4. Update the new secret in:
   - `.env` (local development)
   - K8s secrets (production)
   - Any CI/CD environment variables

- [ ] **Step 4: No git commit needed (file was untracked)**

---

## Verification Checklist

After all tasks are complete:

- [ ] Run `docker build -t test-build .` from root — verifies Java 17 Dockerfile
- [ ] Run `docker build -t test-backend backend/` — verifies backend Dockerfile
- [ ] Run `docker-compose config` — verifies YAML validity (will error if .env not set)
- [ ] Run `kubectl apply --dry-run=client -f deployment/kubernetes/` — verifies K8s manifests
- [ ] Run `git status` — verify no untracked sensitive files remain
- [ ] Verify `grep -r 'npg_\|ep-green-flower' .` returns no matches (no Neon creds in repo)
