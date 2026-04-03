package com.hrms.application.admin.service;

import com.hrms.api.admin.dto.AdminStatsResponse;
import com.hrms.api.admin.dto.AdminUserResponse;
import com.hrms.api.admin.dto.UpdateUserRoleRequest;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.exception.ValidationException;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.employee.Department;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.tenant.Tenant;
import com.hrms.domain.user.Role;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.tenant.repository.TenantRepository;
import com.hrms.infrastructure.user.repository.RoleRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.infrastructure.workflow.repository.WorkflowExecutionRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AdminService Tests")
class AdminServiceTest {

    @Mock
    private TenantRepository tenantRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private com.hrms.application.audit.service.AuditLogService auditLogService;
    @Mock
    private WorkflowExecutionRepository workflowExecutionRepository;

    @InjectMocks
    private AdminService adminService;

    // ==================== getPlatformSettings ====================

    @Test
    @DisplayName("getPlatformSettings should return platform configuration")
    void shouldGetPlatformSettings() {
        when(tenantRepository.count()).thenReturn(3L);
        when(userRepository.count()).thenReturn(100L);
        when(employeeRepository.count()).thenReturn(90L);
        when(departmentRepository.count()).thenReturn(10L);

        Map<String, Object> settings = adminService.getPlatformSettings();

        assertThat(settings.get("platform")).isEqualTo("NU-AURA HRMS");
        assertThat(settings.get("totalTenants")).isEqualTo(3L);
        assertThat(settings.get("totalUsers")).isEqualTo(100L);
        assertThat(settings.get("totalEmployees")).isEqualTo(90L);
        assertThat(settings.get("multiTenancy")).isEqualTo(true);
    }

    // ==================== getGlobalStats ====================

