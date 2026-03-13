package com.hrms.api.dataimport.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Result of executing a KEKA import
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KekaImportResult {
    private Integer totalProcessed;
    private Integer created;
    private Integer updated;
    private Integer skipped;
    private List<KekaImportError> errors;
    private List<KekaImportError> warnings;
    private String importId;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private Long duration; // milliseconds
    private String status; // SUCCESS, PARTIAL_SUCCESS, FAILED
}
