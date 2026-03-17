# NU-AURA Database Migration Scripts

Complete toolkit for migrating NU-AURA PostgreSQL database between systems.

---

## 📁 Files in This Directory

| File | Purpose | Usage |
|------|---------|-------|
| `db-export.sh` | Automated database export script | `./db-export.sh` |
| `db-import.sh` | Automated database import script | `./db-import.sh backup.sql` |
| `db-migrate-manual.sql` | Manual SQL migration script | `psql -f db-migrate-manual.sql` |
| `DB_MIGRATION_GUIDE.md` | Comprehensive migration guide | Read for detailed instructions |
| `QUICK_MIGRATION_COMMANDS.md` | One-line commands reference | Quick copy-paste commands |

---

## 🚀 Quick Start (30 seconds)

### For Humans:

```bash
# On source system
cd /path/to/nu-aura/scripts
./db-export.sh

# Copy backup file to target system
scp db-backups/nuaura_full_backup_*.sql user@target:/tmp/

# On target system
./db-import.sh /tmp/nuaura_full_backup_*.sql
```

### For AI/Claude/Automated Systems:

```bash
# ONE-LINE EXPORT
pg_dump -h localhost -U postgres -d hrms_db --clean --if-exists -f backup.sql

# ONE-LINE IMPORT
psql -h localhost -U postgres -d postgres -f backup.sql
```

---

## 📚 Documentation

### 1. **DB_MIGRATION_GUIDE.md** - Full Guide
- Prerequisites and requirements
- 3 migration methods (automated, manual, docker)
- Verification procedures
- Troubleshooting solutions
- Rollback procedures
- **Read this for production migrations**

### 2. **QUICK_MIGRATION_COMMANDS.md** - Quick Reference
- Copy-paste ready commands
- One-line migration
- Docker-based migration
- Emergency rollback
- **Read this for quick migrations**

### 3. **db-migrate-manual.sql** - SQL Scripts
- Manual SQL commands
- Export/import reference
- Post-migration verification queries
- Sequence reset scripts
- **Use this for manual migrations**

---

## 🎯 Choose Your Migration Method

### Method 1: Automated Scripts (Recommended for Production)

**Best for:**
- Production migrations
- Team use
- First-time migrations
- Non-technical users

**Steps:**
1. Run `./db-export.sh` on source
2. Transfer files to target
3. Run `./db-import.sh backup.sql` on target
4. Verify with built-in checks

### Method 2: One-Line Commands (Fastest)

**Best for:**
- Development environments
- Quick backups
- Experienced DBAs
- CI/CD pipelines

**Steps:**
1. Copy command from `QUICK_MIGRATION_COMMANDS.md`
2. Paste and run
3. Done

### Method 3: Docker-Based (Container Environments)

**Best for:**
- Docker/Kubernetes deployments
- Containerized environments
- Cloud migrations
- Dev containers

**Steps:**
1. Use docker exec commands
2. Export from container
3. Import to container
4. Verify

---

## ✅ Post-Migration Checklist

After migration, verify these items:

```bash
# 1. Check table count
psql -U postgres -d hrms_db -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"

# 2. Check row counts
psql -U postgres -d hrms_db -c "SELECT 'users' AS tbl, COUNT(*) FROM users UNION ALL SELECT 'employees', COUNT(*) FROM employees;"

# 3. Test application connection
cd ../backend
./start-backend.sh

# 4. Check logs
tail -f ../backend/logs/application.log
```

---

## 🛠️ Troubleshooting

### Common Issues:

| Issue | Solution File | Section |
|-------|--------------|---------|
| Permission denied | DB_MIGRATION_GUIDE.md | Troubleshooting → Issue 1 |
| Database exists | QUICK_MIGRATION_COMMANDS.md | Troubleshooting One-Liners |
| Connection refused | DB_MIGRATION_GUIDE.md | Troubleshooting → Issue 4 |
| Sequence errors | QUICK_MIGRATION_COMMANDS.md | Sequence Reset |
| Timeout | DB_MIGRATION_GUIDE.md | Troubleshooting → Issue 5 |

### Get Help:

1. Check error logs: `tail -f /var/log/postgresql/postgresql-14-main.log`
2. Review DB_MIGRATION_GUIDE.md troubleshooting section
3. Run verification queries from db-migrate-manual.sql

---

## 🔐 Security Notes

### Passwords in Scripts

The scripts contain database passwords. **Do not commit to Git!**

