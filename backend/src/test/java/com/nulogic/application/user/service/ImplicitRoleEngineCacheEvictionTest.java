package com.nulogic.application.user.service;

import com.nulogic.common.security.PermissionCacheEvictor;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.user.ImplicitRoleCondition;
import com.nulogic.domain.user.ImplicitRoleRule;
import com.nulogic.domain.user.ImplicitUserRole;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.user.repository.ImplicitRoleRuleRepository;
import com.nulogic.infrastructure.user.repository.ImplicitUserRoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * SEC regression: an implicit-role change must evict the authorization cache for that user.
 *
 * <p>Since {@code SecurityService.getCachedPermissionScopesForUser} became {@code @Cacheable},
 * the permission-scope map that {@code JwtAuthenticationFilter} turns into the principal's
 * authorities is served from the {@code rolePermissions} cache for up to 15 minutes. The engine's
 * old invalidation was {@code redisTemplate.delete("permissions:{tenantId}:{userId}")} — a raw
 * key that never matched, because Spring stores those entries under
 * {@code rolePermissions::permissions:...}. A revoked implicit role therefore stayed
 * authoritative until the TTL expired.</p>
 *
 * <p>These tests pin the engine's half of the contract: that it calls the eviction path at all,
 * with the right tenant and user, and only when something actually changed.
 * {@code PermissionScopeCacheTest} pins the other half — that the key the evictor builds is the
 * same key {@code @Cacheable} wrote, and that the next lookup reflects the revocation.</p>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ImplicitRoleEngine authorization-cache invalidation")
class ImplicitRoleEngineCacheEvictionTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("48000000-e001-0000-0000-0000000000a1");
    private static final UUID EMPLOYEE_ID = UUID.fromString("48000000-e001-0000-0000-0000000000b1");
    private static final UUID MANAGER_ROLE_ID = UUID.fromString("48000000-0c01-0000-0000-000000000001");

    @Mock
    private ImplicitRoleRuleRepository ruleRepository;
    @Mock
    private ImplicitUserRoleRepository implicitUserRoleRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private PermissionCacheEvictor permissionCacheEvictor;
    @Mock
    private TenantTimeService tenantTimeService;

    @InjectMocks
    private ImplicitRoleEngine engine;

    private ImplicitRoleRule managerRule;

    @BeforeEach
    void setUp() {
        when(tenantTimeService.now(any())).thenReturn(LocalDateTime.now());

        Employee employee = Employee.builder().firstName("Ada").lastName("Lovelace").build();
        employee.setId(EMPLOYEE_ID);
        employee.setTenantId(TENANT_ID);
        when(employeeRepository.findByIdAndTenantId(EMPLOYEE_ID, TENANT_ID))
                .thenReturn(Optional.of(employee));

        managerRule = new ImplicitRoleRule();
        managerRule.setId(UUID.randomUUID());
        managerRule.setTenantId(TENANT_ID);
        managerRule.setRuleName("People managers get MANAGER");
        managerRule.setConditionType(ImplicitRoleCondition.HAS_DIRECT_REPORTS);
        managerRule.setTargetRoleId(MANAGER_ROLE_ID);
        managerRule.setScope(RoleScope.TEAM);
        when(ruleRepository.findByTenantIdAndIsActiveTrue(TENANT_ID)).thenReturn(List.of(managerRule));
    }

    private ImplicitUserRole activeManagerRole() {
        ImplicitUserRole role = new ImplicitUserRole();
        role.setUserId(USER_ID);
        role.setTenantId(TENANT_ID);
        role.setRoleId(MANAGER_ROLE_ID);
        role.setScope(RoleScope.TEAM);
        role.setDerivedFromRuleId(managerRule.getId());
        role.setIsActive(true);
        return role;
    }

    @Test
    @DisplayName("revoking an implicit role evicts that user's authorization cache")
    void revocationEvictsTheCache() {
        // The employee no longer has direct reports, so the MANAGER rule stops matching.
        when(employeeRepository.countDirectReportsByManagerId(TENANT_ID, EMPLOYEE_ID)).thenReturn(0L);
        ImplicitUserRole existing = activeManagerRole();
        when(implicitUserRoleRepository.findByUserIdAndTenantIdAndIsActiveTrue(USER_ID, TENANT_ID))
                .thenReturn(List.of(existing));

        ImplicitRoleEngine.RecomputeResult result = engine.recompute(USER_ID, EMPLOYEE_ID, TENANT_ID);

        assertThat(result.removed()).isEqualTo(1);
        assertThat(existing.getIsActive())
                .as("the role row must be deactivated")
                .isFalse();
        verify(permissionCacheEvictor).evictUserPermissions(TENANT_ID, USER_ID);
    }

    @Test
    @DisplayName("granting an implicit role evicts that user's authorization cache")
    void grantEvictsTheCache() {
        when(employeeRepository.countDirectReportsByManagerId(TENANT_ID, EMPLOYEE_ID)).thenReturn(3L);
        when(implicitUserRoleRepository.findByUserIdAndTenantIdAndIsActiveTrue(USER_ID, TENANT_ID))
                .thenReturn(List.of());

        ImplicitRoleEngine.RecomputeResult result = engine.recompute(USER_ID, EMPLOYEE_ID, TENANT_ID);

        assertThat(result.added()).isEqualTo(1);
        verify(permissionCacheEvictor).evictUserPermissions(TENANT_ID, USER_ID);
    }

    @Test
    @DisplayName("an unchanged recompute does not evict — the auth hot-path cache is not flushed for nothing")
    void unchangedRecomputeDoesNotEvict() {
        when(employeeRepository.countDirectReportsByManagerId(TENANT_ID, EMPLOYEE_ID)).thenReturn(3L);
        when(implicitUserRoleRepository.findByUserIdAndTenantIdAndIsActiveTrue(USER_ID, TENANT_ID))
                .thenReturn(List.of(activeManagerRole()));

        ImplicitRoleEngine.RecomputeResult result = engine.recompute(USER_ID, EMPLOYEE_ID, TENANT_ID);

        assertThat(result.added()).isZero();
        assertThat(result.removed()).isZero();
        assertThat(result.unchanged()).isEqualTo(1);
        verify(permissionCacheEvictor, never()).evictUserPermissions(any(), any());
    }

    @Test
    @DisplayName("eviction is addressed to the recomputed user's own tenant, never the ambient context")
    void evictionUsesTheExplicitTenantAndUser() {
        when(employeeRepository.countDirectReportsByManagerId(TENANT_ID, EMPLOYEE_ID)).thenReturn(0L);
        when(implicitUserRoleRepository.findByUserIdAndTenantIdAndIsActiveTrue(USER_ID, TENANT_ID))
                .thenReturn(List.of(activeManagerRole()));

        engine.recompute(USER_ID, EMPLOYEE_ID, TENANT_ID);

        // A tenant read from TenantContext would be null here (no context is set in this test),
        // which would build a "NO_TENANT::" key and evict nothing.
        verify(permissionCacheEvictor).evictUserPermissions(TENANT_ID, USER_ID);
        verify(permissionCacheEvictor, never()).evictUserPermissions(null, USER_ID);
    }
}
