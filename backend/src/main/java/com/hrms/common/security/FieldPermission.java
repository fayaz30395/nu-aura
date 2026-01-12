package com.hrms.common.security;

/**
 * Field-level permission constants for sensitive employee data.
 * These permissions control access to specific fields within entities.
 */
public final class FieldPermission {

    // Salary/Compensation Fields
    public static final String EMPLOYEE_SALARY_VIEW = "FIELD:EMPLOYEE:SALARY:VIEW";
    public static final String EMPLOYEE_SALARY_EDIT = "FIELD:EMPLOYEE:SALARY:EDIT";

    // Bank Details
    public static final String EMPLOYEE_BANK_VIEW = "FIELD:EMPLOYEE:BANK:VIEW";
    public static final String EMPLOYEE_BANK_EDIT = "FIELD:EMPLOYEE:BANK:EDIT";

    // Tax Information
    public static final String EMPLOYEE_TAX_ID_VIEW = "FIELD:EMPLOYEE:TAX_ID:VIEW";

    // Identity Documents (PAN, Aadhaar, Passport, etc.)
    public static final String EMPLOYEE_ID_DOCS_VIEW = "FIELD:EMPLOYEE:ID_DOCS:VIEW";

    private FieldPermission() {
        throw new AssertionError("Cannot instantiate constants class");
    }
}
