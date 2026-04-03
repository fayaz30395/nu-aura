-- V5: Add India statutory deduction columns to payslips table
-- Covers PF, ESI, Professional Tax, and TDS (monthly TDS instalment).

ALTER TABLE payslips
  ADD COLUMN IF NOT EXISTS employee_pf NUMERIC (10, 2),
  ADD COLUMN IF NOT EXISTS employer_pf NUMERIC (10, 2),
  ADD COLUMN IF NOT EXISTS employee_esi NUMERIC (10, 2),
  ADD COLUMN IF NOT EXISTS employer_esi NUMERIC (10, 2),
  ADD COLUMN IF NOT EXISTS professional_tax NUMERIC (10, 2),
  ADD COLUMN IF NOT EXISTS tds_monthly NUMERIC (10, 2),
  ADD COLUMN IF NOT EXISTS statutory_calculated_at TIMESTAMP;

COMMENT
ON COLUMN payslips.employee_pf          IS 'Employee Provident Fund contribution (12% of basic, no ceiling)';
COMMENT
ON COLUMN payslips.employer_pf          IS 'Employer Provident Fund contribution (12% of basic, capped at INR 1800 when basic > 15000)';
COMMENT
ON COLUMN payslips.employee_esi         IS 'Employee ESI contribution (0.75% of gross, applicable when gross <= 21000)';
COMMENT
ON COLUMN payslips.employer_esi         IS 'Employer ESI contribution (3.25% of gross, applicable when gross <= 21000)';
COMMENT
ON COLUMN payslips.professional_tax     IS 'State-level professional tax deducted from employee';
COMMENT
ON COLUMN payslips.tds_monthly          IS 'Monthly TDS instalment based on projected annual income (New Regime FY2024-25)';
COMMENT
ON COLUMN payslips.statutory_calculated_at IS 'Timestamp when statutory deductions were last calculated and applied';
