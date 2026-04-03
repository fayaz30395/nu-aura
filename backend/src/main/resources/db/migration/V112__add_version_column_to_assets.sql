-- V112: Add missing version column to assets table.
-- The Asset entity has @Version (optimistic locking) but the assets DDL in V0
-- omitted the version column, causing a 500 on every INSERT/UPDATE because
-- Hibernate tries to write to a non-existent column.
-- Uses IF NOT EXISTS so this is safe on any fresh install that already has the column.

ALTER TABLE assets
    ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
