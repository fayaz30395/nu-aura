package com.hrms.application.knowledge.service;

import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.SpaceMember;
import com.hrms.domain.knowledge.WikiSpace;
import com.hrms.infrastructure.knowledge.repository.SpaceMemberRepository;
import com.hrms.infrastructure.knowledge.repository.WikiSpaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SpacePermissionService {

    private final SpaceMemberRepository spaceMemberRepository;
    private final WikiSpaceRepository wikiSpaceRepository;

    @Transactional(readOnly = true)
    public boolean canAccessSpace(UUID userId, UUID spaceId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        WikiSpace space = wikiSpaceRepository.findById(spaceId)
                .filter(s -> s.getTenantId().equals(tenantId))
                .orElse(null);
        if (space == null) return false;
        if (space.getVisibility() == WikiSpace.VisibilityLevel.PUBLIC
                || space.getVisibility() == WikiSpace.VisibilityLevel.ORGANIZATION) {
            return true;
        }
        return spaceMemberRepository.existsByTenantIdAndSpaceIdAndUserId(tenantId, spaceId, userId);
    }

    @Transactional(readOnly = true)
    public SpaceMember.Role getSpaceRole(UUID userId, UUID spaceId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return spaceMemberRepository.findByTenantIdAndSpaceIdAndUserId(tenantId, spaceId, userId)
                .map(SpaceMember::getRole)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public boolean canEditInSpace(UUID userId, UUID spaceId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        WikiSpace space = wikiSpaceRepository.findById(spaceId)
                .filter(s -> s.getTenantId().equals(tenantId))
                .orElse(null);
        if (space == null) return false;
        if (space.getVisibility() == WikiSpace.VisibilityLevel.PUBLIC
                || space.getVisibility() == WikiSpace.VisibilityLevel.ORGANIZATION) {
            return true;
        }
        SpaceMember.Role role = getSpaceRole(userId, spaceId);
        return role == SpaceMember.Role.ADMIN || role == SpaceMember.Role.EDITOR;
    }

    @Transactional
    public SpaceMember addMember(UUID spaceId, UUID userId, SpaceMember.Role role) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Optional<SpaceMember> existing = spaceMemberRepository
                .findByTenantIdAndSpaceIdAndUserId(tenantId, spaceId, userId);
        if (existing.isPresent()) {
            SpaceMember member = existing.get();
            member.setRole(role);
            return spaceMemberRepository.save(member);
        }
        SpaceMember member = SpaceMember.builder()
                .tenantId(tenantId)
                .spaceId(spaceId)
                .userId(userId)
                .role(role)
                .addedBy(SecurityContext.getCurrentUserId())
                .addedAt(LocalDateTime.now())
                .build();
        log.info("Added member {} to space {} with role {}", userId, spaceId, role);
        return spaceMemberRepository.save(member);
    }

    @Transactional
    public SpaceMember updateMemberRole(UUID spaceId, UUID userId, SpaceMember.Role newRole) {
        UUID tenantId = TenantContext.getCurrentTenant();
        SpaceMember member = spaceMemberRepository
                .findByTenantIdAndSpaceIdAndUserId(tenantId, spaceId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found in space"));
        member.setRole(newRole);
        log.info("Updated member {} role in space {} to {}", userId, spaceId, newRole);
        return spaceMemberRepository.save(member);
    }

    @Transactional
    public void removeMember(UUID spaceId, UUID userId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        spaceMemberRepository.deleteByTenantIdAndSpaceIdAndUserId(tenantId, spaceId, userId);
        log.info("Removed member {} from space {}", userId, spaceId);
    }

    @Transactional(readOnly = true)
    public List<SpaceMember> getMembers(UUID spaceId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return spaceMemberRepository.findByTenantIdAndSpaceId(tenantId, spaceId);
    }
}
