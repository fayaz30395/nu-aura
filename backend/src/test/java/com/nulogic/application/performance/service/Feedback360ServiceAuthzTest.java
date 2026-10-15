package com.nulogic.application.performance.service;

import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.performance.Feedback360Cycle;
import com.nulogic.domain.performance.Feedback360Cycle.CycleStatus;
import com.nulogic.domain.performance.Feedback360Request;
import com.nulogic.domain.performance.Feedback360Request.RequestStatus;
import com.nulogic.domain.performance.Feedback360Request.ReviewerType;
import com.nulogic.domain.performance.Feedback360Response;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.performance.repository.Feedback360CycleRepository;
import com.nulogic.infrastructure.performance.repository.Feedback360RequestRepository;
import com.nulogic.infrastructure.performance.repository.Feedback360ResponseRepository;
import com.nulogic.infrastructure.performance.repository.Feedback360SummaryRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Feedback360Service nomination and response authorization")
class Feedback360ServiceAuthzTest {

    @Mock
    private Feedback360CycleRepository cycleRepository;
    @Mock
    private Feedback360RequestRepository requestRepository;
    @Mock
    private Feedback360ResponseRepository responseRepository;
    @Mock
    private Feedback360SummaryRepository summaryRepository;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private EmployeeRepository employeeRepository;

    private Feedback360Service service;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID cycleId = UUID.randomUUID();
    private final UUID requestId = UUID.randomUUID();
    private final UUID subjectId = UUID.randomUUID();
    private final UUID managerId = UUID.randomUUID();
    private final UUID peerId = UUID.randomUUID();
    private Feedback360Cycle cycle;
    private Employee subject;

