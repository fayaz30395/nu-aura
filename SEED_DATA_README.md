# NU-AURA Seed Data Documentation

This document describes the database seed data available in the NU-AURA platform for development and demo purposes.

---

## Overview

The platform includes **two separate seed data migrations**:

1. **V19__platform_seed_data.sql** (in `/db/migration/`) — Core platform setup (always runs)
2. **V30__comprehensive_demo_seed_data.sql** (in `/db/migration/`) — Rich demo data (always runs)

---

## V19: Platform Seed Data (Core)

Located: `backend/src/main/resources/db/migration/V19__platform_seed_data.sql`

**Always executes** — this is production-safe infrastructure data.

### Contents:

#### 1. Default Tenant
- **Tenant ID**: `660e8400-e29b-41d4-a716-446655440001`
- **Code**: `nulogic`
- **Name**: NuLogic
- **Status**: ACTIVE

#### 2. SuperAdmin User
- **User ID**: `550e8400-e29b-41d4-a716-446655440030`
- **Email**: `fayaz.m@nulogic.io`
- **Employee Code**: `EMP-0001`
- **Role**: SUPER_ADMIN (bypasses all RBAC checks)

#### 3. Roles
- **SUPER_ADMIN** — Full system access, bypasses RBAC
- **HR_ADMIN** — Full HR module access
- **MANAGER** — Team management access
- **EMPLOYEE** — Basic self-service access

#### 4. Permissions (50+ permissions)
All CRUD permissions for:
- `employee.*` (read, create, update, delete)
- `department.*`
- `attendance.*`
- `leave.*` (read, request, approve, manage)
- `payroll.*`
- `performance.*`
- `recruitment.*`
- `report.*`
- `settings.*`
- `role.*` / `user.*`
- `project.*`
- `announcement.*`
- `knowledge.*` (wiki, blog, templates)
- `contract.*`
- `payment.*` (view, initiate, refund, config)
- `system.admin`

#### 5. NU-AURA Applications
- **NU-HRMS** — Human Resource Management System
- **NU-Hire** — Recruitment & Onboarding
- **NU-Grow** — Performance, Learning & Engagement
- **NU-Fluence** — Knowledge Management & Collaboration

---

## V30: Comprehensive Demo Seed Data

Located: `backend/src/main/resources/db/migration/V30__comprehensive_demo_seed_data.sql`

**Always executes** — rich demo data for development and testing.

### Contents:

#### 1. Departments (8)
- Engineering
- Product
- Human Resources
- Finance
- Sales
- Marketing
- Customer Success
- Operations

#### 2. Users & Employees (25+)

**Engineering Team (10 employees)**:
- Sarah Chen (EMP-0002) — Engineering Manager (L6)
- Raj Kumar (EMP-0003) — Senior Software Engineer (L5)
- Emily Watson (EMP-0004) — Senior Software Engineer (L5)
- David Kim (EMP-0005) — Software Engineer (L4)
- Priya Sharma (EMP-0006) — Software Engineer (L4)
- Alex Johnson (EMP-0007) — Software Engineer (L3)
- Maria Garcia (EMP-0008) — QA Engineer (L4)
- James Taylor (EMP-0009) — DevOps Engineer (L5)
- Lisa Nguyen (EMP-0010) — Frontend Developer (L3)
- Michael Brown (EMP-0011) — Backend Developer (L3)

**Product Team (2 employees)**:
- Olivia Martinez (EMP-0012) — VP of Product (L7)
- William Davis (EMP-0013) — Senior Product Manager (L5)

**HR Team (2 employees)**:
- Sophia Wilson (EMP-0014) — HR Director (L6)
- Liam Anderson (EMP-0015) — HR Business Partner (L4)

**Finance Team (2 employees)**:
- Emma Thomas (EMP-0016) — CFO (CXO)
- Noah Jackson (EMP-0017) — Senior Accountant (L5)

**Sales Team (3 employees)**:
- Ava White (EMP-0018) — VP of Sales (L7)
- Ethan Harris (EMP-0019) — Sales Manager (L5)
- Isabella Martin (EMP-0020) — Account Executive (L4)

**Marketing Team (2 employees)**:
- Mason Thompson (EMP-0021) — Marketing Director (L6)
- Mia Garcia (EMP-0022) — Content Marketing Manager (L4)

