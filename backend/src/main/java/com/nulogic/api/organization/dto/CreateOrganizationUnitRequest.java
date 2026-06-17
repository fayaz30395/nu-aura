package com.nulogic.api.organization.dto;

import com.nulogic.domain.organization.OrganizationUnit;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Request body for POST /api/v1/organization/units.
 *
 * <p>Replaces direct {@link OrganizationUnit} entity binding so that server-managed
 * fields (id, tenantId, audit timestamps, version) can never be supplied by a client.</p>
 */
public record CreateOrganizationUnitRequest(
        @NotBlank String name,
        @NotBlank String code,
        String description,
        @NotNull OrganizationUnit.UnitType type,
        UUID parentId,
        UUID headId,
        Integer sortOrder,
        String costCenter,
        String location
) {
    public OrganizationUnit toEntity() {
        return OrganizationUnit.builder()
                .name(name)
                .code(code)
                .description(description)
                .type(type)
                .parentId(parentId)
                .headId(headId)
                .sortOrder(sortOrder)
                .costCenter(costCenter)
                .location(location)
                .build();
    }
}
