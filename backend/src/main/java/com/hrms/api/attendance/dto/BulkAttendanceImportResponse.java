package com.hrms.api.attendance.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Response DTO for bulk attendance import operations.
 * Provides detailed feedback on each row including successes, failures, and specific error codes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Response from bulk attendance import operation")
public class BulkAttendanceImportResponse {

    @Schema(description = "Total number of data rows processed", example = "100")
    private int totalRecords;

    @Schema(description = "Number of records successfully imported", example = "95")
    private int successCount;

    @Schema(description = "Number of records that failed to import", example = "3")
    private int failureCount;

    @Schema(description = "Number of empty or blank rows skipped", example = "2")
    private int skippedCount;

    @Schema(description = "Import batch ID for tracking", example = "imp_20240315_143022")
    private String importBatchId;

    @Schema(description = "Whether the import was a partial success (some rows failed)")
    private boolean partialSuccess;

    @Builder.Default
    @Schema(description = "List of errors encountered during import")
    private List<ImportError> errors = new ArrayList<>();

    @Builder.Default
    @Schema(description = "List of successfully imported records")
    private List<ImportSuccess> successes = new ArrayList<>();

    /**
     * Categorized error codes for import failures.
     * Allows programmatic error handling and localization.
     */
    public enum ImportErrorCode {
        MISSING_EMPLOYEE_CODE("Employee code is required in column A"),
        MISSING_DATE("Date is required in column B"),
        INVALID_DATE_FORMAT("Date format should be YYYY-MM-DD (e.g., 2024-03-15)"),
        INVALID_TIME_FORMAT("Time format should be HH:MM in 24-hour format (e.g., 09:00 or 18:30)"),
        EMPLOYEE_NOT_FOUND("Employee code does not exist in the system"),
        INVALID_STATUS("Status must be one of: PRESENT, ABSENT, HALF_DAY, ON_LEAVE, WEEKLY_OFF, HOLIDAY"),
        DUPLICATE_RECORD("A record already exists for this employee and date (will be updated)"),
        FILE_TOO_LARGE("File exceeds maximum size of 5MB"),
        INVALID_FILE_TYPE("Only Excel files (.xlsx, .xls) are supported"),
        ROW_LIMIT_EXCEEDED("Maximum 1000 rows allowed per import"),
        UNKNOWN_ERROR("An unexpected error occurred");

        private final String defaultMessage;

        ImportErrorCode(String defaultMessage) {
            this.defaultMessage = defaultMessage;
        }

        public String getDefaultMessage() {
            return defaultMessage;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Details of an import error")
    public static class ImportError {
        @Schema(description = "Row number in the Excel file (1-indexed, includes header)", example = "5")
        private int rowNumber;

        @Schema(description = "Employee code from the row (if available)", example = "EMP001")
        private String employeeCode;

        @Schema(description = "Categorized error code for programmatic handling")
        private ImportErrorCode errorCode;

        @Schema(description = "Human-readable error message", example = "Employee not found with code: EMP999")
        private String errorMessage;

        @Schema(description = "Suggestion for fixing the error", example = "Verify the employee code exists in the system")
        private String suggestion;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Details of a successfully imported record")
    public static class ImportSuccess {
        @Schema(description = "Row number in the Excel file", example = "3")
        private int rowNumber;

        @Schema(description = "Employee code", example = "EMP001")
        private String employeeCode;

        @Schema(description = "Attendance date", example = "2024-03-15")
        private String attendanceDate;

        @Schema(description = "Attendance status", example = "PRESENT")
        private String status;

        @Schema(description = "Whether this was an update to existing record", example = "false")
        private boolean updated;
    }
}
