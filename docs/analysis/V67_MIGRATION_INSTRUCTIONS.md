# V67 Flyway Migration - Restart Instructions

## What is V67?

V67 is a database migration that adds **40 new RBAC permissions** for the following roles:
- Team Lead
- Manager
- Employee
- HR Admin

These permissions enable access to:
- Attendance module
- Leave management
- Benefits module
- Calendar
- Dashboard
- Performance reviews

**Current Status:** Migration file exists at `backend/src/main/resources/db/migration/V67__fix_rbac_permission_gaps_round2.sql` but has NOT been applied to the database yet.

**Impact:** Without applying V67, non-SuperAdmin users (Team Leads, Managers, Employees, HR Admins) will get 403 Forbidden errors when accessing these modules.

---

## How to Apply V67 Migration

### Option 1: Restart Backend (Recommended for Development)

Flyway automatically runs pending migrations on application startup.

**Step 1:** Stop the backend application

```bash
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend

# If running via script:
./stop-backend.sh

# OR if running in terminal (Ctrl+C to stop)
```

**Step 2:** Start the backend application

```bash
# Using the startup script:
./start-backend.sh

# OR using Maven directly:
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

**Step 3:** Verify migration applied

Check the backend logs for:

```
INFO  org.flywaydb.core.internal.command.DbMigrate : Migrating schema "public" to version "67 - fix rbac permission gaps round2"
INFO  org.flywaydb.core.internal.command.DbMigrate : Successfully applied 1 migration to schema "public" (execution time 00:00.123s)
```

**Step 4:** Verify in database

Connect to your Neon DB and run:

```sql
SELECT version, description, installed_on, success
FROM flyway_schema_history
WHERE version = '67';
```

Expected result:
```
version | description                           | installed_on           | success
--------|---------------------------------------|------------------------|--------
67      | fix rbac permission gaps round2       | 2026-03-22 XX:XX:XX   | true
```

---

### Option 2: Docker Compose Restart (If Using Docker)

```bash
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura

# Restart backend service
docker-compose restart backend

# Watch logs
docker-compose logs -f backend
```

---

### Option 3: Manual Migration (If Backend Can't Restart)

**NOT RECOMMENDED** - Flyway will still try to run it on next startup, potentially causing conflicts.

If you absolutely must apply manually:

```bash
# Connect to Neon DB
psql "$NEON_JDBC_URL"

# Run the migration SQL
\i backend/src/main/resources/db/migration/V67__fix_rbac_permission_gaps_round2.sql

# Update Flyway history
INSERT INTO flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, execution_time, success)
VALUES (
  (SELECT MAX(installed_rank) + 1 FROM flyway_schema_history),
  '67',
  'fix rbac permission gaps round2',
  'SQL',
  'V67__fix_rbac_permission_gaps_round2.sql',
  123456789, -- Replace with actual checksum
  current_user,
  0,
  true
);
```

---

## Post-Migration Verification

### Test 1: Login as Employee

```bash
# Use Postman or curl
POST http://localhost:8080/api/v1/auth/login
{
  "email": "employee@example.com",
  "password": "***"
}

# Should return JWT with roles including "EMPLOYEE"
```

### Test 2: Access Attendance Module

```bash
GET http://localhost:8080/api/v1/attendance
Authorization: Bearer {employee-jwt-token}

# Should return 200 OK (not 403)
```

### Test 3: Access Leave Module

```bash
GET http://localhost:8080/api/v1/leave/my-leaves
Authorization: Bearer {employee-jwt-token}

# Should return 200 OK
```

### Test 4: Verify Sidebar Visibility

- Login to frontend as Employee
- Sidebar should show:
  - ✅ Attendance (parent section now visible)
  - ✅ Leave Management (parent section now visible)
  - ✅ Benefits (now uses BENEFIT:VIEW_SELF)

---

## Troubleshooting

### Issue: "Migration failed with error"

**Cause:** SQL syntax error or constraint violation in V67 migration file.

**Solution:**
1. Check backend logs for detailed error
2. Verify V67 SQL file has no syntax errors
3. Check if permissions already exist (duplicate key error)

### Issue: "Flyway schema history table not found"

**Cause:** Database not initialized properly.

**Solution:**
```bash
# Drop and recreate schema (DEV ONLY - loses all data)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

# Restart backend to run all migrations from V0
```

### Issue: "Users still getting 403 after migration"

**Cause:** Permission cache not cleared or JWT doesn't have new roles.

**Solution:**
1. Clear Redis cache:
   ```bash
   redis-cli FLUSHALL
   ```
2. Force users to re-login (invalidates old JWTs)
3. Check `SecurityService.getCachedPermissions()` is loading new permissions

---

## Next Steps After V67

Once V67 is applied and verified:

1. ✅ Test all 8 must-have modules with Employee role
2. ✅ Verify sidebar visibility (Attendance, Leave, Benefits sections)
3. ✅ Run regression tests on permission enforcement
4. 🔄 Create V68 migration for:
   - Missing `ASSET:VIEW` and `ASSET:MANAGE` permissions for EMPLOYEE and HR_ADMIN
   - Missing `ONBOARDING:VIEW/MANAGE` for HR_ADMIN
5. 🔄 Fix remaining controller permission mappings (Assets, Benefits, Preboarding)

---

## Migration File Location

```
backend/src/main/resources/db/migration/V67__fix_rbac_permission_gaps_round2.sql
```

**Last Modified:** 2026-03-22
**Purpose:** Add 40 RBAC permissions for Team Lead, Manager, Employee, and HR Admin roles
**Status:** ⏳ Pending Application (not yet applied to database)
**Blocks:** BUG-006 (Team Lead 403 on performance module) + employee self-service access

---

**Created:** 2026-03-22
**Author:** Wave 1 Fixes - Co-Working Mode
