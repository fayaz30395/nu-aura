package com.nulogic.application.employee.service;

import com.nulogic.api.employee.dto.ApproveRejectChangeRequest;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.employee.EmploymentChangeRequest;
import com.nulogic.infrastructure.employee.repository.DepartmentRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.employee.repository.EmploymentChangeRequestRepository;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
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

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
class EmploymentChangeRequestServiceTest {

    private static MockedStatic<TenantContext> tenantMock;
    private static MockedStatic<SecurityContext> secMock;
    @Mock
    private EmploymentChangeRequestRepository changeRepo;
    @Mock
    private EmployeeRepository employeeRepo;
    @Mock
    private DepartmentRepository departmentRepo;
    @Mock
    private TenantTimeService timeService;
    @InjectMocks
    private EmploymentChangeRequestService service;

    private UUID tenantId = UUID.randomUUID();
    private UUID employeeId = UUID.randomUUID();
    private UUID requesterId = UUID.randomUUID();
    private UUID approverId = UUID.randomUUID();
    private UUID requestId = UUID.randomUUID();
    private Employee employee;
    private EmploymentChangeRequest cr;

    @BeforeAll
    static void init() {
        tenantMock = mockStatic(TenantContext.class);
        secMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void close() {
        tenantMock.close();
        secMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        secMock.when(SecurityContext::getCurrentUserId).thenReturn(approverId);
        secMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(UUID.randomUUID());
        secMock.when(SecurityContext::getAllReporteeIds).thenReturn(Set.of());
        secMock.when(() -> SecurityContext.hasPermission(Permission.EMPLOYMENT_CHANGE_VIEW_ALL)).thenReturn(false);
        when(timeService.today(tenantId)).thenReturn(LocalDate.of(2026, 10, 13));

        employee = Employee.builder().build();
        employee.setId(employeeId);
        employee.setTenantId(tenantId);
        when(employeeRepo.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));

        cr = EmploymentChangeRequest.builder()
                .employeeId(employeeId).requesterId(requesterId)
                .status(EmploymentChangeRequest.ChangeRequestStatus.PENDING)
                .newDesignation("Lead").build();
        cr.setId(requestId);
        cr.setTenantId(tenantId);
        when(changeRepo.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(cr));
        when(changeRepo.save(any(EmploymentChangeRequest.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void approve_appliesChange_whenIndependentApproverAndNoFutureDate() {
        service.approveChangeRequest(requestId, new ApproveRejectChangeRequest());

        assertThat(employee.getDesignation()).isEqualTo("Lead");
        assertThat(cr.getStatus()).isEqualTo(EmploymentChangeRequest.ChangeRequestStatus.APPROVED);
    }

    @Test
    void approve_blocksRequesterApprovingOwnRequest() {
        secMock.when(SecurityContext::getCurrentUserId).thenReturn(requesterId);

        assertThatThrownBy(() -> service.approveChangeRequest(requestId, new ApproveRejectChangeRequest()))
                .isInstanceOf(BusinessException.class);
        verify(employeeRepo, never()).save(any());
        assertThat(cr.getStatus()).isEqualTo(EmploymentChangeRequest.ChangeRequestStatus.PENDING);
    }

    @Test
    void approve_blocksApproverWhoIsTheSubjectEmployee() {
        secMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);

        assertThatThrownBy(() -> service.approveChangeRequest(requestId, new ApproveRejectChangeRequest()))
                .isInstanceOf(BusinessException.class);
        verify(employeeRepo, never()).save(any());
    }

    @Test
    void approve_blocksFutureEffectiveDate() {
        cr.setEffectiveDate(LocalDate.of(2026, 11, 1));

        assertThatThrownBy(() -> service.approveChangeRequest(requestId, new ApproveRejectChangeRequest()))
                .isInstanceOf(BusinessException.class).hasMessageContaining("effective from");
        verify(employeeRepo, never()).save(any());
    }

    @Test
    void approve_blocksManagerCycle() {
        UUID newManager = UUID.randomUUID();
        Employee mgr = Employee.builder().build();
        mgr.setId(newManager);
        mgr.setManagerId(employeeId); // new manager reports to the employee -> cycle
        when(employeeRepo.findByIdAndTenantId(newManager, tenantId)).thenReturn(Optional.of(mgr));
        cr.setNewManagerId(newManager);

        assertThatThrownBy(() -> service.approveChangeRequest(requestId, new ApproveRejectChangeRequest()))
                .isInstanceOf(BusinessException.class).hasMessageContaining("circular");
        verify(employeeRepo, never()).save(any());
    }

    @Test
    void get_deniedForUnrelatedEmployeeWithoutViewAll() {
        assertThatThrownBy(() -> service.getChangeRequest(requestId))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void get_allowedForOwnRequest() {
        secMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);

        assertThat(service.getChangeRequest(requestId)).isNotNull();
    }

    @Test
    void get_allowedWithViewAll() {
        secMock.when(() -> SecurityContext.hasPermission(Permission.EMPLOYMENT_CHANGE_VIEW_ALL)).thenReturn(true);

        assertThat(service.getChangeRequest(requestId)).isNotNull();
    }
}
