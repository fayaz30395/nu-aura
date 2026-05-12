-- V150: Leave-domain correctness (sprint-4 wave-3 audit, F2.3).
--
-- Adds policy caps for leave encashment on leave_types. Both columns are
-- nullable so existing rows keep "no policy cap" semantics (backward compatible).
--
-- F2.3: max_encashable_days_per_year — caps cumulative encashment within a year.
-- F2.3: max_encashable_at_exit       — caps lump-sum encashment at full-and-final.

ALTER TABLE leave_types
  ADD COLUMN IF NOT EXISTS max_encashable_days_per_year DECIMAL (5,2);

ALTER TABLE leave_types
  ADD COLUMN IF NOT EXISTS max_encashable_at_exit DECIMAL (5,2);
