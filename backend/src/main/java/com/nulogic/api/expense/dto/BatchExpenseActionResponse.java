package com.nulogic.api.expense.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Result of a bulk approve/reject call — per-claim outcome so the caller
 * can show which rows in a bulk selection succeeded vs. failed.
 */
@Data
@Builder
public class BatchExpenseActionResponse {
    private int processedCount;
    private List<UUID> failedClaimIds;
}
