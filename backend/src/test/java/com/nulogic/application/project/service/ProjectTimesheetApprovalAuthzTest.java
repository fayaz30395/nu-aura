package com.nulogic.application.project.service;

import com.nulogic.application.project.validation.TimeEntryValidator;
import com.nulogic.application.workflow.service.WorkflowService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.project.Project;
import com.nulogic.domain.project.ProjectMember;
import com.nulogic.domain.project.TimeEntry;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.project.repository.HrmsProjectMemberRepository;
import com.nulogic.infrastructure.project.repository.HrmsProjectRepository;
import com.nulogic.infrastructure.project.repository.ProjectTimeEntryRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProjectTimesheetService approve/reject authority")
class ProjectTimesheetApprovalAuthzTest {

    @Mock private ProjectTimeEntryRepository timeEntryRepository;
    @Mock private HrmsProjectMemberRepository projectMemberRepository;
    @Mock private HrmsProjectRepository projectRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private TimeEntryValidator timeEntryValidator;
    @Mock private WorkflowService workflowService;
    @Mock private TenantTimeService tenantTimeService;

    private ProjectTimesheetService service;
    private MockedStatic<SecurityContext> securityContext;
    private MockedStatic<TenantContext> tenantContext;

    private final UUID tenantId = UUID.randomUUID();
    private final UUID projectId = UUID.randomUUID();
    private final UUID ownerId = UUID.randomUUID();
    private final UUID callerId = UUID.randomUUID();
    private final UUID entryId = UUID.randomUUID();
    private TimeEntry entry;

    @BeforeEach
    void setUp() {
        service = new ProjectTimesheetService(timeEntryRepository, projectMemberRepository, projectRepository,
                employeeRepository, timeEntryValidator, workflowService, tenantTimeService);
        tenantContext = mockStatic(TenantContext.class);
        tenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        securityContext = mockStatic(SecurityContext.class);
        securityContext.when(SecurityContext::getCurrentEmployeeId).thenReturn(callerId);
        securityContext.when(SecurityContext::getCurrentUserId).thenReturn(UUID.randomUUID());

        entry = new TimeEntry();
        entry.setId(entryId);
        entry.setTenantId(tenantId);
        entry.setProjectId(projectId);
        entry.setEmployeeId(ownerId);
        entry.setHoursWorked(new BigDecimal("8.00"));
        entry.setWorkDate(LocalDate.now().minusDays(1));
        entry.setIsBillable(true);
        entry.setStatus(TimeEntry.TimeEntryStatus.SUBMITTED);
        lenient().when(timeEntryRepository.findByIdAndTenantId(entryId, tenantId)).thenReturn(Optional.of(entry));
        lenient().when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(i -> i.getArgument(0));
        lenient().when(tenantTimeService.now(tenantId)).thenReturn(LocalDateTime.of(2026, 1, 1, 10, 0));
    }

    @AfterEach
    void tearDown() {
        securityContext.close();
        tenantContext.close();
    }

    private void assertUntouched() {
        verify(timeEntryRepository, never()).save(any());
        assertThat(entry.getStatus()).isEqualTo(TimeEntry.TimeEntryStatus.SUBMITTED);
        assertThat(entry.getApprovedBy()).isNull();
    }

    @Test
    @DisplayName("approve denies the entry owner even with tenant-wide scope")
    void approve_self_denied() {
        entry.setEmployeeId(callerId);
        securityContext.when(SecurityContext::isSuperAdmin).thenReturn(true);

        assertThatThrownBy(() -> service.approveTimeEntry(entryId, UUID.randomUUID()))
                .isInstanceOf(AccessDeniedException.class);
        assertUntouched();
    }

    @Test
    @DisplayName("approve denies a TIMESHEET_APPROVE holder with no relationship to the entry")
    void approve_unrelatedApprover_denied() {
        assertThatThrownBy(() -> service.approveTimeEntry(entryId, callerId))
                .isInstanceOf(AccessDeniedException.class);
        assertUntouched();
    }

    @Test
    @DisplayName("approve denies a project member who cannot approve time")
    void approve_memberWithoutApproveFlag_denied() {
        ProjectMember member = new ProjectMember();
        member.setIsActive(true);
        member.setCanApproveTime(false);
        when(projectMemberRepository.findByTenantIdAndProjectIdAndEmployeeId(tenantId, projectId, callerId))
                .thenReturn(Optional.of(member));

        assertThatThrownBy(() -> service.approveTimeEntry(entryId, callerId))
                .isInstanceOf(AccessDeniedException.class);
        assertUntouched();
    }

    @Test
    @DisplayName("approve ignores a forged approverId argument and stamps the authenticated caller")
    void approve_manager_stampsServerActor() {
        securityContext.when(SecurityContext::getAllReporteeIds).thenReturn(Set.of(ownerId));
        UUID forged = UUID.randomUUID();

        service.approveTimeEntry(entryId, forged);

        assertThat(entry.getStatus()).isEqualTo(TimeEntry.TimeEntryStatus.APPROVED);
        assertThat(entry.getApprovedBy()).isEqualTo(callerId);
        assertThat(entry.getApprovedAt()).isNotNull();
    }

