package com.nulogic.api.organization.dto;

import com.nulogic.domain.organization.Position;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

/**
 * Request body for POST /api/v1/organization/positions.
 *
 * <p>Replaces direct {@link Position} entity binding so that server-managed
 * fields (id, tenantId, audit timestamps, version) can never be supplied by a client.</p>
 */
public record CreatePositionRequest(
        @NotBlank String title,
        @NotBlank String code,
        String description,
        UUID departmentId,
        UUID reportsToPositionId,
        Position.JobLevel level,
        Position.JobFamily jobFamily,
        Integer headcount,
        String gradeMin,
        String gradeMax,
        String requiredSkills,
        String responsibilities,
        Boolean isCritical,
        String location
) {
    public Position toEntity() {
        return Position.builder()
                .title(title)
                .code(code)
                .description(description)
                .departmentId(departmentId)
                .reportsToPositionId(reportsToPositionId)
                .level(level)
                .jobFamily(jobFamily)
                .headcount(headcount != null ? headcount : 1)
                .gradeMin(gradeMin)
                .gradeMax(gradeMax)
                .requiredSkills(requiredSkills)
                .responsibilities(responsibilities)
                .isCritical(isCritical != null ? isCritical : false)
                .location(location)
                .build();
    }
}
