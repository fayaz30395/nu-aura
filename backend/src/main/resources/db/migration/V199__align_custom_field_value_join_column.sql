ALTER TABLE custom_field_values
  ADD COLUMN IF NOT EXISTS field_definition_id UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'custom_field_values'
      AND column_name = 'fielddefinitionid'
  ) THEN
    EXECUTE 'UPDATE custom_field_values SET field_definition_id = fielddefinitionid WHERE field_definition_id IS NULL';
  END IF;
END $$;
