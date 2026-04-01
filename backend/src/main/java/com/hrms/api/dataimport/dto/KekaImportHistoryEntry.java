package com.hrms.api.dataimport.dto;

import lombok.*;

import java.time.LocalDateTime;

/**
 * Historical entry for a completed KEKA import
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KekaImportHistoryEntry {
    private String id;
    private String fileName;
    private LocalDateTime uploadedAt;
    private String status; // SUCCESS, PARTIAL_SUCCESS, FAILED, IN_PROGRESS
    private Integer totalRows;
    private Integer created;
    private Integer updated;
    private Integer skipped;
    private Integer errors;
    private Long duration; // milliseconds
    private String uploadedBy; // User ID
}
