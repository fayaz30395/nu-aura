package com.nulogic.application.resourcemanagement.service;

import com.nulogic.api.resourcemanagement.ResourcePoolController.CreatePoolRequest;
import com.nulogic.api.resourcemanagement.ResourcePoolController.CreatePoolResponse;
import com.nulogic.api.resourcemanagement.ResourcePoolController.ResourcePoolSummary;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.audit.AuditLog.AuditAction;
import com.nulogic.domain.resourcemanagement.ResourcePool;
import com.nulogic.domain.resourcemanagement.ResourcePoolMember;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.resourcemanagement.repository.ResourcePoolMemberRepository;
import com.nulogic.infrastructure.resourcemanagement.repository.ResourcePoolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Backing service for {@link com.nulogic.api.resourcemanagement.ResourcePoolController}
 * (UC-RESOURCE-006). Replaces the former stub responses with real persistence
 * against {@code resource_pools} / {@code resource_pool_members} (V317).
 */
@Service
@RequiredArgsConstructor
public class ResourcePoolService {

    private final ResourcePoolRepository poolRepository;
    private final ResourcePoolMemberRepository memberRepository;
    private final EmployeeRepository employeeRepository;
    private final AuditLogService auditLogService;
    private final TenantTimeService tenantTimeService;

    @Transactional(readOnly = true)
    public Page<ResourcePoolSummary> listPools(String poolType, Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        Page<ResourcePool> pools = poolType != null
                ? poolRepository.findAllByTenantIdAndPoolType(
                        tenantId, ResourcePool.PoolType.valueOf(poolType.toUpperCase()), pageable)
                : poolRepository.findAllByTenantId(tenantId, pageable);
        return pools.map(this::toSummary);
    }

    @Transactional
    public CreatePoolResponse createPool(CreatePoolRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        ResourcePool pool = ResourcePool.builder()
                .name(request.getName())
                .description(request.getDescription())
                .poolType(ResourcePool.PoolType.valueOf(
                        (request.getPoolType() != null ? request.getPoolType() : "SHARED").toUpperCase()))
                .isActive(true)
                .build();
        pool.setTenantId(tenantId);
        pool = poolRepository.save(pool);

        int memberCount = 0;
        if (request.getMemberEmployeeIds() != null && !request.getMemberEmployeeIds().isEmpty()) {
            memberCount = addMembersInternal(pool.getId(), request.getMemberEmployeeIds(), tenantId);
        }

        auditLogService.logAction("RESOURCE_POOL", pool.getId(), AuditAction.CREATE, null, pool,
                "Resource pool created: " + pool.getName());

        CreatePoolResponse response = new CreatePoolResponse();
        response.setId(pool.getId());
        response.setName(pool.getName());
        response.setDescription(pool.getDescription());
        response.setPoolType(pool.getPoolType().name());
        response.setMemberCount(memberCount);
        response.setActive(pool.getIsActive());
        response.setCreatedAt(pool.getCreatedAt() != null ? pool.getCreatedAt().toString() : null);
        response.setMessage("Resource pool created.");
        return response;
    }

    @Transactional(readOnly = true)
    public ResourcePoolSummary getPool(UUID id) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        ResourcePool pool = poolRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource pool not found"));
        return toSummary(pool);
    }

    @Transactional(readOnly = true)
    public Page<com.nulogic.api.resourcemanagement.ResourcePoolController.ResourcePoolMember> getPoolMembers(
            UUID poolId, Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        poolRepository.findByIdAndTenantId(poolId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource pool not found"));

        return memberRepository.findAllByTenantIdAndPoolId(tenantId, poolId, pageable)
                .map(this::toMemberDto);
    }

    @Transactional
    public int addMembers(UUID poolId, List<UUID> employeeIds) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        poolRepository.findByIdAndTenantId(poolId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource pool not found"));

        int added = addMembersInternal(poolId, employeeIds, tenantId);

        auditLogService.logAction("RESOURCE_POOL", poolId, AuditAction.UPDATE, null,
                Map.of("addedMemberCount", added), "Members added to resource pool");
        return added;
    }

    @Transactional
    public void removeMember(UUID poolId, UUID employeeId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        poolRepository.findByIdAndTenantId(poolId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource pool not found"));
        ResourcePoolMember member = memberRepository.findByTenantIdAndPoolIdAndEmployeeId(tenantId, poolId, employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee is not a member of this pool"));

        memberRepository.delete(member);

        auditLogService.logAction("RESOURCE_POOL", poolId, AuditAction.UPDATE, member, null,
                "Member removed from resource pool: employeeId=" + employeeId);
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    /**
     * Adds the given employee IDs to the pool, skipping IDs that do not
     * resolve to an existing employee in this tenant or are already members
     * (idempotent add, matches DB unique constraint on pool_id+employee_id).
     */
    private int addMembersInternal(UUID poolId, List<UUID> employeeIds, UUID tenantId) {
        int added = 0;
        for (UUID employeeId : employeeIds) {
            if (!employeeRepository.existsByIdAndTenantId(employeeId, tenantId)) {
                continue;
            }
            if (memberRepository.existsByTenantIdAndPoolIdAndEmployeeId(tenantId, poolId, employeeId)) {
                continue;
            }
            ResourcePoolMember member = ResourcePoolMember.builder()
                    .poolId(poolId)
                    .employeeId(employeeId)
                    .joinedPoolAt(tenantTimeService.now(tenantId))
                    .build();
            member.setTenantId(tenantId);
            memberRepository.save(member);
            added++;
        }
        return added;
    }

    private ResourcePoolSummary toSummary(ResourcePool pool) {
        UUID tenantId = pool.getTenantId();
        ResourcePoolSummary summary = new ResourcePoolSummary();
        summary.setId(pool.getId());
        summary.setName(pool.getName());
        summary.setDescription(pool.getDescription());
        summary.setPoolType(pool.getPoolType().name());
        summary.setMemberCount((int) memberRepository.countByTenantIdAndPoolId(tenantId, pool.getId()));
        summary.setActive(Boolean.TRUE.equals(pool.getIsActive()));
        summary.setCreatedAt(pool.getCreatedAt() != null ? pool.getCreatedAt().toString() : null);
        return summary;
    }

    private com.nulogic.api.resourcemanagement.ResourcePoolController.ResourcePoolMember toMemberDto(
            ResourcePoolMember member) {
        com.nulogic.api.resourcemanagement.ResourcePoolController.ResourcePoolMember dto =
                new com.nulogic.api.resourcemanagement.ResourcePoolController.ResourcePoolMember();
        dto.setEmployeeId(member.getEmployeeId());
        employeeRepository.findByIdAndTenantId(member.getEmployeeId(), member.getTenantId())
                .ifPresent(emp -> {
                    dto.setEmployeeName(emp.getFullName());
                    dto.setDesignation(emp.getDesignation());
                });
        // ponytail: no existing reusable allocation-percentage lookup was found for this
        // grouping concept (ResourceManagementService.getEmployeeCapacity computes it but
        // is project-allocation-scoped, not pool-scoped) — left at 0 as a fast-follow
        // rather than inventing new allocation logic here (out of scope: persistence only).
        dto.setCurrentAllocationPercent(0);
        dto.setAvailablePercent(0);
        dto.setJoinedPoolAt(member.getJoinedPoolAt() != null ? member.getJoinedPoolAt().toString() : null);
        return dto;
    }
}
