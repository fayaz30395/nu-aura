package com.nulogic.application.selfservice.service;

import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.selfservice.DocumentRequest;
import com.nulogic.domain.selfservice.ProfileUpdateRequest;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.leave.repository.LeaveBalanceRepository;
import com.nulogic.infrastructure.leave.repository.LeaveRequestRepository;
import com.nulogic.infrastructure.leave.repository.LeaveTypeRepository;
import com.nulogic.infrastructure.selfservice.repository.DocumentRequestRepository;
import com.nulogic.infrastructure.selfservice.repository.ProfileUpdateRequestRepository;
import com.nulogic.infrastructure.workflow.repository.StepExecutionRepository;
import com.nulogic.common.util.TenantTimeService;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * SEC-M5b regression: the self-service IDOR guard must actually fire.
 *
 * <p>As shipped, {@code assertOwnsRequestOrPrivileged} began with
 * {@code if (hasPermission(EMPLOYEE_UPDATE) || hasPermission(EMPLOYEE_VIEW_ALL)) return;}. Both
 * are scope-blind calls, and {@code V107__repopulate_role_permissions.sql:46} grants
 * {@code EMPLOYEE:UPDATE} to the baseline EMPLOYEE role at {@code scope='SELF'} — so the first
 * clause was true for every authenticated employee. The guard returned immediately, the ownership
 * comparison never ran, and the {@code SECURITY: IDOR attempt} audit line was unreachable. The
 * protected responses carry {@code currentValue}/{@code requestedValue}, i.e. unmasked bank
 * account numbers and home addresses.
 *
 * <p>The boundary these tests pin: OWN data yes; another employee's data no, even while holding
 * a SELF-scoped {@code EMPLOYEE:UPDATE}; HR with {@code EMPLOYEE:VIEW_ALL} at ALL scope yes
 * (the administrative detail view must keep working); MANAGER with the same code at TEAM scope
 * no, because V107 grants it to MANAGER at TEAM only.</p>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("SEC-M5b: self-service request IDOR guard")
class SelfServiceIdorTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

    @Mock private ProfileUpdateRequestRepository profileUpdateRequestRepository;
    @Mock private DocumentRequestRepository documentRequestRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private LeaveBalanceRepository leaveBalanceRepository;
    @Mock private LeaveTypeRepository leaveTypeRepository;
    @Mock private LeaveRequestRepository leaveRequestRepository;
    @Mock private AttendanceRecordRepository attendanceRecordRepository;
    @Mock private StepExecutionRepository stepExecutionRepository;
    @Mock private TenantTimeService tenantTimeService;

    @InjectMocks
    private SelfServiceService service;

    private UUID ownerEmployeeId;
    private UUID otherEmployeeId;
    private UUID profileRequestId;
    private UUID documentRequestId;

    @BeforeEach
    void setUp() {
        ownerEmployeeId = UUID.randomUUID();
        otherEmployeeId = UUID.randomUUID();
        profileRequestId = UUID.randomUUID();
        documentRequestId = UUID.randomUUID();

        TenantContext.setCurrentTenant(TENANT_ID);

        ProfileUpdateRequest profile = new ProfileUpdateRequest();
        profile.setId(profileRequestId);
        profile.setTenantId(TENANT_ID);
        profile.setEmployeeId(ownerEmployeeId);
        profile.setFieldName("bankAccountNumber");
        profile.setCurrentValue("XXXX-REAL-ACCOUNT-1234");
        profile.setRequestedValue("XXXX-REAL-ACCOUNT-9876");

        DocumentRequest document = new DocumentRequest();
        document.setId(documentRequestId);
        document.setTenantId(TENANT_ID);
        document.setEmployeeId(ownerEmployeeId);

        lenient().when(profileUpdateRequestRepository.findByIdAndTenantId(profileRequestId, TENANT_ID))
                .thenReturn(Optional.of(profile));
        lenient().when(documentRequestRepository.findByIdAndTenantId(documentRequestId, TENANT_ID))
                .thenReturn(Optional.of(document));

        Employee employee = Employee.builder().firstName("Owner").lastName("Person").build();
        employee.setId(ownerEmployeeId);
        employee.setTenantId(TENANT_ID);
        lenient().when(employeeRepository.findByIdAndTenantId(any(UUID.class), any(UUID.class)))
                .thenReturn(Optional.of(employee));
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
    }

    /** Baseline employee exactly as V107 seeds them: everything at SELF scope. */
    private void loginAsBaselineEmployee(UUID employeeId) {
        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("EMPLOYEE"),
                Map.of(Permission.EMPLOYEE_VIEW_SELF, RoleScope.SELF,
                        Permission.EMPLOYEE_UPDATE, RoleScope.SELF));
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    /** HR_MANAGER / HR_ADMIN: EMPLOYEE:VIEW_ALL at ALL scope (V107:215, :280). */
    private void loginAsHrAdmin() {
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of("HR_MANAGER"),
                Map.of(Permission.EMPLOYEE_VIEW_ALL, RoleScope.ALL,
                        Permission.EMPLOYEE_UPDATE, RoleScope.ALL));
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    /** MANAGER: the SAME code, but V107:155 grants it at TEAM scope. */
    private void loginAsTeamScopedManager() {
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of("MANAGER"),
                Map.of(Permission.EMPLOYEE_VIEW_ALL, RoleScope.TEAM,
                        Permission.EMPLOYEE_UPDATE, RoleScope.SELF));
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    // ── (a) own data still reachable ──────────────────────────────────────────────

    @Test
    @DisplayName("(a) an employee can read their OWN profile update request")
    void ownerCanReadOwnProfileRequest() {
        loginAsBaselineEmployee(ownerEmployeeId);

        assertThat(service.getProfileUpdateRequestById(profileRequestId)).isNotNull();
    }

    @Test
    @DisplayName("(a) an employee can read their OWN document request")
    void ownerCanReadOwnDocumentRequest() {
        loginAsBaselineEmployee(ownerEmployeeId);

        assertThat(service.getDocumentRequestById(documentRequestId)).isNotNull();
    }

    // ── (b) another employee's PII denied ────────────────────────────────────────

    @Test
    @DisplayName("(b) an employee CANNOT read another employee's profile request (bank/address PII)")
    void employeeCannotReadAnotherEmployeesProfileRequest() {
        loginAsBaselineEmployee(otherEmployeeId);

        assertThatThrownBy(() -> service.getProfileUpdateRequestById(profileRequestId))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("(b) an employee CANNOT read another employee's document request")
    void employeeCannotReadAnotherEmployeesDocumentRequest() {
        loginAsBaselineEmployee(otherEmployeeId);

        assertThatThrownBy(() -> service.getDocumentRequestById(documentRequestId))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("(b) holding SELF-scoped EMPLOYEE:UPDATE does not buy access to someone else's record")
    void selfScopedUpdatePermissionGrantsNothing() {
        // This is the precise shape of the original bug: the caller holds EMPLOYEE:UPDATE, which
        // every employee holds at SELF, and the old guard returned on its mere presence.
        SecurityContext.setCurrentUser(UUID.randomUUID(), otherEmployeeId, Set.of("EMPLOYEE"),
                Map.of(Permission.EMPLOYEE_UPDATE, RoleScope.SELF));
        SecurityContext.setCurrentTenantId(TENANT_ID);

        assertThatThrownBy(() -> service.getProfileUpdateRequestById(profileRequestId))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ── (c) administrative workflow still works ──────────────────────────────────

    @Test
    @DisplayName("(c) HR with EMPLOYEE:VIEW_ALL at ALL scope can still read any request")
    void hrAdminCanStillReadAnyRequest() {
        loginAsHrAdmin();

        assertThat(service.getProfileUpdateRequestById(profileRequestId)).isNotNull();
        assertThat(service.getDocumentRequestById(documentRequestId)).isNotNull();
    }

    @Test
    @DisplayName("(c) super-admin keeps its explicit bypass")
    void superAdminCanStillReadAnyRequest() {
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(),
                Set.of("SUPER_ADMIN"), Map.of("SYSTEM:ADMIN", RoleScope.ALL));
        SecurityContext.setCurrentTenantId(TENANT_ID);

        assertThat(service.getProfileUpdateRequestById(profileRequestId)).isNotNull();
    }

    // ── (d) the guard cannot be bypassed by an insufficient scope ────────────────

    @Test
    @DisplayName("(d) a TEAM-scoped EMPLOYEE:VIEW_ALL holder is denied — scope is enforced, not just the code")
    void teamScopedManagerIsDenied() {
        loginAsTeamScopedManager();

        assertThatThrownBy(() -> service.getProfileUpdateRequestById(profileRequestId))
                .as("V107:155 grants MANAGER EMPLOYEE:VIEW_ALL at TEAM; an arbitrary employee's "
                        + "bank details are outside that scope")
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("(d) the denial path is reachable — it is what throws, so the audit line runs")
    void denialPathIsReachable() {
        // The original guard returned before the ownership comparison, so the branch containing
        // the `SECURITY: IDOR attempt` warning was dead code and exploitation left no trace.
        // Reaching AccessDeniedException proves that branch now executes.
        loginAsBaselineEmployee(otherEmployeeId);

        assertThatThrownBy(() -> service.getProfileUpdateRequestById(profileRequestId))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Access denied");
    }

    @Test
    @DisplayName("(d) a caller holding no relevant permission at all is denied")
    void callerWithNoPermissionsIsDenied() {
        SecurityContext.setCurrentUser(UUID.randomUUID(), otherEmployeeId, Set.of("EMPLOYEE"), Map.of());
        SecurityContext.setCurrentTenantId(TENANT_ID);

        assertThatThrownBy(() -> service.getDocumentRequestById(documentRequestId))
                .isInstanceOf(AccessDeniedException.class);
    }
}
