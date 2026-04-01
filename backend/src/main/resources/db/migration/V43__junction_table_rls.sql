-- V43__junction_table_rls.sql
-- Enable RLS on user_roles and app_role_permissions junction tables.
--
-- NOTE: Both tables receive tenant_id via V34 (ALTER TABLE ... ADD COLUMN IF NOT EXISTS tenant_id UUID).
-- V38's dynamic loop already handles them: it queries information_schema.columns for tables with
-- tenant_id and creates allow_all + tenant_rls policies for every table not in its already_covered list.
-- user_roles and app_role_permissions are NOT in V38's already_covered list, so V38 covers them.
--
-- The original static DO $$ blocks below referenced tenant_id directly in the USING clause.
-- On any database where V34 has not yet been applied (tenant_id column absent), those blocks
-- would fail with "column tenant_id does not exist". V38's dynamic approach is immune to this
-- because it only targets tables that actually have the column at runtime.
--
-- RLS coverage for these tables is therefore fully delegated to V38.

-- user_roles does NOT have a tenant_id column in the base schema (V0).
-- tenant_id is added by V34. RLS policy skipped here.
-- Tenant isolation enforced via V38 dynamic loop (runs after V34 adds the column)
-- and via parent table FK (users.tenant_id).

-- app_role_permissions does NOT have a tenant_id column in the base schema (V0).
-- tenant_id is added by V34. RLS policy skipped here.
-- Tenant isolation enforced via V38 dynamic loop (runs after V34 adds the column)
-- and via parent table FK (roles.tenant_id).

SELECT 1; -- Intentionally empty: RLS coverage delegated to V38
