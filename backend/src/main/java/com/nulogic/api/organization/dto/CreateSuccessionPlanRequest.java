package com.nulogic.api.organization.dto;

import com.nulogic.domain.organization.SuccessionPlan;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Request body for POST /api/v1/organization/succession-plans.
 *
 * <p>Replaces direct {@link SuccessionPlan} entity binding so that server-managed
 * fields (id, tenantId, audit timestamps, version, createdBy, lastReviewedBy) can
 * never be supplied by a client.</p>
 */
public record CreateSuccessionPlanRequest(
        @NotNull UUID positionId,
        UUID currentIncumbentId,
        SuccessionPlan.RiskLevel riskLevel,
        String riskReason,
        LocalDate expectedVacancyDate,
        String notes
) {
    public SuccessionPlan toEntity() {
        return SuccessionPlan.builder()
                .positionId(positionId)
                .currentIncumbentId(currentIncumbentId)
                .riskLevel(riskLevel)
                .riskReason(riskReason)
                .expectedVacancyDate(expectedVacancyDate)
                .notes(notes)
                .build();
    }
}
