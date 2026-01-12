--liquibase formatted sql

--changeset hrms:104-reset-nulogic-admin-password
-- Reset NuLogic admin user password to 'password' using BCrypt hash
-- Hash: $2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG = "password"
UPDATE users
SET password_hash = '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
    updated_at = NOW()
WHERE email = 'fayaz.m@nulogic.io'
  AND tenant_id = '660e8400-e29b-41d4-a716-446655440001';
