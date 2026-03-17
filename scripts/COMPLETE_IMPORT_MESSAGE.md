# 📦 NU-AURA Complete Database & Docker Import Package

**Complete migration package with Docker configuration**

---

## 📋 PACKAGE CONTENTS

### Database Files
- ✅ `nuaura_migration_20260318_020943.sql.gz` (123 KB) ← Main backup
- ✅ `nuaura_migration_20260318_020943.sql` (833 KB) ← Uncompressed
- ✅ `postgres-volume-20260318_021425.tar.gz` (20 MB) ← Docker volume backup

### Documentation
- ✅ `START_HERE.md` ← Read this first
- ✅ `INSTRUCTIONS_FOR_TARGET_SYSTEM.md` ← Detailed steps
- ✅ `DOCKER_EXPORT_GUIDE.md` ← Docker migration guide
- ✅ `auto-import.sh` ← Automated import script

### Docker Configuration
- ✅ `docker-compose.yml` ← Container orchestration

---

## 🐳 DOCKER SETUP REQUIREMENTS

### Required Containers

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `hrms-postgres` | postgres:16-alpine | 5432 | Database |
| `hrms-redis` | redis:7-alpine | 6379 | Cache |
| `hrms-kafka` | confluentinc/cp-kafka:7.6.0 | 9092, 9101 | Event streaming |
| `hrms-zookeeper` | confluentinc/cp-zookeeper:7.6.0 | 2181 | Kafka coordinator |
| `hrms-minio` | minio/minio:latest | 9000, 9001 | Object storage |

### Required Volumes

```bash
nu-aura_postgres_data    # PostgreSQL data
nu-aura_redis_data       # Redis data
nu-aura_kafka_data       # Kafka data
nu-aura_zookeeper_data   # Zookeeper data
nu-aura_zookeeper_logs   # Zookeeper logs
nu-aura_minio_data       # MinIO data
```

---

## 🚀 QUICK IMPORT (Option 1: SQL Import)

### Step 1: Start Docker Infrastructure

```bash
# Use the provided docker-compose.yml
docker-compose up -d

# Wait for all services to be healthy (30-60 seconds)
docker-compose ps
```

### Step 2: Import Database

```bash
# Extract compressed SQL backup
gunzip nuaura_migration_20260318_020943.sql.gz

# Import to PostgreSQL
docker exec -i hrms-postgres psql -U hrms -d postgres < nuaura_migration_20260318_020943.sql
```

### Step 3: Verify Import

```bash
# Should return 9
docker exec hrms-postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM users;"

# Should return 9
docker exec hrms-postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM employees;"

# Should return 44
docker exec hrms-postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM permissions;"
```

**All counts match?** ✅ Success!

---

## 🐳 ALTERNATIVE: Docker Volume Import (Faster)

### Step 1: Stop PostgreSQL

```bash
docker-compose stop postgres
```

### Step 2: Import Volume Data

```bash
# The volume should already exist from docker-compose up
# If not, create it:
docker volume create nu-aura_postgres_data

# Import the volume backup
docker run --rm \
  -v nu-aura_postgres_data:/target \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-volume-20260318_021425.tar.gz -C /target
```

### Step 3: Start PostgreSQL

```bash
docker-compose up -d postgres

# Wait for healthy status
docker-compose ps postgres
```

### Step 4: Verify

```bash
docker exec hrms-postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM users;"
# Expected: 9
```

---

## 🔧 DOCKER CONFIGURATION DETAILS

### Environment Variables

Create a `.env` file in the same directory as docker-compose.yml:

```env
# PostgreSQL
POSTGRES_PASSWORD=hrms_dev_password

# Backend (if running backend container)
SPRING_PROFILES_ACTIVE=dev
DB_HOST=postgres
DB_PORT=5432
DB_NAME=hrms_dev
DB_USERNAME=hrms
DB_PASSWORD=hrms_dev_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Kafka
KAFKA_BOOTSTRAP_SERVERS=kafka:29092

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
```

### Network Configuration

Docker network: `hrms_network` (bridge mode)

All containers communicate internally via container names:
- `postgres` (not localhost)
- `redis`
- `kafka`
- `zookeeper`
- `minio`

### Port Mappings

```
Host → Container
5432 → 5432  (PostgreSQL)
6379 → 6379  (Redis)
9092 → 9092  (Kafka - external)
9101 → 9101  (Kafka JMX)
2181 → 2181  (Zookeeper)
9000 → 9000  (MinIO API)
9001 → 9001  (MinIO Console)
```

---

## 🏗️ COMPLETE SETUP FROM SCRATCH

### Step 1: Prerequisites

```bash
# Install Docker and Docker Compose
# Verify installation
docker --version
docker-compose --version
```

### Step 2: Extract Migration Package

```bash
# Create project directory
mkdir -p ~/nu-aura
cd ~/nu-aura

# Extract files
tar xzf migration-package.tar.gz
```

### Step 3: Start Infrastructure

```bash
# Start all services
docker-compose up -d

# Check status (all should be "Up" and "healthy")
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 4: Import Database

```bash
# Option A: SQL Import (recommended)
gunzip nuaura_migration_*.sql.gz
docker exec -i hrms-postgres psql -U hrms -d postgres < nuaura_migration_*.sql

# Option B: Volume Import (faster)
docker-compose stop postgres
docker run --rm -v nu-aura_postgres_data:/target -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-volume-*.tar.gz -C /target
docker-compose up -d postgres
```

### Step 5: Verify All Services

```bash
# PostgreSQL
docker exec hrms-postgres psql -U hrms -d hrms_dev -c "SELECT version();"

# Redis
docker exec hrms-redis redis-cli ping
# Expected: PONG

