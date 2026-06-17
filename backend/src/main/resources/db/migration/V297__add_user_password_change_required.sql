-- Add password_change_required flag to users table.
-- When true, AuthService includes mustChangePassword=true in the login response
-- so the frontend can redirect to the change-password screen before allowing navigation.
-- Set to true by the Keka migration importer and the admin-forced password reset flow.
-- Cleared to false after a successful self-service password change.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN NOT NULL DEFAULT FALSE;
