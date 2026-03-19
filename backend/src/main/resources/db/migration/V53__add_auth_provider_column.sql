-- V53: Add auth_provider column to users table
-- Distinguishes between LOCAL (email+password) and GOOGLE (SSO) authentication
-- Used by forgot-password flow to redirect SSO users to Google account management

ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL';

-- Index for quick lookups during forgot-password flow
CREATE INDEX idx_users_auth_provider ON users (auth_provider);

-- Backfill: Mark users whose email matches the SSO domain as GOOGLE auth
-- This assumes all @nulogic.io users authenticate via Google SSO
UPDATE users SET auth_provider = 'GOOGLE' WHERE email LIKE '%@nulogic.io';