**Customer Success Team (2 employees)**:
- Lucas Rodriguez (EMP-0023) — CS Manager (L5)
- Amelia Lee (EMP-0024) — Customer Success Specialist (L3)

**Operations Team (2 employees)**:
- Logan Walker (EMP-0025) — Operations Manager (L5)
- Harper Hall (EMP-0026) — Office Administrator (L3)

#### 3. Leave Types (6)
- **Annual Leave** (AL) — 20 days/year, paid
- **Sick Leave** (SL) — 10 days/year, paid
- **Casual Leave** (CL) — 12 days/year, paid
- **Maternity Leave** (ML) — 180 days/year, paid
- **Paternity Leave** (PL) — 15 days/year, paid
- **Unpaid Leave** (UL) — unlimited, unpaid

#### 4. Leave Balances
- Auto-generated for all 25+ employees
- Covers Annual Leave, Sick Leave, and Casual Leave for 2025
- Random usage (0-5 days used) for realistic balances

#### 5. Holidays (8 in 2025)
- New Year (Jan 1)
- Republic Day (Jan 26)
- Holi (Mar 14)
- Good Friday (Apr 18)
- Independence Day (Aug 15)
- Gandhi Jayanti (Oct 2)
- Diwali (Oct 20)
- Christmas (Dec 25)

#### 6. Announcements (3)
- Welcome to NU-AURA Platform
- Year-End Performance Reviews
- Office Closed - Christmas Holiday

#### 7. Projects (3)
- **NU-AURA Platform Development** (AURA-CORE) — High priority, in progress
- **Customer Portal 2.0** (PORTAL-V2) — Medium priority, in progress
- **Mobile App Launch** (MOBILE-V1) — Low priority, planning phase

#### 8. Job Openings (3)
- Senior Frontend Developer (Bengaluru)
- Product Manager (Remote)
- DevOps Engineer (Bengaluru)

#### 9. Assets (5)
- LAP-001: MacBook Pro 16" → Assigned to Sarah Chen
- LAP-002: MacBook Air 13" → Assigned to Raj Kumar
- MON-001: Dell UltraSharp 27" → Assigned to Emily Watson
- CHR-001: Herman Miller Aeron Chair → Assigned to Fayaz M
- KEY-001: Logitech MX Keys → Available

#### 10. Performance Reviews (3)
- Raj Kumar — 2024-Q4, rating: 4/5 (Completed)
- Emily Watson — 2024-Q4, rating: 5/5 (Completed)
- David Kim — 2024-Q4 (In Progress)

#### 11. LMS Courses (3)
- Introduction to TypeScript (Beginner, 8 hours)
- React Performance Optimization (Advanced, 12 hours)
- Leadership Essentials (Intermediate, 16 hours)

#### 12. Wall Posts (3)
- Platform launch announcement (15 likes, 3 comments)
- Engineering milestone update (22 likes, 5 comments)
- Marketing blog post (8 likes, 2 comments)

#### 13. Recognition (3)
- Sarah Chen → Raj Kumar: Excellence (50 points)
- Olivia Martinez → Emily Watson: Teamwork (30 points)
- Fayaz M → Sarah Chen: Leadership (100 points)

#### 14. Attendance Records (~500 records)
- Auto-generated for last 30 days
- Weekdays only (Mon-Fri)
- Random check-in/check-out times (9-10 AM check-in, 6-8 PM check-out)
- 8-10 work hours per day

---

## Demo Login Credentials

### SuperAdmin (Full Access)
- **Email**: `fayaz.m@nulogic.io`
- **Employee Code**: `EMP-0001`
- **Role**: SUPER_ADMIN
- **Password**: Set via signup or database

### Sample Employees
All demo employees use the same tenant:
- **Tenant**: NuLogic (`660e8400-e29b-41d4-a716-446655440001`)
- **Email Pattern**: `<firstname>.<lastname>@nulogic.io`
- **Employee Codes**: `EMP-0002` to `EMP-0026`
- **Password Hash**: `$2a$10$demoHash###` (placeholder — set real passwords via signup)

**Note**: All demo users have placeholder password hashes. Use the signup flow to create real accounts or manually update password hashes in the database.

---

## How to Use Seed Data

### 1. Fresh Installation
When you run the application for the first time:
```bash
# Start infrastructure
docker-compose up -d

# Start backend (migrations run automatically)
cd backend
./start-backend.sh
```

