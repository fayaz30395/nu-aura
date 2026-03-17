# Docker Export & Migration Guide

Complete guide for exporting and migrating Docker containers, images, and volumes.

---

## 📦 Export Options Comparison

| Method | Speed | Size | Includes | Best For |
|--------|-------|------|----------|----------|
| **Database SQL** | Fast | Small (1 MB) | Data only | Simple migrations |
| **Docker Volume** | Medium | Medium (100 MB) | Data + config | Quick migrations |
| **Full Docker** | Slow | Large (500 MB+) | Everything | Complete system copy |

---

## 🚀 Method 1: Database Export (Recommended)

**Already completed!** ✅

```bash
# Export completed in previous step
ls -lh db-backups/nuaura_migration_*.sql
```

**Pros:**
- Smallest file size (~1 MB)
- Works across different Docker setups
- Easy to inspect/modify
- Platform independent

**Use this when:**
- Migrating between different Docker configurations
- Target has different PostgreSQL version
- Need human-readable backup

---

## 🐳 Method 2: Docker Volume Export (Fast)

**Best for:** Quick migration with exact data copy

### Export

```bash
# Option A: Use script
chmod +x docker-volume-export.sh
./docker-volume-export.sh

# Option B: Manual command
docker run --rm \
  -v postgres-volume:/source:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-volume-backup.tar.gz -C /source .
```

### Import

```bash
# 1. Copy file to target
scp postgres-volume-backup.tar.gz user@target:/tmp/

# 2. On target, stop containers
docker-compose stop postgres

# 3. Create volume
docker volume create nu-aura-postgres-data

# 4. Import
docker run --rm \
  -v nu-aura-postgres-data:/target \
  -v /tmp:/backup \
  alpine tar xzf /backup/postgres-volume-backup.tar.gz -C /target

# 5. Start containers
docker-compose up -d postgres
```

**Pros:**
- Preserves all PostgreSQL configuration
- Faster than SQL import for large databases
- Exact binary copy

**Cons:**
- Larger file size
- PostgreSQL version must match
- Less portable

---

## 📦 Method 3: Complete Docker Export (Full System)

**Best for:** Moving entire stack to new server

### Export Everything

```bash
chmod +x docker-full-export.sh
./docker-full-export.sh
```

**This exports:**
- PostgreSQL container
- PostgreSQL image
- PostgreSQL data volume
- Backend container (if running)
- Backend image (if exists)
- docker-compose.yml
- Auto-import script

**Output:** Single `.tar.gz` file (~500 MB)

### Import on Target System

```bash
# 1. Transfer archive
scp docker-exports/nuaura_docker_*.tar.gz user@target:/tmp/

# 2. Extract
cd /tmp
tar xzf nuaura_docker_*.tar.gz
cd nuaura_docker_*/

# 3. Run import script
./import.sh
```

**The import script automatically:**
- Loads Docker images
- Creates volumes
- Imports data
- Starts containers via docker-compose

---

## 🔄 Migration Scenarios

### Scenario 1: Same Docker Setup (Dev → Staging)

**Use:** Docker Volume Export

```bash
# Source
./docker-volume-export.sh

# Target (same docker-compose.yml)
scp postgres-volume-*.tar.gz staging:/tmp/
ssh staging "
  docker-compose stop postgres &&
  docker volume create nu-aura-postgres-data &&
  docker run --rm -v nu-aura-postgres-data:/target -v /tmp:/backup alpine tar xzf /backup/postgres-volume-*.tar.gz -C /target &&
  docker-compose up -d
"
```

### Scenario 2: Different Docker Setup

**Use:** Database SQL Export

```bash
# Already done - use the SQL backup
scp db-backups/nuaura_migration_*.sql target:/tmp/
ssh target "docker exec -i postgres psql -U hrms -d postgres < /tmp/nuaura_migration_*.sql"
```

### Scenario 3: Complete System Migration

**Use:** Full Docker Export

```bash
# Source
./docker-full-export.sh

# Target
scp docker-exports/nuaura_docker_*.tar.gz target:/tmp/
ssh target "cd /tmp && tar xzf nuaura_docker_*.tar.gz && cd nuaura_docker_*/ && ./import.sh"
```

### Scenario 4: Docker → Cloud (AWS/GCP/Azure)

**Use:** Database SQL Export + Docker Compose

```bash
# 1. Export database
./docker-db-export.sh

# 2. Push images to registry
docker tag postgres:16-alpine myregistry/nu-aura-postgres:latest
docker push myregistry/nu-aura-postgres:latest

# 3. On cloud, pull images and import data
docker pull myregistry/nu-aura-postgres:latest
docker-compose up -d postgres
docker exec -i postgres psql -U hrms -d postgres < backup.sql
```

---

## 📊 Size Comparison

