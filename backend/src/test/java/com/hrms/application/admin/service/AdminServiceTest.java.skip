package com.hrms.application.admin.service;

import com.hrms.api.admin.dto.AdminStatsResponse;
import com.hrms.api.admin.dto.AdminUserResponse;
import com.hrms.api.admin.dto.UpdateUserRoleRequest;
import com.hrms.api.user.dto.RoleResponse;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.exception.ValidationException;
import com.hrms.domain.audit.AuditLog;
import com.hrms.domain.tenant.Tenant;
import com.hrms.domain.user.Role;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.tenant.repository.TenantRepository;
import com.hrms.infrastructure.user.repository.RoleRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.infrastructure.workflow.repository.WorkflowExecutionRepository;
import com.hrms.application.audit.service.AuditLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminService Tests")
class AdminServiceTest {

    @Mock
    private TenantRepository tenantRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private WorkflowExecutionRepository workflowExecutionRepository;

    @InjectMocks
    private AdminService adminService;

    private UUID tenantId;
    private UUID userId;
    private UUID roleId;
    private User testUser;
    private Role testRole;
    private Tenant testTenant;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();
        roleId = UUID.randomUUID();

        // Setup test tenant
        testTenant = Tenant.builder()
                .id(tenantId)
                .name("Test Tenant")
                .build();

        // Setup test role
        testRole = Role.builder()
                .id(roleId)
                .code("HR_ADMIN")
                .name("HR Admin")
                .description("Human Resources Admin")
                .tenantId(tenantId)
                .isSystemRole(false)
                .permissions(new HashSet<>())
                .build();

