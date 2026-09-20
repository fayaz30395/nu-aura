package com.nulogic.api.leave.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Result of a bulk approve/reject call — per-request outcome so the caller
 * can show which rows in a bulk selection succeeded vs. failed.
 */
@Data
@Builder
public class BatchLeaveActionResponse {
    private int processedCount;
    private List<UUID> failedLeaveRequestIds;
}
