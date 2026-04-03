package com.hrms.application;

import com.hrms.api.user.dto.*;
import com.hrms.application.user.service.RoleManagementService;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.exception.ValidationException;
import com.hrms.common.security.RoleHierarchy;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.user.Permission;
import com.hrms.domain.user.Role;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.user.repository.PermissionRepository;
import com.hrms.infrastructure.user.repository.RoleRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.*;

import com.hrms.domain.user.RolePermission;
import com.hrms.domain.user.RoleScope;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoleManagementServiceTest {

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PermissionRepository permissionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private com.hrms.application.audit.service.AuditLogService auditLogService;

    @InjectMocks
    private RoleManagementService roleManagementService;

    private MockedStatic<SecurityContext> securityContextMock;
    private UUID tenantId;
    private UUID roleId;
    private Role role;
    private Permission permission1;
    private Permission permission2;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        roleId = UUID.randomUUID();

        // Mock SecurityContext
        securityContextMock = mockStatic(SecurityContext.class);
        securityContextMock.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

        // Create test permissions
        permission1 = new Permission();
        permission1.setId(UUID.randomUUID());
        permission1.setCode("USER_READ");
        permission1.setName("Read Users");
        permission1.setDescription("Can read user data");
        permission1.setResource("USER");
        permission1.setAction("READ");

        permission2 = new Permission();
        permission2.setId(UUID.randomUUID());
        permission2.setCode("USER_WRITE");
        permission2.setName("Write Users");
        permission2.setDescription("Can write user data");
        permission2.setResource("USER");
        permission2.setAction("WRITE");

        // Create test role
        role = new Role();
        role.setId(roleId);
        role.setCode("DEVELOPER");
        role.setName("Developer");
        role.setDescription("Developer role");
        role.setIsSystemRole(false);
        role.setTenantId(tenantId);
        role.setParentRoleId(UUID.randomUUID());

        // Create RolePermission objects for each permission
        RolePermission rp1 = RolePermission.builder()
                .role(role)
                .permission(permission1)
                .scope(RoleScope.ALL)
                .build();
        rp1.setTenantId(tenantId);

        RolePermission rp2 = RolePermission.builder()
                .role(role)
                .permission(permission2)
                .scope(RoleScope.ALL)
                .build();
        rp2.setTenantId(tenantId);

        role.setPermissions(new HashSet<>(Arrays.asList(rp1, rp2)));
        role.setCreatedAt(LocalDateTime.now());
        role.setUpdatedAt(LocalDateTime.now());
    }

    @AfterEach
    void tearDown() {
        if (securityContextMock != null) {
            securityContextMock.close();
        }
    }

    @Test
    void getAllRoles_Success() {
        // Given
        List<Role> roles = Arrays.asList(role);
        when(roleRepository.findByTenantIdWithPermissions(tenantId)).thenReturn(roles);

        // When
        List<RoleResponse> result = roleManagementService.getAllRoles();

        // Then
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCode()).isEqualTo("DEVELOPER");
        assertThat(result.get(0).getPermissions()).hasSize(2);

        verify(roleRepository).findByTenantIdWithPermissions(tenantId);
    }

    @Test
    void getRoleById_Success() {
        // Given
        when(roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId))
                .thenReturn(Optional.of(role));

        // When
        RoleResponse result = roleManagementService.getRoleById(roleId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(roleId);
        assertThat(result.getCode()).isEqualTo("DEVELOPER");
        assertThat(result.getPermissions()).hasSize(2);

        verify(roleRepository).findByIdAndTenantIdWithPermissions(roleId, tenantId);
    }

    @Test
    void getRoleById_NotFound_ThrowsException() {
        // Given
        when(roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId))
                .thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> roleManagementService.getRoleById(roleId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Role not found");

        verify(roleRepository).findByIdAndTenantIdWithPermissions(roleId, tenantId);
    }

    @Test
    void createRole_Success() {
        // Given
        CreateRoleRequest request = new CreateRoleRequest();
        request.setCode("TESTER");
        request.setName("Tester");
        request.setDescription("Tester role");
        request.setPermissionCodes(new HashSet<>(Arrays.asList("USER_READ")));

        when(roleRepository.existsByCodeAndTenantId("TESTER", tenantId)).thenReturn(false);
        when(permissionRepository.findByCodeIn(new HashSet<>(Arrays.asList("USER_READ"))))
                .thenReturn(Arrays.asList(permission1));
        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        RoleResponse result = roleManagementService.createRole(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getCode()).isEqualTo("TESTER");
        assertThat(result.getName()).isEqualTo("Tester");
        assertThat(result.getIsSystemRole()).isFalse();

        verify(roleRepository).existsByCodeAndTenantId("TESTER", tenantId);
        verify(permissionRepository).findByCodeIn(new HashSet<>(Arrays.asList("USER_READ")));
        verify(roleRepository).save(any(Role.class));
    }

    @Test
    void createRole_DuplicateCode_ThrowsException() {
        // Given
        CreateRoleRequest request = new CreateRoleRequest();
        request.setCode("DEVELOPER");
        request.setName("Developer");

        when(roleRepository.existsByCodeAndTenantId("DEVELOPER", tenantId)).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> roleManagementService.createRole(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already exists");

        verify(roleRepository).existsByCodeAndTenantId("DEVELOPER", tenantId);
        verify(roleRepository, never()).save(any());
    }

    @Test
    void updateRole_Success() {
        // Given
        UpdateRoleRequest request = new UpdateRoleRequest();
        request.setName("Senior Developer");
        request.setDescription("Senior Developer role");

        when(roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId))
                .thenReturn(Optional.of(role));
        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        RoleResponse result = roleManagementService.updateRole(roleId, request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Senior Developer");
        assertThat(result.getDescription()).isEqualTo("Senior Developer role");

        verify(roleRepository).findByIdAndTenantIdWithPermissions(roleId, tenantId);
        verify(roleRepository).save(any(Role.class));
    }

    @Test
    void updateRole_SystemRole_ThrowsException() {
        // Given
        role.setIsSystemRole(true);
        UpdateRoleRequest request = new UpdateRoleRequest();
        request.setName("Updated Name");

        when(roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId))
                .thenReturn(Optional.of(role));

        // When & Then
        assertThatThrownBy(() -> roleManagementService.updateRole(roleId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot update system role");

        verify(roleRepository).findByIdAndTenantIdWithPermissions(roleId, tenantId);
        verify(roleRepository, never()).save(any());
    }

    @Test
    void deleteRole_Success() {
        // Given
        when(roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId))
                .thenReturn(Optional.of(role));
        when(roleRepository.isRoleAssignedToUsers(roleId)).thenReturn(false);

        // When
        roleManagementService.deleteRole(roleId);

        // Then
        verify(roleRepository).findByIdAndTenantIdWithPermissions(roleId, tenantId);
        verify(roleRepository).isRoleAssignedToUsers(roleId);
        verify(roleRepository).delete(role);
    }

    @Test
    void deleteRole_SystemRole_ThrowsException() {
        // Given
        role.setIsSystemRole(true);
        when(roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId))
                .thenReturn(Optional.of(role));

        // When & Then
        assertThatThrownBy(() -> roleManagementService.deleteRole(roleId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot delete system role");

        verify(roleRepository).findByIdAndTenantIdWithPermissions(roleId, tenantId);
        verify(roleRepository, never()).delete(any());
    }

    @Test
    void deleteRole_AssignedToUsers_ThrowsException() {
        // Given
        when(roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId))
                .thenReturn(Optional.of(role));
        when(roleRepository.isRoleAssignedToUsers(roleId)).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> roleManagementService.deleteRole(roleId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot delete role that is assigned to users");

        verify(roleRepository).findByIdAndTenantIdWithPermissions(roleId, tenantId);
        verify(roleRepository).isRoleAssignedToUsers(roleId);
        verify(roleRepository, never()).delete(any());
    }

    @Test
    void assignPermissions_Success() {
        // Given
        AssignPermissionsRequest request = new AssignPermissionsRequest();
        request.setPermissionCodes(new HashSet<>(Arrays.asList("USER_READ", "USER_WRITE")));

        when(roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId))
                .thenReturn(Optional.of(role));
        when(permissionRepository.findByCodeIn(new HashSet<>(Arrays.asList("USER_READ", "USER_WRITE"))))
                .thenReturn(Arrays.asList(permission1, permission2));
        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        RoleResponse result = roleManagementService.assignPermissions(roleId, request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getPermissions()).hasSize(2);

        verify(roleRepository).findByIdAndTenantIdWithPermissions(roleId, tenantId);
        verify(permissionRepository).findByCodeIn(new HashSet<>(Arrays.asList("USER_READ", "USER_WRITE")));
        verify(roleRepository).save(any(Role.class));
    }

    @Test
    void assignPermissions_InvalidPermissionCode_ThrowsException() {
        // Given
        AssignPermissionsRequest request = new AssignPermissionsRequest();
        request.setPermissionCodes(new HashSet<>(Arrays.asList("USER_READ", "INVALID_CODE")));

        when(roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId))
                .thenReturn(Optional.of(role));
        when(permissionRepository.findByCodeIn(new HashSet<>(Arrays.asList("USER_READ", "INVALID_CODE"))))
                .thenReturn(Arrays.asList(permission1)); // Only one found, not two

        // When & Then
        assertThatThrownBy(() -> roleManagementService.assignPermissions(roleId, request))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("One or more permission codes are invalid");

        verify(roleRepository).findByIdAndTenantIdWithPermissions(roleId, tenantId);
        verify(permissionRepository).findByCodeIn(new HashSet<>(Arrays.asList("USER_READ", "INVALID_CODE")));
        verify(roleRepository, never()).save(any());
    }

    @Test
    void assignPermissions_SystemRole_ThrowsException() {
        // Given
        role.setIsSystemRole(true);
        AssignPermissionsRequest request = new AssignPermissionsRequest();
        request.setPermissionCodes(new HashSet<>(Arrays.asList("USER_READ")));

        when(roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId))
                .thenReturn(Optional.of(role));

        // When & Then
        assertThatThrownBy(() -> roleManagementService.assignPermissions(roleId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot modify permissions for system role");

        verify(roleRepository).findByIdAndTenantIdWithPermissions(roleId, tenantId);
        verify(roleRepository, never()).save(any());
    }

    @Test
    void addPermissions_Success() {
        // Given
        Permission permission3 = new Permission();
        permission3.setId(UUID.randomUUID());
        permission3.setCode("USER_DELETE");
        permission3.setName("Delete Users");

        AssignPermissionsRequest request = new AssignPermissionsRequest();
        request.setPermissionCodes(new HashSet<>(Arrays.asList("USER_DELETE")));

        when(roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId))
                .thenReturn(Optional.of(role));
        when(permissionRepository.findByCodeIn(new HashSet<>(Arrays.asList("USER_DELETE"))))
                .thenReturn(Arrays.asList(permission3));
        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        RoleResponse result = roleManagementService.addPermissions(roleId, request);

        // Then
        assertThat(result).isNotNull();
        assertThat(role.getPermissions())
                .extracting(RolePermission::getPermission)
                .contains(permission3);

        verify(roleRepository).findByIdAndTenantIdWithPermissions(roleId, tenantId);
        verify(permissionRepository).findByCodeIn(new HashSet<>(Arrays.asList("USER_DELETE")));
        verify(roleRepository).save(any(Role.class));
    }

    @Test
    void removePermissions_Success() {
        // Given
        AssignPermissionsRequest request = new AssignPermissionsRequest();
        request.setPermissionCodes(new HashSet<>(Arrays.asList("USER_READ")));

        when(roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId))
                .thenReturn(Optional.of(role));
        when(permissionRepository.findByCodeIn(new HashSet<>(Arrays.asList("USER_READ"))))
                .thenReturn(Arrays.asList(permission1));
        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        RoleResponse result = roleManagementService.removePermissions(roleId, request);

        // Then
        assertThat(result).isNotNull();
        assertThat(role.getPermissions())
                .extracting(RolePermission::getPermission)
                .doesNotContain(permission1);

        verify(roleRepository).findByIdAndTenantIdWithPermissions(roleId, tenantId);
        verify(permissionRepository).findByCodeIn(new HashSet<>(Arrays.asList("USER_READ")));
        verify(roleRepository).save(any(Role.class));
    }

    // ──────────────────────────────────────────────────────────
    // DEF-49/50/54: Privilege Escalation Prevention Tests
    // ──────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Privilege Escalation Prevention (DEF-49/50/54)")
    class PrivilegeEscalationTests {

        private UUID userId;
        private User regularUser;
        private Role superAdminRole;
        private Role employeeRole;

        @BeforeEach
        void setUpEscalationTests() {
            userId = UUID.randomUUID();

            // Create a regular employee role
            employeeRole = new Role();
            employeeRole.setId(UUID.randomUUID());
            employeeRole.setCode("EMPLOYEE");
            employeeRole.setName("Employee");
            employeeRole.setIsSystemRole(true);
            employeeRole.setTenantId(tenantId);
            employeeRole.setPermissions(new HashSet<>());
            employeeRole.setCreatedAt(LocalDateTime.now());
            employeeRole.setUpdatedAt(LocalDateTime.now());

            // Create the SUPER_ADMIN role
            superAdminRole = new Role();
            superAdminRole.setId(UUID.randomUUID());
            superAdminRole.setCode(RoleHierarchy.SUPER_ADMIN);
            superAdminRole.setName("Super Administrator");
            superAdminRole.setIsSystemRole(true);
            superAdminRole.setTenantId(tenantId);
            superAdminRole.setPermissions(new HashSet<>());
            superAdminRole.setCreatedAt(LocalDateTime.now());
            superAdminRole.setUpdatedAt(LocalDateTime.now());

            // Create a regular user with EMPLOYEE role
            regularUser = new User();
            regularUser.setId(userId);
            regularUser.setEmail("regular@example.com");
            regularUser.setFirstName("Regular");
            regularUser.setLastName("User");
            regularUser.setStatus(User.UserStatus.ACTIVE);
            regularUser.setTenantId(tenantId);
            regularUser.setRoles(new HashSet<>(Set.of(employeeRole)));
            regularUser.setCreatedAt(LocalDateTime.now());
            regularUser.setUpdatedAt(LocalDateTime.now());
        }

        @Test
        @DisplayName("Non-SuperAdmin CANNOT assign SUPER_ADMIN role")
        void assignRoles_NonSuperAdmin_AssigningSuperAdmin_ThrowsAccessDenied() {
            // Given: current user is NOT a SuperAdmin
            securityContextMock.when(SecurityContext::isSuperAdmin).thenReturn(false);
            securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(UUID.randomUUID());

            AssignRolesRequest request = new AssignRolesRequest();
            request.setRoleCodes(new HashSet<>(Set.of(RoleHierarchy.SUPER_ADMIN)));

            // When & Then: should throw AccessDeniedException
            assertThatThrownBy(() -> roleManagementService.assignRolesToUser(userId, request))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("Only SuperAdmin can assign or revoke privileged roles");

            // Verify user was never looked up (guard fires first)
            verify(userRepository, never()).findByIdAndTenantId(any(), any());
        }

        @Test
        @DisplayName("SuperAdmin CAN assign SUPER_ADMIN role")
        void assignRoles_SuperAdmin_AssigningSuperAdmin_Succeeds() {
            // Given: current user IS a SuperAdmin
            securityContextMock.when(SecurityContext::isSuperAdmin).thenReturn(true);

            AssignRolesRequest request = new AssignRolesRequest();
            request.setRoleCodes(new HashSet<>(Set.of(RoleHierarchy.SUPER_ADMIN)));

            when(userRepository.findByIdAndTenantId(userId, tenantId)).thenReturn(Optional.of(regularUser));
            when(roleRepository.findByCodeInAndTenantId(Set.of(RoleHierarchy.SUPER_ADMIN), tenantId))
                    .thenReturn(List.of(superAdminRole));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            UserResponse result = roleManagementService.assignRolesToUser(userId, request);

            // Then: succeeds without exception
            assertThat(result).isNotNull();
            verify(userRepository).findByIdAndTenantId(userId, tenantId);
            verify(userRepository).save(any(User.class));
        }

        @Test
        @DisplayName("Non-SuperAdmin CAN assign regular roles (EMPLOYEE, HR_MANAGER)")
        void assignRoles_NonSuperAdmin_AssigningRegularRole_Succeeds() {
            // Given: current user is NOT a SuperAdmin
            securityContextMock.when(SecurityContext::isSuperAdmin).thenReturn(false);

            AssignRolesRequest request = new AssignRolesRequest();
            request.setRoleCodes(new HashSet<>(Set.of("EMPLOYEE", "HR_MANAGER")));

            when(userRepository.findByIdAndTenantId(userId, tenantId)).thenReturn(Optional.of(regularUser));
            when(roleRepository.findByCodeInAndTenantId(Set.of("EMPLOYEE", "HR_MANAGER"), tenantId))
                    .thenReturn(List.of(employeeRole));
            // Size mismatch will be caught by validation, but escalation guard should not fire
            // To test the guard specifically, match sizes
            Role hrManagerRole = new Role();
            hrManagerRole.setId(UUID.randomUUID());
            hrManagerRole.setCode("HR_MANAGER");
            hrManagerRole.setName("HR Manager");
            hrManagerRole.setIsSystemRole(true);
            hrManagerRole.setTenantId(tenantId);
            hrManagerRole.setPermissions(new HashSet<>());
            hrManagerRole.setCreatedAt(LocalDateTime.now());
            hrManagerRole.setUpdatedAt(LocalDateTime.now());

            when(roleRepository.findByCodeInAndTenantId(Set.of("EMPLOYEE", "HR_MANAGER"), tenantId))
                    .thenReturn(List.of(employeeRole, hrManagerRole));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            UserResponse result = roleManagementService.assignRolesToUser(userId, request);

            // Then: succeeds — no escalation issue
            assertThat(result).isNotNull();
            verify(userRepository).save(any(User.class));
        }

        @Test
        @DisplayName("Non-SuperAdmin CANNOT modify roles of an existing SuperAdmin user")
        void assignRoles_NonSuperAdmin_ModifyingSuperAdminUser_ThrowsAccessDenied() {
            // Given: current user is NOT a SuperAdmin
            securityContextMock.when(SecurityContext::isSuperAdmin).thenReturn(false);
            securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(UUID.randomUUID());

            // The target user currently HAS the SUPER_ADMIN role
            User superAdminUser = new User();
            superAdminUser.setId(userId);
            superAdminUser.setEmail("admin@example.com");
            superAdminUser.setFirstName("Super");
            superAdminUser.setLastName("Admin");
            superAdminUser.setStatus(User.UserStatus.ACTIVE);
            superAdminUser.setTenantId(tenantId);
            superAdminUser.setRoles(new HashSet<>(Set.of(superAdminRole)));
            superAdminUser.setCreatedAt(LocalDateTime.now());
            superAdminUser.setUpdatedAt(LocalDateTime.now());

            // Request tries to change them to just EMPLOYEE (removing SUPER_ADMIN)
            AssignRolesRequest request = new AssignRolesRequest();
            request.setRoleCodes(new HashSet<>(Set.of("EMPLOYEE")));

            when(userRepository.findByIdAndTenantId(userId, tenantId)).thenReturn(Optional.of(superAdminUser));

            // When & Then: should throw because non-SuperAdmin cannot modify a SuperAdmin user's roles
            assertThatThrownBy(() -> roleManagementService.assignRolesToUser(userId, request))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("Only SuperAdmin can modify roles of users with privileged roles");
        }

        @Test
        @DisplayName("Non-SuperAdmin CANNOT assign SUPER_ADMIN mixed with regular roles")
        void assignRoles_NonSuperAdmin_MixedRolesIncludingSuperAdmin_ThrowsAccessDenied() {
            // Given: current user is NOT a SuperAdmin
            securityContextMock.when(SecurityContext::isSuperAdmin).thenReturn(false);
            securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(UUID.randomUUID());

            // Request includes both EMPLOYEE and SUPER_ADMIN
            AssignRolesRequest request = new AssignRolesRequest();
            request.setRoleCodes(new HashSet<>(Set.of("EMPLOYEE", RoleHierarchy.SUPER_ADMIN)));

            // When & Then
            assertThatThrownBy(() -> roleManagementService.assignRolesToUser(userId, request))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("Only SuperAdmin can assign or revoke privileged roles");

            verify(userRepository, never()).findByIdAndTenantId(any(), any());
        }
    }
}
