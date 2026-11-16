package com.nulogic.api.psa.dto;

import java.time.LocalDate;
import java.util.UUID;

/** Read-only view of one active PSA allocation of the current user. */
public record MyProjectAllocationResponse(
        UUID projectId,
        String projectCode,
        String projectName,
        String roleName,
        Integer allocationPercentage,
        LocalDate startDate,
        LocalDate endDate,
        Boolean isActive) {
}
