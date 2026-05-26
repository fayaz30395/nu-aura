-- Align employee_payroll_records.rate_date with EmployeePayrollRecord.rateDate.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'employee_payroll_records'
      AND column_name = 'rate_date'
      AND data_type <> 'date'
  ) THEN
    ALTER TABLE employee_payroll_records
      ALTER COLUMN rate_date TYPE DATE USING NULLIF(rate_date::TEXT, '')::DATE;
  END IF;
END $$;
