package com.nulogic.api.employee.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Result of a {@link BatchStatusChangeRequest} — per-employee outcome so the
 * caller can show which rows in a bulk selection succeeded vs. failed.
 */
@Data
@Builder
public class BatchStatusChangeResponse {
    private int updatedCount;
    private List<UUID> failedEmployeeIds;
}
