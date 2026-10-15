package com.nulogic.application.project.service;

import com.nulogic.api.project.dto.TimeEntryRequest;
import com.nulogic.api.project.dto.TimeEntryResponse;
import com.nulogic.application.project.validation.TimeEntryValidator;
import com.nulogic.application.workflow.service.WorkflowService;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.project.ProjectMember;
import com.nulogic.domain.project.TimeEntry;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.project.repository.HrmsProjectMemberRepository;
import com.nulogic.infrastructure.project.repository.ProjectTimeEntryRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for billing rate calculation in {@link ProjectTimesheetService}.
 * Validates:
 * 1. Billable entry with explicit rate: billed_amount = hours * rate
 * 2. Non-billable entry: billed_amount is null
 * 3. Billable entry with no explicit rate: inherits from project_members.billing_rate
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ProjectTimesheetService — Billing Rate Calculation Tests")
class ProjectTimesheetBillingTest {

    @Mock
    private ProjectTimeEntryRepository timeEntryRepository;

    @Mock
    private HrmsProjectMemberRepository projectMemberRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private TimeEntryValidator timeEntryValidator;

    @Mock
    private WorkflowService workflowService;

    @InjectMocks
    private ProjectTimesheetService projectTimesheetService;

    private UUID tenantId;
    private UUID projectId;
    private UUID employeeId;
    private Employee employee;
    private MockedStatic<SecurityContext> securityContext;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        employee = Employee.builder()
                .employeeCode("EMP100")
                .firstName("Alice")
                .lastName("Dev")
                .build();
        employee.setId(employeeId);
        employee.setTenantId(tenantId);

