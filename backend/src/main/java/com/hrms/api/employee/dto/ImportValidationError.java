package com.hrms.api.employee.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a validation error for a specific row/field during import.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportValidationError {

    private int rowNumber;
    private String field;
    private String value;
    private String message;
    private ErrorType errorType;

    public static ImportValidationError required(int row, String field) {
        return ImportValidationError.builder()
                .rowNumber(row)
                .field(field)
                .message(field + " is required")
                .errorType(ErrorType.REQUIRED_FIELD_MISSING)
                .build();
    }

    public static ImportValidationError invalidFormat(int row, String field, String value, String expectedFormat) {
        return ImportValidationError.builder()
                .rowNumber(row)
                .field(field)
                .value(value)
                .message("Invalid format for " + field + ". Expected: " + expectedFormat)
                .errorType(ErrorType.INVALID_FORMAT)
                .build();
    }

    public static ImportValidationError invalidValue(int row, String field, String value, String allowedValues) {
        return ImportValidationError.builder()
                .rowNumber(row)
                .field(field)
                .value(value)
                .message("Invalid value for " + field + ". Allowed values: " + allowedValues)
                .errorType(ErrorType.INVALID_VALUE)
                .build();
    }

    public static ImportValidationError duplicateInFile(int row, String field, String value) {
        return ImportValidationError.builder()
                .rowNumber(row)
                .field(field)
                .value(value)
                .message("Duplicate " + field + " found in the import file")
                .errorType(ErrorType.DUPLICATE_IN_FILE)
                .build();
    }

    public static ImportValidationError duplicateInDatabase(int row, String field, String value) {
        return ImportValidationError.builder()
                .rowNumber(row)
                .field(field)
                .value(value)
                .message(field + " already exists in the system")
                .errorType(ErrorType.DUPLICATE_IN_DATABASE)
                .build();
    }

    public static ImportValidationError referenceNotFound(int row, String field, String value, String referenceType) {
        return ImportValidationError.builder()
                .rowNumber(row)
                .field(field)
                .value(value)
                .message(referenceType + " not found: " + value)
                .errorType(ErrorType.REFERENCE_NOT_FOUND)
                .build();
    }

    public enum ErrorType {
        REQUIRED_FIELD_MISSING,
        INVALID_FORMAT,
        INVALID_VALUE,
        DUPLICATE_IN_FILE,
        DUPLICATE_IN_DATABASE,
        REFERENCE_NOT_FOUND,
        BUSINESS_RULE_VIOLATION
    }
}
