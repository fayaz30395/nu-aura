-- ============================================================================
-- V181: Align analytics insight cost impact with AnalyticsInsight entity
-- ============================================================================

DO
$$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'analytics_insights'
      AND column_name = 'potential_cost_impact'
      AND data_type IN ('character varying', 'text')
  ) THEN
    ALTER TABLE analytics_insights
      ALTER COLUMN potential_cost_impact TYPE NUMERIC(15, 2)
      USING CASE
        WHEN potential_cost_impact IS NULL OR btrim(potential_cost_impact) = '' THEN NULL
        WHEN potential_cost_impact ~ '^[[:space:]]*-?[0-9]+(\.[0-9]+)?[[:space:]]*$'
          THEN potential_cost_impact::NUMERIC(15, 2)
        ELSE NULL
      END;
  END IF;
END $$;
