# 🚀 NU-AURA Migration - START HERE

**Quick guide to migrate your NU-AURA database to another system.**

---

## ✅ What's Already Done

All export packages are ready! Choose the one that fits your needs:

### Option 1: SQL Database Export (RECOMMENDED) ⭐

**Best for:** Most migrations, universal compatibility

**Files:**
- `db-backups/nuaura_migration_20260318_020943.sql` (833 KB)
- `db-backups/nuaura_migration_20260318_020943.sql.gz` (123 KB) ← Use this

**On target system:**
```bash
# Copy file
scp db-backups/nuaura_migration_*.sql.gz user@target:/tmp/

# Import
ssh user@target "
  gunzip /tmp/nuaura_migration_*.sql.gz
  docker exec -i postgres psql -U hrms -d postgres < /tmp/nuaura_migration_*.sql
"
```

**OR use automated script:**
```bash
scp db-backups/auto-import.sh user@target:/tmp/
scp db-backups/nuaura_migration_*.sql user@target:/tmp/
ssh user@target "cd /tmp && chmod +x auto-import.sh && ./auto-import.sh"
```

---

### Option 2: Docker Volume Export

**Best for:** Fast Docker-to-Docker migration, same PostgreSQL version

**Files:**
- `docker-exports/postgres-volume-20260318_021425.tar.gz` (20 MB)

**On target system:**
```bash
# Copy file
scp docker-exports/postgres-volume-*.tar.gz user@target:/tmp/

# Import
ssh user@target "
  docker-compose stop postgres
  docker volume create nu-aura-postgres-data
  docker run --rm -v nu-aura-postgres-data:/target -v /tmp:/backup \
    alpine tar xzf /backup/postgres-volume-*.tar.gz -C /target
  docker-compose up -d postgres
"
```

---

### Option 3: Full Docker Export (On Demand)

**Best for:** Complete system migration with containers and images

**Create package:**
```bash
./docker-full-export.sh
```

This creates a complete package (~500 MB) with everything needed.

---

## 📊 Quick Comparison

| Method | Size | Speed | Compatibility | Recommendation |
|--------|------|-------|---------------|----------------|
| SQL Export | 123 KB | Fast | ⭐⭐⭐⭐⭐ | **Use this** |
| Volume Export | 20 MB | Faster | ⭐⭐⭐ | Docker only |
| Full Export | 500 MB | Slow | ⭐⭐⭐⭐ | Complete copy |

---

## 🎯 Choose Your Path

### Path A: I want the easiest migration (RECOMMENDED)

```bash
# 1. Copy SQL backup
scp db-backups/nuaura_migration_20260318_020943.sql.gz user@target:/tmp/

# 2. On target, import
ssh user@target "
  gunzip /tmp/nuaura_migration_*.sql.gz
  docker exec -i postgres psql -U hrms -d postgres < /tmp/nuaura_migration_*.sql
"

# 3. Verify
ssh user@target "docker exec postgres psql -U hrms -d hrms_dev -c 'SELECT COUNT(*) FROM users;'"
# Should show: 9
```

**Done!** ✅

---

### Path B: I want the fastest migration (Docker experts)

```bash
# 1. Copy volume backup
scp docker-exports/postgres-volume-20260318_021425.tar.gz user@target:/tmp/

# 2. On target, import volume
ssh user@target "
  docker-compose stop postgres
  docker volume create nu-aura-postgres-data
  docker run --rm -v nu-aura-postgres-data:/target -v /tmp:/backup \
    alpine tar xzf /backup/postgres-volume-*.tar.gz -C /target
  docker-compose up -d postgres
"
```

**Done!** ✅

---

### Path C: I want to explore options first

Read the guides:
1. `EXPORT_OPTIONS_SUMMARY.md` - Decision guide
2. `DB_MIGRATION_GUIDE.md` - Complete SQL migration guide
3. `DOCKER_EXPORT_GUIDE.md` - Docker migration guide

---

## 📋 What's Included in Exports

| Item | SQL Export | Volume Export | Full Export |
|------|------------|---------------|-------------|
| Database schema | ✅ | ✅ | ✅ |
| All data | ✅ | ✅ | ✅ |
| Users (9) | ✅ | ✅ | ✅ |
| Employees (9) | ✅ | ✅ | ✅ |
| Permissions (44) | ✅ | ✅ | ✅ |
| PostgreSQL config | ❌ | ✅ | ✅ |
| Docker images | ❌ | ❌ | ✅ |
| docker-compose.yml | ❌ | ❌ | ✅ |

---

## ✅ Post-Import Verification

After importing, verify data:

```bash
# Check users
docker exec postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM users;"
# Expected: 9

# Check employees
docker exec postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM employees;"
# Expected: 9

# Check tables
docker exec postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
# Expected: 275
```

---

## 🛠️ Troubleshooting

### Issue: Import failed

**Check logs:**
```bash
docker logs postgres
```

**Common fixes:**
```bash
# 1. Database already exists
docker exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS hrms_dev;"

# 2. User doesn't exist
docker exec postgres psql -U postgres -c "CREATE USER hrms WITH PASSWORD 'password' CREATEDB;"

# 3. Permission denied
docker exec postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE hrms_dev TO hrms;"
```

---

## 📞 Need Help?

1. Check `QUICK_IMPORT.txt` for one-line commands
2. Read `MIGRATION_INSTRUCTIONS.md` for detailed steps
3. Review `DOCKER_EXPORT_GUIDE.md` for Docker specifics

---

## 🎉 Quick Start Summary

**Recommended for most users:**

```bash
# Source system (already done):
ls -lh db-backups/nuaura_migration_*.sql.gz

# Target system:
scp db-backups/nuaura_migration_*.sql.gz target:/tmp/
ssh target "gunzip /tmp/*.sql.gz && docker exec -i postgres psql -U hrms -d postgres < /tmp/*.sql"
```

**Verify:**
```bash
ssh target "docker exec postgres psql -U hrms -d hrms_dev -c 'SELECT COUNT(*) FROM users;'"
```

**Expected result:** `9 users` ✅

---

**That's it! Choose your path above and start migrating.** 🚀

---

**Export completed:** 2026-03-18 02:14 AM
**Package location:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/scripts/`
**Total package size:** ~21 MB (all methods)