```bash
# Add to .gitignore
echo "scripts/db-backups/" >> ../.gitignore
echo "scripts/*.sql" >> ../.gitignore
```

### Secure Password Handling

```bash
# Option 1: Environment variable
export PGPASSWORD="your_password"
./db-export.sh
unset PGPASSWORD

# Option 2: .pgpass file
echo "localhost:5432:hrms_db:postgres:your_password" > ~/.pgpass
chmod 600 ~/.pgpass
```

### Backup File Encryption

```bash
# Encrypt backup
gpg -c nuaura_backup.sql

# Decrypt backup
gpg nuaura_backup.sql.gpg
```

---

## 📊 Database Specifications

### Current Setup (as of 2026-03-18)

- **Database:** hrms_db
- **PostgreSQL Version:** 14+
- **Encoding:** UTF-8
- **Locale:** en_US.utf8
- **Extensions:** uuid-ossp, pgcrypto
- **Tables:** ~80+ tables
- **Size:** Varies by tenant

### Key Tables

| Table | Purpose | Approximate Rows |
|-------|---------|-----------------|
| tenants | Multi-tenant data | 1-100 |
| users | User accounts | 100-10,000 |
| employees | Employee records | 100-10,000 |
| departments | Organizational structure | 10-100 |
| roles | RBAC roles | 5-50 |
| permissions | RBAC permissions | 100-500 |
| leave_requests | Leave management | 1,000-100,000 |
| attendance_records | Attendance tracking | 10,000-1,000,000 |

---

## 🔄 Migration Scenarios

### Scenario 1: Development → Staging

```bash
# Export from dev
./db-export.sh

# Import to staging
./db-import.sh backup.sql

# Update application config
# Edit: backend/src/main/resources/application-staging.yml
```

### Scenario 2: Production → Backup Server

```bash
# Scheduled backup (add to cron)
0 2 * * * /path/to/scripts/db-export.sh

# Copy to backup server
rsync -avz db-backups/ backup-server:/backups/nuaura/
```

### Scenario 3: On-Premise → Cloud

```bash
# Export compressed
pg_dump -h localhost -U postgres -d hrms_db -F custom -f backup.dump

# Upload to cloud
aws s3 cp backup.dump s3://mybucket/backups/

# Download on cloud VM
aws s3 cp s3://mybucket/backups/backup.dump .

# Import
pg_restore -h cloud-db.rds.amazonaws.com -U postgres -d hrms_db backup.dump
```

### Scenario 4: Docker → Docker

```bash
# Export from source container
docker exec source-postgres pg_dump -U postgres -d hrms_db > backup.sql

# Import to target container
docker exec -i target-postgres psql -U postgres -d postgres < backup.sql
```

---

## 📅 Maintenance

### Daily Backups

```bash
# Add to crontab: crontab -e
0 2 * * * /path/to/nu-aura/scripts/db-export.sh
```

### Weekly Full Backups

```bash
# Add to crontab: crontab -e
0 1 * * 0 /path/to/nu-aura/scripts/db-export.sh && mv db-backups/nuaura_full_backup_*.sql db-backups/weekly/
```

### Backup Retention

```bash
# Keep last 7 days of backups
find db-backups/ -name "nuaura_full_backup_*.sql" -mtime +7 -delete
```

---

## 📞 Support

### Log Locations

- **PostgreSQL Logs:** `/var/log/postgresql/postgresql-14-main.log`
- **Application Logs:** `backend/logs/application.log`
- **Docker Logs:** `docker-compose logs postgres`

### Useful Commands

```bash
# Check PostgreSQL status
systemctl status postgresql  # Linux
brew services list  # macOS

# List databases
psql -U postgres -l

# Connect to database
psql -U postgres -d hrms_db

# Show database size
psql -U postgres -d hrms_db -c "SELECT pg_size_pretty(pg_database_size('hrms_db'));"
```

---

## 🎓 Learning Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pg_dump Manual](https://www.postgresql.org/docs/current/app-pgdump.html)
- [pg_restore Manual](https://www.postgresql.org/docs/current/app-pgrestore.html)

---

## ⚠️ Important Notes

1. **Always test migration on staging before production**
2. **Keep source database backup for at least 30 days after migration**
3. **Verify row counts match before decommissioning source**
4. **Update application configuration after migration**
5. **Test all critical application features post-migration**

---

**Last Updated:** 2026-03-18
**Version:** 1.0.0
**Maintained by:** NU-AURA Team
