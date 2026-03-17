# Docker Database Migration Guide

Complete guide for migrating NU-AURA PostgreSQL database in Docker environments.

---

## 🐳 Quick Start

### Export from Docker:

```bash
./docker-db-export.sh
```

### Import to Docker:

```bash
./docker-db-import.sh db-backups/nuaura_docker_backup_*.sql
```

---

## 📁 Files for Docker Migration

| File | Purpose |
|------|---------|
| `docker-db-export.sh` | Export database from Docker container |
| `docker-db-import.sh` | Import database into Docker container |
| `docker-init-db.sh` | Auto-restore on container startup |

---

## 🚀 Migration Methods

### Method 1: Using Scripts (Recommended)

#### Export Database

```bash
# Make script executable
chmod +x docker-db-export.sh

# Run export
./docker-db-export.sh
```

This creates 3 files:
- Plain SQL: `nuaura_docker_backup_TIMESTAMP.sql`
- Compressed: `nuaura_docker_backup_TIMESTAMP.sql.gz`
- Custom format: `nuaura_docker_backup_TIMESTAMP.dump`

#### Import Database

```bash
# Make script executable
chmod +x docker-db-import.sh

# Run import (choose ONE file)
./docker-db-import.sh db-backups/nuaura_docker_backup_20260318_020000.sql
# OR
./docker-db-import.sh db-backups/nuaura_docker_backup_20260318_020000.sql.gz
# OR
./docker-db-import.sh db-backups/nuaura_docker_backup_20260318_020000.dump
```

---

### Method 2: One-Line Docker Commands

#### Export

```bash
# Plain SQL
docker exec -t nu-aura-postgres pg_dump -U postgres -d hrms_db --clean --if-exists > backup.sql

# Compressed
docker exec -t nu-aura-postgres pg_dump -U postgres -d hrms_db | gzip > backup.sql.gz

# Custom format
docker exec nu-aura-postgres pg_dump -U postgres -d hrms_db -F custom -f /tmp/backup.dump && \
docker cp nu-aura-postgres:/tmp/backup.dump ./backup.dump
```

#### Import

```bash
# From plain SQL
docker exec -i nu-aura-postgres psql -U postgres -d postgres < backup.sql

# From compressed
gunzip -c backup.sql.gz | docker exec -i nu-aura-postgres psql -U postgres -d postgres

# From custom format
docker cp backup.dump nu-aura-postgres:/tmp/ && \
docker exec nu-aura-postgres pg_restore -U postgres -d hrms_db --clean --if-exists /tmp/backup.dump
```

---

### Method 3: Docker Compose with Auto-Restore

#### Setup Auto-Restore on Startup

1. **Place your backup file:**

```bash
# Copy backup to init directory
cp db-backups/nuaura_backup.sql docker/postgres/init-backup.sql
```

2. **Update docker-compose.yml:**

```yaml
services:
  postgres:
    image: postgres:14-alpine
    container_name: nu-aura-postgres
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      # Mount init script
      - ./scripts/docker-init-db.sh:/docker-entrypoint-initdb.d/01-init-db.sh:ro
      # Mount backup file (optional - for auto-restore)
      - ./scripts/db-backups/nuaura_backup.sql:/docker-entrypoint-initdb.d/init-backup.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

3. **Start containers:**

```bash
# First time startup will auto-restore database
docker-compose up -d postgres

# Watch logs
docker-compose logs -f postgres
```

---

## 🔄 Common Docker Migration Scenarios

### Scenario 1: Local Docker → Remote Docker

#### On Source (Local):

```bash
# Export
./docker-db-export.sh

# Copy to remote server
scp db-backups/nuaura_docker_backup_*.sql user@remote-server:/tmp/
```

#### On Target (Remote):

```bash
# Import
./docker-db-import.sh /tmp/nuaura_docker_backup_*.sql

# Or direct pipe over SSH
docker exec -t source-postgres pg_dump -U postgres -d hrms_db | \
ssh user@remote-server "docker exec -i target-postgres psql -U postgres -d postgres"
```

---

### Scenario 2: Docker → Non-Docker PostgreSQL

#### Export from Docker:

```bash
docker exec -t nu-aura-postgres pg_dump -U postgres -d hrms_db > backup.sql
```

#### Import to Native PostgreSQL:

```bash
psql -h localhost -U postgres -d postgres -f backup.sql
```

---

### Scenario 3: Non-Docker → Docker PostgreSQL

#### Export from Native PostgreSQL:

```bash
pg_dump -h localhost -U postgres -d hrms_db > backup.sql
```

#### Import to Docker:

```bash
docker exec -i nu-aura-postgres psql -U postgres -d postgres < backup.sql
```

---

### Scenario 4: Docker Volume Migration

#### Backup entire PostgreSQL data directory:

```bash
# Stop database
docker-compose stop postgres

# Create volume backup
docker run --rm \
  -v nu-aura_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-volume-backup.tar.gz /data

# Start database
docker-compose start postgres
```

#### Restore volume backup:

```bash
# Stop database
docker-compose stop postgres

# Remove old volume (WARNING: destructive!)
docker volume rm nu-aura_postgres_data

# Create new volume
docker volume create nu-aura_postgres_data

# Restore backup
docker run --rm \
  -v nu-aura_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-volume-backup.tar.gz -C /

# Start database
docker-compose start postgres
```

---

## 🔍 Verification

### Check Container Status

```bash
# List running containers
docker ps

# Check PostgreSQL container logs
docker logs nu-aura-postgres