    @Test
    @DisplayName("getAllUsers should return users with tenant and department info")
    void shouldGetAllUsers() {
        UUID tenantIdVal = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        User user = new User();
        user.setId(userId);
        user.setEmail("test@example.com");
        user.setFirstName("John");
        user.setLastName("Doe");
        user.setStatus(User.UserStatus.ACTIVE);
        user.setTenantId(tenantIdVal);
        user.setRoles(new HashSet<>());

        Page<User> userPage = new PageImpl<>(List.of(user));
        when(userRepository.findAll(any(PageRequest.class))).thenReturn(userPage);

        Tenant tenant = new Tenant();
        tenant.setId(tenantIdVal);
        tenant.setName("Acme Corp");
        when(tenantRepository.findAllById(anySet())).thenReturn(List.of(tenant));
        when(employeeRepository.findAllByUserIdIn(anySet())).thenReturn(List.of());

        Page<AdminUserResponse> result = adminService.getAllUsers(PageRequest.of(0, 10));

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getEmail()).isEqualTo("test@example.com");
        assertThat(result.getContent().get(0).getTenantName()).isEqualTo("Acme Corp");
    }

    // ==================== getAllUsers ====================

    @Nested
    @DisplayName("getGlobalStats")
    class GetGlobalStatsTests {

        @Test
        @DisplayName("Should return aggregated statistics")
        void shouldReturnAggregatedStats() {
            when(tenantRepository.count()).thenReturn(5L);
            when(employeeRepository.count()).thenReturn(500L);
            when(userRepository.countByStatus(User.UserStatus.ACTIVE)).thenReturn(450L);
            when(workflowExecutionRepository.countAllPendingCrossTenant()).thenReturn(12L);

            AdminStatsResponse result = adminService.getGlobalStats();

            assertThat(result.getTotalTenants()).isEqualTo(5L);
            assertThat(result.getTotalEmployees()).isEqualTo(500L);
            assertThat(result.getActiveUsers()).isEqualTo(450L);
            assertThat(result.getPendingApprovals()).isEqualTo(12L);
        }

        @Test
        @DisplayName("Should handle pending approvals error gracefully")
        void shouldHandlePendingApprovalsError() {
            when(tenantRepository.count()).thenReturn(1L);
            when(employeeRepository.count()).thenReturn(10L);
            when(userRepository.countByStatus(User.UserStatus.ACTIVE)).thenReturn(8L);
            when(workflowExecutionRepository.countAllPendingCrossTenant())
                    .thenThrow(new RuntimeException("DB error"));

            AdminStatsResponse result = adminService.getGlobalStats();

            assertThat(result.getPendingApprovals()).isEqualTo(0L);
        }
    }

    // ==================== updateUserRole ====================

    @Nested
    @DisplayName("updateUserRole")
    class UpdateUserRoleTests {

        private static MockedStatic<SecurityContext> securityContextMock;

        @BeforeAll
        static void setUpSecurity() {
            securityContextMock = mockStatic(SecurityContext.class);
        }

        @AfterAll
        static void tearDownSecurity() {
            securityContextMock.close();
        }

        @Test
        @DisplayName("Should update user roles when authorized")
        void shouldUpdateUserRoles() {
            securityContextMock.when(SecurityContext::isSuperAdmin).thenReturn(true);

            UUID userId = UUID.randomUUID();
            UUID tenantIdVal = UUID.randomUUID();

            User user = new User();
            user.setId(userId);
            user.setEmail("user@example.com");
            user.setFirstName("Jane");
            user.setLastName("Doe");
            user.setStatus(User.UserStatus.ACTIVE);
            user.setTenantId(tenantIdVal);
            user.setRoles(new HashSet<>());

            Role hrRole = new Role();
            hrRole.setId(UUID.randomUUID());
            hrRole.setCode("HR_ADMIN");
            hrRole.setName("HR Admin");
            hrRole.setIsSystemRole(true);
            hrRole.setTenantId(tenantIdVal);
            hrRole.setPermissions(new HashSet<>());

            UpdateUserRoleRequest request = new UpdateUserRoleRequest();
            request.setRoleCodes(Set.of("HR_ADMIN"));

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(roleRepository.findByCodeInAndTenantId(Set.of("HR_ADMIN"), tenantIdVal)).thenReturn(List.of(hrRole));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
            when(tenantRepository.findById(tenantIdVal)).thenReturn(Optional.of(new Tenant()));
            when(employeeRepository.findByUserIdAndTenantId(userId, tenantIdVal)).thenReturn(Optional.empty());

            AdminUserResponse result = adminService.updateUserRole(userId, request);

            assertThat(result.getEmail()).isEqualTo("user@example.com");
            verify(auditLogService).logAction(anyString(), any(), any(), anyMap(), anyMap(), anyString());
        }

        @Test
        @DisplayName("Should throw when non-SuperAdmin assigns privileged role")
        void shouldThrowWhenNonSuperAdminAssignsPrivilegedRole() {
            securityContextMock.when(SecurityContext::isSuperAdmin).thenReturn(false);

            UpdateUserRoleRequest request = new UpdateUserRoleRequest();
            request.setRoleCodes(Set.of("SUPER_ADMIN"));

            assertThatThrownBy(() -> adminService.updateUserRole(UUID.randomUUID(), request))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("privileged roles");
        }

        @Test
        @DisplayName("Should throw when user not found")
        void shouldThrowWhenUserNotFound() {
            securityContextMock.when(SecurityContext::isSuperAdmin).thenReturn(true);

            UUID userId = UUID.randomUUID();
            UpdateUserRoleRequest request = new UpdateUserRoleRequest();
            request.setRoleCodes(Set.of("HR_ADMIN"));

            when(userRepository.findById(userId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> adminService.updateUserRole(userId, request))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("Should throw when role codes are invalid")
        void shouldThrowWhenRoleCodesInvalid() {
            securityContextMock.when(SecurityContext::isSuperAdmin).thenReturn(true);

            UUID userId = UUID.randomUUID();
            UUID tenantIdVal = UUID.randomUUID();

            User user = new User();
            user.setId(userId);
            user.setTenantId(tenantIdVal);
            user.setRoles(new HashSet<>());

            UpdateUserRoleRequest request = new UpdateUserRoleRequest();
            request.setRoleCodes(Set.of("HR_ADMIN", "NONEXISTENT"));

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(roleRepository.findByCodeInAndTenantId(anySet(), eq(tenantIdVal))).thenReturn(List.of());

            assertThatThrownBy(() -> adminService.updateUserRole(userId, request))
                    .isInstanceOf(ValidationException.class);
        }
    }
}