# Kafka (check topics)
docker exec hrms-kafka kafka-topics --bootstrap-server localhost:9092 --list

# MinIO (check health)
curl http://localhost:9000/minio/health/live
```

---

## 📊 DATABASE INFORMATION

| Property | Value |
|----------|-------|
| **Database Name** | hrms_dev |
| **Username** | hrms |
| **Password** | hrms_dev_password (default) |
| **Port** | 5432 |
| **Container** | hrms-postgres |
| **Image** | postgres:16-alpine |
| **Volume** | nu-aura_postgres_data |

### Data Included

| Table | Rows |
|-------|------|
| Users | 9 |
| Employees | 9 |
| Departments | 0 |
| Roles | 4 |
| Permissions | 44 |
| Total Tables | 275 |

**Database Size:** 28 MB

---

## 🔐 SECURITY NOTES

### Change Default Passwords

```bash
# After import, update PostgreSQL password
docker exec hrms-postgres psql -U postgres -c "ALTER USER hrms WITH PASSWORD 'your-secure-password';"

# Update .env file
echo "POSTGRES_PASSWORD=your-secure-password" >> .env
echo "DB_PASSWORD=your-secure-password" >> .env

# Restart containers
docker-compose restart
```

### Secure MinIO

```bash
# Access MinIO console: http://localhost:9001
# Login: minioadmin / minioadmin
# Change password immediately after first login
```

---

## 🆘 TROUBLESHOOTING

### Container Won't Start

```bash
# Check logs
docker-compose logs postgres

# Check if port is in use
sudo lsof -i :5432

# Remove and recreate
docker-compose down
docker-compose up -d
```

### Database Import Failed

```bash
# Error: database already exists
docker exec hrms-postgres psql -U postgres -c "DROP DATABASE IF EXISTS hrms_dev;"

# Error: role doesn't exist
docker exec hrms-postgres psql -U postgres -c "CREATE USER hrms WITH PASSWORD 'hrms_dev_password' CREATEDB;"

# Re-import
docker exec -i hrms-postgres psql -U hrms -d postgres < nuaura_migration_*.sql
```

### Volume Mount Issues

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect nu-aura_postgres_data

# Remove and recreate
docker volume rm nu-aura_postgres_data
docker volume create nu-aura_postgres_data
```

### Services Not Healthy

```bash
# Check health status
docker inspect hrms-postgres --format='{{.State.Health.Status}}'

# Force recreate
docker-compose up -d --force-recreate postgres

# View health check logs
docker inspect hrms-postgres --format='{{json .State.Health}}' | jq
```

---

## 📋 POST-IMPORT CHECKLIST

- [ ] All Docker containers running (`docker-compose ps`)
- [ ] PostgreSQL healthy (`docker inspect hrms-postgres`)
- [ ] Database imported (9 users, 9 employees)
- [ ] Redis accessible (`docker exec hrms-redis redis-cli ping`)
- [ ] Kafka running (`docker exec hrms-kafka kafka-topics --list`)
- [ ] MinIO accessible (http://localhost:9001)
- [ ] Passwords changed from defaults
- [ ] .env file configured
- [ ] Backend application configuration updated

---

## 🎯 BACKEND CONFIGURATION

After import, update your backend application.yml:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://postgres:5432/hrms_dev
    username: hrms
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver

  data:
    redis:
      host: redis
      port: 6379

  kafka:
    bootstrap-servers: kafka:29092
```

### Start Backend (if using Docker)

```bash
# Add backend service to docker-compose.yml or run separately
docker run -d \
  --name hrms-backend \
  --network hrms_network \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/hrms_dev \
  -e SPRING_DATASOURCE_USERNAME=hrms \
  -e SPRING_DATASOURCE_PASSWORD=hrms_dev_password \
  -e SPRING_REDIS_HOST=redis \
  -e SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka:29092 \
  -p 8080:8080 \
  your-backend-image:latest
```

---

## 📞 QUICK HELP COMMANDS

```bash
# View all containers
docker-compose ps

# View logs for all services
docker-compose logs

# View logs for specific service
docker-compose logs -f postgres

# Restart all services
docker-compose restart

# Stop all services
docker-compose down

# Stop all services and remove volumes (DANGER!)
docker-compose down -v

# Execute SQL query
docker exec hrms-postgres psql -U hrms -d hrms_dev -c "YOUR QUERY"

# Connect to PostgreSQL interactively
docker exec -it hrms-postgres psql -U hrms -d hrms_dev

# Check disk usage
docker system df
```

---

## 🎉 SUCCESS INDICATORS

Import is successful when:

✅ `docker-compose ps` shows all containers "Up" and "healthy"
✅ `SELECT COUNT(*) FROM users;` returns 9
✅ `SELECT COUNT(*) FROM employees;` returns 9
✅ `SELECT COUNT(*) FROM permissions;` returns 44
✅ Backend application connects successfully
✅ Can login to application

---

## 📦 COMPLETE IMPORT COMMAND SUMMARY

**One-command setup (after extracting files):**

```bash
# Start infrastructure
docker-compose up -d && \

# Wait for PostgreSQL to be ready
sleep 10 && \

# Import database
gunzip -c nuaura_migration_*.sql.gz | docker exec -i hrms-postgres psql -U hrms -d postgres && \

# Verify
docker exec hrms-postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM users;"
```

**Expected output:** `9`

---

**Package Created:** 2026-03-18 02:14 AM
**Source System:** macOS Docker
**PostgreSQL Version:** 16.13
**Total Package Size:** ~21 MB

---

**Need More Help?**
- Read: `START_HERE.md`
- Troubleshoot: `INSTRUCTIONS_FOR_TARGET_SYSTEM.md`
- Docker details: `DOCKER_EXPORT_GUIDE.md`
