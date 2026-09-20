package com.nulogic.api.attendance.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Result of a bulk approve/reject regularization call — per-record outcome
 * so the caller can show which rows in a bulk selection succeeded vs. failed.
 */
@Data
@Builder
public class BatchAttendanceActionResponse {
    private int processedCount;
    private List<UUID> failedRecordIds;
}
