package com.hrms.api.migration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class ImportResult {
    private UUID importId;
    private String dataType;
    private int totalRows;
    private int successCount;
    private int errorCount;
    private int skippedCount;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private long durationMs;

    @Builder.Default
    private List<ImportError> errors = new ArrayList<>();

    @Builder.Default
    private List<String> warnings = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ImportError {
        private int rowNumber;
        private String field;
        private String value;
        private String errorMessage;
    }

    public void addError(int row, String field, String value, String message) {
        if (errors == null) errors = new ArrayList<>();
        errors.add(ImportError.builder()
                .rowNumber(row)
                .field(field)
                .value(value)
                .errorMessage(message)
                .build());
        errorCount++;
    }

    public void addWarning(String warning) {
        if (warnings == null) warnings = new ArrayList<>();
        warnings.add(warning);
    }

    public double getSuccessRate() {
        if (totalRows == 0) return 0.0;
        return (double) successCount / totalRows * 100;
    }
}