Example for NU-AURA with 9 users, 9 employees:

| Method | File Size | Transfer Time (1 Gbps) |
|--------|-----------|------------------------|
| SQL Backup | 833 KB | < 1 second |
| Compressed SQL | 123 KB | < 1 second |
| Docker Volume | ~100 MB | 1 second |
| Full Docker Export | ~500 MB | 4 seconds |

---

## 🛠️ Advanced Export Options

### Export Specific Containers

```bash
# List all containers
docker ps -a

# Export specific container
docker export container-name | gzip > container-backup.tar.gz

# Import
gunzip -c container-backup.tar.gz | docker import - myimage:latest
```

### Export Images Only

```bash
# Save single image
docker save postgres:16-alpine | gzip > postgres-image.tar.gz

# Save multiple images
docker save postgres:16-alpine openjdk:23 | gzip > images.tar.gz

# Load images on target
gunzip -c images.tar.gz | docker load
```

### Export All Volumes

```bash
# List all volumes
docker volume ls

# Export all volumes
for volume in $(docker volume ls -q); do
    docker run --rm \
        -v "$volume":/source:ro \
        -v $(pwd):/backup \
        alpine tar czf "/backup/${volume}.tar.gz" -C /source .
done
```

---

## 🔍 Verification After Import

### Check Volume

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect nu-aura-postgres-data

# Check volume size
docker system df -v | grep nu-aura-postgres-data
```

### Check Container

```bash
# Check if container is running
docker ps | grep postgres

# Check container logs
docker logs postgres --tail 50

# Connect to database
docker exec -it postgres psql -U hrms -d hrms_dev
```

### Verify Data

```bash
# Check row counts
docker exec postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM users;"

# Check database size
docker exec postgres psql -U hrms -d hrms_dev -c "SELECT pg_size_pretty(pg_database_size('hrms_dev'));"
```

---

## 🚨 Troubleshooting

### Issue: Volume Import Failed

```bash
# Check if volume exists
docker volume ls

# Remove and recreate
docker volume rm nu-aura-postgres-data
docker volume create nu-aura-postgres-data

# Re-import
docker run --rm -v nu-aura-postgres-data:/target -v /tmp:/backup alpine tar xzf /backup/backup.tar.gz -C /target
```

### Issue: Image Load Failed

```bash
# Verify tar file is not corrupted
gunzip -t image.tar.gz

# Try loading with verbose output
gunzip -c image.tar.gz | docker load -q

# Check available disk space
docker system df
```

### Issue: Container Won't Start

```bash
# Check container logs
docker logs postgres

# Check if port is already in use
sudo lsof -i :5432

# Try starting with different port
docker run -p 5433:5432 postgres:16-alpine
```

---

## 📋 Export Checklist

Before exporting:

- [ ] Stop application to ensure data consistency
- [ ] Check Docker disk space: `docker system df`
- [ ] Verify all containers are healthy: `docker ps`
- [ ] Test database connection
- [ ] Document environment variables
- [ ] Note PostgreSQL version: `docker exec postgres psql --version`

After export:

- [ ] Verify file integrity: `tar tzf backup.tar.gz > /dev/null`
- [ ] Check file size is reasonable
- [ ] Test extraction on same system (optional)
- [ ] Document export timestamp
- [ ] Store in secure location

---

## 🔐 Security Best Practices

### Encrypt Backups

```bash
# Encrypt with GPG
gpg -c docker-backup.tar.gz

# Decrypt on target
gpg docker-backup.tar.gz.gpg
```

### Secure Transfer

```bash
# Use SCP with compression
scp -C docker-backup.tar.gz user@target:/tmp/

# Or use rsync with encryption
rsync -avz -e ssh docker-backup.tar.gz user@target:/tmp/
```

### Clean Up Sensitive Data

```bash
# Remove password from docker-compose.yml before export
sed -i 's/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${DB_PASSWORD}/' docker-compose.yml

# Use .env file instead
echo "DB_PASSWORD=your_password" > .env
echo ".env" >> .gitignore
```

---

## 📞 Quick Reference Commands

### Export

```bash
# Database only (SQL)
docker exec -t postgres pg_dump -U hrms -d hrms_dev > backup.sql

# Volume only
docker run --rm -v volume:/source:ro -v $(pwd):/backup alpine tar czf /backup/volume.tar.gz -C /source .

# Full system
./docker-full-export.sh
```

### Import

```bash
# Database SQL
docker exec -i postgres psql -U hrms -d postgres < backup.sql

# Volume
docker run --rm -v volume:/target -v /tmp:/backup alpine tar xzf /backup/volume.tar.gz -C /target

# Full system
./import.sh
```

---

**Last Updated:** 2026-03-18
**Docker Version:** 20.10+
**PostgreSQL Version:** 16.13