        // Setup test user
        testUser = User.builder()
                .id(userId)
                .email("testuser@company.com")
                .firstName("John")
                .lastName("Doe")
                .tenantId(tenantId)
                .status(User.UserStatus.ACTIVE)
                .roles(new HashSet<>(Collections.singletonList(testRole)))
                .lastLoginAt(Instant.now())
                .createdAt(Instant.now())
                .build();
    }

    @Nested
    @DisplayName("GetGlobalStats Tests")
    class GetGlobalStatsTests {

        @Test
        @DisplayName("Should return global statistics aggregating across all tenants")
        void shouldReturnGlobalStats() {
            // Arrange
            when(tenantRepository.count()).thenReturn(5L);
            when(employeeRepository.count()).thenReturn(150L);
            when(userRepository.countByStatus(User.UserStatus.ACTIVE)).thenReturn(45L);
            when(workflowExecutionRepository.countAllPendingCrossTenant()).thenReturn(12L);

            // Act
            AdminStatsResponse stats = adminService.getGlobalStats();

            // Assert
            assertThat(stats)
                    .isNotNull()
                    .extracting(
                            AdminStatsResponse::getTotalTenants,
                            AdminStatsResponse::getTotalEmployees,
                            AdminStatsResponse::getActiveUsers,
                            AdminStatsResponse::getPendingApprovals
                    )
                    .containsExactly(5L, 150L, 45L, 12L);

            verify(tenantRepository, times(1)).count();
            verify(employeeRepository, times(1)).count();
            verify(userRepository, times(1)).countByStatus(User.UserStatus.ACTIVE);
            verify(workflowExecutionRepository, times(1)).countAllPendingCrossTenant();
        }

        @Test
        @DisplayName("Should handle exception when counting pending approvals")
        void shouldHandleExceptionWhenCountingPendingApprovals() {
            // Arrange
            when(tenantRepository.count()).thenReturn(3L);
            when(employeeRepository.count()).thenReturn(80L);
            when(userRepository.countByStatus(User.UserStatus.ACTIVE)).thenReturn(25L);
            when(workflowExecutionRepository.countAllPendingCrossTenant())
                    .thenThrow(new RuntimeException("Database error"));

            // Act
            AdminStatsResponse stats = adminService.getGlobalStats();

            // Assert
            assertThat(stats)
                    .isNotNull()
                    .extracting(AdminStatsResponse::getPendingApprovals)
                    .isEqualTo(0L);
        }

        @Test
        @DisplayName("Should return zero counts for empty system")
        void shouldReturnZeroCountsForEmptySystem() {
            // Arrange
            when(tenantRepository.count()).thenReturn(0L);
            when(employeeRepository.count()).thenReturn(0L);
            when(userRepository.countByStatus(User.UserStatus.ACTIVE)).thenReturn(0L);
            when(workflowExecutionRepository.countAllPendingCrossTenant()).thenReturn(0L);

            // Act
            AdminStatsResponse stats = adminService.getGlobalStats();

            // Assert
            assertThat(stats)
                    .isNotNull()
                    .extracting(
                            AdminStatsResponse::getTotalTenants,
                            AdminStatsResponse::getTotalEmployees,
                            AdminStatsResponse::getActiveUsers,
                            AdminStatsResponse::getPendingApprovals
                    )
                    .containsExactly(0L, 0L, 0L, 0L);
        }
    }

    @Nested
    @DisplayName("GetAllUsers Tests")
    class GetAllUsersTests {

        @Test
        @DisplayName("Should return paginated list of all users with tenant information")
        void shouldReturnAllUsersWithTenantInfo() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);
            UUID secondTenantId = UUID.randomUUID();

            User secondUser = User.builder()
                    .id(UUID.randomUUID())
                    .email("seconduser@company.com")
                    .firstName("Jane")
                    .lastName("Smith")
                    .tenantId(secondTenantId)
                    .status(User.UserStatus.ACTIVE)
                    .roles(new HashSet<>())
                    .lastLoginAt(Instant.now())
                    .createdAt(Instant.now())
                    .build();

            Tenant secondTenant = Tenant.builder()
                    .id(secondTenantId)
                    .name("Second Tenant")
                    .build();

            List<User> users = Arrays.asList(testUser, secondUser);
            Page<User> usersPage = new PageImpl<>(users, pageable, 2);

            when(userRepository.findAll(pageable)).thenReturn(usersPage);
            when(tenantRepository.findAllById(any())).thenReturn(Arrays.asList(testTenant, secondTenant));

            // Act
            Page<AdminUserResponse> result = adminService.getAllUsers(pageable);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .hasSize(2);

            assertThat(result.getContent())
                    .extracting(AdminUserResponse::getEmail)
                    .containsExactly("testuser@company.com", "seconduser@company.com");

            assertThat(result.getContent())
                    .extracting(AdminUserResponse::getTenantName)
                    .containsExactly("Test Tenant", "Second Tenant");

            verify(userRepository, times(1)).findAll(pageable);
            verify(tenantRepository, times(1)).findAllById(any());
        }

        @Test
        @DisplayName("Should handle empty user list")
        void shouldHandleEmptyUserList() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);
            Page<User> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);

            when(userRepository.findAll(pageable)).thenReturn(emptyPage);

            // Act
            Page<AdminUserResponse> result = adminService.getAllUsers(pageable);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .isEmpty();

            verify(userRepository, times(1)).findAll(pageable);
        }

        @Test
        @DisplayName("Should map user fields correctly to AdminUserResponse")
        void shouldMapUserFieldsCorrectly() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);
            Page<User> usersPage = new PageImpl<>(Collections.singletonList(testUser), pageable, 1);

            when(userRepository.findAll(pageable)).thenReturn(usersPage);
            when(tenantRepository.findAllById(any())).thenReturn(Collections.singletonList(testTenant));

            // Act
            Page<AdminUserResponse> result = adminService.getAllUsers(pageable);
            AdminUserResponse userResponse = result.getContent().get(0);

            // Assert
            assertThat(userResponse)
                    .extracting(
                            AdminUserResponse::getId,
                            AdminUserResponse::getEmail,
                            AdminUserResponse::getFirstName,
                            AdminUserResponse::getLastName,
                            AdminUserResponse::getUserStatus,
                            AdminUserResponse::getTenantId,
                            AdminUserResponse::getTenantName
                    )
                    .containsExactly(
                            userId,
                            "testuser@company.com",
                            "John",
                            "Doe",
                            "ACTIVE",
                            tenantId,
                            "Test Tenant"
                    );
        }
    }

    @Nested
    @DisplayName("UpdateUserRole Tests")
    class UpdateUserRoleTests {

        @Test
        @DisplayName("Should update user roles successfully")
        void shouldUpdateUserRoleSuccessfully() {
            // Arrange
            UpdateUserRoleRequest request = new UpdateUserRoleRequest();
            request.setRoleCodes(Arrays.asList("HR_ADMIN", "EMPLOYEE"));

            Role secondRole = Role.builder()
                    .id(UUID.randomUUID())
                    .code("EMPLOYEE")
                    .name("Employee")
                    .description("Employee Role")
                    .tenantId(tenantId)
                    .isSystemRole(true)
                    .permissions(new HashSet<>())
                    .build();

            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
            when(roleRepository.findByCodeInAndTenantId(
                    Arrays.asList("HR_ADMIN", "EMPLOYEE"), tenantId))
                    .thenReturn(Arrays.asList(testRole, secondRole));
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(testTenant));

            // Act
            AdminUserResponse result = adminService.updateUserRole(userId, request);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(AdminUserResponse::getId, AdminUserResponse::getEmail)
                    .containsExactly(userId, "testuser@company.com");

            verify(userRepository, times(1)).findById(userId);
            verify(roleRepository, times(1)).findByCodeInAndTenantId(any(), eq(tenantId));
            verify(userRepository, times(1)).save(any(User.class));
            verify(auditLogService, times(1)).logAction(
                    eq("USER"),
                    eq(userId),
                    eq(AuditLog.AuditAction.UPDATE),
                    any(Map.class),
                    any(Map.class),
                    anyString());
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when user not found")
        void shouldThrowExceptionWhenUserNotFound() {
            // Arrange
            UpdateUserRoleRequest request = new UpdateUserRoleRequest();
            request.setRoleCodes(Arrays.asList("HR_ADMIN"));

            when(userRepository.findById(userId)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> adminService.updateUserRole(userId, request))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("User not found");

            verify(userRepository, times(1)).findById(userId);
            verify(roleRepository, never()).findByCodeInAndTenantId(any(), any());
        }

        @Test
        @DisplayName("Should throw ValidationException when role codes are invalid")
        void shouldThrowExceptionWhenRoleCodesInvalid() {
            // Arrange
            UpdateUserRoleRequest request = new UpdateUserRoleRequest();
            request.setRoleCodes(Arrays.asList("HR_ADMIN", "INVALID_ROLE", "ANOTHER_INVALID"));

            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
            when(roleRepository.findByCodeInAndTenantId(
                    request.getRoleCodes(), tenantId))
                    .thenReturn(Collections.singletonList(testRole)); // Only 1 of 3 found

            // Act & Assert
            assertThatThrownBy(() -> adminService.updateUserRole(userId, request))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("One or more role codes are invalid");

            verify(userRepository, times(1)).findById(userId);
            verify(roleRepository, times(1)).findByCodeInAndTenantId(any(), eq(tenantId));
            verify(userRepository, never()).save(any(User.class));
        }

        @Test
        @DisplayName("Should handle tenant not found gracefully")
        void shouldHandleTenantNotFoundGracefully() {
            // Arrange
            UpdateUserRoleRequest request = new UpdateUserRoleRequest();
            request.setRoleCodes(Collections.singletonList("HR_ADMIN"));

            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
            when(roleRepository.findByCodeInAndTenantId(
                    request.getRoleCodes(), tenantId))
                    .thenReturn(Collections.singletonList(testRole));
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.empty());

            // Act
            AdminUserResponse result = adminService.updateUserRole(userId, request);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(AdminUserResponse::getTenantName)
                    .isEqualTo("Unknown");
        }

        @Test
        @DisplayName("Should capture old roles in audit log")
        void shouldCaptureOldRolesInAuditLog() {
            // Arrange
            UpdateUserRoleRequest request = new UpdateUserRoleRequest();
            request.setRoleCodes(Collections.singletonList("HR_ADMIN"));

            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
            when(roleRepository.findByCodeInAndTenantId(
                    request.getRoleCodes(), tenantId))
                    .thenReturn(Collections.singletonList(testRole));
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(testTenant));

            // Act
            adminService.updateUserRole(userId, request);

            // Assert
            verify(auditLogService, times(1)).logAction(
                    eq("USER"),
                    any(),
                    eq(AuditLog.AuditAction.UPDATE),
                    argThat(map -> map.containsKey("roles")),
                    argThat(map -> map.containsKey("roles")),
                    anyString());
        }
    }
}
