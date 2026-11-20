-- Runs on container start, BEFORE Flyway, so V179's "IF EXISTS nu_app_rls" grant block
-- (and its ALTER DEFAULT PRIVILEGES) actually fires — exactly like a production database
-- where the runtime role is provisioned before the first migration.
-- Password is a synthetic, container-local test value.
CREATE ROLE nu_app_rls NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE LOGIN PASSWORD 'iso-app-role-test-only';
