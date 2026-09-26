package com.nulogic.application.admin.service;

import com.nulogic.api.admin.dto.UpdateUserRoleRequest;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.PermissionCacheEvictor;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.domain.tenant.Tenant;
import com.nulogic.domain.user.Role;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.employee.repository.DepartmentRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.tenant.repository.TenantRepository;
import com.nulogic.infrastructure.user.repository.RoleRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import com.nulogic.infrastructure.workflow.repository.WorkflowExecutionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * {@code AdminService.updateUserRole} must invalidate the authorization cache.
 *
 * <p>It is the second path that mutates a user's explicit roles (the first is
 * {@code RoleManagementService.assignRolesToUser}). Because
 * {@code SecurityService.getCachedPermissionScopesForUser} is {@code @Cacheable} under a key that
 * deliberately omits the role codes, an un-evicted demotion here keeps serving the OLD role's
 * authorities for the full 15-minute TTL — including across a re-login.
 *
 * <p>This replaces an earlier assertion that the method carried
 * {@code @CacheEvict(allEntries = true)}. The annotation was removed on purpose: it fires relative
 * to advisor ordering, and {@code CacheEvictTransactionOrderingTest} shows that ordering is
 * unspecified here (both advisors sit at {@code LOWEST_PRECEDENCE}). The eviction is now an
 * explicit {@link PermissionCacheEvictor} call, which defers itself to after commit. So the test
 * asserts the BEHAVIOUR — that the eviction is requested — rather than the annotation shape.</p>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AdminService.updateUserRole authorization-cache invalidation")
class AdminServiceRoleUpdateCacheEvictionTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("48000000-e001-0000-0000-0000000000a1");
    private static final UUID ACTOR_ID = UUID.fromString("48000000-e001-0000-0000-0000000000ff");

    @Mock private TenantRepository tenantRepository;
    @Mock private UserRepository userRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private DepartmentRepository departmentRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private AuditLogService auditLogService;
    @Mock private WorkflowExecutionRepository workflowExecutionRepository;
    @Mock private PermissionCacheEvictor permissionCacheEvictor;

    @InjectMocks private AdminService adminService;

    @BeforeEach
    void setUp() {
        // SuperAdmin actor: the method refuses privileged assignment otherwise.
        SecurityContext.setCurrentUser(ACTOR_ID, null, Set.of("SUPER_ADMIN"),
                Map.of(Permission.SYSTEM_ADMIN, RoleScope.ALL));
        SecurityContext.setCurrentTenantId(TENANT_ID);

        User target = new User();
        target.setId(USER_ID);
        target.setEmail("demoted@nulogic.io");
        target.setTenantId(TENANT_ID);
        target.setStatus(User.UserStatus.ACTIVE);
        target.setRoles(new HashSet<>(Set.of(role("HR_ADMIN"))));

        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(target));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(roleRepository.findByCodeInAndTenantId(anyCollection(), any()))
                .thenReturn(List.of(role("EMPLOYEE")));

        Tenant tenant = new Tenant();
        tenant.setId(TENANT_ID);
        tenant.setName("NuLogic");
        when(tenantRepository.findById(TENANT_ID)).thenReturn(Optional.of(tenant));
        when(employeeRepository.findByUserIdAndTenantId(any(), any())).thenReturn(Optional.empty());
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    private static Role role(String code) {
        Role role = new Role();
        role.setId(UUID.randomUUID());
        role.setCode(code);
        role.setName(code);
        return role;
    }

    @Test
    @DisplayName("a demotion through the admin API requests an authorization-cache eviction")
    void demotionEvictsAuthorizationCache() {
        UpdateUserRoleRequest request = new UpdateUserRoleRequest();
        request.setRoleCodes(Set.of("EMPLOYEE"));

        adminService.updateUserRole(USER_ID, request);

        // allEntries: a role's permission set is shared by every holder, and the role-keyed entries
        // are not reachable from the user key.
        verify(permissionCacheEvictor).evictAllPermissions();
    }

    @Test
    @DisplayName("a rejected privilege escalation evicts nothing — no role was changed")
    void rejectedEscalationDoesNotEvict() {
        // Non-SuperAdmin actor attempting to grant SUPER_ADMIN.
        SecurityContext.setCurrentUser(ACTOR_ID, null, Set.of("HR_ADMIN"), Map.of());
        SecurityContext.setCurrentTenantId(TENANT_ID);

        UpdateUserRoleRequest request = new UpdateUserRoleRequest();
        request.setRoleCodes(Set.of("SUPER_ADMIN"));

        assertThat(org.assertj.core.api.Assertions.catchThrowable(
                () -> adminService.updateUserRole(USER_ID, request)))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);

        verify(permissionCacheEvictor, never()).evictAllPermissions();
        verify(permissionCacheEvictor, never()).evictUserPermissions(any(), any());
    }
}