    @Test
    @DisplayName("approve allows the project manager")
    void approve_projectManager_allowed() {
        Project project = new Project();
        project.setProjectManagerId(callerId);
        when(projectRepository.findByIdAndTenantId(projectId, tenantId)).thenReturn(Optional.of(project));

        service.approveTimeEntry(entryId, callerId);

        assertThat(entry.getStatus()).isEqualTo(TimeEntry.TimeEntryStatus.APPROVED);
    }

    @Test
    @DisplayName("approve allows an active project member flagged canApproveTime")
    void approve_flaggedMember_allowed() {
        ProjectMember member = new ProjectMember();
        member.setIsActive(true);
        member.setCanApproveTime(true);
        when(projectMemberRepository.findByTenantIdAndProjectIdAndEmployeeId(tenantId, projectId, callerId))
                .thenReturn(Optional.of(member));

        service.approveTimeEntry(entryId, callerId);

        assertThat(entry.getStatus()).isEqualTo(TimeEntry.TimeEntryStatus.APPROVED);
    }

    @Test
    @DisplayName("approve allows tenant-wide TIMESHEET_APPROVE scope")
    void approve_tenantWide_allowed() {
        securityContext.when(() -> SecurityContext.hasPermissionAtLeast(Permission.TIMESHEET_APPROVE, RoleScope.ALL))
                .thenReturn(true);

        service.approveTimeEntry(entryId, callerId);

        assertThat(entry.getStatus()).isEqualTo(TimeEntry.TimeEntryStatus.APPROVED);
    }

    @Test
    @DisplayName("approve is not found for an entry outside the tenant")
    void approve_otherTenant_notFound() {
        when(timeEntryRepository.findByIdAndTenantId(entryId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.approveTimeEntry(entryId, callerId))
                .isInstanceOf(IllegalArgumentException.class);
        verify(timeEntryRepository, never()).save(any());
    }

    @Test
    @DisplayName("approve of a non-SUBMITTED entry is a state conflict")
    void approve_wrongState_conflict() {
        securityContext.when(SecurityContext::isSuperAdmin).thenReturn(true);
        for (TimeEntry.TimeEntryStatus s : new TimeEntry.TimeEntryStatus[]{
                TimeEntry.TimeEntryStatus.DRAFT, TimeEntry.TimeEntryStatus.APPROVED,
                TimeEntry.TimeEntryStatus.REJECTED, TimeEntry.TimeEntryStatus.BILLED}) {
            entry.setStatus(s);
            assertThatThrownBy(() -> service.approveTimeEntry(entryId, callerId))
                    .isInstanceOf(IllegalStateException.class);
        }
        verify(timeEntryRepository, never()).save(any());
    }

    @Test
    @DisplayName("reject denies self and unrelated callers without mutating the entry")
    void reject_self_andUnrelated_denied() {
        assertThatThrownBy(() -> service.rejectTimeEntry(entryId, callerId, "no"))
                .isInstanceOf(AccessDeniedException.class);
        entry.setEmployeeId(callerId);
        securityContext.when(SecurityContext::isSuperAdmin).thenReturn(true);
        assertThatThrownBy(() -> service.rejectTimeEntry(entryId, callerId, "no"))
                .isInstanceOf(AccessDeniedException.class);
        verify(timeEntryRepository, never()).save(any());
        assertThat(entry.getRejectedReason()).isNull();
    }

    @Test
    @DisplayName("reject by the manager records the actor and reason")
    void reject_manager_recordsActor() {
        securityContext.when(SecurityContext::getAllReporteeIds).thenReturn(Set.of(ownerId));

        service.rejectTimeEntry(entryId, UUID.randomUUID(), "wrong project");

        assertThat(entry.getStatus()).isEqualTo(TimeEntry.TimeEntryStatus.REJECTED);
        assertThat(entry.getApprovedBy()).isEqualTo(callerId);
        assertThat(entry.getRejectedReason()).isEqualTo("wrong project");
    }

    @Test
    @DisplayName("workflow approval callback refuses to approve the approver's own entry")
    void onApproved_self_denied() {
        assertThatThrownBy(() -> service.onApproved(tenantId, entryId, ownerId))
                .isInstanceOf(AccessDeniedException.class);
        assertUntouched();
    }

    @Test
    @DisplayName("workflow approval callback approves for a different approver")
    void onApproved_otherApprover_approves() {
        service.onApproved(tenantId, entryId, callerId);

        assertThat(entry.getStatus()).isEqualTo(TimeEntry.TimeEntryStatus.APPROVED);
        assertThat(entry.getApprovedBy()).isEqualTo(callerId);
    }
}
