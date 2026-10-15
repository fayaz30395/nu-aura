package com.nulogic.application.attendance.service;

import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
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
import org.springframework.security.access.AccessDeniedException;

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AttendanceActorScope")
class AttendanceActorScopeTest {

    @Mock
    private EmployeeRepository employeeRepository;
    @InjectMocks
    private AttendanceActorScope scope;

    private UUID tenantId;
    private UUID actor;
    private UUID reportee;
    private UUID stranger;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        actor = UUID.randomUUID();
        reportee = UUID.randomUUID();
        stranger = UUID.randomUUID();
        TenantContext.setCurrentTenant(tenantId);
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
    }

    private void login(Set<String> roles, Map<String, RoleScope> permissions) {
        SecurityContext.setCurrentUser(UUID.randomUUID(), actor, roles, permissions);
        SecurityContext.setAllReporteeIds(Set.of(reportee));
    }

    @Test
    @DisplayName("requireActor fails closed without an employee context")
    void requireActorWithoutEmployee() {
        SecurityContext.setCurrentUser(UUID.randomUUID(), null, Set.of(), Map.of());
        assertThatThrownBy(() -> scope.requireActor()).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("TEAM-scope approver can approve a reportee but not themselves nor a stranger")
    void teamScopeApproval() {
        login(Set.of("MANAGER"), Map.of(Permission.ATTENDANCE_APPROVE, RoleScope.TEAM));

        assertThat(scope.requireApprovalAccess(reportee, Permission.ATTENDANCE_APPROVE)).isEqualTo(actor);
        assertThatThrownBy(() -> scope.requireApprovalAccess(actor, Permission.ATTENDANCE_APPROVE))
                .isInstanceOf(AccessDeniedException.class).hasMessageContaining("own request");
        assertThatThrownBy(() -> scope.requireApprovalAccess(stranger, Permission.ATTENDANCE_APPROVE))
                .isInstanceOf(AccessDeniedException.class).hasMessageContaining("outside your approval scope");
        assertThat(scope.canApprove(reportee, Permission.ATTENDANCE_APPROVE)).isTrue();
        assertThat(scope.canApprove(stranger, Permission.ATTENDANCE_APPROVE)).isFalse();
    }

    @Test
    @DisplayName("ALL-scope approver may approve anyone including themselves")
    void allScopeApproval() {
        login(Set.of("HR_MANAGER"), Map.of(Permission.ATTENDANCE_APPROVE, RoleScope.ALL));

        assertThat(scope.canApprove(stranger, Permission.ATTENDANCE_APPROVE)).isTrue();
        assertThat(scope.canApprove(actor, Permission.ATTENDANCE_APPROVE)).isTrue();
    }

    @Test
    @DisplayName("holding no approval permission denies everything")
    void noPermission() {
        login(Set.of("EMPLOYEE"), Map.of(Permission.ATTENDANCE_VIEW_SELF, RoleScope.SELF));

        assertThat(scope.canApprove(reportee, Permission.ATTENDANCE_APPROVE)).isFalse();
    }

    @Test
    @DisplayName("DEPARTMENT scope uses a tenant-filtered employee lookup")
    void departmentScope() {
        UUID department = UUID.randomUUID();
        login(Set.of("MANAGER"), Map.of(Permission.ATTENDANCE_APPROVE, RoleScope.DEPARTMENT));
        SecurityContext.setOrgContext(null, department, null);
        Employee inDept = new Employee();
        inDept.setDepartmentId(department);
        Employee elsewhere = new Employee();
        elsewhere.setDepartmentId(UUID.randomUUID());
        when(employeeRepository.findByIdAndTenantId(reportee, tenantId)).thenReturn(Optional.of(inDept));
        when(employeeRepository.findByIdAndTenantId(stranger, tenantId)).thenReturn(Optional.of(elsewhere));

        assertThat(scope.canApprove(reportee, Permission.ATTENDANCE_APPROVE)).isTrue();
        assertThat(scope.canApprove(stranger, Permission.ATTENDANCE_APPROVE)).isFalse();
        // an id from another tenant resolves to nothing and is denied
        assertThat(scope.canApprove(UUID.randomUUID(), Permission.ATTENDANCE_APPROVE)).isFalse();
    }

    @Test
    @DisplayName("view access: own data always, a stranger's only when a view scope covers them")
    void viewAccess() {
        login(Set.of("EMPLOYEE"), Map.of(Permission.ATTENDANCE_VIEW_SELF, RoleScope.SELF));

        scope.requireViewAccess(actor);
        assertThatThrownBy(() -> scope.requireViewAccess(stranger)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("view access: VIEW_TEAM held at TEAM scope covers reportees only")
    void viewTeam() {
        login(Set.of("MANAGER"), Map.of(Permission.ATTENDANCE_VIEW_TEAM, RoleScope.TEAM));

        scope.requireViewAccess(reportee);
        assertThatThrownBy(() -> scope.requireViewAccess(stranger)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("requireAccess: super admin passes; a permission not held is refused outright")
    void requireAccessSuperAdminAndNoPermission() {
        login(Set.of("SUPER_ADMIN"), Map.of());
        scope.requireAccess(stranger, Permission.ATTENDANCE_VIEW_ALL);

        login(Set.of("EMPLOYEE"), Map.of(Permission.ATTENDANCE_VIEW_SELF, RoleScope.SELF));
        assertThatThrownBy(() -> scope.requireAccess(actor, Permission.ATTENDANCE_VIEW_ALL))
                .isInstanceOf(AccessDeniedException.class).hasMessage("No access to attendance records");
    }

    @Test
    @DisplayName("requireAccess: TEAM covers self and reportees only; ALL covers anyone, even without an employee context")
    void requireAccessTeamAndAll() {
        login(Set.of("MANAGER"), Map.of(Permission.ATTENDANCE_VIEW_TEAM, RoleScope.TEAM));
        scope.requireAccess(actor, Permission.ATTENDANCE_VIEW_TEAM);
        scope.requireAccess(reportee, Permission.ATTENDANCE_VIEW_TEAM);
        assertThatThrownBy(() -> scope.requireAccess(stranger, Permission.ATTENDANCE_VIEW_TEAM))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("You do not have permission to access this employee's attendance");

        SecurityContext.setCurrentUser(UUID.randomUUID(), null, Set.of("HR_MANAGER"),
                Map.of(Permission.ATTENDANCE_VIEW_ALL, RoleScope.ALL));
        scope.requireAccess(stranger, Permission.ATTENDANCE_VIEW_ALL);
    }

    @Test
    @DisplayName("requireAccess: no employee context means no 'own data' under SELF scope")
    void requireAccessSelfScopeWithoutEmployeeContext() {
        SecurityContext.setCurrentUser(UUID.randomUUID(), null, Set.of("EMPLOYEE"),
                Map.of(Permission.ATTENDANCE_VIEW_SELF, RoleScope.SELF));

        assertThatThrownBy(() -> scope.requireAccess(stranger, Permission.ATTENDANCE_VIEW_SELF))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("requireAccess: LOCATION and CUSTOM scopes use the tenant-filtered employee lookup")
    void requireAccessLocationAndCustom() {
        UUID location = UUID.randomUUID();
        UUID department = UUID.randomUUID();
        Employee inLocation = new Employee();
        inLocation.setOfficeLocationId(location);
        Employee inDepartment = new Employee();
        inDepartment.setDepartmentId(department);
        when(employeeRepository.findByIdAndTenantId(reportee, tenantId)).thenReturn(Optional.of(inLocation));
        when(employeeRepository.findByIdAndTenantId(stranger, tenantId)).thenReturn(Optional.of(inDepartment));

        login(Set.of("MANAGER"), Map.of(Permission.ATTENDANCE_VIEW_ALL, RoleScope.LOCATION));
        SecurityContext.setCurrentLocationIds(Set.of(location));
        scope.requireAccess(reportee, Permission.ATTENDANCE_VIEW_ALL);
        assertThatThrownBy(() -> scope.requireAccess(stranger, Permission.ATTENDANCE_VIEW_ALL))
                .isInstanceOf(AccessDeniedException.class);

        login(Set.of("MANAGER"), Map.of(Permission.ATTENDANCE_VIEW_ALL, RoleScope.CUSTOM));
        SecurityContext.setCustomScopeTargets(Permission.ATTENDANCE_VIEW_ALL, Set.of(), Set.of(department), Set.of());
        scope.requireAccess(stranger, Permission.ATTENDANCE_VIEW_ALL);
        assertThatThrownBy(() -> scope.requireAccess(reportee, Permission.ATTENDANCE_VIEW_ALL))
                .isInstanceOf(AccessDeniedException.class);
    }
}
