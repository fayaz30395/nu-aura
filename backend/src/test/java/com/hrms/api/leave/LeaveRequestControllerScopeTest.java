package com.hrms.api.leave;

import com.hrms.api.leave.controller.LeaveRequestController;
import com.hrms.application.leave.service.LeaveRequestService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.domain.user.RoleScope;
import com.hrms.application.employee.service.EmployeeService;
import com.hrms.common.security.DataScopeService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for LeaveRequestController scope enforcement.
 * Tests that SELF scope users cannot access other employees' leave requests.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("LeaveRequestController Scope Enforcement Tests")
class LeaveRequestControllerScopeTest {

    @Mock
    private LeaveRequestService leaveRequestService;

    @Mock
    private EmployeeService employeeService;

    @Mock
    private DataScopeService dataScopeService;

    @InjectMocks
    private LeaveRequestController leaveRequestController;

    private static MockedStatic<TenantContext> tenantContextMock;
    private static MockedStatic<SecurityContext> securityContextMock;

    private UUID tenantId;
    private UUID currentEmployeeId;
    private UUID otherEmployeeId;
    private UUID managerId;
    private LeaveRequest ownLeaveRequest;
    private LeaveRequest otherLeaveRequest;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        currentEmployeeId = UUID.randomUUID();
        otherEmployeeId = UUID.randomUUID();
        managerId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

        // Create own leave request
        ownLeaveRequest = LeaveRequest.builder()
                .employeeId(currentEmployeeId)
                .leaveTypeId(UUID.randomUUID())
                .startDate(LocalDate.now().plusDays(1))
                .endDate(LocalDate.now().plusDays(3))
                .totalDays(BigDecimal.valueOf(3.0))
                .reason("My vacation")
                .status(LeaveRequest.LeaveRequestStatus.PENDING)
                .build();
        ownLeaveRequest.setId(UUID.randomUUID());
        ownLeaveRequest.setTenantId(tenantId);

