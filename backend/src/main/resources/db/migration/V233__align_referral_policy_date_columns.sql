-- Align referral_policies date columns with ReferralPolicy mapping.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'referral_policies'
      AND column_name = 'effective_from'
      AND data_type <> 'date'
  ) THEN
    ALTER TABLE referral_policies
      ALTER COLUMN effective_from TYPE DATE
      USING CASE
        WHEN effective_from IS NULL OR trim(effective_from::text) = '' THEN NULL
        WHEN effective_from::text ~ '^\d{4}-\d{2}-\d{2}$' THEN effective_from::date
        ELSE NULL
      END;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'referral_policies'
      AND column_name = 'effective_to'
      AND data_type <> 'date'
  ) THEN
    ALTER TABLE referral_policies
      ALTER COLUMN effective_to TYPE DATE
      USING CASE
        WHEN effective_to IS NULL OR trim(effective_to::text) = '' THEN NULL
        WHEN effective_to::text ~ '^\d{4}-\d{2}-\d{2}$' THEN effective_to::date
        ELSE NULL
      END;
  END IF;
END $$;
