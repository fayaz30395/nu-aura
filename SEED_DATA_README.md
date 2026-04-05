# NU-AURA Seed Data

## Overview

Seed data is applied via Flyway migrations on backend startup. Two key migrations provide base data:

| Migration | Purpose                                                                       | Environment      |
|-----------|-------------------------------------------------------------------------------|------------------|
| **V19**   | Platform seed — tenant, SuperAdmin users, roles, permissions, app definitions | All environments |
| **V30**   | Demo data — sample employees, leave, attendance, performance, etc.            | Development only |

## V19: Platform Seed (Required)

Creates the foundational data every NU-AURA instance needs:

- **Default tenant:** `nulogic` (UUID in migration)
- **SuperAdmin users:** `sarankarthick` and `fayaz` with SuperAdmin role
- **Roles:** SuperAdmin, HR Admin, Manager, Employee (4 base roles)
- **Permissions:** 50+ base permissions in `module.action` format
- **NU-AURA apps:** HRMS, Hire, Grow, Fluence (4 app definitions)

## V30: Demo Data (Development Only)

Populates the platform with realistic sample data for development and testing:

- 25+ employees across 8 departments
- Leave types and balances
- Holiday calendar
- Projects and assignments
- 5 job openings with candidates
- 5 IT assets
- ~500 attendance records
- Performance reviews and OKR samples
- LMS courses
- Social wall posts and recognition entries

> **Warning:** V30 demo data must NOT be applied in production. Use environment-specific Flyway
> configuration to exclude it.

> **Note:** Demo user passwords use placeholder BCrypt hashes. For actual login, update passwords
> via the signup flow or directly in the database.

## Migration Status

- **Applied:** V0–V91 (88 migration files, gaps at V1, V27–V29, V63–V66, V68–V79)
- **Next available version:** V92
- **Migration tool:** Flyway only. Legacy Liquibase files in `db/changelog/` are deprecated — do not
  use.

## Adding New Seed Data

1. Create a new migration file: `V92__description.sql`
2. Place it in `backend/src/main/resources/db/migration/`
3. Always include `tenant_id` for tenant-scoped data
4. Use `ON CONFLICT DO NOTHING` for idempotent seeds
5. Test by running the backend — Flyway auto-applies on startup
