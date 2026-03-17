# Instructions for Target System

**You've received NU-AURA database migration files. Here's what to do:**

---

## 📋 Step 1: What You Received

You should have one of these packages:

- **SQL Package** (db-backups folder) - Most common
- **Docker Volume Package** (docker-exports folder)
- **Complete Package** (both folders + scripts)

---

## 🤖 Step 2: For AI Assistants (Claude, ChatGPT, etc.)

**Tell your AI:**

```
I received NU-AURA database migration files.

Please read these files in this order:

1. START_HERE.md - Quick overview
2. EXPORT_OPTIONS_SUMMARY.md - What package I have
3. DB_MIGRATION_GUIDE.md or DOCKER_EXPORT_GUIDE.md - Detailed steps

Then help me import the database to my system.

My system info:
- OS: [Linux/macOS/Windows]
- Docker installed: [Yes/No]
- PostgreSQL version: [version or "don't know"]
- Files I have: [list the .sql or .tar.gz files you see]
```

---

## 👤 Step 3: For Human Administrators

**Choose your path:**

### Path A: I have a .sql or .sql.gz file (EASIEST)

```bash
# 1. Find the file
ls -lh *.sql*

# 2. If compressed, extract it
gunzip nuaura_migration_*.sql.gz

# 3. Import to Docker PostgreSQL
docker exec -i postgres psql -U hrms -d postgres < nuaura_migration_*.sql

# 4. Verify
docker exec postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM users;"
# Should show: 9
```

### Path B: I have a postgres-volume-*.tar.gz file

```bash
# 1. Stop PostgreSQL
docker-compose stop postgres

# 2. Create volume
docker volume create nu-aura-postgres-data

# 3. Import volume data
docker run --rm \
  -v nu-aura-postgres-data:/target \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-volume-*.tar.gz -C /target

# 4. Start PostgreSQL
docker-compose up -d postgres

# 5. Verify
docker exec postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM users;"
# Should show: 9
```

### Path C: I have an auto-import.sh script

```bash
# 1. Make executable
chmod +x auto-import.sh

# 2. Run it
./auto-import.sh

# It will guide you through the import
```

---

## 🔍 Step 4: Verify Import Success

After import, check these:

```bash
# Should return 9
docker exec postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM users;"

# Should return 9
docker exec postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM employees;"

# Should return 44
docker exec postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM permissions;"

# Should return 275
docker exec postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
```

**All counts match?** ✅ Success!

---

## 🆘 Step 5: If Something Goes Wrong

### Error: "database already exists"

```bash
docker exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS hrms_dev;"
# Then re-run import
```

### Error: "role hrms does not exist"

```bash
docker exec postgres psql -U postgres -c "CREATE USER hrms WITH PASSWORD 'password' CREATEDB;"
# Then re-run import
```

### Error: "permission denied"

```bash
docker exec postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE hrms_dev TO hrms;"
docker exec postgres psql -U postgres -d hrms_dev -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hrms;"
# Then re-run import
```

---

## 📞 Step 6: Get More Help

If you have an AI assistant, share these files with it:

1. **START_HERE.md** - Main guide
2. **MIGRATION_INSTRUCTIONS.md** - Detailed steps
3. **QUICK_IMPORT.txt** - One-line commands

Tell your AI:

```
I'm trying to import NU-AURA database.
I have [describe your files].
My error is: [paste error message].
Please help me troubleshoot using the guides provided.
```

---

## ✅ Success Checklist

- [ ] Files transferred to target system
- [ ] Docker/PostgreSQL running
- [ ] Import command executed without errors
- [ ] User count verified (9 users)
- [ ] Employee count verified (9 employees)
- [ ] Backend application configuration updated
- [ ] Backend application started successfully
- [ ] Can login to application

---

## 🎯 Quick Reference

| I Have | Use This Command |
|--------|------------------|
| `.sql.gz` file | `gunzip *.sql.gz && docker exec -i postgres psql -U hrms -d postgres < *.sql` |
| `.sql` file | `docker exec -i postgres psql -U hrms -d postgres < *.sql` |
| `postgres-volume-*.tar.gz` | See "Path B" above |
| `auto-import.sh` | `chmod +x auto-import.sh && ./auto-import.sh` |

---

## 📧 Package Contents Summary

This migration package includes:

- ✅ Complete database schema (275 tables)
- ✅ All data (9 users, 9 employees, 44 permissions)
- ✅ Sequences and indexes
- ✅ Foreign key constraints
- ✅ PostgreSQL extensions
- ✅ Import scripts and documentation

**Database:** hrms_dev
**User:** hrms
**Size:** 28 MB

---

**Need human support?** Share the error logs from:
```bash
docker logs postgres --tail 100
```

**Questions?** Read the detailed guides included in this package.

---

**Last Updated:** 2026-03-18
**Source System:** macOS Docker
**PostgreSQL Version:** 16.13