Both V19 and V30 will execute automatically via Flyway.

### 2. Verify Seed Data
```bash
# Connect to PostgreSQL
docker exec -it nu-aura-postgres-1 psql -U hrms -d hrms_dev

# Check tenant
SELECT * FROM tenants WHERE code = 'nulogic';

# Check users
SELECT email, first_name, last_name, status FROM users LIMIT 10;

# Check employees
SELECT employee_code, first_name, last_name, designation, department_id FROM employees LIMIT 10;

# Check leave balances
SELECT e.employee_code, lt.leave_name, lb.balance_days
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
LIMIT 20;
```

### 3. Reset Seed Data
If you need to reset the database:
```bash
# Stop backend
# Stop PostgreSQL
docker-compose down -v

# Restart (this will recreate the database)
docker-compose up -d
cd backend && ./start-backend.sh
```

All migrations (including V19 and V30) will re-run, recreating all seed data.

---

## Data Idempotency

Both seed data migrations use `ON CONFLICT DO NOTHING` for all INSERT statements, making them **safe to re-run** without creating duplicates.

### Safe Operations:
- Re-running migrations after a failed deploy
- Running migrations on multiple environments
- Manually re-executing seed SQL scripts

### UUIDs:
All entity IDs are **hardcoded UUIDs** (not auto-generated) to ensure:
- Consistent references across migrations
- Predictable foreign key relationships
- Reproducible demo environments

---

## Extending Seed Data

To add more seed data:

1. **Option A**: Edit V30__comprehensive_demo_seed_data.sql
   - Add new INSERT statements at the bottom
   - Use `ON CONFLICT DO NOTHING`
   - Use hardcoded UUIDs for predictability

2. **Option B**: Create V31__additional_demo_data.sql
   - For large additions or optional modules
   - Keeps V30 focused on core demo data

### Example: Adding More Employees
```sql
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, ...)
VALUES ('new-uuid-here', '660e8400-e29b-41d4-a716-446655440001', 'john.doe@nulogic.io', 'John', 'Doe', ...)
ON CONFLICT (id) DO NOTHING;

INSERT INTO employees (id, tenant_id, employee_code, user_id, ...)
VALUES ('employee-uuid', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0027', 'new-uuid-here', ...)
ON CONFLICT (id) DO NOTHING;
```

---

## Production Considerations

### V19 (Platform Seed Data)
✅ **Safe for production** — creates essential infrastructure:
- Default tenant
- SuperAdmin user
- Core roles and permissions
- NU-AURA applications

### V30 (Comprehensive Demo Data)
⚠️ **Demo/Dev only** — creates sample data:
- 25+ demo employees
- Sample projects, job openings, assets
- Fake performance reviews, wall posts

**Recommendation**: For production deployments, either:
1. Skip V30 entirely (delete the file before deployment), or
2. Create a separate `db/seed/` directory for optional demo data that only loads in dev/staging environments

---

## Testing the Seed Data

### Frontend Testing
1. Login as SuperAdmin (`fayaz.m@nulogic.io`)
2. Navigate to:
   - `/employees/directory` — See 25+ employees across 8 departments
   - `/leaves` — See leave types and balances
   - `/attendance` — See 30 days of attendance records
   - `/recruitment/jobs` — See 3 active job openings
   - `/assets` — See 5 sample assets
   - `/performance` — See performance reviews
   - `/company-spotlight` — See announcements and wall posts

### Backend Testing
```bash
# Check employee count
curl http://localhost:8080/api/v1/employees | jq '.length'

# Check departments
curl http://localhost:8080/api/v1/departments | jq '.[] | {name, code}'

# Check leave balances
curl http://localhost:8080/api/v1/leave-balances?employeeId=<id> | jq
```

---

## Summary

| Aspect | V19 (Platform) | V30 (Demo) |
|--------|---------------|------------|
| **Purpose** | Core infrastructure | Rich demo data |
| **Production** | ✅ Safe | ⚠️ Dev/staging only |
| **Entities** | Tenant, SuperAdmin, Roles, Permissions, Apps | 25+ employees, projects, assets, attendance |
| **Size** | ~200 lines | ~600 lines |
| **Idempotent** | ✅ Yes | ✅ Yes |
| **Location** | `db/migration/` | `db/migration/` |

---

**Last Updated**: March 16, 2026
**Platform Version**: 1.0.0
