package com.nulogic.application.psa.service;

import com.nulogic.api.psa.dto.PSATimeEntryRequest;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.exception.ValidationException;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.psa.PSAInvoice;
import com.nulogic.domain.psa.PSAProject;
import com.nulogic.domain.psa.PSAProjectAllocation;
import com.nulogic.domain.psa.PSATimeEntry;
import com.nulogic.domain.psa.PSATimesheet;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.psa.repository.PSAInvoiceRepository;
import com.nulogic.infrastructure.psa.repository.PSAProjectAllocationRepository;
import com.nulogic.infrastructure.psa.repository.PSAProjectRepository;
import com.nulogic.infrastructure.psa.repository.PSATimeEntryRepository;
import com.nulogic.infrastructure.psa.repository.PSATimesheetRepository;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PSAService Tests")
class PSAServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;

    @Mock
    private PSAProjectRepository projectRepository;
    @Mock
    private PSAProjectAllocationRepository allocationRepository;
    @Mock
    private PSATimesheetRepository timesheetRepository;
    @Mock
    private PSATimeEntryRepository timeEntryRepository;
    @Mock
    private PSAInvoiceRepository invoiceRepository;
    @Mock
    private com.nulogic.infrastructure.project.repository.ProjectTimeEntryRepository projectTimeEntryRepository;
    @Mock
    private TenantTimeService tenantTimeService;

    @InjectMocks
    private PSAService psaService;

    private UUID tenantId;
    private UUID projectId;
    private UUID employeeId;

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
        tenantId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
    }

    @Test
    @DisplayName("allocateResources saves allocation and returns project when found")
    void allocateResources_projectFound_savesAllocationAndReturnsProject() {
        PSAProject project = PSAProject.builder().id(projectId).build();
        when(projectRepository.findByIdAndTenantId(projectId, tenantId)).thenReturn(Optional.of(project));
        when(allocationRepository.save(any(PSAProjectAllocation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Map<String, Object> allocation = new HashMap<>();
        allocation.put("employeeId", employeeId.toString());
        allocation.put("startDate", "2026-01-01");
        allocation.put("roleName", "Consultant");
        allocation.put("allocationPercentage", "50");
        allocation.put("billingRate", "125.50");

        Optional<PSAProject> result = psaService.allocateResources(projectId, allocation);

        assertThat(result).contains(project);

        ArgumentCaptor<PSAProjectAllocation> captor = ArgumentCaptor.forClass(PSAProjectAllocation.class);
        verify(allocationRepository).save(captor.capture());
        PSAProjectAllocation saved = captor.getValue();
        assertThat(saved.getTenantId()).isEqualTo(tenantId);
        assertThat(saved.getProjectId()).isEqualTo(projectId);
        assertThat(saved.getEmployeeId()).isEqualTo(employeeId);
        assertThat(saved.getRoleName()).isEqualTo("Consultant");
        assertThat(saved.getAllocationPercentage()).isEqualTo(50);
        assertThat(saved.getStartDate()).isEqualTo(LocalDate.of(2026, 1, 1));
        assertThat(saved.getBillingRate()).isEqualByComparingTo("125.50");
        assertThat(saved.getIsActive()).isTrue();
    }

    @Test
    @DisplayName("allocateResources returns empty when project not found")
    void allocateResources_projectNotFound_returnsEmpty() {
        when(projectRepository.findByIdAndTenantId(projectId, tenantId)).thenReturn(Optional.empty());

        Map<String, Object> allocation = new HashMap<>();
        allocation.put("employeeId", employeeId.toString());
        allocation.put("startDate", "2026-01-01");

        Optional<PSAProject> result = psaService.allocateResources(projectId, allocation);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("allocateResources throws when required fields are missing")
    void allocateResources_missingRequiredFields_throws() {
        PSAProject project = PSAProject.builder().id(projectId).build();
        when(projectRepository.findByIdAndTenantId(projectId, tenantId)).thenReturn(Optional.of(project));

        Map<String, Object> allocation = new HashMap<>();
        allocation.put("employeeId", employeeId.toString());
        // startDate missing

        assertThatThrownBy(() -> psaService.allocateResources(projectId, allocation))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("employeeId and startDate are required");
    }

    @Nested
    @DisplayName("Timesheet access control")
    class TimesheetAccessControl {

        private MockedStatic<SecurityContext> securityContextMock;
        private UUID callerId;
        private UUID otherEmployeeId;
        private UUID timesheetId;

        @BeforeEach
        void setUpSecurity() {
            securityContextMock = mockStatic(SecurityContext.class);
            callerId = UUID.randomUUID();
            otherEmployeeId = UUID.randomUUID();
            timesheetId = UUID.randomUUID();
            securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(callerId);
        }

        @AfterEach
        void tearDownSecurity() {
            securityContextMock.close();
        }

        private PSATimesheet timesheetOf(UUID owner, PSATimesheet.TimesheetStatus status) {
            PSATimesheet ts = PSATimesheet.builder()
                    .id(timesheetId).tenantId(tenantId).employeeId(owner).status(status).build();
            when(timesheetRepository.findByIdAndTenantId(timesheetId, tenantId)).thenReturn(Optional.of(ts));
            return ts;
        }

        private void callerManages(UUID employee) {
            securityContextMock.when(SecurityContext::getAllReporteeIds).thenReturn(Set.of(employee));
        }

        private void callerHasTenantWideApprove() {
            securityContextMock.when(() -> SecurityContext.hasPermissionAtLeast(Permission.TIMESHEET_APPROVE, RoleScope.ALL))
                    .thenReturn(true);
        }

        private PSATimeEntryRequest entryRequest() {
            return new PSATimeEntryRequest(projectId, null, LocalDate.of(2026, 1, 5), 8.0,
                    true, "work", PSATimeEntry.ActivityType.DEVELOPMENT, false);
        }

        @Test
        @DisplayName("getEmployeeTimesheets denies another employee's timesheets without scope")
        void getEmployeeTimesheets_otherEmployee_denied() {
            assertThatThrownBy(() -> psaService.getEmployeeTimesheets(otherEmployeeId))
                    .isInstanceOf(AccessDeniedException.class);
            verify(timesheetRepository, never()).findByTenantIdAndEmployeeIdOrderByWeekStartDateDesc(any(), any());
        }

        @Test
        @DisplayName("getEmployeeTimesheets allows self")
        void getEmployeeTimesheets_self_allowed() {
            when(timesheetRepository.findByTenantIdAndEmployeeIdOrderByWeekStartDateDesc(tenantId, callerId))
                    .thenReturn(List.of());

            assertThat(psaService.getEmployeeTimesheets(callerId)).isEmpty();
        }

        @Test
        @DisplayName("getEmployeeTimesheets allows the employee's manager")
        void getEmployeeTimesheets_manager_allowed() {
            callerManages(otherEmployeeId);
            when(timesheetRepository.findByTenantIdAndEmployeeIdOrderByWeekStartDateDesc(tenantId, otherEmployeeId))
                    .thenReturn(List.of());

            assertThat(psaService.getEmployeeTimesheets(otherEmployeeId)).isEmpty();
        }

        @Test
        @DisplayName("getTimesheet denies another employee's timesheet")
        void getTimesheet_otherEmployee_denied() {
            timesheetOf(otherEmployeeId, PSATimesheet.TimesheetStatus.DRAFT);

            assertThatThrownBy(() -> psaService.getTimesheet(timesheetId))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("submitTimesheet denies another employee's timesheet and does not save")
        void submitTimesheet_otherEmployee_denied() {
            timesheetOf(otherEmployeeId, PSATimesheet.TimesheetStatus.DRAFT);

            assertThatThrownBy(() -> psaService.submitTimesheet(timesheetId))
                    .isInstanceOf(AccessDeniedException.class);
            verify(timesheetRepository, never()).save(any());
        }

        @Test
        @DisplayName("addTimeEntry denies another employee's timesheet")
        void addTimeEntry_otherEmployee_denied() {
            timesheetOf(otherEmployeeId, PSATimesheet.TimesheetStatus.DRAFT);

            assertThatThrownBy(() -> psaService.addTimeEntry(timesheetId, entryRequest()))
                    .isInstanceOf(AccessDeniedException.class);
            verify(timeEntryRepository, never()).save(any());
        }

        @Test
        @DisplayName("addTimeEntry rejects a timesheet that is not in the current tenant")
        void addTimeEntry_timesheetNotInTenant_notFound() {
            when(timesheetRepository.findByIdAndTenantId(timesheetId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> psaService.addTimeEntry(timesheetId, entryRequest()))
                    .isInstanceOf(ResourceNotFoundException.class);
            verify(timeEntryRepository, never()).save(any());
        }

        @Test
        @DisplayName("addTimeEntry on a SUBMITTED timesheet fails with a conflict")
        void addTimeEntry_submittedTimesheet_conflict() {
            timesheetOf(callerId, PSATimesheet.TimesheetStatus.SUBMITTED);

            assertThatThrownBy(() -> psaService.addTimeEntry(timesheetId, entryRequest()))
                    .isInstanceOf(IllegalStateException.class);
            verify(timeEntryRepository, never()).save(any());
        }

        @Test
        @DisplayName("addTimeEntry rejects a project outside the tenant")
        void addTimeEntry_foreignProject_rejected() {
            timesheetOf(callerId, PSATimesheet.TimesheetStatus.DRAFT);
            when(projectRepository.existsByIdAndTenantId(projectId, tenantId)).thenReturn(false);

            assertThatThrownBy(() -> psaService.addTimeEntry(timesheetId, entryRequest()))
                    .isInstanceOf(ValidationException.class);
            verify(timeEntryRepository, never()).save(any());
        }

        @Test
        @DisplayName("addTimeEntry stamps tenant, timesheet and owner server-side")
        void addTimeEntry_ownDraft_derivesServerFields() {
            timesheetOf(callerId, PSATimesheet.TimesheetStatus.DRAFT);
            when(projectRepository.existsByIdAndTenantId(projectId, tenantId)).thenReturn(true);
            when(allocationRepository.existsByTenantIdAndProjectIdAndEmployeeIdAndIsActiveTrue(
                    tenantId, projectId, callerId)).thenReturn(true);
            when(timeEntryRepository.save(any(PSATimeEntry.class))).thenAnswer(inv -> inv.getArgument(0));

            PSATimeEntry saved = psaService.addTimeEntry(timesheetId, entryRequest());

            assertThat(saved.getId()).isNotNull();
            assertThat(saved.getTenantId()).isEqualTo(tenantId);
            assertThat(saved.getTimesheetId()).isEqualTo(timesheetId);
            assertThat(saved.getEmployeeId()).isEqualTo(callerId);
            assertThat(saved.getProjectId()).isEqualTo(projectId);
            assertThat(saved.getHours()).isEqualTo(8.0);
            assertThat(saved.getIsBillable()).isTrue();
        }


        @Test
        @DisplayName("addTimeEntry rejects an employee who is not allocated to the project")
        void addTimeEntry_notAllocated_rejected() {
            timesheetOf(callerId, PSATimesheet.TimesheetStatus.DRAFT);
            when(projectRepository.existsByIdAndTenantId(projectId, tenantId)).thenReturn(true);
            when(allocationRepository.existsByTenantIdAndProjectIdAndEmployeeIdAndIsActiveTrue(
                    tenantId, projectId, callerId)).thenReturn(false);

            assertThatThrownBy(() -> psaService.addTimeEntry(timesheetId, entryRequest()))
                    .isInstanceOf(ValidationException.class);
            verify(timeEntryRepository, never()).save(any());
        }

        @Test
        @DisplayName("addTimeEntry rejects an entry date outside the timesheet week")
        void addTimeEntry_dateOutsideWeek_rejected() {
            PSATimesheet ts = timesheetOf(callerId, PSATimesheet.TimesheetStatus.DRAFT);
            ts.setWeekStartDate(LocalDate.of(2026, 1, 12));
            ts.setWeekEndDate(LocalDate.of(2026, 1, 18));
            when(projectRepository.existsByIdAndTenantId(projectId, tenantId)).thenReturn(true);

            assertThatThrownBy(() -> psaService.addTimeEntry(timesheetId, entryRequest())) // 2026-01-05
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("outside the timesheet week");
            verify(timeEntryRepository, never()).save(any());
            verify(timesheetRepository, never()).save(any());
        }

        @Test
        @DisplayName("addTimeEntry recomputes timesheet totals from persisted entries, ignoring client totals")
        void addTimeEntry_recomputesTotals() {
            PSATimesheet ts = timesheetOf(callerId, PSATimesheet.TimesheetStatus.DRAFT);
            ts.setWeekStartDate(LocalDate.of(2026, 1, 5));
            ts.setWeekEndDate(LocalDate.of(2026, 1, 11));
            ts.setTotalHours(999.0); // forged
            when(projectRepository.existsByIdAndTenantId(projectId, tenantId)).thenReturn(true);
            when(allocationRepository.existsByTenantIdAndProjectIdAndEmployeeIdAndIsActiveTrue(
                    tenantId, projectId, callerId)).thenReturn(true);
            when(timeEntryRepository.save(any(PSATimeEntry.class))).thenAnswer(inv -> inv.getArgument(0));
            when(timeEntryRepository.findByTenantIdAndTimesheetIdOrderByEntryDateAsc(tenantId, timesheetId))
                    .thenReturn(List.of(
                            PSATimeEntry.builder().hours(8.0).isBillable(true).build(),
                            PSATimeEntry.builder().hours(2.0).isBillable(false).build()));

            psaService.addTimeEntry(timesheetId, entryRequest());

            assertThat(ts.getTotalHours()).isEqualTo(10.0);
            assertThat(ts.getBillableHours()).isEqualTo(8.0);
            assertThat(ts.getNonBillableHours()).isEqualTo(2.0);
            verify(timesheetRepository).save(ts);
        }

        @Test
        @DisplayName("submitTimesheet recomputes totals from persisted entries")
        void submitTimesheet_recomputesTotals() {
            PSATimesheet ts = timesheetOf(callerId, PSATimesheet.TimesheetStatus.DRAFT);
            ts.setTotalHours(500.0);
            ts.setBillableHours(500.0);
            when(tenantTimeService.now(tenantId)).thenReturn(java.time.LocalDateTime.of(2026, 1, 1, 9, 0));
            when(timesheetRepository.save(any(PSATimesheet.class))).thenAnswer(inv -> inv.getArgument(0));
            when(timeEntryRepository.findByTenantIdAndTimesheetIdOrderByEntryDateAsc(tenantId, timesheetId))
                    .thenReturn(List.of(PSATimeEntry.builder().hours(6.0).isBillable(true).build()));

            PSATimesheet submitted = psaService.submitTimesheet(timesheetId).orElseThrow();

            assertThat(submitted.getTotalHours()).isEqualTo(6.0);
            assertThat(submitted.getBillableHours()).isEqualTo(6.0);
            assertThat(submitted.getNonBillableHours()).isEqualTo(0.0);
        }

        @Test
        @DisplayName("rejectTimesheet records the rejecting actor and time")
        void rejectTimesheet_recordsActor() {
            PSATimesheet ts = timesheetOf(otherEmployeeId, PSATimesheet.TimesheetStatus.SUBMITTED);
            callerManages(otherEmployeeId);
            when(tenantTimeService.now(tenantId)).thenReturn(java.time.LocalDateTime.of(2026, 1, 1, 9, 0));
            when(timesheetRepository.save(any(PSATimesheet.class))).thenAnswer(inv -> inv.getArgument(0));

            PSATimesheet rejected = psaService.rejectTimesheet(timesheetId, "fix hours").orElseThrow();

            assertThat(rejected.getStatus()).isEqualTo(PSATimesheet.TimesheetStatus.REJECTED);
            assertThat(rejected.getApprovedBy()).isEqualTo(callerId);
            assertThat(rejected.getApprovedAt()).isNotNull();
            assertThat(rejected.getRejectionReason()).isEqualTo("fix hours");
        }

        @Test
        @DisplayName("createTimesheet discards client-supplied totals and decision fields")
        void createTimesheet_discardsClientTotals() {
            PSATimesheet in = PSATimesheet.builder().employeeId(callerId)
                    .totalHours(80.0).billableHours(80.0).approvedBy(otherEmployeeId)
                    .status(PSATimesheet.TimesheetStatus.APPROVED).build();
            when(timesheetRepository.save(any(PSATimesheet.class))).thenAnswer(inv -> inv.getArgument(0));

            PSATimesheet saved = psaService.createTimesheet(in);

            assertThat(saved.getStatus()).isEqualTo(PSATimesheet.TimesheetStatus.DRAFT);
            assertThat(saved.getTotalHours()).isZero();
            assertThat(saved.getBillableHours()).isZero();
            assertThat(saved.getApprovedBy()).isNull();
        }

        @Test
        @DisplayName("getTimesheetEntries uses the tenant-scoped lookup")
        void getTimesheetEntries_own_tenantScoped() {
            timesheetOf(callerId, PSATimesheet.TimesheetStatus.DRAFT);
            when(timeEntryRepository.findByTenantIdAndTimesheetIdOrderByEntryDateAsc(tenantId, timesheetId))
                    .thenReturn(List.of());

            assertThat(psaService.getTimesheetEntries(timesheetId)).isEmpty();
            verify(timeEntryRepository, never()).findByTimesheetIdOrderByEntryDateAsc(any());
        }

        @Test
        @DisplayName("getTimesheetEntries denies another employee's timesheet")
        void getTimesheetEntries_otherEmployee_denied() {
            timesheetOf(otherEmployeeId, PSATimesheet.TimesheetStatus.DRAFT);

            assertThatThrownBy(() -> psaService.getTimesheetEntries(timesheetId))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("approveTimesheet rejects self-approval")
        void approveTimesheet_self_denied() {
            timesheetOf(callerId, PSATimesheet.TimesheetStatus.SUBMITTED);

            assertThatThrownBy(() -> psaService.approveTimesheet(timesheetId))
                    .isInstanceOf(AccessDeniedException.class);
            verify(timesheetRepository, never()).save(any());
        }

        @Test
        @DisplayName("approveTimesheet denies an approver who is neither manager nor tenant-wide")
        void approveTimesheet_unrelatedApprover_denied() {
            timesheetOf(otherEmployeeId, PSATimesheet.TimesheetStatus.SUBMITTED);

            assertThatThrownBy(() -> psaService.approveTimesheet(timesheetId))
                    .isInstanceOf(AccessDeniedException.class);
            verify(timesheetRepository, never()).save(any());
        }

        @Test
        @DisplayName("approveTimesheet by the manager records the caller as approver")
        void approveTimesheet_manager_recordsCaller() {
            callerManages(otherEmployeeId);
            timesheetOf(otherEmployeeId, PSATimesheet.TimesheetStatus.SUBMITTED);
            when(timesheetRepository.save(any(PSATimesheet.class))).thenAnswer(inv -> inv.getArgument(0));

            Optional<PSATimesheet> result = psaService.approveTimesheet(timesheetId);

            assertThat(result).isPresent();
            assertThat(result.get().getStatus()).isEqualTo(PSATimesheet.TimesheetStatus.APPROVED);
            assertThat(result.get().getApprovedBy()).isEqualTo(callerId);
        }

        @Test
        @DisplayName("approveTimesheet allows tenant-wide approvers")
        void approveTimesheet_tenantWide_allowed() {
            callerHasTenantWideApprove();
            timesheetOf(otherEmployeeId, PSATimesheet.TimesheetStatus.SUBMITTED);
            when(timesheetRepository.save(any(PSATimesheet.class))).thenAnswer(inv -> inv.getArgument(0));

            assertThat(psaService.approveTimesheet(timesheetId))
                    .hasValueSatisfying(ts -> assertThat(ts.getApprovedBy()).isEqualTo(callerId));
        }

        @ParameterizedTest
        @EnumSource(value = PSATimesheet.TimesheetStatus.class, names = "SUBMITTED", mode = EnumSource.Mode.EXCLUDE)
        @DisplayName("approveTimesheet on a non-SUBMITTED timesheet fails with a conflict")
        void approveTimesheet_notSubmitted_conflict(PSATimesheet.TimesheetStatus status) {
            callerManages(otherEmployeeId);
            timesheetOf(otherEmployeeId, status);

            assertThatThrownBy(() -> psaService.approveTimesheet(timesheetId))
                    .isInstanceOf(IllegalStateException.class);
            verify(timesheetRepository, never()).save(any());
        }

        @ParameterizedTest
        @EnumSource(value = PSATimesheet.TimesheetStatus.class, names = "SUBMITTED", mode = EnumSource.Mode.EXCLUDE)
        @DisplayName("rejectTimesheet on a non-SUBMITTED timesheet fails with a conflict")
        void rejectTimesheet_notSubmitted_conflict(PSATimesheet.TimesheetStatus status) {
            callerManages(otherEmployeeId);
            timesheetOf(otherEmployeeId, status);

            assertThatThrownBy(() -> psaService.rejectTimesheet(timesheetId, "nope"))
                    .isInstanceOf(IllegalStateException.class);
            verify(timesheetRepository, never()).save(any());
        }

        @Test
        @DisplayName("rejectTimesheet by the manager on a SUBMITTED timesheet succeeds")
        void rejectTimesheet_managerSubmitted_rejects() {
            callerManages(otherEmployeeId);
            timesheetOf(otherEmployeeId, PSATimesheet.TimesheetStatus.SUBMITTED);
            when(timesheetRepository.save(any(PSATimesheet.class))).thenAnswer(inv -> inv.getArgument(0));

            assertThat(psaService.rejectTimesheet(timesheetId, "fix hours"))
                    .hasValueSatisfying(ts -> {
                        assertThat(ts.getStatus()).isEqualTo(PSATimesheet.TimesheetStatus.REJECTED);
                        assertThat(ts.getRejectionReason()).isEqualTo("fix hours");
                    });
        }

        @ParameterizedTest
        @EnumSource(value = PSATimesheet.TimesheetStatus.class, names = {"SUBMITTED", "UNDER_REVIEW", "APPROVED"})
        @DisplayName("submitTimesheet from a non-editable status fails with a conflict")
        void submitTimesheet_notEditable_conflict(PSATimesheet.TimesheetStatus status) {
            timesheetOf(callerId, status);

            assertThatThrownBy(() -> psaService.submitTimesheet(timesheetId))
                    .isInstanceOf(IllegalStateException.class);
            verify(timesheetRepository, never()).save(any());
        }

        @ParameterizedTest
        @EnumSource(value = PSATimesheet.TimesheetStatus.class, names = {"DRAFT", "REJECTED"})
        @DisplayName("submitTimesheet from an editable status moves it to SUBMITTED")
        void submitTimesheet_editable_submits(PSATimesheet.TimesheetStatus status) {
            timesheetOf(callerId, status);
            when(timesheetRepository.save(any(PSATimesheet.class))).thenAnswer(inv -> inv.getArgument(0));

            assertThat(psaService.submitTimesheet(timesheetId))
                    .hasValueSatisfying(ts -> assertThat(ts.getStatus())
                            .isEqualTo(PSATimesheet.TimesheetStatus.SUBMITTED));
        }

        @Test
        @DisplayName("rejectTimesheet rejects self-rejection")
        void rejectTimesheet_self_denied() {
            timesheetOf(callerId, PSATimesheet.TimesheetStatus.SUBMITTED);

            assertThatThrownBy(() -> psaService.rejectTimesheet(timesheetId, "nope"))
                    .isInstanceOf(AccessDeniedException.class);
            verify(timesheetRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Invoice lifecycle")
    class InvoiceLifecycle {

        private UUID invoiceId;

        @BeforeEach
        void setUpInvoice() {
            invoiceId = UUID.randomUUID();
            lenient().when(invoiceRepository.save(any(PSAInvoice.class))).thenAnswer(i -> i.getArgument(0));
        }

        private PSAInvoice invoiceIn(PSAInvoice.InvoiceStatus status) {
            PSAInvoice inv = PSAInvoice.builder().id(invoiceId).tenantId(tenantId).status(status)
                    .billableAmount(new BigDecimal("100.00")).taxAmount(new BigDecimal("10.00"))
                    .totalAmount(new BigDecimal("110.00")).build();
            when(invoiceRepository.findByIdAndTenantIdForUpdate(invoiceId, tenantId)).thenReturn(Optional.of(inv));
            return inv;
        }

        @Test
        @DisplayName("approveInvoice moves DRAFT to SENT")
        void approve_draft_sent() {
            invoiceIn(PSAInvoice.InvoiceStatus.DRAFT);

            assertThat(psaService.approveInvoice(invoiceId).orElseThrow().getStatus())
                    .isEqualTo(PSAInvoice.InvoiceStatus.SENT);
        }

        @Test
        @DisplayName("approveInvoice refuses every non-DRAFT status and saves nothing")
        void approve_nonDraft_conflict() {
            PSAInvoice inv = invoiceIn(PSAInvoice.InvoiceStatus.SENT);
            for (PSAInvoice.InvoiceStatus s : new PSAInvoice.InvoiceStatus[]{
                    PSAInvoice.InvoiceStatus.SENT, PSAInvoice.InvoiceStatus.PAID,
                    PSAInvoice.InvoiceStatus.CANCELLED, PSAInvoice.InvoiceStatus.OVERDUE,
                    PSAInvoice.InvoiceStatus.PARTIALLY_PAID}) {
                inv.setStatus(s);
                assertThatThrownBy(() -> psaService.approveInvoice(invoiceId))
                        .isInstanceOf(IllegalStateException.class);
            }
            verify(invoiceRepository, never()).save(any());
        }

        @Test
        @DisplayName("updateInvoice cannot touch a non-DRAFT invoice")
        void update_nonDraft_conflict() {
            invoiceIn(PSAInvoice.InvoiceStatus.PAID);

            assertThatThrownBy(() -> psaService.updateInvoice(invoiceId,
                    PSAInvoice.builder().billableAmount(BigDecimal.ONE).build()))
                    .isInstanceOf(IllegalStateException.class);
            verify(invoiceRepository, never()).save(any());
        }

        @Test
        @DisplayName("updateInvoice ignores payload status/paid/project fields and recomputes the total")
        void update_draft_ignoresProtectedFields() {
            PSAInvoice existing = invoiceIn(PSAInvoice.InvoiceStatus.DRAFT);
            UUID realProject = UUID.randomUUID();
            existing.setProjectId(realProject);
            PSAInvoice payload = PSAInvoice.builder()
                    .status(PSAInvoice.InvoiceStatus.PAID)
                    .paidAt(java.time.LocalDateTime.now())
                    .projectId(UUID.randomUUID())
                    .tenantId(UUID.randomUUID())
                    .billableAmount(new BigDecimal("200.00"))
                    .taxAmount(new BigDecimal("20.00"))
                    .notes("n").build();
            when(projectTimeEntryRepository.existsByTenantIdAndInvoiceId(tenantId, invoiceId)).thenReturn(false);

            PSAInvoice saved = psaService.updateInvoice(invoiceId, payload).orElseThrow();

            assertThat(saved.getStatus()).isEqualTo(PSAInvoice.InvoiceStatus.DRAFT);
            assertThat(saved.getPaidAt()).isNull();
            assertThat(saved.getProjectId()).isEqualTo(realProject);
            assertThat(saved.getTenantId()).isEqualTo(tenantId);
            assertThat(saved.getTotalAmount()).isEqualByComparingTo("220.00");
            assertThat(saved.getNotes()).isEqualTo("n");
        }

        @Test
        @DisplayName("updateInvoice keeps the billable amount of an invoice generated from time entries")
        void update_generatedInvoice_amountLocked() {
            invoiceIn(PSAInvoice.InvoiceStatus.DRAFT);
            when(projectTimeEntryRepository.existsByTenantIdAndInvoiceId(tenantId, invoiceId)).thenReturn(true);

            PSAInvoice saved = psaService.updateInvoice(invoiceId,
                    PSAInvoice.builder().billableAmount(new BigDecimal("1.00")).build()).orElseThrow();

            assertThat(saved.getBillableAmount()).isEqualByComparingTo("100.00");
        }

        @Test
        @DisplayName("updateInvoice is empty for an invoice outside the tenant")
        void update_otherTenant_empty() {
            when(invoiceRepository.findByIdAndTenantIdForUpdate(invoiceId, tenantId)).thenReturn(Optional.empty());

            assertThat(psaService.updateInvoice(invoiceId, PSAInvoice.builder().build())).isEmpty();
            verify(invoiceRepository, never()).save(any());
        }

        @Test
        @DisplayName("createInvoice forces DRAFT, clears paid state and computes the total server-side")
        void create_forcesDraft() {
            PSAInvoice in = PSAInvoice.builder()
                    .status(PSAInvoice.InvoiceStatus.PAID)
                    .paidAt(java.time.LocalDateTime.now())
                    .billableAmount(new BigDecimal("50.00"))
                    .taxAmount(new BigDecimal("5.00"))
                    .totalAmount(new BigDecimal("1.00")).build();
            when(tenantTimeService.today(tenantId)).thenReturn(LocalDate.of(2026, 2, 3));

            PSAInvoice saved = psaService.createInvoice(in);

            assertThat(saved.getStatus()).isEqualTo(PSAInvoice.InvoiceStatus.DRAFT);
            assertThat(saved.getPaidAt()).isNull();
            assertThat(saved.getTotalAmount()).isEqualByComparingTo("55.00");
            assertThat(saved.getTenantId()).isEqualTo(tenantId);
            assertThat(saved.getInvoiceDate()).isEqualTo(LocalDate.of(2026, 2, 3));
        }

        @Test
        @DisplayName("createInvoice rejects a missing or negative billable amount")
        void create_invalidAmount_rejected() {
            assertThatThrownBy(() -> psaService.createInvoice(PSAInvoice.builder().build()))
                    .isInstanceOf(ValidationException.class);
            assertThatThrownBy(() -> psaService.createInvoice(
                    PSAInvoice.builder().billableAmount(new BigDecimal("-1")).build()))
                    .isInstanceOf(ValidationException.class);
            verify(invoiceRepository, never()).save(any());
        }
    }
}
