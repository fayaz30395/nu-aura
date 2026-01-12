--liquibase formatted sql

--changeset hrms:105-add-audit-columns-to-attendance-v2
-- Add created_by and updated_by audit columns to attendance_records table
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS updated_by UUID;
