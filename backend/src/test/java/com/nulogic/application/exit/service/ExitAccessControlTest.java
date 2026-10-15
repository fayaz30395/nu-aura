package com.nulogic.application.exit.service;

import com.nulogic.api.exit.dto.ExitClearanceRequest;
import com.nulogic.api.exit.dto.ExitInterviewRequest;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.exit.ExitClearance;
import com.nulogic.domain.exit.ExitInterview;
import com.nulogic.domain.exit.ExitProcess;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.exit.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Exit clearance / interview record-level access")
class ExitAccessControlTest {

    private final UUID tenantId = UUID.randomUUID();
    private final UUID exitEmployee = UUID.randomUUID();
    private final UUID approver = UUID.randomUUID();
    private final UUID processId = UUID.randomUUID();
    private final UUID clearanceId = UUID.randomUUID();
    private final UUID interviewId = UUID.randomUUID();

    private MockedStatic<TenantContext> tenantCtx;
    private MockedStatic<SecurityContext> secCtx;
    private ExitProcessRepository processRepo;
    private ExitClearanceRepository clearanceRepo;
    private ExitInterviewRepository interviewRepo;
    private EmployeeRepository employeeRepo;
    private ExitManagementService service;
    private ExitProcess process;
    private ExitClearance clearance;
    private ExitInterview interview;
    private final LocalDate today = LocalDate.of(2026, 1, 15);

