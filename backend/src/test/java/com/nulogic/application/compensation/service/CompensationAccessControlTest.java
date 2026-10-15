package com.nulogic.application.compensation.service;

import com.nulogic.api.compensation.dto.SalaryRevisionRequest;
import com.nulogic.common.security.DataScopeService;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.compensation.SalaryRevision;
import com.nulogic.domain.compensation.SalaryRevision.RevisionStatus;
import com.nulogic.infrastructure.compensation.repository.CompensationReviewCycleRepository;
import com.nulogic.infrastructure.compensation.repository.SalaryRevisionRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.payroll.repository.SalaryStructureRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Salary revision record-level access")
class CompensationAccessControlTest {

    private final UUID tenantId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();
    private final UUID myEmployeeId = UUID.randomUUID();
    private final UUID subject = UUID.randomUUID();
    private final UUID revisionId = UUID.randomUUID();

    private MockedStatic<TenantContext> tenantCtx;
    private SalaryRevisionRepository repo;
    private CompensationService service;
    private SalaryRevision revision;

    @BeforeEach
    void setUp() {
        tenantCtx = mockStatic(TenantContext.class);
        tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        SecurityContext.setCurrentUser(userId, myEmployeeId, Set.of("MANAGER"), Map.of());
        SecurityContext.setAllReporteeIds(Set.of());

        repo = mock(SalaryRevisionRepository.class);
        TenantTimeService time = mock(TenantTimeService.class);
        when(time.today(any())).thenReturn(LocalDate.of(2026, 1, 1));
        service = new CompensationService(repo, mock(CompensationReviewCycleRepository.class),
                mock(EmployeeRepository.class), mock(DataScopeService.class), mock(SalaryStructureRepository.class),
                mock(com.nulogic.application.audit.service.AuditLogService.class), time);
        revision = SalaryRevision.builder().employeeId(subject).status(RevisionStatus.PENDING_APPROVAL)
                .proposedBy(UUID.randomUUID()).build();
        revision.setId(revisionId);
        revision.setTenantId(tenantId);
        when(repo.findByIdAndTenantId(revisionId, tenantId)).thenReturn(Optional.of(revision));
    }

    @AfterEach
    void tearDown() {
        tenantCtx.close();
        SecurityContext.clear();
    }

    @Test
    @DisplayName("cannot propose a revision for yourself; nothing saved")
    void createForSelf_denied() {
        SalaryRevisionRequest req = new SalaryRevisionRequest();
        req.setEmployeeId(myEmployeeId);

        assertThatThrownBy(() -> service.createRevision(req)).isInstanceOf(AccessDeniedException.class);
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("cannot approve, review or reject a revision about yourself")
    void decideOnOwnRevision_denied() {
        revision.setEmployeeId(myEmployeeId);

        assertThatThrownBy(() -> service.approveRevision(revisionId, "ok")).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.reviewRevision(revisionId, "ok")).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.rejectRevision(revisionId, "no")).isInstanceOf(AccessDeniedException.class);
        verify(repo, never()).save(any());
        assertThat(revision.getStatus()).isEqualTo(RevisionStatus.PENDING_APPROVAL);
    }

    @Test
    @DisplayName("the proposer cannot also approve (four-eyes)")
    void proposerCannotApprove() {
        revision.setProposedBy(userId);

        assertThatThrownBy(() -> service.approveRevision(revisionId, "ok")).isInstanceOf(AccessDeniedException.class);
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("revision and history of another employee are denied to a non-HR, non-manager caller")
    void readScoped() {
        assertThatThrownBy(() -> service.getRevisionById(revisionId)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getEmployeeRevisionHistory(subject)).isInstanceOf(AccessDeniedException.class);

        SecurityContext.setAllReporteeIds(Set.of(subject)); // now the manager of the subject
        when(repo.findByEmployeeIdAndTenantIdOrderByEffectiveDateDesc(subject, tenantId)).thenReturn(List.of());
        assertThat(service.getEmployeeRevisionHistory(subject)).isEmpty();
    }

    @Test
    @DisplayName("an independent approver can approve")
    void independentApprover_allowed() {
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        service.approveRevision(revisionId, "ok");
        assertThat(revision.getStatus()).isEqualTo(RevisionStatus.APPROVED);
    }
}
