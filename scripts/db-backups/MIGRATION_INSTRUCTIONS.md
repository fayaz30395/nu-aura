# NU-AURA Database Migration Package

**Migration Date:** 2026-03-18 02:09 AM
**Source System:** macOS (Docker)
**Database:** hrms_dev
**PostgreSQL Version:** 16.13

---

## 📦 Backup Files

| File | Size | Purpose |
|------|------|---------|
| `nuaura_migration_20260318_020943.sql` | 833 KB | Plain SQL backup (use this) |
| `nuaura_migration_20260318_020943.sql.gz` | 123 KB | Compressed backup (faster transfer) |

---

## 📊 Database Statistics

| Table | Row Count |
|-------|-----------|
| Tenants | 1 |
| Users | 9 |
| Employees | 9 |
| Departments | 0 |
| Roles | 4 |
| Permissions | 44 |
| Wiki Pages | 0 |
| Blog Posts | 0 |

**Total Tables:** ~80 tables
**Database Size:** ~833 KB (schema + data)

---

## 🚀 Import on Target System

### Option 1: Docker Environment (Recommended)

```bash
# 1. Copy backup file to target system
scp nuaura_migration_20260318_020943.sql.gz user@target-server:/tmp/

# 2. On target server, extract if compressed
gunzip /tmp/nuaura_migration_20260318_020943.sql.gz

# 3. Import into Docker container
docker exec -i postgres-container psql -U hrms -d postgres < /tmp/nuaura_migration_20260318_020943.sql

# 4. Verify import
docker exec postgres-container psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM users;"
# Expected: 9 rows
```

### Option 2: Native PostgreSQL

```bash
# 1. Copy backup file to target system
scp nuaura_migration_20260318_020943.sql user@target-server:/tmp/

# 2. Import into PostgreSQL
psql -U hrms -d postgres -f /tmp/nuaura_migration_20260318_020943.sql

# 3. Verify import
psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM users;"
# Expected: 9 rows
```

### Option 3: One-Line Import (Docker)

```bash
# If backup file is on local machine, pipe directly
cat nuaura_migration_20260318_020943.sql | docker exec -i postgres-container psql -U hrms -d postgres
```

---

## ✅ Post-Import Verification

After importing, run these verification queries:

```sql
-- Connect to database
psql -U hrms -d hrms_dev
-- OR for Docker:
docker exec -it postgres-container psql -U hrms -d hrms_dev

-- Verify row counts match source
SELECT
    'Tenants' AS table_name, COUNT(*) AS rows FROM tenants
UNION ALL SELECT 'Users', COUNT(*) FROM users
UNION ALL SELECT 'Employees', COUNT(*) FROM employees
UNION ALL SELECT 'Departments', COUNT(*) FROM departments
UNION ALL SELECT 'Roles', COUNT(*) FROM roles
UNION ALL SELECT 'Permissions', COUNT(*) FROM permissions;

-- Expected output should match:
-- Tenants: 1, Users: 9, Employees: 9, Departments: 0, Roles: 4, Permissions: 44

-- Check table count
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Expected: ~80 tables

-- Check database size
SELECT pg_size_pretty(pg_database_size('hrms_dev'));
```

---

## 🔧 Target System Configuration

### Update Backend Configuration

After importing, update `backend/src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/hrms_dev
    username: hrms
    password: ${DB_PASSWORD}  # Set in environment
    driver-class-name: org.postgresql.Driver

  jpa:
    hibernate:
      ddl-auto: validate  # Don't auto-create, use existing schema
    show-sql: false
```

### Environment Variables

```bash
# Set database password
export DB_PASSWORD="your_password_here"

# Restart backend
cd backend
./start-backend.sh
```

---

## 🛠️ Troubleshooting

### Issue: "database already exists"

```bash
# Drop existing database
docker exec postgres-container psql -U hrms -d postgres -c "DROP DATABASE IF EXISTS hrms_dev;"

# Re-import
docker exec -i postgres-container psql -U hrms -d postgres < backup.sql
```

### Issue: "role hrms does not exist"

```bash
# Create user first
docker exec postgres-container psql -U postgres -c "CREATE USER hrms WITH PASSWORD 'password';"
docker exec postgres-container psql -U postgres -c "ALTER USER hrms CREATEDB;"

# Re-import
docker exec -i postgres-container psql -U hrms -d postgres < backup.sql
```

### Issue: Permission denied

```bash
# Grant privileges
docker exec postgres-container psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE hrms_dev TO hrms;"
docker exec postgres-container psql -U postgres -d hrms_dev -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hrms;"
```

---

## 📋 Migration Checklist

On Target System:

- [ ] PostgreSQL 14+ or 16+ installed
- [ ] User `hrms` created with CREATEDB privileges
- [ ] Backup file transferred successfully
- [ ] Database imported without errors
- [ ] Row counts verified (9 users, 9 employees, 44 permissions)
- [ ] Table count verified (~80 tables)
- [ ] Backend configuration updated
- [ ] Backend application started successfully
- [ ] Test login: http://localhost:8080/api/v1/auth/login
- [ ] Verify data access: http://localhost:8080/api/v1/employees

---

## 🔐 Database Credentials

**Database Name:** hrms_dev
**Username:** hrms
**Password:** [Set in environment variable]
**Port:** 5432

---

## 📞 Need Help?

1. Check import logs for errors
2. Verify PostgreSQL version: `psql --version` (should be 14+)
3. Check container status: `docker ps`
4. Review backend logs: `tail -f backend/logs/application.log`

---

## 🎯 Quick Start on New System

```bash
# 1. Start PostgreSQL (if using Docker Compose)
docker-compose up -d postgres

# 2. Import database
docker exec -i postgres psql -U hrms -d postgres < nuaura_migration_20260318_020943.sql

# 3. Verify
docker exec postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM users;"

# 4. Start backend
cd backend && ./start-backend.sh

# 5. Test
curl http://localhost:8080/api/v1/auth/health
```

Done! 🎉

---

**Export Completed:** 2026-03-18 02:09:43
**File Integrity:** ✓ Verified
**Ready for Migration:** ✓ Yes
