package com.hrms.api.employee.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Result of an employee bulk import operation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeImportResult {

    private UUID importId;
    private LocalDateTime importedAt;
    private String importedBy;

    private int totalProcessed;
    private int successCount;
    private int failedCount;
    private int skippedCount;

    private ImportStatus status;

    @Builder.Default
    private List<ImportedEmployee> importedEmployees = new ArrayList<>();

    @Builder.Default
    private List<FailedImport> failedImports = new ArrayList<>();

    public static EmployeeImportResult success(int count, List<ImportedEmployee> employees) {
        return EmployeeImportResult.builder()
                .importId(UUID.randomUUID())
                .importedAt(LocalDateTime.now())
                .totalProcessed(count)
                .successCount(count)
                .failedCount(0)
                .skippedCount(0)
                .status(ImportStatus.COMPLETED)
                .importedEmployees(employees)
                .build();
    }

    public static EmployeeImportResult partial(int success, int failed,
                                               List<ImportedEmployee> employees,
                                               List<FailedImport> failures) {
        return EmployeeImportResult.builder()
                .importId(UUID.randomUUID())
                .importedAt(LocalDateTime.now())
                .totalProcessed(success + failed)
                .successCount(success)
                .failedCount(failed)
                .skippedCount(0)
                .status(ImportStatus.PARTIAL_SUCCESS)
                .importedEmployees(employees)
                .failedImports(failures)
                .build();
    }

    public static EmployeeImportResult failed(String reason) {
        return EmployeeImportResult.builder()
                .importId(UUID.randomUUID())
                .importedAt(LocalDateTime.now())
                .totalProcessed(0)
                .successCount(0)
                .failedCount(0)
                .skippedCount(0)
                .status(ImportStatus.FAILED)
                .build();
    }

    public boolean isSuccess() {
        return status == ImportStatus.COMPLETED;
    }

    public boolean hasFailures() {
        return failedCount > 0;
    }

    public enum ImportStatus {
        COMPLETED,           // All rows imported successfully
        PARTIAL_SUCCESS,     // Some rows imported, some failed
        FAILED,              // Import failed completely
        CANCELLED            // Import was cancelled
    }

    /**
     * Details of a successfully imported employee.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportedEmployee {
        private int rowNumber;
        private UUID employeeId;
        private String employeeCode;
        private String fullName;
        private String workEmail;
    }

    /**
     * Details of a failed import row.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FailedImport {
        private int rowNumber;
        private String employeeCode;
        private String reason;
        private List<ImportValidationError> errors;
    }
}