        // Create other employee's leave request
        otherLeaveRequest = LeaveRequest.builder()
                .employeeId(otherEmployeeId)
                .leaveTypeId(UUID.randomUUID())
                .startDate(LocalDate.now().plusDays(1))
                .endDate(LocalDate.now().plusDays(3))
                .totalDays(BigDecimal.valueOf(3.0))
                .reason("Other's vacation")
                .status(LeaveRequest.LeaveRequestStatus.PENDING)
                .build();
        otherLeaveRequest.setId(UUID.randomUUID());
        otherLeaveRequest.setTenantId(tenantId);
    }

    @Nested
    @DisplayName("GET /leave-requests/{id} Scope Tests")
    class GetByIdScopeTests {

        @Test
        @DisplayName("SELF scope user CAN access their own leave request")
        void selfScopeUserCanAccessOwnLeaveRequest() {
            // Setup: User with SELF scope
            setupSecurityContext(currentEmployeeId, RoleScope.SELF, false);
            when(leaveRequestService.getLeaveRequestById(ownLeaveRequest.getId()))
                    .thenReturn(ownLeaveRequest);
            when(employeeService.findByIdAndTenant(currentEmployeeId, tenantId))
                    .thenReturn(Optional.of(createEmployee(currentEmployeeId, managerId)));

            // Execute
            var response = leaveRequestController.getLeaveRequest(ownLeaveRequest.getId());

            // Verify
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            assertThat(response.getBody()).isNotNull();
        }

        @Test
        @DisplayName("SELF scope user CANNOT access other employee's leave request")
        void selfScopeUserCannotAccessOthersLeaveRequest() {
            // Setup: User with SELF scope trying to access other's leave request
            setupSecurityContext(currentEmployeeId, RoleScope.SELF, false);
            when(leaveRequestService.getLeaveRequestById(otherLeaveRequest.getId()))
                    .thenReturn(otherLeaveRequest);

            // Execute & Verify
            assertThatThrownBy(() -> leaveRequestController.getLeaveRequest(otherLeaveRequest.getId()))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("do not have permission");
        }

        @Test
        @DisplayName("TEAM scope user CAN access their reportee's leave request")
        void teamScopeUserCanAccessReporteeLeaveRequest() {
            // Setup: User with TEAM scope and otherEmployeeId is a reportee
            Set<UUID> reporteeIds = new HashSet<>();
            reporteeIds.add(otherEmployeeId);
            setupSecurityContextWithReportees(currentEmployeeId, RoleScope.TEAM, reporteeIds, false);
            when(leaveRequestService.getLeaveRequestById(otherLeaveRequest.getId()))
                    .thenReturn(otherLeaveRequest);
            when(employeeService.findByIdAndTenant(otherEmployeeId, tenantId))
                    .thenReturn(Optional.of(createEmployee(otherEmployeeId, currentEmployeeId)));

            // Execute
            var response = leaveRequestController.getLeaveRequest(otherLeaveRequest.getId());

            // Verify
            assertThat(response.getStatusCode().value()).isEqualTo(200);
        }

        @Test
        @DisplayName("TEAM scope user CANNOT access non-reportee's leave request")
        void teamScopeUserCannotAccessNonReporteeLeaveRequest() {
            // Setup: User with TEAM scope but otherEmployeeId is NOT a reportee
            Set<UUID> reporteeIds = new HashSet<>(); // Empty - no reportees
            setupSecurityContextWithReportees(currentEmployeeId, RoleScope.TEAM, reporteeIds, false);
            when(leaveRequestService.getLeaveRequestById(otherLeaveRequest.getId()))
                    .thenReturn(otherLeaveRequest);

            // Execute & Verify
            assertThatThrownBy(() -> leaveRequestController.getLeaveRequest(otherLeaveRequest.getId()))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("do not have permission");
        }

        @Test
        @DisplayName("ALL scope user CAN access any leave request")
        void allScopeUserCanAccessAnyLeaveRequest() {
            // Setup: User with ALL scope
            setupSecurityContext(currentEmployeeId, RoleScope.ALL, false);
            when(leaveRequestService.getLeaveRequestById(otherLeaveRequest.getId()))
                    .thenReturn(otherLeaveRequest);
            when(employeeService.findByIdAndTenant(otherEmployeeId, tenantId))
                    .thenReturn(Optional.of(createEmployee(otherEmployeeId, managerId)));

            // Execute
            var response = leaveRequestController.getLeaveRequest(otherLeaveRequest.getId());

            // Verify
            assertThat(response.getStatusCode().value()).isEqualTo(200);
        }

        @Test
        @DisplayName("System admin CAN access any leave request")
        void systemAdminCanAccessAnyLeaveRequest() {
            // Setup: System admin
            setupSecurityContext(currentEmployeeId, RoleScope.SELF, true);
            when(leaveRequestService.getLeaveRequestById(otherLeaveRequest.getId()))
                    .thenReturn(otherLeaveRequest);
            when(employeeService.findByIdAndTenant(otherEmployeeId, tenantId))
                    .thenReturn(Optional.of(createEmployee(otherEmployeeId, managerId)));

            // Execute
            var response = leaveRequestController.getLeaveRequest(otherLeaveRequest.getId());

            // Verify
            assertThat(response.getStatusCode().value()).isEqualTo(200);
        }
    }

    @Nested
    @DisplayName("GET /leave-requests/employee/{employeeId} Scope Tests")
    class GetByEmployeeIdScopeTests {

        @Test
        @DisplayName("SELF scope user CAN access their own leave requests by employee ID")
        void selfScopeUserCanAccessOwnLeaveRequestsByEmployeeId() {
            // Setup: User with SELF scope
            setupSecurityContext(currentEmployeeId, RoleScope.SELF, false);
            when(leaveRequestService.getLeaveRequestsByEmployee(eq(currentEmployeeId), any()))
                    .thenReturn(org.springframework.data.domain.Page.empty());

            // Execute
            var response = leaveRequestController.getEmployeeLeaveRequests(
                    currentEmployeeId,
                    org.springframework.data.domain.PageRequest.of(0, 10));

            // Verify
            assertThat(response.getStatusCode().value()).isEqualTo(200);
        }

        @Test
        @DisplayName("SELF scope user CANNOT access other employee's leave requests by employee ID")
        void selfScopeUserCannotAccessOthersLeaveRequestsByEmployeeId() {
            // Setup: User with SELF scope
            setupSecurityContext(currentEmployeeId, RoleScope.SELF, false);

            // Execute & Verify
            assertThatThrownBy(() -> leaveRequestController.getEmployeeLeaveRequests(
                    otherEmployeeId,
                    org.springframework.data.domain.PageRequest.of(0, 10)))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("do not have permission");
        }

        @Test
        @DisplayName("TEAM scope user CAN access their reportee's leave requests by employee ID")
        void teamScopeUserCanAccessReporteeLeaveRequestsByEmployeeId() {
            // Setup: User with TEAM scope and otherEmployeeId is a reportee
            Set<UUID> reporteeIds = new HashSet<>();
            reporteeIds.add(otherEmployeeId);
            setupSecurityContextWithReportees(currentEmployeeId, RoleScope.TEAM, reporteeIds, false);
            when(leaveRequestService.getLeaveRequestsByEmployee(eq(otherEmployeeId), any()))
                    .thenReturn(org.springframework.data.domain.Page.empty());

            // Execute
            var response = leaveRequestController.getEmployeeLeaveRequests(
                    otherEmployeeId,
                    org.springframework.data.domain.PageRequest.of(0, 10));

            // Verify
            assertThat(response.getStatusCode().value()).isEqualTo(200);
        }
    }

    @Nested
    @DisplayName("DEPARTMENT Scope Tests")
    class DepartmentScopeTests {

        @Test
        @DisplayName("DEPARTMENT scope user CAN access same-department employee's leave request")
        void departmentScopeUserCanAccessSameDeptEmployeeLeaveRequest() {
            // Setup: User with DEPARTMENT scope
            UUID departmentId = UUID.randomUUID();
            setupSecurityContextWithDepartment(currentEmployeeId, RoleScope.DEPARTMENT, departmentId, false);

            Employee otherEmployee = createEmployee(otherEmployeeId, managerId);
            otherEmployee.setDepartmentId(departmentId); // Same department

            when(leaveRequestService.getLeaveRequestById(otherLeaveRequest.getId()))
                    .thenReturn(otherLeaveRequest);
            when(employeeService.findByIdAndTenant(otherEmployeeId, tenantId))
                    .thenReturn(Optional.of(otherEmployee));

            // Execute
            var response = leaveRequestController.getLeaveRequest(otherLeaveRequest.getId());

            // Verify
            assertThat(response.getStatusCode().value()).isEqualTo(200);
        }

        @Test
        @DisplayName("DEPARTMENT scope user CANNOT access different-department employee's leave request")
        void departmentScopeUserCannotAccessDifferentDeptEmployeeLeaveRequest() {
            // Setup: User with DEPARTMENT scope
            UUID userDepartmentId = UUID.randomUUID();
            UUID otherDepartmentId = UUID.randomUUID();
            setupSecurityContextWithDepartment(currentEmployeeId, RoleScope.DEPARTMENT, userDepartmentId, false);

            Employee otherEmployee = createEmployee(otherEmployeeId, managerId);
            otherEmployee.setDepartmentId(otherDepartmentId); // Different department

            when(leaveRequestService.getLeaveRequestById(otherLeaveRequest.getId()))
                    .thenReturn(otherLeaveRequest);
            when(employeeService.findByIdAndTenant(otherEmployeeId, tenantId))
                    .thenReturn(Optional.of(otherEmployee));

            // Execute & Verify
            assertThatThrownBy(() -> leaveRequestController.getLeaveRequest(otherLeaveRequest.getId()))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("do not have permission");
        }
    }

    // ==================== Helper Methods ====================

    private void setupSecurityContext(UUID employeeId, RoleScope scope, boolean isAdmin) {
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
        securityContextMock.when(SecurityContext::isSystemAdmin).thenReturn(isAdmin);
        securityContextMock.when(SecurityContext::isSuperAdmin).thenReturn(isAdmin);
        securityContextMock.when(() -> SecurityContext.hasPermission(Permission.LEAVE_VIEW_ALL))
                .thenReturn(scope == RoleScope.ALL);
        securityContextMock.when(() -> SecurityContext.hasPermission(Permission.LEAVE_VIEW_TEAM))
                .thenReturn(scope == RoleScope.ALL || scope == RoleScope.TEAM);
        securityContextMock.when(() -> SecurityContext.hasPermission(Permission.LEAVE_VIEW_SELF))
                .thenReturn(true);
        securityContextMock.when(() -> SecurityContext.getPermissionScope(anyString()))
                .thenReturn(scope);
        securityContextMock.when(SecurityContext::getAllReporteeIds).thenReturn(Collections.emptySet());
        securityContextMock.when(SecurityContext::getCurrentDepartmentId).thenReturn(null);
        securityContextMock.when(SecurityContext::getCurrentLocationIds).thenReturn(Collections.emptySet());
    }

    private void setupSecurityContextWithReportees(UUID employeeId, RoleScope scope,
            Set<UUID> reporteeIds, boolean isAdmin) {
        setupSecurityContext(employeeId, scope, isAdmin);
        securityContextMock.when(SecurityContext::getAllReporteeIds).thenReturn(reporteeIds);
    }

    private void setupSecurityContextWithDepartment(UUID employeeId, RoleScope scope,
            UUID departmentId, boolean isAdmin) {
        setupSecurityContext(employeeId, scope, isAdmin);
        securityContextMock.when(SecurityContext::getCurrentDepartmentId).thenReturn(departmentId);
    }

    private Employee createEmployee(UUID employeeId, UUID managerId) {
        Employee employee = new Employee();
        employee.setId(employeeId);
        employee.setTenantId(tenantId);
        employee.setManagerId(managerId);
        employee.setFirstName("Test");
        employee.setLastName("Employee");
        return employee;
    }
}
