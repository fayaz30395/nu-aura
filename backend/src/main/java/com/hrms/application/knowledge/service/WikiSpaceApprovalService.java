package com.hrms.application.knowledge.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.WikiSpace;
import com.hrms.infrastructure.knowledge.repository.WikiSpaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WikiSpaceApprovalService {

    private final WikiSpaceRepository wikiSpaceRepository;

    @Transactional(readOnly = true)
    public boolean isApprovalRequired(UUID spaceId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        WikiSpace space = wikiSpaceRepository.findById(spaceId)
                .filter(s -> s.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Wiki space not found"));

        return Boolean.TRUE.equals(space.getApprovalEnabled());
    }

    @Transactional(readOnly = true)
    public UUID getApprover(UUID spaceId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        WikiSpace space = wikiSpaceRepository.findById(spaceId)
                .filter(s -> s.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Wiki space not found"));

        if (!Boolean.TRUE.equals(space.getApprovalEnabled())) {
            return null;
        }

        return space.getApproverEmployeeId();
    }

    @Transactional
    public WikiSpace configureApproval(UUID spaceId, boolean enabled, UUID approverEmployeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        WikiSpace space = wikiSpaceRepository.findById(spaceId)
                .filter(s -> s.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Wiki space not found"));

        space.setApprovalEnabled(enabled);
        space.setApproverEmployeeId(enabled ? approverEmployeeId : null);

        WikiSpace saved = wikiSpaceRepository.save(space);
        log.info("Configured approval for wiki space {}: enabled={}, approver={}",
                spaceId, enabled, approverEmployeeId);
        return saved;
    }
}
