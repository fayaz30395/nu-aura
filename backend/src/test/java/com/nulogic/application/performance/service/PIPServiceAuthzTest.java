package com.nulogic.application.performance.service;

import com.nulogic.application.notification.service.WebSocketNotificationService;
import com.nulogic.application.performance.dto.ClosePIPRequest;
import com.nulogic.application.performance.dto.CreatePIPRequest;
import com.nulogic.application.performance.dto.PIPCheckInRequest;
import com.nulogic.application.performance.dto.PIPResponse;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.performance.PerformanceImprovementPlan;
import com.nulogic.domain.performance.PerformanceImprovementPlan.PIPStatus;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.performance.repository.PIPCheckInRepository;
import com.nulogic.infrastructure.performance.repository.PIPRepository;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("PIPService scope, create and state guards")
class PIPServiceAuthzTest {

    private static MockedStatic<TenantContext> tenantContextMock;

    @Mock
    private PIPRepository pipRepository;
    @Mock
    private PIPCheckInRepository checkInRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private WebSocketNotificationService notificationService;

    private PIPService service;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID pipId = UUID.randomUUID();
    private final UUID employeeId = UUID.randomUUID();
    private final UUID managerId = UUID.randomUUID();
    private Employee reportee;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        service = new PIPService(pipRepository, checkInRepository, employeeRepository, notificationService);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        when(employeeRepository.findAllById(any())).thenReturn(List.of());
        reportee = new Employee();
        reportee.setId(employeeId);
        reportee.setManagerId(managerId);
        when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(reportee));
        when(employeeRepository.findByIdAndTenantId(managerId, tenantId)).thenReturn(Optional.of(new Employee()));
        when(pipRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(pipRepository.findByTenantIdAndManagerId(any(), any(), any())).thenReturn(new PageImpl<>(List.of()));
        when(pipRepository.findByTenantId(any(), any())).thenReturn(new PageImpl<>(List.of()));
        when(pipRepository.findByTenantIdAndEmployeeId(any(), any(), any())).thenReturn(new PageImpl<>(List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    private void actAsManager(UUID id, Set<UUID> reportees) {
        SecurityContext.setCurrentUser(UUID.randomUUID(), id, Set.of("DEPARTMENT_MANAGER"),
                Map.of(Permission.PIP_VIEW, RoleScope.TEAM, Permission.PIP_CREATE, RoleScope.TEAM));
        SecurityContext.setAllReporteeIds(reportees);
    }

    private void actAsHr(UUID id) {
        SecurityContext.setCurrentUser(UUID.randomUUID(), id, Set.of("HR_MANAGER"),
                Map.of(Permission.PIP_MANAGE, RoleScope.ALL, Permission.PIP_VIEW, RoleScope.ALL));
    }

    private CreatePIPRequest createRequest(UUID employee, UUID manager) {
        CreatePIPRequest r = new CreatePIPRequest();
        r.setEmployeeId(employee);
        r.setManagerId(manager);
        r.setStartDate(LocalDate.of(2026, 1, 1));
        r.setEndDate(LocalDate.of(2026, 3, 1));
        r.setReason("Missed targets");
        return r;
    }

    private PerformanceImprovementPlan pip(PIPStatus status) {
        PerformanceImprovementPlan p = PerformanceImprovementPlan.builder()
                .employeeId(employeeId).managerId(managerId).status(status).build();
        p.setId(pipId);
        p.setTenantId(tenantId);
        when(pipRepository.findByIdAndTenantId(pipId, tenantId)).thenReturn(Optional.of(p));
        return p;
    }

    // ---- create ----

    @Test
    @DisplayName("create: a manager creates a PIP for their own reportee and is recorded as manager (body managerId ignored)")
    void managerCreatesForReportee() {
        actAsManager(managerId, Set.of(employeeId));
        when(checkInRepository.countByPipId(any())).thenReturn(0L);

        PIPResponse response = service.create(createRequest(employeeId, UUID.randomUUID()));

        assertThat(response.getManagerId()).isEqualTo(managerId);
    }

    @Test
    @DisplayName("create: a manager cannot create a PIP for someone who is not their reportee")
    void managerDeniedForNonReportee() {
        UUID otherManager = UUID.randomUUID();
        actAsManager(otherManager, Set.of());

        assertThatThrownBy(() -> service.create(createRequest(employeeId, otherManager)))
                .isInstanceOf(AccessDeniedException.class);
        verify(pipRepository, never()).save(any());
    }

    @Test
    @DisplayName("create: unknown (other-tenant) employee or manager is rejected")
    void unknownEmployeeOrManagerRejected() {
        actAsHr(UUID.randomUUID());
        UUID foreign = UUID.randomUUID();
        when(employeeRepository.findByIdAndTenantId(foreign, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(createRequest(foreign, managerId))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.create(createRequest(employeeId, foreign))).isInstanceOf(IllegalArgumentException.class);
        verify(pipRepository, never()).save(any());
    }

    @Test
    @DisplayName("create: nobody can create a PIP against themselves")
    void selfPipRejected() {
        actAsHr(employeeId);

        assertThatThrownBy(() -> service.create(createRequest(employeeId, managerId)))
                .isInstanceOf(AccessDeniedException.class);
        verify(pipRepository, never()).save(any());
    }

    // ---- close / check-in ----

    @Test
    @DisplayName("close: an ACTIVE PIP can be closed by HR")
    void closeActiveValid() {
        PerformanceImprovementPlan p = pip(PIPStatus.ACTIVE);
        actAsHr(UUID.randomUUID());

        ClosePIPRequest req = new ClosePIPRequest();
        req.setFinalStatus(PIPStatus.COMPLETED);
        req.setNotes("done");
        service.close(pipId, req);

        assertThat(p.getStatus()).isEqualTo(PIPStatus.COMPLETED);
    }

    @Test
    @DisplayName("close: an already closed PIP cannot be re-closed or flipped to another outcome")
    void closeFromClosedStateRejected() {
        PerformanceImprovementPlan p = pip(PIPStatus.COMPLETED);
        actAsHr(UUID.randomUUID());

        ClosePIPRequest req = new ClosePIPRequest();
        req.setFinalStatus(PIPStatus.TERMINATED);
        assertThatThrownBy(() -> service.close(pipId, req)).isInstanceOf(IllegalStateException.class);

        assertThat(p.getStatus()).isEqualTo(PIPStatus.COMPLETED);
        verify(pipRepository, never()).save(any());
    }

    @Test
    @DisplayName("close and check-in: the PIP's own employee cannot touch their plan")
    void ownPipLocked() {
        PerformanceImprovementPlan p = pip(PIPStatus.ACTIVE);
        actAsHr(employeeId);

        ClosePIPRequest req = new ClosePIPRequest();
        req.setFinalStatus(PIPStatus.COMPLETED);
        assertThatThrownBy(() -> service.close(pipId, req)).isInstanceOf(AccessDeniedException.class);
        PIPCheckInRequest checkIn = new PIPCheckInRequest();
        checkIn.setCheckInDate(LocalDate.of(2026, 2, 1));
        assertThatThrownBy(() -> service.recordCheckIn(pipId, checkIn)).isInstanceOf(AccessDeniedException.class);

        assertThat(p.getStatus()).isEqualTo(PIPStatus.ACTIVE);
        verify(pipRepository, never()).save(any());
    }

    // ---- list scope ----

    @Test
    @DisplayName("list: a manager without org-wide access only sees their own managed PIPs")
    void managerGetAllScopedToSelf() {
        actAsManager(managerId, Set.of(employeeId));

        service.getAll(PageRequest.of(0, 10));

        verify(pipRepository).findByTenantIdAndManagerId(tenantId, managerId, PageRequest.of(0, 10));
        verify(pipRepository, never()).findByTenantId(any(), any());
    }

    @Test
    @DisplayName("list: HR sees the tenant-wide list")
    void hrGetAllUnscoped() {
        actAsHr(UUID.randomUUID());

        service.getAll(PageRequest.of(0, 10));

        verify(pipRepository).findByTenantId(tenantId, PageRequest.of(0, 10));
    }

    @Test
    @DisplayName("list: a manager cannot list another manager's PIPs or a non-reportee's PIPs")
    void managerCannotListOthers() {
        actAsManager(managerId, Set.of(employeeId));

        assertThatThrownBy(() -> service.getForManager(UUID.randomUUID(), PageRequest.of(0, 10)))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getForEmployee(UUID.randomUUID(), PageRequest.of(0, 10)))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getForEmployee(UUID.randomUUID()))
                .isInstanceOf(AccessDeniedException.class);
        verify(pipRepository, never()).findByTenantIdAndEmployeeId(any(), any(), any());
    }

    @Test
    @DisplayName("list: a manager can list PIPs of their own reportee")
    void managerCanListReportee() {
        actAsManager(managerId, Set.of(employeeId));

        assertThat(service.getForEmployee(employeeId, PageRequest.of(0, 10)).getContent()).isEmpty();
        verify(pipRepository).findByTenantIdAndEmployeeId(tenantId, employeeId, PageRequest.of(0, 10));
    }
}
