# NU-AURA Database Migration Guide

Complete guide for migrating the NU-AURA PostgreSQL database to another system.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Method 1: Automated Shell Scripts](#method-1-automated-shell-scripts)
4. [Method 2: Manual PostgreSQL Commands](#method-2-manual-postgresql-commands)
5. [Method 3: Docker-based Migration](#method-3-docker-based-migration)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Rollback](#rollback)

---

## Prerequisites

### Source System Requirements
- PostgreSQL 14+ installed
- Database `hrms_db` running and accessible
- `pg_dump` utility available
- Sufficient disk space for backup files

### Target System Requirements
- PostgreSQL 14+ installed
- `psql` and `pg_restore` utilities available
- Network access (if remote migration)
- Same or newer PostgreSQL version

---

## Quick Start

### On Source System (where your data currently is):

```bash
# 1. Navigate to scripts directory
cd /path/to/nu-aura/scripts

# 2. Make scripts executable
chmod +x db-export.sh db-import.sh

# 3. Export database
./db-export.sh
```

This creates 3 backup files in `db-backups/`:
- `nuaura_full_backup_TIMESTAMP.sql` - Complete backup (use this for migration)
- `nuaura_schema_TIMESTAMP.sql` - Schema only
- `nuaura_data_TIMESTAMP.sql` - Data only

### On Target System (new server):

```bash
# 1. Copy the backup file to target system
scp db-backups/nuaura_full_backup_*.sql user@target-server:/tmp/

# 2. On target system, import the database
./db-import.sh /tmp/nuaura_full_backup_*.sql
```

---

## Method 1: Automated Shell Scripts

### 1.1 Export Database (Source System)

```bash
cd /path/to/nu-aura/scripts
./db-export.sh
```

**What this script does:**
- Connects to PostgreSQL database `hrms_db`
- Creates 3 backup files with timestamp
- Includes all schemas, tables, data, indexes, and constraints
- Saves to `db-backups/` directory

**Configuration (edit if needed):**
```bash
# In db-export.sh, modify these variables:
DB_HOST="localhost"      # Database host
DB_PORT="5432"          # Database port
DB_NAME="hrms_db"       # Database name
DB_USER="postgres"      # Database user
DB_PASSWORD="postgres123" # Database password
```

### 1.2 Import Database (Target System)

```bash
./db-import.sh db-backups/nuaura_full_backup_20260318_020000.sql
```

**What this script does:**
- Prompts for confirmation (will drop existing database)
- Imports schema and data
- Verifies table count
- Shows import summary

**Configuration (edit if needed):**
```bash
# In db-import.sh, modify these variables:
DB_HOST="localhost"      # Target database host
DB_PORT="5432"          # Target database port
DB_USER="postgres"      # Target database user
DB_PASSWORD="postgres123" # Target database password
```

---

## Method 2: Manual PostgreSQL Commands

If you can't use shell scripts (Windows, restricted environments), use these commands directly.

### 2.1 Export Commands (Run on Source System)

```bash
# Option A: Full backup (RECOMMENDED)
pg_dump -h localhost \
        -p 5432 \
        -U postgres \
        -d hrms_db \
        --clean \
        --if-exists \
        --create \
        -F plain \
        -f nuaura_full_backup.sql

# Option B: Schema only (for initial setup on new system)
pg_dump -h localhost \
        -p 5432 \
        -U postgres \
        -d hrms_db \
        --schema-only \
        --clean \
        --if-exists \
        -F plain \
        -f nuaura_schema.sql

# Option C: Data only (if schema already exists)
pg_dump -h localhost \
        -p 5432 \
        -U postgres \
        -d hrms_db \
        --data-only \
        --column-inserts \
        -F plain \
        -f nuaura_data.sql

# Option D: Specific tables only
pg_dump -h localhost \
        -p 5432 \
        -U postgres \
        -d hrms_db \
        -t users \
        -t employees \
        -t tenants \
        -t departments \
        --column-inserts \
        -F plain \
        -f nuaura_partial.sql

# Option E: Custom format (compressed, faster restore)
pg_dump -h localhost \
        -p 5432 \
        -U postgres \
        -d hrms_db \
        -F custom \
        -f nuaura_backup.dump
```

### 2.2 Import Commands (Run on Target System)

```bash
# Option A: Import full backup (RECOMMENDED)
psql -h localhost \
     -p 5432 \
     -U postgres \
     -d postgres \
     -f nuaura_full_backup.sql

# Option B: Import schema then data separately
psql -h localhost -p 5432 -U postgres -d hrms_db -f nuaura_schema.sql
psql -h localhost -p 5432 -U postgres -d hrms_db -f nuaura_data.sql

# Option C: Restore from custom format
pg_restore -h localhost \
           -p 5432 \
           -U postgres \
           -d hrms_db \
           --clean \
           --if-exists \
           -v \
           nuaura_backup.dump

# Option D: Import specific tables
psql -h localhost -p 5432 -U postgres -d hrms_db -f nuaura_partial.sql
```

### 2.3 Environment Variables (Optional)

To avoid password prompts:

```bash
# Set password in environment
export PGPASSWORD="postgres123"

# Run commands without password prompt
pg_dump -h localhost -U postgres -d hrms_db -f backup.sql

# Unset when done (security)
unset PGPASSWORD

# Alternative: Use .pgpass file
echo "localhost:5432:hrms_db:postgres:postgres123" >> ~/.pgpass
chmod 600 ~/.pgpass
```

---

## Method 3: Docker-based Migration

If using Docker/Docker Compose:

### 3.1 Export from Docker Container

```bash
# Method A: Direct dump
docker exec -t nu-aura-postgres pg_dump \
    -U postgres \
    -d hrms_db \
    --clean \
    --if-exists \
    > nuaura_backup.sql

# Method B: Using docker-compose
docker-compose exec -T postgres pg_dump \
    -U postgres \
    -d hrms_db \
    --clean \
    --if-exists \
    > nuaura_backup.sql

# Method C: Export to file inside container, then copy
docker exec nu-aura-postgres pg_dump \
    -U postgres \
    -d hrms_db \
    -f /tmp/backup.sql

docker cp nu-aura-postgres:/tmp/backup.sql ./nuaura_backup.sql
```

### 3.2 Import to Docker Container

```bash
# Method A: Direct restore
docker exec -i nu-aura-postgres psql \
    -U postgres \
    -d postgres \
    < nuaura_backup.sql

# Method B: Copy file then import
docker cp nuaura_backup.sql nu-aura-postgres:/tmp/backup.sql

docker exec nu-aura-postgres psql \
    -U postgres \
    -d postgres \
    -f /tmp/backup.sql

# Method C: Using docker-compose
cat nuaura_backup.sql | docker-compose exec -T postgres psql \
    -U postgres \
    -d postgres
```

---

## Verification

After migration, verify data integrity:

### 4.1 Connect to Database

```bash
# Local connection
psql -U postgres -d hrms_db

# Remote connection
psql -h target-server.com -p 5432 -U postgres -d hrms_db
```

### 4.2 Verification Queries

```sql
-- Check total tables
SELECT COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = 'public';

-- Check row counts for key tables
SELECT
    'tenants' AS table_name,
    COUNT(*) AS row_count
FROM tenants
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'employees', COUNT(*) FROM employees
UNION ALL
SELECT 'departments', COUNT(*) FROM departments
UNION ALL
SELECT 'roles', COUNT(*) FROM roles
UNION ALL
SELECT 'permissions', COUNT(*) FROM permissions
UNION ALL
SELECT 'leave_requests', COUNT(*) FROM leave_requests
UNION ALL
SELECT 'attendance_records', COUNT(*) FROM attendance_records;

-- Check foreign key constraints
SELECT
    tc.table_name,
    COUNT(*) AS fk_count
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_schema = 'public'
GROUP BY tc.table_name
ORDER BY tc.table_name;

-- Check indexes
SELECT
    tablename,
    COUNT(*) AS index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Check sequences (important for auto-increment columns)
SELECT
    schemaname,
    sequencename,
    last_value
FROM pg_sequences
WHERE schemaname = 'public';

-- Check database size
SELECT
    pg_size_pretty(pg_database_size('hrms_db')) AS database_size;

-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

### 4.3 Test Application Connectivity

```bash
# Update backend configuration
# Edit: backend/src/main/resources/application.yml

spring:
  datasource:
    url: jdbc:postgresql://NEW_HOST:5432/hrms_db
    username: postgres
    password: postgres123

# Restart backend
cd backend
./start-backend.sh

# Check logs for database connection
tail -f logs/application.log
```

---

## Troubleshooting

### Issue 1: Permission Denied

```bash
# Error: permission denied for database hrms_db

# Solution: Grant privileges
psql -U postgres -d postgres
GRANT ALL PRIVILEGES ON DATABASE hrms_db TO postgres;
\c hrms_db
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

### Issue 2: Database Already Exists

```bash
# Error: database "hrms_db" already exists

# Solution A: Drop and recreate
psql -U postgres -d postgres
DROP DATABASE IF EXISTS hrms_db;
# Then re-run import

# Solution B: Import with --clean flag (already included in scripts)
```

### Issue 3: Sequence Not Resetting

```bash
# Error: duplicate key value violates unique constraint

# Solution: Reset sequences manually
psql -U postgres -d hrms_db

-- Reset all sequences
DO $$
DECLARE
    rec RECORD;
    max_id BIGINT;
BEGIN
    FOR rec IN
        SELECT
            table_name,
            column_name,
            pg_get_serial_sequence(table_name, column_name) as seq_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_default LIKE 'nextval%'
    LOOP
        EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I',
                       rec.column_name, rec.table_name) INTO max_id;
        EXECUTE format('SELECT setval(%L, %s)',
                       rec.seq_name, max_id + 1);
    END LOOP;
END $$;
```

### Issue 4: Connection Refused

```bash
# Error: could not connect to server: Connection refused

# Solution: Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list  # macOS
sc query postgresql-x64-14  # Windows

# Start if stopped
sudo systemctl start postgresql  # Linux
brew services start postgresql  # macOS

# Check pg_hba.conf for connection rules
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

### Issue 5: Large Database Timeout

```bash
# Error: timeout waiting for server

# Solution: Use custom format with parallel jobs
pg_dump -h localhost \
        -U postgres \
        -d hrms_db \
        -F custom \
        -j 4 \
        -f backup.dump

pg_restore -h localhost \
           -U postgres \
           -d hrms_db \
           -j 4 \
           backup.dump
```

---

## Rollback

If migration fails, restore from backup on source system:

### On Source System

```bash
# Backup still exists in db-backups/
# No action needed - continue using existing system

# Optional: Create a fresh export before retry
./db-export.sh
```

### On Target System

```bash
# Drop failed import
psql -U postgres -d postgres
DROP DATABASE IF EXISTS hrms_db;

# Re-run import with corrected settings
./db-import.sh /path/to/backup.sql
```

---

## Additional Resources

### Useful PostgreSQL Commands

```bash
# List databases
psql -U postgres -l

# List tables in database
psql -U postgres -d hrms_db -c "\dt"

# Show table schema
psql -U postgres -d hrms_db -c "\d users"

# Export single table
pg_dump -U postgres -d hrms_db -t employees > employees.sql

# Import single table
psql -U postgres -d hrms_db -f employees.sql

# Copy data between servers directly
pg_dump -h source-host -U postgres -d hrms_db | \
psql -h target-host -U postgres -d hrms_db
```

### Performance Optimization

```bash
# For large databases (>100GB), use parallel dump
pg_dump -h localhost \
        -U postgres \
        -d hrms_db \
        -F directory \
        -j 8 \
        -f backup_dir/

# Restore with parallel jobs
pg_restore -h localhost \
           -U postgres \
           -d hrms_db \
           -j 8 \
           backup_dir/

# Disable triggers during import (faster)
psql -U postgres -d hrms_db -c "SET session_replication_role = replica;"
# Import data
psql -U postgres -d hrms_db -c "SET session_replication_role = DEFAULT;"
```

---

## Migration Checklist

- [ ] Backup source database
- [ ] Verify backup file integrity
- [ ] Test backup file on test environment
- [ ] Stop application on source system
- [ ] Export final database dump
- [ ] Transfer backup to target system
- [ ] Import on target system
- [ ] Verify row counts match source
- [ ] Reset sequences
- [ ] Update application configuration
- [ ] Test application connectivity
- [ ] Run smoke tests
- [ ] Monitor logs for errors
- [ ] Update DNS/load balancer (if applicable)
- [ ] Keep source system backup for 30 days

---

## Support

For issues or questions:
- Check logs: `backend/logs/application.log`
- PostgreSQL logs: `/var/log/postgresql/postgresql-14-main.log`
- Docker logs: `docker-compose logs postgres`

---

**Last Updated:** 2026-03-18
**NU-AURA Version:** 1.0.0
**PostgreSQL Version:** 14+
