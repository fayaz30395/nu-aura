-- V42__employee_avatar_url.sql
ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
