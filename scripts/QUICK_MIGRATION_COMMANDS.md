# Quick Migration Commands - For Claude/AI Systems

Copy-paste these commands directly. No configuration needed.

---

## 🚀 ONE-LINE MIGRATION (Recommended)

### On Source System (Current Database):

```bash
pg_dump -h localhost -p 5432 -U postgres -d hrms_db --clean --if-exists --create -F plain -f ~/nuaura_backup_$(date +%Y%m%d_%H%M%S).sql
```

### On Target System (New Database):

```bash
psql -h localhost -p 5432 -U postgres -d postgres -f ~/nuaura_backup_*.sql
```

**That's it!** Database is migrated.

---

## 📦 DOCKER-BASED MIGRATION

### Export from Docker Container:

```bash
docker exec -t $(docker ps -qf "name=postgres") pg_dump -U postgres -d hrms_db --clean --if-exists > nuaura_backup.sql
```

### Import to Docker Container:

```bash
docker exec -i $(docker ps -qf "name=postgres") psql -U postgres -d postgres < nuaura_backup.sql
```

---

## 🔍 VERIFY MIGRATION

After importing, run this:

```sql
-- Connect to database
psql -U postgres -d hrms_db

-- Run verification query
SELECT
    'Tenants' AS table_name, COUNT(*) AS rows FROM tenants
UNION ALL SELECT 'Users', COUNT(*) FROM users
UNION ALL SELECT 'Employees', COUNT(*) FROM employees
UNION ALL SELECT 'Departments', COUNT(*) FROM departments
UNION ALL SELECT 'Roles', COUNT(*) FROM roles
UNION ALL SELECT 'Permissions', COUNT(*) FROM permissions;
```

Expected output should show row counts matching source system.

---

## 🛠️ TROUBLESHOOTING ONE-LINERS

### If "database already exists" error:

```bash
psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS hrms_db;" && psql -U postgres -d postgres -f nuaura_backup.sql
```

### If "permission denied" error:

```bash
psql -U postgres -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE hrms_db TO postgres;" && psql -U postgres -d hrms_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;"
```

### If sequence errors after import:

```bash
psql -U postgres -d hrms_db << 'EOF'
DO $$
DECLARE rec RECORD; max_id BIGINT;
BEGIN
    FOR rec IN SELECT table_name, column_name, pg_get_serial_sequence(table_name, column_name) as seq
               FROM information_schema.columns
               WHERE table_schema='public' AND column_default LIKE 'nextval%'
    LOOP
        EXECUTE format('SELECT COALESCE(MAX(%I),0) FROM %I', rec.column_name, rec.table_name) INTO max_id;
        EXECUTE format('SELECT setval(%L,%s)', rec.seq, max_id+1);
    END LOOP;
END $$;
EOF
```

---

## 📋 FILE LOCATIONS

After running export script, find backups here:

- **Linux/macOS:** `~/nuaura_backup_TIMESTAMP.sql`
- **Docker:** Inside container at `/tmp/backup.sql` (copy out with `docker cp`)
- **Windows:** `%USERPROFILE%\nuaura_backup_TIMESTAMP.sql`

---

## 🔐 PASSWORD-LESS EXECUTION

Set password once, run multiple commands:

```bash
export PGPASSWORD="postgres123"
pg_dump -h localhost -U postgres -d hrms_db -f backup.sql
psql -h localhost -U postgres -d postgres -f backup.sql
unset PGPASSWORD
```

---

## 📊 MIGRATION STATUS CHECK

Check if migration is running:

```bash
psql -U postgres -d postgres -c "SELECT pid, usename, application_name, state, query FROM pg_stat_activity WHERE datname='hrms_db';"
```

---

## ⚡ FAST MIGRATION (Compressed)

For large databases (faster transfer):

```bash
# Export compressed
pg_dump -h localhost -U postgres -d hrms_db -F custom -f backup.dump

# Import compressed
pg_restore -h localhost -U postgres -d hrms_db --clean --if-exists backup.dump
```

---

## 🌐 REMOTE MIGRATION

Copy database directly between servers:

```bash
pg_dump -h source-server.com -U postgres -d hrms_db | psql -h target-server.com -U postgres -d hrms_db
```

---

## 💾 BACKUP SIZE ESTIMATION

Check before exporting:

```bash
psql -U postgres -d hrms_db -c "SELECT pg_size_pretty(pg_database_size('hrms_db'));"
```

---

## ✅ COMPLETE MIGRATION EXAMPLE

Full end-to-end migration in 4 commands:

```bash
# 1. Export from source
pg_dump -h localhost -U postgres -d hrms_db --clean --if-exists -f backup.sql

# 2. Copy to target server (if remote)
scp backup.sql user@target-server:/tmp/

# 3. Import on target
psql -h localhost -U postgres -d postgres -f backup.sql

# 4. Verify
psql -U postgres -d hrms_db -c "SELECT COUNT(*) FROM users;"
```

Done! 🎉

---

## 📞 EMERGENCY ROLLBACK

If import fails, restore previous state:

```bash
# On target system, drop failed database
psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS hrms_db;"

# Re-import with original backup
psql -U postgres -d postgres -f backup.sql
```

---

**Note:** Replace `localhost` with actual server IP/hostname for remote migrations.
**Note:** Replace `postgres123` with actual password if different.
