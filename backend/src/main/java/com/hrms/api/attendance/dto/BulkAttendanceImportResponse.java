package com.hrms.api.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkAttendanceImportResponse {
    private int totalRecords;
    private int successCount;
    private int failureCount;
    private int skippedCount;

    @Builder.Default
    private List<ImportError> errors = new ArrayList<>();

    @Builder.Default
    private List<ImportSuccess> successes = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportError {
        private int rowNumber;
        private String employeeCode;
        private String errorMessage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportSuccess {
        private int rowNumber;
        private String employeeCode;
        private String attendanceDate;
        private String status;
    }
}