# Follow logs in real-time
docker logs -f nu-aura-postgres
```

### Verify Database

```bash
# Connect to database
docker exec -it nu-aura-postgres psql -U postgres -d hrms_db

# Check table count
docker exec nu-aura-postgres psql -U postgres -d hrms_db -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"

# Check row counts
docker exec nu-aura-postgres psql -U postgres -d hrms_db -c \
  "SELECT 'users' AS tbl, COUNT(*) FROM users
   UNION ALL SELECT 'employees', COUNT(*) FROM employees;"

# Check database size
docker exec nu-aura-postgres psql -U postgres -d hrms_db -c \
  "SELECT pg_size_pretty(pg_database_size('hrms_db'));"
```

---

## 🛠️ Troubleshooting

### Issue 1: Container Not Found

```bash
# List all containers (including stopped)
docker ps -a

# List only PostgreSQL containers
docker ps -a | grep postgres

# Start container if stopped
docker start nu-aura-postgres
# OR
docker-compose up -d postgres
```

### Issue 2: Permission Denied

```bash
# Fix file permissions
chmod +x docker-db-export.sh docker-db-import.sh docker-init-db.sh

# Check container permissions
docker exec nu-aura-postgres ls -la /docker-entrypoint-initdb.d/
```

### Issue 3: Database Already Exists

```bash
# Drop existing database
docker exec nu-aura-postgres psql -U postgres -c "DROP DATABASE IF EXISTS hrms_db;"

# Re-import
./docker-db-import.sh backup.sql
```

### Issue 4: Out of Disk Space

```bash
# Check Docker disk usage
docker system df

# Clean up unused images
docker image prune -a

# Clean up unused volumes
docker volume prune

# Clean up build cache
docker builder prune
```

### Issue 5: Import Hangs/Timeout

```bash
# Increase Docker resources (Docker Desktop)
# Settings → Resources → Advanced → Memory (increase to 4GB+)

# Or use compressed import (faster)
./docker-db-export.sh  # Creates .sql.gz automatically
./docker-db-import.sh backup.sql.gz
```

---

## 📊 Performance Tips

### Large Database Import (>1GB)

```bash
# Use custom format with compression
docker exec nu-aura-postgres pg_dump \
  -U postgres -d hrms_db \
  -F custom -Z 9 \
  -f /tmp/backup.dump

docker cp nu-aura-postgres:/tmp/backup.dump ./backup.dump

# Restore with parallel jobs (4 cores)
docker cp backup.dump nu-aura-postgres:/tmp/
docker exec nu-aura-postgres pg_restore \
  -U postgres -d hrms_db \
  --clean --if-exists \
  -j 4 \
  /tmp/backup.dump
```

### Network-Optimized Transfer

```bash
# Pipe directly over SSH (no intermediate file)
docker exec -t source-postgres pg_dump -U postgres -d hrms_db | \
ssh user@target "docker exec -i target-postgres psql -U postgres -d postgres"
```

---

## 🔐 Security Best Practices

### Encrypt Backup Files

```bash
# Export and encrypt
docker exec -t nu-aura-postgres pg_dump -U postgres -d hrms_db | \
gpg -c > backup.sql.gpg

# Decrypt and import
gpg -d backup.sql.gpg | \
docker exec -i nu-aura-postgres psql -U postgres -d postgres
```

### Use Docker Secrets

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:14-alpine
    secrets:
      - postgres_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password

secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
```

---

## 📅 Automated Backups

### Daily Backup Cron Job

```bash
# Add to crontab: crontab -e
0 2 * * * /path/to/nu-aura/scripts/docker-db-export.sh

# Keep last 7 days
0 3 * * * find /path/to/nu-aura/scripts/db-backups -name "*.sql" -mtime +7 -delete
```

### Backup on Container Stop

Create `docker-compose.override.yml`:

```yaml
services:
  postgres:
    labels:
      - "com.docker.compose.on-stop=/path/to/scripts/docker-db-export.sh"
```

---

## 🎯 Docker Compose Full Example

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: nu-aura-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
      # Enable auto_explain for performance debugging
      POSTGRES_INITDB_ARGS: "-E UTF8 --locale=en_US.utf8"
    ports:
      - "5432:5432"
    volumes:
      # Data persistence
      - postgres_data:/var/lib/postgresql/data
      # Init script for auto-restore
      - ./scripts/docker-init-db.sh:/docker-entrypoint-initdb.d/01-init-db.sh:ro
      # Optional: Auto-restore backup
      - ./scripts/db-backups/init-backup.sql:/docker-entrypoint-initdb.d/init-backup.sql:ro
      # Scheduled backups
      - ./scripts/db-backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d hrms_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - nu-aura-network

  backend:
    build: ./backend
    container_name: nu-aura-backend
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/hrms_db
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: postgres123
    ports:
      - "8080:8080"
    networks:
      - nu-aura-network

networks:
  nu-aura-network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
```

---

## 📞 Support

### View Logs

```bash
# All services
docker-compose logs

# PostgreSQL only
docker-compose logs postgres

# Follow logs
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 postgres
```

### Debug Connection

```bash
# Check port mapping
docker port nu-aura-postgres

# Test connection from host
psql -h localhost -p 5432 -U postgres -d hrms_db

# Test connection from another container
docker exec backend psql -h postgres -p 5432 -U postgres -d hrms_db
```

---

**Last Updated:** 2026-03-18
**Docker Version:** 20.10+
**PostgreSQL Version:** 14-alpine