    @BeforeEach
    void setUp() {
        service = new Feedback360Service(cycleRepository, requestRepository, responseRepository,
                summaryRepository, tenantTimeService, employeeRepository);
        when(tenantTimeService.now(nullable(UUID.class))).thenReturn(LocalDateTime.now());
        cycle = new Feedback360Cycle();
        cycle.setId(cycleId);
        cycle.setStatus(CycleStatus.NOMINATION_OPEN);
        when(cycleRepository.findByIdAndTenantId(cycleId, tenantId)).thenReturn(Optional.of(cycle));
        subject = new Employee();
        subject.setId(subjectId);
        subject.setManagerId(managerId);
        when(employeeRepository.findByIdAndTenantId(subjectId, tenantId)).thenReturn(Optional.of(subject));
        when(employeeRepository.findByIdAndTenantId(peerId, tenantId)).thenReturn(Optional.of(new Employee()));
        when(requestRepository.findRequestsForSubject(tenantId, subjectId, cycleId)).thenReturn(List.of());
        when(requestRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(responseRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    private void actAs(UUID employeeId) {
        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Collections.emptySet(), Collections.emptyMap());
    }

    private void actAsHr(UUID employeeId) {
        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Collections.emptySet(),
                Map.of(Permission.FEEDBACK_360_MANAGE, RoleScope.ALL));
    }

    // ---- nomination ----

    @Test
    @DisplayName("nominate: subject can nominate a peer; nominator is the actor and approval is not self-granted")
    void subjectNominatesPeer() {
        actAs(subjectId);

        Feedback360Request r = service.nominateReviewer(tenantId, cycleId, subjectId, peerId, ReviewerType.PEER, subjectId);

        assertThat(r.getNominatedBy()).isEqualTo(subjectId);
        assertThat(r.getNominationApproved()).isFalse();
        assertThat(r.getTenantId()).isEqualTo(tenantId);
        verify(requestRepository).save(r);
    }

    @Test
    @DisplayName("nominate: the subject's manager can nominate")
    void managerNominates() {
        actAs(managerId);

        assertThat(service.nominateReviewer(tenantId, cycleId, subjectId, peerId, ReviewerType.PEER, managerId)).isNotNull();
    }

    @Test
    @DisplayName("nominate: an unrelated employee cannot nominate for someone else, nothing saved")
    void strangerCannotNominate() {
        UUID stranger = UUID.randomUUID();
        actAs(stranger);

        assertThatThrownBy(() -> service.nominateReviewer(tenantId, cycleId, subjectId, peerId, ReviewerType.PEER, stranger))
                .isInstanceOf(AccessDeniedException.class);
        verify(requestRepository, never()).save(any());
    }

    @Test
    @DisplayName("nominate: cross-tenant / unknown subject or reviewer is rejected")
    void unknownEmployeesRejected() {
        actAs(subjectId);
        UUID foreign = UUID.randomUUID();
        when(employeeRepository.findByIdAndTenantId(foreign, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.nominateReviewer(tenantId, cycleId, subjectId, foreign, ReviewerType.PEER, subjectId))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.nominateReviewer(tenantId, cycleId, foreign, peerId, ReviewerType.PEER, subjectId))
                .isInstanceOf(IllegalArgumentException.class);
        verify(requestRepository, never()).save(any());
    }

    @Test
    @DisplayName("nominate: cycle from another tenant (not found) is rejected")
    void foreignCycleRejected() {
        actAs(subjectId);

        assertThatThrownBy(() -> service.nominateReviewer(tenantId, UUID.randomUUID(), subjectId, peerId, ReviewerType.PEER, subjectId))
                .isInstanceOf(IllegalArgumentException.class);
        verify(requestRepository, never()).save(any());
    }

    @Test
    @DisplayName("nominate: closed cycle is rejected for everyone; DRAFT only for HR")
    void cycleStateChecked() {
        actAs(subjectId);
        cycle.setStatus(CycleStatus.DRAFT);
        assertThatThrownBy(() -> service.nominateReviewer(tenantId, cycleId, subjectId, peerId, ReviewerType.PEER, subjectId))
                .isInstanceOf(IllegalStateException.class);

        actAsHr(UUID.randomUUID());
        assertThat(service.nominateReviewer(tenantId, cycleId, subjectId, peerId, ReviewerType.PEER, UUID.randomUUID())).isNotNull();

        cycle.setStatus(CycleStatus.CLOSED);
        assertThatThrownBy(() -> service.nominateReviewer(tenantId, cycleId, subjectId, peerId, ReviewerType.PEER, UUID.randomUUID()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("nominate: duplicate reviewer for the same subject and cycle is rejected")
    void duplicateRejected() {
        actAs(subjectId);
        Feedback360Request existing = Feedback360Request.builder().reviewerId(peerId).build();
        when(requestRepository.findRequestsForSubject(tenantId, subjectId, cycleId)).thenReturn(List.of(existing));

        assertThatThrownBy(() -> service.nominateReviewer(tenantId, cycleId, subjectId, peerId, ReviewerType.PEER, subjectId))
                .isInstanceOf(IllegalStateException.class);
        verify(requestRepository, never()).save(any());
    }

    @Test
    @DisplayName("nominate: SELF type must name the subject, and only SELF may")
    void selfTypeConsistency() {
        actAs(subjectId);

        assertThatThrownBy(() -> service.nominateReviewer(tenantId, cycleId, subjectId, peerId, ReviewerType.SELF, subjectId))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.nominateReviewer(tenantId, cycleId, subjectId, subjectId, ReviewerType.PEER, subjectId))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ---- responses ----

    private Feedback360Request request(RequestStatus status) {
        Feedback360Request r = Feedback360Request.builder()
                .cycleId(cycleId).subjectEmployeeId(subjectId).reviewerId(peerId)
                .reviewerType(ReviewerType.PEER).status(status).build();
        r.setId(requestId);
        r.setTenantId(tenantId);
        when(requestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(r));
        return r;
    }

    private Feedback360Response incoming(boolean draft) {
        Feedback360Response r = Feedback360Response.builder()
                .requestId(requestId).reviewerId(peerId).isDraft(draft)
                .overallRating(new BigDecimal("4.00")).build();
        r.setTenantId(tenantId);
        return r;
    }

    @Test
    @DisplayName("response: the assigned reviewer can submit; subject/cycle/type come from the stored request")
    void reviewerSubmits() {
        Feedback360Request req = request(RequestStatus.PENDING);
        cycle.setStatus(CycleStatus.IN_PROGRESS);
        when(responseRepository.findByRequestIdAndTenantId(requestId, tenantId)).thenReturn(Optional.empty());
        Feedback360Response in = incoming(false);
        in.setSubjectEmployeeId(UUID.randomUUID()); // spoofed, must be overwritten

        Feedback360Response saved = service.submitReviewerResponse(tenantId, peerId, in);

        assertThat(saved.getSubjectEmployeeId()).isEqualTo(subjectId);
        assertThat(saved.getReviewerId()).isEqualTo(peerId);
        assertThat(saved.getReviewerType()).isEqualTo(ReviewerType.PEER);
        assertThat(req.getStatus()).isEqualTo(RequestStatus.SUBMITTED);
    }

    @Test
    @DisplayName("response: someone other than the assigned reviewer is denied and nothing is saved")
    void impostorDenied() {
        request(RequestStatus.PENDING);
        cycle.setStatus(CycleStatus.IN_PROGRESS);

        assertThatThrownBy(() -> service.submitReviewerResponse(tenantId, subjectId, incoming(false)))
                .isInstanceOf(AccessDeniedException.class);
        verify(responseRepository, never()).save(any());
    }

    @Test
    @DisplayName("response: a second final submission is rejected (no duplicate row)")
    void duplicateSubmissionRejected() {
        request(RequestStatus.PENDING);
        cycle.setStatus(CycleStatus.IN_PROGRESS);
        Feedback360Response submitted = incoming(false);
        when(responseRepository.findByRequestIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(submitted));

        assertThatThrownBy(() -> service.submitReviewerResponse(tenantId, peerId, incoming(false)))
                .isInstanceOf(IllegalStateException.class);
        verify(responseRepository, never()).save(any());
    }

    @Test
    @DisplayName("response: request already SUBMITTED is rejected")
    void submittedRequestRejected() {
        request(RequestStatus.SUBMITTED);
        cycle.setStatus(CycleStatus.IN_PROGRESS);

        assertThatThrownBy(() -> service.submitReviewerResponse(tenantId, peerId, incoming(false)))
                .isInstanceOf(IllegalStateException.class);
        verify(responseRepository, never()).save(any());
    }

    @Test
    @DisplayName("response: rejected when the cycle is closed")
    void closedCycleRejected() {
        request(RequestStatus.PENDING);
        cycle.setStatus(CycleStatus.CLOSED);

        assertThatThrownBy(() -> service.submitReviewerResponse(tenantId, peerId, incoming(false)))
                .isInstanceOf(IllegalStateException.class);
        verify(responseRepository, never()).save(any());
    }

    @Test
    @DisplayName("response: re-saving a draft updates the existing row instead of adding a new one")
    void draftUpdatedInPlace() {
        request(RequestStatus.PENDING);
        cycle.setStatus(CycleStatus.IN_PROGRESS);
        Feedback360Response draft = incoming(true);
        draft.setId(UUID.randomUUID());
        draft.setCreatedAt(LocalDateTime.now());
        when(responseRepository.findByRequestIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(draft));
        Feedback360Response in = incoming(true);
        in.setStrengths("updated");

        Feedback360Response saved = service.submitReviewerResponse(tenantId, peerId, in);

        assertThat(saved).isSameAs(draft);
        assertThat(saved.getStrengths()).isEqualTo("updated");
    }
}
