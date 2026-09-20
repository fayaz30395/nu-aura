package com.nulogic.application.resourcemanagement.service;

import com.nulogic.api.resourcemanagement.ResourcePoolController.CreatePoolRequest;
import com.nulogic.api.resourcemanagement.ResourcePoolController.CreatePoolResponse;
import com.nulogic.api.resourcemanagement.ResourcePoolController.ResourcePoolSummary;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.resourcemanagement.ResourcePool;
import com.nulogic.domain.resourcemanagement.ResourcePoolMember;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.resourcemanagement.repository.ResourcePoolMemberRepository;
import com.nulogic.infrastructure.resourcemanagement.repository.ResourcePoolRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ResourcePoolService Tests")
class ResourcePoolServiceTest {

    @Mock
    private ResourcePoolRepository poolRepository;

    @Mock
    private ResourcePoolMemberRepository memberRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private TenantTimeService tenantTimeService;

    @InjectMocks
    private ResourcePoolService resourcePoolService;

    private UUID tenantId;
    private UUID poolId;
    private UUID employeeId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        poolId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
    }

    @Test
    @DisplayName("createPool persists a pool and audits creation")
    void createPool_persistsPoolAndAudits() {
        try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
            securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

            CreatePoolRequest request = new CreatePoolRequest();
            request.setName("Backend Guild");
            request.setPoolType("SHARED");

            ResourcePool saved = ResourcePool.builder()
                    .name("Backend Guild")
                    .poolType(ResourcePool.PoolType.SHARED)
                    .isActive(true)
                    .build();
            saved.setId(UUID.randomUUID());
            saved.setTenantId(tenantId);
            when(poolRepository.save(any(ResourcePool.class))).thenReturn(saved);

            CreatePoolResponse response = resourcePoolService.createPool(request);

            assertThat(response.getName()).isEqualTo("Backend Guild");
            assertThat(response.getPoolType()).isEqualTo("SHARED");
            assertThat(response.getMemberCount()).isZero();
            verify(poolRepository).save(any(ResourcePool.class));
            verify(auditLogService).logAction(eq("RESOURCE_POOL"), eq(saved.getId()),
                    eq(com.nulogic.domain.audit.AuditLog.AuditAction.CREATE), isNull(), any(), anyString());
        }
    }

    @Test
    @DisplayName("listPools returns tenant-scoped page")
    void listPools_returnsTenantScopedPage() {
        try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
            securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

            ResourcePool pool = ResourcePool.builder()
                    .name("Frontend Pool").poolType(ResourcePool.PoolType.SHARED).isActive(true).build();
            pool.setId(poolId);
            pool.setTenantId(tenantId);
            Pageable pageable = PageRequest.of(0, 20);
            when(poolRepository.findAllByTenantId(tenantId, pageable))
                    .thenReturn(new PageImpl<>(List.of(pool)));

            Page<ResourcePoolSummary> result = resourcePoolService.listPools(null, pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getName()).isEqualTo("Frontend Pool");
        }
    }

    @Test
    @DisplayName("getPool throws ResourceNotFoundException when pool missing")
    void getPool_missingPool_throws() {
        try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
            securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
            when(poolRepository.findByIdAndTenantId(poolId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> resourcePoolService.getPool(poolId))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Test
    @DisplayName("addMembers skips employees that do not exist in this tenant")
    void addMembers_skipsUnknownEmployees() {
        try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
            securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

            ResourcePool pool = ResourcePool.builder()
                    .name("Pool").poolType(ResourcePool.PoolType.SHARED).isActive(true).build();
            pool.setId(poolId);
            pool.setTenantId(tenantId);
            when(poolRepository.findByIdAndTenantId(poolId, tenantId)).thenReturn(Optional.of(pool));
            when(employeeRepository.existsByIdAndTenantId(employeeId, tenantId)).thenReturn(true);
            when(memberRepository.existsByTenantIdAndPoolIdAndEmployeeId(tenantId, poolId, employeeId))
                    .thenReturn(false);
            when(tenantTimeService.now(tenantId)).thenReturn(LocalDateTime.now());

            UUID unknownEmployeeId = UUID.randomUUID();
            when(employeeRepository.existsByIdAndTenantId(unknownEmployeeId, tenantId)).thenReturn(false);

            int added = resourcePoolService.addMembers(poolId, List.of(employeeId, unknownEmployeeId));

            assertThat(added).isEqualTo(1);
            verify(memberRepository, times(1)).save(any(ResourcePoolMember.class));
        }
    }

    @Test
    @DisplayName("removeMember deletes the membership and audits removal")
    void removeMember_deletesMembershipAndAudits() {
        try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
            securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

            ResourcePool pool = ResourcePool.builder()
                    .name("Pool").poolType(ResourcePool.PoolType.SHARED).isActive(true).build();
            pool.setId(poolId);
            pool.setTenantId(tenantId);
            ResourcePoolMember member = ResourcePoolMember.builder()
                    .poolId(poolId).employeeId(employeeId).joinedPoolAt(LocalDateTime.now()).build();
            member.setTenantId(tenantId);

            when(poolRepository.findByIdAndTenantId(poolId, tenantId)).thenReturn(Optional.of(pool));
            when(memberRepository.findByTenantIdAndPoolIdAndEmployeeId(tenantId, poolId, employeeId))
                    .thenReturn(Optional.of(member));

            resourcePoolService.removeMember(poolId, employeeId);

            verify(memberRepository).delete(member);
            verify(auditLogService).logAction(eq("RESOURCE_POOL"), eq(poolId),
                    eq(com.nulogic.domain.audit.AuditLog.AuditAction.UPDATE), eq(member), isNull(), anyString());
        }
    }
}
