-- V109: Add missing wall_post_id column to announcements table.
-- Root cause: Announcement.java JPA entity has @Column(name = "wall_post_id")
-- but V0__init.sql CREATE TABLE announcements did not include this column.
-- Hibernate tries to INSERT wall_post_id = null on every announcement save,
-- causing a PSQLException "column wall_post_id does not exist" → HTTP 500 (BUG-014).

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS wall_post_id UUID;
