-- V144: Normalize WallPost soft-delete column to BaseEntity convention (is_deleted).
--
-- Context: The WallPost entity uses the `social_posts` table. In V0__init.sql the column
--          was already named `is_deleted`, so on a clean install this migration is a no-op.
--          This file exists as an idempotent safety net for any environment where the
--          column drifted to `deleted` (e.g. from an out-of-band schema change), and to
--          align with the BaseEntity / @Where("is_deleted = false") convention used
--          everywhere else in the codebase (audit O-section-5).

-- Rename `deleted` -> `is_deleted` if only the old name exists.
DO
$$
BEGIN
    IF EXISTS (SELECT 1
               FROM information_schema.columns
               WHERE table_name = 'social_posts'
                 AND column_name = 'deleted')
       AND NOT EXISTS (SELECT 1
                       FROM information_schema.columns
                       WHERE table_name = 'social_posts'
                         AND column_name = 'is_deleted') THEN
        ALTER TABLE social_posts
            RENAME COLUMN deleted TO is_deleted;
    END IF;
END
$$;

-- If both columns somehow coexist (idempotent re-run safety), backfill and drop the old one.
DO
$$
BEGIN
    IF EXISTS (SELECT 1
               FROM information_schema.columns
               WHERE table_name = 'social_posts'
                 AND column_name = 'deleted')
       AND EXISTS (SELECT 1
                   FROM information_schema.columns
                   WHERE table_name = 'social_posts'
                     AND column_name = 'is_deleted') THEN
        UPDATE social_posts
        SET is_deleted = deleted
        WHERE is_deleted IS DISTINCT FROM deleted;
        ALTER TABLE social_posts
            DROP COLUMN deleted;
    END IF;
END
$$;
