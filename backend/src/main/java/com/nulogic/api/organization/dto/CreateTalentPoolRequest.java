package com.nulogic.api.organization.dto;

import com.nulogic.domain.organization.TalentPool;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

/**
 * Request body for POST /api/v1/organization/talent-pools.
 *
 * <p>Replaces direct {@link TalentPool} entity binding so that server-managed
 * fields (id, tenantId, audit timestamps, version, memberCount) can never be
 * supplied by a client.</p>
 */
public record CreateTalentPoolRequest(
        @NotBlank String name,
        String description,
        TalentPool.PoolType type,
        String criteria,
        UUID ownerId
) {
    public TalentPool toEntity() {
        return TalentPool.builder()
                .name(name)
                .description(description)
                .type(type)
                .criteria(criteria)
                .ownerId(ownerId)
                .build();
    }
}
