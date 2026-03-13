package com.hrms.application.knowledge.service;

import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.WikiSpace;
import com.hrms.infrastructure.knowledge.repository.WikiPageRepository;
import com.hrms.infrastructure.knowledge.repository.WikiSpaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class WikiSpaceService {

    private final WikiSpaceRepository wikiSpaceRepository;
    private final WikiPageRepository wikiPageRepository;

    public WikiSpace createSpace(WikiSpace space) {
        UUID tenantId = TenantContext.getCurrentTenant();
        space.setTenantId(tenantId);
        space.setIsArchived(false);

        WikiSpace saved = wikiSpaceRepository.save(space);
        log.info("Created wiki space: {}", saved.getId());
        return saved;
    }

    public WikiSpace updateSpace(UUID spaceId, WikiSpace spaceData) {
        UUID tenantId = TenantContext.getCurrentTenant();

        WikiSpace space = wikiSpaceRepository.findById(spaceId)
            .filter(s -> s.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Wiki space not found"));

        space.setName(spaceData.getName());
        space.setDescription(spaceData.getDescription());
        space.setSlug(spaceData.getSlug());
        space.setIcon(spaceData.getIcon());
        space.setVisibility(spaceData.getVisibility());
        space.setColor(spaceData.getColor());
        space.setOrderIndex(spaceData.getOrderIndex());

        WikiSpace updated = wikiSpaceRepository.save(space);
        log.info("Updated wiki space: {}", spaceId);
        return updated;
    }

    @Transactional(readOnly = true)
    public WikiSpace getSpaceById(UUID spaceId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiSpaceRepository.findById(spaceId)
            .filter(s -> s.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Wiki space not found"));
    }

    @Transactional(readOnly = true)
    public WikiSpace getSpaceBySlug(String slug) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiSpaceRepository.findByTenantIdAndSlug(tenantId, slug)
            .orElseThrow(() -> new IllegalArgumentException("Wiki space not found"));
    }

    @Transactional(readOnly = true)
    public Page<WikiSpace> getAllSpaces(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiSpaceRepository.findByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public List<WikiSpace> getActiveSpaces() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiSpaceRepository.findActiveSpacesByTenant(tenantId);
    }

    public WikiSpace archiveSpace(UUID spaceId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        WikiSpace space = wikiSpaceRepository.findById(spaceId)
            .filter(s -> s.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Wiki space not found"));

        space.setIsArchived(true);
        space.setArchivedAt(LocalDateTime.now());
        space.setArchivedBy(userId);

        WikiSpace updated = wikiSpaceRepository.save(space);
        log.info("Archived wiki space: {}", spaceId);
        return updated;
    }

    public void deleteSpace(UUID spaceId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        WikiSpace space = wikiSpaceRepository.findById(spaceId)
            .filter(s -> s.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Wiki space not found"));

        wikiSpaceRepository.delete(space);
        log.info("Deleted wiki space: {}", spaceId);
    }

    @Transactional(readOnly = true)
    public long getPageCountBySpace(UUID spaceId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiPageRepository.countByTenantIdAndSpaceId(tenantId, spaceId);
    }
}