        securityContext = mockStatic(SecurityContext.class);
        securityContext.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
        securityContext.when(SecurityContext::isSuperAdmin).thenReturn(false);
        securityContext.when(() -> SecurityContext.hasAnyPermission(any())).thenReturn(false);
    }

    private ProjectMember member(BigDecimal rate, boolean active) {
        ProjectMember member = new ProjectMember();
        member.setId(UUID.randomUUID());
        member.setTenantId(tenantId);
        member.setProjectId(projectId);
        member.setEmployeeId(employeeId);
        member.setRole(ProjectMember.ProjectRole.DEVELOPER);
        member.setBillingRate(rate);
        member.setStartDate(LocalDate.now().minusMonths(1));
        member.setIsActive(active);
        member.setCanApproveTime(false);
        return member;
    }

    @AfterEach
    void tearDown() {
        if (securityContext != null) {
            securityContext.close();
        }
    }

    @Test
    @DisplayName("Billable entry with 8 hours at the member's 2000/hr should produce billed_amount = 16000")
    void shouldCalculateBilledAmountForExplicitRate() {
        try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
            tenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            TimeEntryRequest request = TimeEntryRequest.builder()
                    .projectId(projectId)
                    .employeeId(employeeId)
                    .workDate(LocalDate.now().minusDays(1))
                    .hoursWorked(new BigDecimal("8.00"))
                    .description("Feature development")
                    .taskName("TASK-001")
                    .entryType(TimeEntry.EntryType.REGULAR)
                    .isBillable(true)
                    .billingRate(new BigDecimal("999999.00")) // client-supplied rate must be ignored
                    .build();

            when(timeEntryValidator.validate(any(), eq(tenantId), isNull()))
                    .thenReturn(Collections.emptyList());
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
            when(projectMemberRepository.findByTenantIdAndProjectIdAndEmployeeId(
                    tenantId, projectId, employeeId)).thenReturn(Optional.of(member(new BigDecimal("2000.00"), true)));
            when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(inv -> inv.getArgument(0));

            TimeEntryResponse response = projectTimesheetService.createTimeEntry(request);

            assertThat(response.getIsBillable()).isTrue();
            assertThat(response.getBillingRate()).isEqualByComparingTo(new BigDecimal("2000.00"));
            assertThat(response.getBilledAmount()).isEqualByComparingTo(new BigDecimal("16000.00"));

            // Also verify what was persisted
            ArgumentCaptor<TimeEntry> captor = ArgumentCaptor.forClass(TimeEntry.class);
            verify(timeEntryRepository).save(captor.capture());
            TimeEntry saved = captor.getValue();
            assertThat(saved.getBilledAmount()).isEqualByComparingTo(new BigDecimal("16000.00"));
        }
    }

    @Test
    @DisplayName("Non-billable entry should have null billed_amount")
    void shouldHaveNullBilledAmountForNonBillableEntry() {
        try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
            tenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            TimeEntryRequest request = TimeEntryRequest.builder()
                    .projectId(projectId)
                    .employeeId(employeeId)
                    .workDate(LocalDate.now().minusDays(1))
                    .hoursWorked(new BigDecimal("8.00"))
                    .description("Internal meeting")
                    .taskName("MEETING-001")
                    .entryType(TimeEntry.EntryType.MEETING)
                    .isBillable(false)
                    .billingRate(null)
                    .build();

            when(timeEntryValidator.validate(any(), eq(tenantId), isNull()))
                    .thenReturn(Collections.emptyList());
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
            when(projectMemberRepository.findByTenantIdAndProjectIdAndEmployeeId(
                    tenantId, projectId, employeeId)).thenReturn(Optional.of(member(new BigDecimal("1500.00"), true)));
            when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(inv -> inv.getArgument(0));

            TimeEntryResponse response = projectTimesheetService.createTimeEntry(request);

            assertThat(response.getIsBillable()).isFalse();
            assertThat(response.getBilledAmount()).isNull();

            ArgumentCaptor<TimeEntry> captor = ArgumentCaptor.forClass(TimeEntry.class);
            verify(timeEntryRepository).save(captor.capture());
            TimeEntry saved = captor.getValue();
            assertThat(saved.getBilledAmount()).isNull();
        }
    }

    @Test
    @DisplayName("Billable entry with no explicit rate should inherit billing_rate from project_members")
    void shouldInheritBillingRateFromProjectMember() {
        try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
            tenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            // Set up project member with billing rate of 1500/hr
            ProjectMember member = new ProjectMember();
            member.setId(UUID.randomUUID());
            member.setTenantId(tenantId);
            member.setProjectId(projectId);
            member.setEmployeeId(employeeId);
            member.setRole(ProjectMember.ProjectRole.DEVELOPER);
            member.setBillingRate(new BigDecimal("1500.00"));
            member.setStartDate(LocalDate.now().minusMonths(1));
            member.setIsActive(true);
            member.setCanApproveTime(false);

            TimeEntryRequest request = TimeEntryRequest.builder()
                    .projectId(projectId)
                    .employeeId(employeeId)
                    .workDate(LocalDate.now().minusDays(1))
                    .hoursWorked(new BigDecimal("8.00"))
                    .description("Backend development")
                    .taskName("TASK-002")
                    .entryType(TimeEntry.EntryType.REGULAR)
                    .isBillable(true)
                    .billingRate(null)  // No explicit rate — should inherit
                    .build();

            when(timeEntryValidator.validate(any(), eq(tenantId), isNull()))
                    .thenReturn(Collections.emptyList());
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
            when(projectMemberRepository.findByTenantIdAndProjectIdAndEmployeeId(
                    tenantId, projectId, employeeId)).thenReturn(Optional.of(member));
            when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(inv -> inv.getArgument(0));

            TimeEntryResponse response = projectTimesheetService.createTimeEntry(request);

            assertThat(response.getIsBillable()).isTrue();
            assertThat(response.getBillingRate()).isEqualByComparingTo(new BigDecimal("1500.00"));
            // 8 hours * 1500/hr = 12000
            assertThat(response.getBilledAmount()).isEqualByComparingTo(new BigDecimal("12000.00"));

            ArgumentCaptor<TimeEntry> captor = ArgumentCaptor.forClass(TimeEntry.class);
            verify(timeEntryRepository).save(captor.capture());
            TimeEntry saved = captor.getValue();
            assertThat(saved.getBillingRate()).isEqualByComparingTo(new BigDecimal("1500.00"));
            assertThat(saved.getBilledAmount()).isEqualByComparingTo(new BigDecimal("12000.00"));
        }
    }

    @Test
    @DisplayName("Billable entry without a project member record is rejected and nothing is saved")
    void shouldRejectEntryWhenEmployeeIsNotAProjectMember() {
        try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
            tenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            TimeEntryRequest request = TimeEntryRequest.builder()
                    .projectId(projectId)
                    .employeeId(employeeId)
                    .workDate(LocalDate.now().minusDays(1))
                    .hoursWorked(new BigDecimal("4.00"))
                    .entryType(TimeEntry.EntryType.SUPPORT)
                    .isBillable(true)
                    .build();

            when(timeEntryValidator.validate(any(), eq(tenantId), isNull()))
                    .thenReturn(Collections.emptyList());
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
            when(projectMemberRepository.findByTenantIdAndProjectIdAndEmployeeId(
                    tenantId, projectId, employeeId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> projectTimesheetService.createTimeEntry(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not an active member");
            verify(timeEntryRepository, never()).save(any());
        }
    }

    @Test
    @DisplayName("Entry for an inactive project member is rejected")
    void shouldRejectEntryForInactiveMember() {
        try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
            tenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            TimeEntryRequest request = TimeEntryRequest.builder()
                    .projectId(projectId).employeeId(employeeId)
                    .workDate(LocalDate.now().minusDays(1)).hoursWorked(new BigDecimal("4.00"))
                    .isBillable(true).build();
            when(timeEntryValidator.validate(any(), eq(tenantId), isNull())).thenReturn(Collections.emptyList());
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
            when(projectMemberRepository.findByTenantIdAndProjectIdAndEmployeeId(tenantId, projectId, employeeId))
                    .thenReturn(Optional.of(member(new BigDecimal("1500.00"), false)));

            assertThatThrownBy(() -> projectTimesheetService.createTimeEntry(request))
                    .isInstanceOf(IllegalArgumentException.class);
            verify(timeEntryRepository, never()).save(any());
        }
    }

    @Test
    @DisplayName("Client-supplied APPROVED status and rate are ignored: entry is saved as DRAFT at the member rate")
    void shouldIgnoreClientSuppliedStatusAndRate() {
        try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
            tenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            TimeEntryRequest request = TimeEntryRequest.builder()
                    .projectId(projectId).employeeId(employeeId)
                    .workDate(LocalDate.now().minusDays(1)).hoursWorked(new BigDecimal("2.00"))
                    .isBillable(true)
                    .billingRate(new BigDecimal("5000.00"))
                    .status(TimeEntry.TimeEntryStatus.APPROVED)
                    .build();
            when(timeEntryValidator.validate(any(), eq(tenantId), isNull())).thenReturn(Collections.emptyList());
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
            when(projectMemberRepository.findByTenantIdAndProjectIdAndEmployeeId(tenantId, projectId, employeeId))
                    .thenReturn(Optional.of(member(new BigDecimal("100.00"), true)));
            when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(inv -> inv.getArgument(0));

            projectTimesheetService.createTimeEntry(request);

            ArgumentCaptor<TimeEntry> captor = ArgumentCaptor.forClass(TimeEntry.class);
            verify(timeEntryRepository).save(captor.capture());
            assertThat(captor.getValue().getStatus()).isEqualTo(TimeEntry.TimeEntryStatus.DRAFT);
            assertThat(captor.getValue().getBillingRate()).isEqualByComparingTo("100.00");
            assertThat(captor.getValue().getBilledAmount()).isEqualByComparingTo("200.00");
            assertThat(captor.getValue().getApprovedBy()).isNull();
        }
    }
}
