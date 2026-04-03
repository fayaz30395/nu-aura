package com.hrms.api.employee.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Response DTO for the import preview/validation step.
 * Shows what will be imported and any validation errors.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeImportPreview {

    private int totalRows;
    private int validRows;
    private int invalidRows;
    private boolean hasErrors;

    @Builder.Default
    private List<EmployeeImportRowPreview> rows = new ArrayList<>();

    @Builder.Default
    private List<ImportValidationError> errors = new ArrayList<>();

    @Builder.Default
    private List<String> warnings = new ArrayList<>();

    public static EmployeeImportPreview empty() {
        return EmployeeImportPreview.builder()
                .totalRows(0)
                .validRows(0)
                .invalidRows(0)
                .hasErrors(false)
                .build();
    }

    public void addError(ImportValidationError error) {
        if (this.errors == null) {
            this.errors = new ArrayList<>();
        }
        this.errors.add(error);
        this.hasErrors = true;
    }

    public void addWarning(String warning) {
        if (this.warnings == null) {
            this.warnings = new ArrayList<>();
        }
        this.warnings.add(warning);
    }

    /**
     * Preview of a single row with validation status.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeImportRowPreview {
        private int rowNumber;
        private String employeeCode;
        private String fullName;
        private String workEmail;
        private String designation;
        private String departmentName;
        private String joiningDate;
        private String employmentType;
        private boolean isValid;
        private List<String> rowErrors;
    }
}
