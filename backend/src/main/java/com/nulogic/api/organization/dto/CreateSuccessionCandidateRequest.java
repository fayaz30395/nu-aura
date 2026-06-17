package com.nulogic.api.organization.dto;

import com.nulogic.domain.organization.SuccessionCandidate;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Request body for POST /api/v1/organization/succession-plans/{planId}/candidates.
 *
 * <p>Replaces direct {@link SuccessionCandidate} entity binding so that server-managed
 * fields (id, tenantId, audit timestamps, version, successionPlanId) can never be
 * supplied by a client. successionPlanId is taken from the path variable, not the body.</p>
 */
public record CreateSuccessionCandidateRequest(
        @NotNull UUID candidateId,
        @NotNull SuccessionCandidate.ReadinessLevel readiness,
        Integer priority,
        SuccessionCandidate.PerformanceRating performanceRating,
        SuccessionCandidate.PotentialRating potentialRating,
        LocalDate estimatedReadyDate,
        String developmentNeeds,
        String developmentPlan,
        String strengths,
        String gaps,
        String notes,
        Boolean isConfidential
) {
    public SuccessionCandidate toEntity() {
        return SuccessionCandidate.builder()
                .candidateId(candidateId)
                .readiness(readiness)
                .priority(priority != null ? priority : 1)
                .performanceRating(performanceRating)
                .potentialRating(potentialRating)
                .estimatedReadyDate(estimatedReadyDate)
                .developmentNeeds(developmentNeeds)
                .developmentPlan(developmentPlan)
                .strengths(strengths)
                .gaps(gaps)
                .notes(notes)
                .isConfidential(isConfidential != null ? isConfidential : false)
                .build();
    }
}
