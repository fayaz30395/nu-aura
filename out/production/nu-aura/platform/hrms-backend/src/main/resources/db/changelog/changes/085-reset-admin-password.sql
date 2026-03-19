--liquibase formatted sql

--changeset hrms:085-reset-admin-password
-- Reset admin user password to 'password' using BCrypt hash
-- Hash: $2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG = "password"
UPDATE users
SET password_hash = '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG'
WHERE email = 'admin@demo.com'
  AND tenant_id = '550e8400-e29b-41d4-a716-446655440000';