    @BeforeEach
    void setUp() {
        tenantCtx = mockStatic(TenantContext.class);
        secCtx = mockStatic(SecurityContext.class);
        tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        secCtx.when(SecurityContext::getAllReporteeIds).thenReturn(Set.of());
        secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(approver);

        processRepo = mock(ExitProcessRepository.class);
        clearanceRepo = mock(ExitClearanceRepository.class);
        interviewRepo = mock(ExitInterviewRepository.class);
        employeeRepo = mock(EmployeeRepository.class);
        TenantTimeService time = mock(TenantTimeService.class);
        when(time.today(tenantId)).thenReturn(today);
        service = new ExitManagementService(processRepo, clearanceRepo, mock(FullAndFinalSettlementRepository.class),
                interviewRepo, mock(AssetRecoveryRepository.class), employeeRepo, null, time, null);

        process = new ExitProcess();
        process.setId(processId);
        process.setTenantId(tenantId);
        process.setEmployeeId(exitEmployee);
        process.setStatus(ExitProcess.ExitStatus.IN_PROGRESS);
        when(processRepo.findByIdAndTenantId(processId, tenantId)).thenReturn(Optional.of(process));

        clearance = new ExitClearance();
        clearance.setId(clearanceId);
        clearance.setTenantId(tenantId);
        clearance.setExitProcessId(processId);
        clearance.setStatus(ExitClearance.ClearanceStatus.PENDING);
        when(clearanceRepo.findByIdAndTenantId(clearanceId, tenantId)).thenReturn(Optional.of(clearance));
        when(clearanceRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        interview = new ExitInterview();
        interview.setTenantId(tenantId);
        interview.setEmployeeId(exitEmployee);
        interview.setInterviewerId(approver);
        interview.setStatus(ExitInterview.InterviewStatus.SCHEDULED);
        when(interviewRepo.findByIdAndTenantId(interviewId, tenantId)).thenReturn(Optional.of(interview));
        when(interviewRepo.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        tenantCtx.close();
        secCtx.close();
    }

    private ExitClearanceRequest decision(ExitClearance.ClearanceStatus status) {
        ExitClearanceRequest r = new ExitClearanceRequest();
        r.setStatus(status);
        r.setApproverId(UUID.randomUUID());               // forged
        r.setApprovedDate(LocalDate.of(1999, 1, 1));      // forged
        return r;
    }

    @Test
    @DisplayName("clearance decision takes approver and date from the server, not the body")
    void clearanceApprove_usesServerIdentityAndDate() {
        service.updateExitClearance(clearanceId, decision(ExitClearance.ClearanceStatus.APPROVED));

        assertThat(clearance.getApproverId()).isEqualTo(approver);
        assertThat(clearance.getApprovedDate()).isEqualTo(today);
        assertThat(clearance.getStatus()).isEqualTo(ExitClearance.ClearanceStatus.APPROVED);
    }

    @Test
    @DisplayName("the exiting employee cannot decide their own clearance; nothing is saved")
    void clearanceOwnExit_denied() {
        secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(exitEmployee);

        assertThatThrownBy(() -> service.updateExitClearance(clearanceId, decision(ExitClearance.ClearanceStatus.APPROVED)))
                .isInstanceOf(AccessDeniedException.class);
        verify(clearanceRepo, never()).save(any());
        assertThat(clearance.getStatus()).isEqualTo(ExitClearance.ClearanceStatus.PENDING);
    }

    @Test
    @DisplayName("clearance of a completed exit is frozen")
    void clearanceOnCompletedExit_rejected() {
        process.setStatus(ExitProcess.ExitStatus.COMPLETED);

        assertThatThrownBy(() -> service.updateExitClearance(clearanceId, decision(ExitClearance.ClearanceStatus.REJECTED)))
                .isInstanceOf(IllegalStateException.class);
        verify(clearanceRepo, never()).save(any());
    }

    @Test
    @DisplayName("creating a clearance for another tenant's exit process is rejected and forces PENDING")
    void clearanceCreate_crossTenantProcessRejected_andStatusForced() {
        UUID foreign = UUID.randomUUID();
        when(processRepo.findByIdAndTenantId(foreign, tenantId)).thenReturn(Optional.empty());
        ExitClearanceRequest bad = decision(ExitClearance.ClearanceStatus.APPROVED);
        bad.setExitProcessId(foreign);
        assertThatThrownBy(() -> service.createExitClearance(bad)).isInstanceOf(IllegalArgumentException.class);
        verify(clearanceRepo, never()).save(any());

        when(employeeRepo.findByIdAndTenantId(any(), any())).thenReturn(Optional.of(new Employee()));
        ExitClearanceRequest ok = decision(ExitClearance.ClearanceStatus.APPROVED);
        ok.setExitProcessId(processId);
        var created = service.createExitClearance(ok);
        assertThat(created.getStatus()).isEqualTo(ExitClearance.ClearanceStatus.PENDING);
        assertThat(created.getApprovedDate()).isNull();
    }

    @Test
    @DisplayName("non tenant-wide caller cannot list another approver's clearances or a stranger's process clearances")
    void clearanceReads_scoped() {
        assertThatThrownBy(() -> service.getClearancesByApprover(UUID.randomUUID()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getClearancesByExitProcess(processId))
                .isInstanceOf(AccessDeniedException.class);

        secCtx.when(SecurityContext::isHRManager).thenReturn(true);
        when(clearanceRepo.findByTenantIdAndExitProcessId(tenantId, processId)).thenReturn(List.of());
        assertThat(service.getClearancesByExitProcess(processId)).isEmpty();
    }

    @Test
    @DisplayName("exit employee id for an interview comes from the process, not the body")
    void interviewCreate_employeeFromProcess() {
        ExitInterviewRequest req = new ExitInterviewRequest();
        req.setExitProcessId(processId);
        req.setEmployeeId(UUID.randomUUID()); // forged
        when(interviewRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        service.createExitInterview(req);

        verify(interviewRepo).save(argThat(i -> exitEmployee.equals(i.getEmployeeId())));
    }

    @Test
    @DisplayName("the interviewee cannot conduct their own exit interview; a completed one cannot be redone")
    void interviewConduct_selfAndCompletedBlocked() {
        secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(exitEmployee);
        assertThatThrownBy(() -> service.conductExitInterview(interviewId, new ExitInterviewRequest()))
                .isInstanceOf(AccessDeniedException.class);

        secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(approver);
        interview.setStatus(ExitInterview.InterviewStatus.COMPLETED);
        assertThatThrownBy(() -> service.rescheduleInterview(interviewId, today))
                .isInstanceOf(IllegalStateException.class);
        verify(interviewRepo, never()).save(any());
    }

    @Test
    @DisplayName("confidential interview is hidden from callers who are neither interviewer nor tenant-wide")
    void interviewRead_scoped() {
        secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(UUID.randomUUID());
        assertThatThrownBy(() -> service.getExitInterviewById(interviewId)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getExitInterviewAnalytics()).isInstanceOf(AccessDeniedException.class);

        secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(approver); // the interviewer
        assertThat(service.getExitInterviewById(interviewId)).isNotNull();
    }
}
