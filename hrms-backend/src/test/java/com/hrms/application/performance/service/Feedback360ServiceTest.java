package com.hrms.application.performance.service;

import com.hrms.domain.performance.*;
import com.hrms.domain.performance.Feedback360Cycle.CycleStatus;
import com.hrms.domain.performance.Feedback360Request.RequestStatus;
import com.hrms.domain.performance.Feedback360Request.ReviewerType;
import com.hrms.infrastructure.performance.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class Feedback360ServiceTest {

    @Mock
    private Feedback360CycleRepository cycleRepository;

    @Mock
    private Feedback360RequestRepository requestRepository;

    @Mock
    private Feedback360ResponseRepository responseRepository;

    @Mock
    private Feedback360SummaryRepository summaryRepository;

    @InjectMocks
    private Feedback360Service feedback360Service;

    private UUID tenantId;
    private UUID cycleId;
    private UUID requestId;
    private UUID subjectEmployeeId;
    private UUID reviewerId;
    private Feedback360Cycle testCycle;
    private Feedback360Request testRequest;
    private Feedback360Response testResponse;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        cycleId = UUID.randomUUID();
        requestId = UUID.randomUUID();
        subjectEmployeeId = UUID.randomUUID();
        reviewerId = UUID.randomUUID();

        testCycle = createTestCycle();
        testRequest = createTestRequest();
        testResponse = createTestResponse();
    }

    private Feedback360Cycle createTestCycle() {
        Feedback360Cycle cycle = Feedback360Cycle.builder()
                .name("Q4 2024 360 Feedback")
                .description("Annual 360 feedback cycle")
                .status(CycleStatus.DRAFT)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(1))
                .nominationDeadline(LocalDate.now().plusWeeks(1))
                .peerReviewDeadline(LocalDate.now().plusWeeks(3))
                .isAnonymous(true)
                .includeSelfReview(true)
                .includeManagerReview(true)
                .includePeerReview(true)
                .includeUpwardReview(true)
                .minPeersRequired(2)
                .maxPeersAllowed(5)
                .build();
        cycle.setId(cycleId);
        cycle.setTenantId(tenantId);
        cycle.setCreatedAt(LocalDateTime.now());
        return cycle;
    }

    private Feedback360Request createTestRequest() {
        Feedback360Request request = Feedback360Request.builder()
                .cycleId(cycleId)
                .subjectEmployeeId(subjectEmployeeId)
                .reviewerId(reviewerId)
                .reviewerType(ReviewerType.PEER)
                .status(RequestStatus.PENDING)
                .nominatedBy(subjectEmployeeId)
                .build();
        request.setId(requestId);
        request.setTenantId(tenantId);
        request.setCreatedAt(LocalDateTime.now());
        return request;
    }

    private Feedback360Response createTestResponse() {
        Feedback360Response response = Feedback360Response.builder()
                .cycleId(cycleId)
                .requestId(requestId)
                .subjectEmployeeId(subjectEmployeeId)
                .reviewerId(reviewerId)
                .reviewerType(ReviewerType.PEER)
                .overallRating(BigDecimal.valueOf(4.0))
                .communicationRating(BigDecimal.valueOf(4.5))
                .teamworkRating(BigDecimal.valueOf(4.0))
                .leadershipRating(BigDecimal.valueOf(3.5))
                .problemSolvingRating(BigDecimal.valueOf(4.0))
                .technicalSkillsRating(BigDecimal.valueOf(4.5))
                .strengths("Great team player, excellent communication")
                .areasForImprovement("Could improve time management")
                .isDraft(true)
                .build();
        response.setId(UUID.randomUUID());
        response.setTenantId(tenantId);
        response.setCreatedAt(LocalDateTime.now());
        return response;
    }

    // ================== Cycle Tests ==================

    @Test
    void createCycle_Success() {
        Feedback360Cycle newCycle = Feedback360Cycle.builder()
                .name("New Cycle")
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(1))
                .build();
        newCycle.setTenantId(tenantId);

        when(cycleRepository.save(any(Feedback360Cycle.class))).thenAnswer(invocation -> {
            Feedback360Cycle saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(UUID.randomUUID());
            }
            return saved;
        });

        Feedback360Cycle result = feedback360Service.createCycle(newCycle);

        assertNotNull(result.getId());
        assertEquals(CycleStatus.DRAFT, result.getStatus());
        assertNotNull(result.getCreatedAt());
        verify(cycleRepository).save(any(Feedback360Cycle.class));
    }

    @Test
    void updateCycle_Success() {
        testCycle.setName("Updated Cycle Name");

        when(cycleRepository.save(any(Feedback360Cycle.class))).thenReturn(testCycle);

        Feedback360Cycle result = feedback360Service.updateCycle(testCycle);

        assertEquals("Updated Cycle Name", result.getName());
        assertNotNull(result.getUpdatedAt());
        verify(cycleRepository).save(testCycle);
    }

    @Test
    void getAllCycles_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Feedback360Cycle> expectedPage = new PageImpl<>(List.of(testCycle), pageable, 1);

        when(cycleRepository.findAllByTenantId(tenantId, pageable)).thenReturn(expectedPage);

        Page<Feedback360Cycle> result = feedback360Service.getAllCycles(tenantId, pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals(testCycle.getName(), result.getContent().get(0).getName());
    }

    @Test
    void getCycleById_Success() {
        when(cycleRepository.findByIdAndTenantId(cycleId, tenantId))
                .thenReturn(Optional.of(testCycle));

        Optional<Feedback360Cycle> result = feedback360Service.getCycleById(tenantId, cycleId);

        assertTrue(result.isPresent());
        assertEquals(testCycle.getName(), result.get().getName());
    }

    @Test
    void getCycleById_NotFound() {
        when(cycleRepository.findByIdAndTenantId(cycleId, tenantId))
                .thenReturn(Optional.empty());

        Optional<Feedback360Cycle> result = feedback360Service.getCycleById(tenantId, cycleId);

        assertTrue(result.isEmpty());
    }

    @Test
    void getActiveCycles_Success() {
        testCycle.setStatus(CycleStatus.IN_PROGRESS);

        when(cycleRepository.findActiveCycles(tenantId)).thenReturn(List.of(testCycle));

        List<Feedback360Cycle> result = feedback360Service.getActiveCycles(tenantId);

        assertEquals(1, result.size());
        assertEquals(CycleStatus.IN_PROGRESS, result.get(0).getStatus());
    }

    @Test
    void activateCycle_Success() {
        when(cycleRepository.findByIdAndTenantId(cycleId, tenantId))
                .thenReturn(Optional.of(testCycle));
        when(cycleRepository.save(any(Feedback360Cycle.class))).thenReturn(testCycle);

        feedback360Service.activateCycle(tenantId, cycleId);

        assertEquals(CycleStatus.IN_PROGRESS, testCycle.getStatus());
        verify(cycleRepository).save(testCycle);
    }

    @Test
    void closeCycle_Success() {
        when(cycleRepository.findByIdAndTenantId(cycleId, tenantId))
                .thenReturn(Optional.of(testCycle));
        when(cycleRepository.save(any(Feedback360Cycle.class))).thenReturn(testCycle);

        feedback360Service.closeCycle(tenantId, cycleId);

        assertEquals(CycleStatus.CLOSED, testCycle.getStatus());
        verify(cycleRepository).save(testCycle);
    }

    @Test
    void deleteCycle_Success() {
        when(cycleRepository.findByIdAndTenantId(cycleId, tenantId))
                .thenReturn(Optional.of(testCycle));

        feedback360Service.deleteCycle(tenantId, cycleId);

        verify(summaryRepository).deleteAllByCycleId(cycleId);
        verify(responseRepository).deleteAllByCycleId(cycleId);
        verify(requestRepository).deleteAllByCycleId(cycleId);
        verify(cycleRepository).delete(testCycle);
    }

    @Test
    void deleteCycle_NotFound_NoAction() {
        when(cycleRepository.findByIdAndTenantId(cycleId, tenantId))
                .thenReturn(Optional.empty());

        feedback360Service.deleteCycle(tenantId, cycleId);

        verify(cycleRepository, never()).delete(any());
    }

    // ================== Request Tests ==================

    @Test
    void createRequest_Success() {
        Feedback360Request newRequest = Feedback360Request.builder()
                .cycleId(cycleId)
                .subjectEmployeeId(subjectEmployeeId)
                .reviewerId(UUID.randomUUID())
                .reviewerType(ReviewerType.MANAGER)
                .build();
        newRequest.setTenantId(tenantId);

        when(requestRepository.save(any(Feedback360Request.class))).thenAnswer(invocation -> {
            Feedback360Request saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(UUID.randomUUID());
            }
            return saved;
        });

        Feedback360Request result = feedback360Service.createRequest(newRequest);

        assertNotNull(result.getId());
        assertEquals(RequestStatus.PENDING, result.getStatus());
        assertNotNull(result.getCreatedAt());
    }

    @Test
    void updateRequest_Success() {
        testRequest.setStatus(RequestStatus.IN_PROGRESS);

        when(requestRepository.save(any(Feedback360Request.class))).thenReturn(testRequest);

        Feedback360Request result = feedback360Service.updateRequest(testRequest);

        assertEquals(RequestStatus.IN_PROGRESS, result.getStatus());
        assertNotNull(result.getUpdatedAt());
    }

    @Test
    void getRequestsByCycle_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Feedback360Request> expectedPage = new PageImpl<>(List.of(testRequest), pageable, 1);

        when(requestRepository.findAllByTenantIdAndCycleId(tenantId, cycleId, pageable))
                .thenReturn(expectedPage);

        Page<Feedback360Request> result = feedback360Service.getRequestsByCycle(tenantId, cycleId, pageable);

        assertEquals(1, result.getTotalElements());
    }

    @Test
    void getRequestById_Success() {
        when(requestRepository.findByIdAndTenantId(requestId, tenantId))
                .thenReturn(Optional.of(testRequest));

        Optional<Feedback360Request> result = feedback360Service.getRequestById(tenantId, requestId);

        assertTrue(result.isPresent());
    }

    @Test
    void getPendingReviewsForReviewer_Success() {
        when(requestRepository.findPendingReviewsForReviewer(tenantId, reviewerId))
                .thenReturn(List.of(testRequest));

        List<Feedback360Request> result = feedback360Service.getPendingReviewsForReviewer(tenantId, reviewerId);

        assertEquals(1, result.size());
    }

    @Test
    void getRequestsForSubject_Success() {
        when(requestRepository.findRequestsForSubject(tenantId, subjectEmployeeId, cycleId))
                .thenReturn(List.of(testRequest));

        List<Feedback360Request> result = feedback360Service.getRequestsForSubject(tenantId, subjectEmployeeId, cycleId);

        assertEquals(1, result.size());
    }

    @Test
    void approveNomination_Success() {
        UUID approverId = UUID.randomUUID();

        when(requestRepository.findByIdAndTenantId(requestId, tenantId))
                .thenReturn(Optional.of(testRequest));
        when(requestRepository.save(any(Feedback360Request.class))).thenReturn(testRequest);

        feedback360Service.approveNomination(tenantId, requestId, approverId);

        assertTrue(testRequest.getNominationApproved());
        assertEquals(approverId, testRequest.getApprovedBy());
        assertNotNull(testRequest.getApprovedAt());
        verify(requestRepository).save(testRequest);
    }

    // ================== Response Tests ==================

    @Test
    void createOrUpdateResponse_NewResponse_Success() {
        Feedback360Response newResponse = Feedback360Response.builder()
                .cycleId(cycleId)
                .requestId(requestId)
                .subjectEmployeeId(subjectEmployeeId)
                .reviewerId(reviewerId)
                .reviewerType(ReviewerType.PEER)
                .overallRating(BigDecimal.valueOf(4.0))
                .isDraft(true)
                .build();
        newResponse.setTenantId(tenantId);

        when(responseRepository.save(any(Feedback360Response.class))).thenAnswer(invocation -> {
            Feedback360Response saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(UUID.randomUUID());
            }
            return saved;
        });

        Feedback360Response result = feedback360Service.createOrUpdateResponse(newResponse);

        assertNotNull(result.getId());
        assertNotNull(result.getUpdatedAt());
    }

    @Test
    void createOrUpdateResponse_SubmittedResponse_UpdatesRequestStatus() {
        testResponse.setIsDraft(false);

        when(responseRepository.save(any(Feedback360Response.class))).thenReturn(testResponse);
        when(requestRepository.findByIdAndTenantId(requestId, tenantId))
                .thenReturn(Optional.of(testRequest));
        when(requestRepository.save(any(Feedback360Request.class))).thenReturn(testRequest);

        feedback360Service.createOrUpdateResponse(testResponse);

        assertEquals(RequestStatus.SUBMITTED, testRequest.getStatus());
        verify(requestRepository).save(testRequest);
    }

    @Test
    void submitResponse_Success() {
        UUID responseId = testResponse.getId();

        when(responseRepository.findByIdAndTenantId(responseId, tenantId))
                .thenReturn(Optional.of(testResponse));
        when(responseRepository.save(any(Feedback360Response.class))).thenReturn(testResponse);
        when(requestRepository.findByIdAndTenantId(requestId, tenantId))
                .thenReturn(Optional.of(testRequest));
        when(requestRepository.save(any(Feedback360Request.class))).thenReturn(testRequest);

        Feedback360Response result = feedback360Service.submitResponse(tenantId, responseId);

        assertFalse(result.getIsDraft());
        assertNotNull(result.getSubmittedAt());
        assertEquals(RequestStatus.SUBMITTED, testRequest.getStatus());
    }

    @Test
    void submitResponse_NotFound_ThrowsException() {
        UUID responseId = UUID.randomUUID();

        when(responseRepository.findByIdAndTenantId(responseId, tenantId))
                .thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
                feedback360Service.submitResponse(tenantId, responseId));
    }

    @Test
    void getResponseById_Success() {
        UUID responseId = testResponse.getId();

        when(responseRepository.findByIdAndTenantId(responseId, tenantId))
                .thenReturn(Optional.of(testResponse));

        Optional<Feedback360Response> result = feedback360Service.getResponseById(tenantId, responseId);

        assertTrue(result.isPresent());
    }

    @Test
    void getResponseByRequest_Success() {
        when(responseRepository.findByRequestIdAndTenantId(requestId, tenantId))
                .thenReturn(Optional.of(testResponse));

        Optional<Feedback360Response> result = feedback360Service.getResponseByRequest(tenantId, requestId);

        assertTrue(result.isPresent());
    }

    @Test
    void getSubmittedResponsesForSubject_Success() {
        testResponse.setIsDraft(false);

        when(responseRepository.findSubmittedResponsesForSubject(tenantId, subjectEmployeeId, cycleId))
                .thenReturn(List.of(testResponse));

        List<Feedback360Response> result = feedback360Service.getSubmittedResponsesForSubject(tenantId, subjectEmployeeId, cycleId);

        assertEquals(1, result.size());
    }

    // ================== Summary Tests ==================

    @Test
    void generateSummary_NewSummary_Success() {
        // Create responses from different reviewer types
        Feedback360Response selfResponse = createResponseWithType(ReviewerType.SELF, BigDecimal.valueOf(4.0));
        Feedback360Response managerResponse = createResponseWithType(ReviewerType.MANAGER, BigDecimal.valueOf(3.5));
        Feedback360Response peerResponse1 = createResponseWithType(ReviewerType.PEER, BigDecimal.valueOf(4.0));
        Feedback360Response peerResponse2 = createResponseWithType(ReviewerType.PEER, BigDecimal.valueOf(4.5));
        Feedback360Response directReportResponse = createResponseWithType(ReviewerType.DIRECT_REPORT, BigDecimal.valueOf(4.0));

        when(summaryRepository.findByCycleIdAndSubjectEmployeeIdAndTenantId(cycleId, subjectEmployeeId, tenantId))
                .thenReturn(Optional.empty());
        when(responseRepository.findSubmittedResponsesForSubject(tenantId, subjectEmployeeId, cycleId))
                .thenReturn(List.of(selfResponse, managerResponse, peerResponse1, peerResponse2, directReportResponse));
        when(summaryRepository.save(any(Feedback360Summary.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Feedback360Summary result = feedback360Service.generateSummary(tenantId, cycleId, subjectEmployeeId);

        assertNotNull(result.getId());
        assertEquals(5, result.getTotalReviewers());
        assertTrue(result.getSelfReviewCompleted());
        assertTrue(result.getManagerReviewCompleted());
        assertEquals(2, result.getPeerReviewsCompleted());
        assertEquals(1, result.getUpwardReviewsCompleted());
        assertNotNull(result.getPeerAverageRating());
        assertNotNull(result.getFinalRating());
        verify(summaryRepository).save(any(Feedback360Summary.class));
    }

    @Test
    void generateSummary_ExistingSummary_Updates() {
        Feedback360Summary existingSummary = new Feedback360Summary();
        existingSummary.setId(UUID.randomUUID());
        existingSummary.setTenantId(tenantId);
        existingSummary.setCycleId(cycleId);
        existingSummary.setSubjectEmployeeId(subjectEmployeeId);

        when(summaryRepository.findByCycleIdAndSubjectEmployeeIdAndTenantId(cycleId, subjectEmployeeId, tenantId))
                .thenReturn(Optional.of(existingSummary));
        when(responseRepository.findSubmittedResponsesForSubject(tenantId, subjectEmployeeId, cycleId))
                .thenReturn(List.of(testResponse));
        when(summaryRepository.save(any(Feedback360Summary.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Feedback360Summary result = feedback360Service.generateSummary(tenantId, cycleId, subjectEmployeeId);

        assertEquals(existingSummary.getId(), result.getId());
    }

    @Test
    void generateSummary_NoResponses_ReturnsEmptySummary() {
        when(summaryRepository.findByCycleIdAndSubjectEmployeeIdAndTenantId(cycleId, subjectEmployeeId, tenantId))
                .thenReturn(Optional.empty());
        when(responseRepository.findSubmittedResponsesForSubject(tenantId, subjectEmployeeId, cycleId))
                .thenReturn(Collections.emptyList());
        when(summaryRepository.save(any(Feedback360Summary.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Feedback360Summary result = feedback360Service.generateSummary(tenantId, cycleId, subjectEmployeeId);

        assertEquals(0, result.getTotalReviewers());
        assertFalse(result.getSelfReviewCompleted());
        assertFalse(result.getManagerReviewCompleted());
    }

    private Feedback360Response createResponseWithType(ReviewerType type, BigDecimal rating) {
        Feedback360Response response = Feedback360Response.builder()
                .cycleId(cycleId)
                .requestId(UUID.randomUUID())
                .subjectEmployeeId(subjectEmployeeId)
                .reviewerId(UUID.randomUUID())
                .reviewerType(type)
                .overallRating(rating)
                .communicationRating(rating)
                .teamworkRating(rating)
                .leadershipRating(rating)
                .problemSolvingRating(rating)
                .technicalSkillsRating(rating)
                .adaptabilityRating(rating)
                .workQualityRating(rating)
                .timeManagementRating(rating)
                .strengths("Good work")
                .areasForImprovement("Needs improvement")
                .isDraft(false)
                .build();
        response.setId(UUID.randomUUID());
        response.setTenantId(tenantId);
        return response;
    }

    @Test
    void getSummaryById_Success() {
        UUID summaryId = UUID.randomUUID();
        Feedback360Summary summary = new Feedback360Summary();
        summary.setId(summaryId);
        summary.setTenantId(tenantId);

        when(summaryRepository.findByIdAndTenantId(summaryId, tenantId))
                .thenReturn(Optional.of(summary));

        Optional<Feedback360Summary> result = feedback360Service.getSummaryById(tenantId, summaryId);

        assertTrue(result.isPresent());
    }

    @Test
    void getSummaryForSubject_Success() {
        Feedback360Summary summary = new Feedback360Summary();
        summary.setId(UUID.randomUUID());

        when(summaryRepository.findByCycleIdAndSubjectEmployeeIdAndTenantId(cycleId, subjectEmployeeId, tenantId))
                .thenReturn(Optional.of(summary));

        Optional<Feedback360Summary> result = feedback360Service.getSummaryForSubject(tenantId, cycleId, subjectEmployeeId);

        assertTrue(result.isPresent());
    }

    @Test
    void getSummariesForCycle_Success() {
        Feedback360Summary summary = new Feedback360Summary();
        summary.setId(UUID.randomUUID());

        when(summaryRepository.findAllByCycleId(tenantId, cycleId))
                .thenReturn(List.of(summary));

        List<Feedback360Summary> result = feedback360Service.getSummariesForCycle(tenantId, cycleId);

        assertEquals(1, result.size());
    }

    @Test
    void getEmployeeSummaries_Success() {
        Feedback360Summary summary = new Feedback360Summary();
        summary.setId(UUID.randomUUID());

        when(summaryRepository.findAllForEmployee(tenantId, subjectEmployeeId))
                .thenReturn(List.of(summary));

        List<Feedback360Summary> result = feedback360Service.getEmployeeSummaries(tenantId, subjectEmployeeId);

        assertEquals(1, result.size());
    }

    @Test
    void shareWithEmployee_Success() {
        UUID summaryId = UUID.randomUUID();
        Feedback360Summary summary = new Feedback360Summary();
        summary.setId(summaryId);

        when(summaryRepository.findByIdAndTenantId(summaryId, tenantId))
                .thenReturn(Optional.of(summary));
        when(summaryRepository.save(any(Feedback360Summary.class))).thenReturn(summary);

        feedback360Service.shareWithEmployee(tenantId, summaryId);

        assertTrue(summary.getSharedWithEmployee());
        assertNotNull(summary.getSharedAt());
        verify(summaryRepository).save(summary);
    }

    // ================== Dashboard Tests ==================

    @Test
    void getDashboardStats_Success() {
        UUID employeeId = UUID.randomUUID();

        when(requestRepository.findPendingReviewsForReviewer(tenantId, employeeId))
                .thenReturn(List.of(testRequest));
        when(cycleRepository.findActiveCycles(tenantId))
                .thenReturn(List.of(testCycle));
        when(summaryRepository.findAllForEmployee(tenantId, employeeId))
                .thenReturn(List.of(new Feedback360Summary()));

        Map<String, Object> stats = feedback360Service.getDashboardStats(tenantId, employeeId);

        assertEquals(1, stats.get("pendingReviewsCount"));
        assertEquals(1, stats.get("activeCyclesCount"));
        assertEquals(1, stats.get("receivedFeedbackCount"));
    }

    @Test
    void getDashboardStats_EmptyData_ReturnsZeros() {
        UUID employeeId = UUID.randomUUID();

        when(requestRepository.findPendingReviewsForReviewer(tenantId, employeeId))
                .thenReturn(Collections.emptyList());
        when(cycleRepository.findActiveCycles(tenantId))
                .thenReturn(Collections.emptyList());
        when(summaryRepository.findAllForEmployee(tenantId, employeeId))
                .thenReturn(Collections.emptyList());

        Map<String, Object> stats = feedback360Service.getDashboardStats(tenantId, employeeId);

        assertEquals(0, stats.get("pendingReviewsCount"));
        assertEquals(0, stats.get("activeCyclesCount"));
        assertEquals(0, stats.get("receivedFeedbackCount"));
    }
}
