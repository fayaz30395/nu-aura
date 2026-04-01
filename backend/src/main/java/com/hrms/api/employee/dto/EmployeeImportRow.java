package com.hrms.api.employee.dto;

import lombok.Data;

import java.util.HashMap;
import java.util.Map;

/**
 * Represents a single row from the employee import CSV/Excel file.
 * All fields are strings to allow flexible parsing and validation.
 */
@Data
public class EmployeeImportRow {

    private int rowNumber;

    // Required fields
    private String employeeCode;
    private String firstName;
    private String lastName;
    private String workEmail;
    private String joiningDate;        // Format: yyyy-MM-dd
    private String designation;
    private String employmentType;     // FULL_TIME, PART_TIME, CONTRACT, INTERN

    // Optional fields
    private String middleName;
    private String personalEmail;
    private String phoneNumber;
    private String emergencyContactNumber;
    private String dateOfBirth;        // Format: yyyy-MM-dd
    private String gender;             // MALE, FEMALE, OTHER
    private String address;
    private String city;
    private String state;
    private String postalCode;
    private String country;
    private String confirmationDate;   // Format: yyyy-MM-dd
    private String departmentCode;     // Department code to lookup
    private String managerEmployeeCode; // Manager's employee code to lookup
    private String bankAccountNumber;
    private String bankName;
    private String bankIfscCode;
    private String taxId;

    // Custom field values - map of field code to value (as string)
    private Map<String, String> customFieldValues = new HashMap<>();

    /**
     * Add a custom field value
     */
    public void addCustomFieldValue(String fieldCode, String value) {
        if (value != null && !value.trim().isEmpty()) {
            this.customFieldValues.put(fieldCode, value.trim());
        }
    }

    /**
     * Get a custom field value by field code
     */
    public String getCustomFieldValue(String fieldCode) {
        return this.customFieldValues.get(fieldCode);
    }

    /**
     * Check if this row has any custom field values
     */
    public boolean hasCustomFieldValues() {
        return !this.customFieldValues.isEmpty();
    }
}
