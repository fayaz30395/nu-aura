package com.nulogic.application.performance.service;

import com.nulogic.domain.performance.Feedback360Cycle;
import com.nulogic.domain.performance.Feedback360Cycle.CycleStatus;
import com.nulogic.domain.performance.Feedback360Request;
import com.nulogic.domain.performance.Feedback360Request.RequestStatus;
import com.nulogic.domain.performance.Feedback360Request.ReviewerType;
import com.nulogic.domain.performance.Feedback360Response;
import com.nulogic.domain.performance.Feedback360Summary;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.performance.repository.Feedback360CycleRepository;
import com.nulogic.infrastructure.performance.repository.Feedback360RequestRepository;
import com.nulogic.infrastructure.performance.repository.Feedback360ResponseRepository;
import com.nulogic.infrastructure.performance.repository.Feedback360SummaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class Feedback360Service {

    private final Feedback360CycleRepository cycleRepository;
    private final Feedback360RequestRepository requestRepository;
    private final Feedback360ResponseRepository responseRepository;
    private final Feedback360SummaryRepository summaryRepository;
    private final TenantTimeService tenantTimeService;
    private final EmployeeRepository employeeRepository;

    /**
     * Resolve "now" in the tenant's local zone. Prefers the entity's tenantId when
     * available (consistent with the entity's actual tenant); falls back to the
     * security-context tenant otherwise. Centralises every {@code LocalDateTime.now()}
     * for the 360 feedback module so timestamps reflect tenant-local time, not server-local.
     */
    private LocalDateTime tenantNow(UUID tenantId) {
        UUID resolved = (tenantId != null) ? tenantId : TenantContext.requireCurrentTenant();
        return tenantTimeService.now(resolved);
    }

    // ================== Cycles ==================

    @Transactional
    public Feedback360Cycle createCycle(Feedback360Cycle cycle) {
        // Let JPA generate the ID — manual @Id assignment + null @Version causes "detached entity" errors
        if (cycle.getStatus() == null) {
            cycle.setStatus(CycleStatus.DRAFT);
        }
        if (cycle.getCreatedAt() == null) {
            cycle.setCreatedAt(tenantNow(cycle.getTenantId()));
        }

        log.info("Creating 360 feedback cycle: {}", cycle.getName());
        return cycleRepository.save(cycle);
    }

    @Transactional
    public Feedback360Cycle updateCycle(Feedback360Cycle cycle) {
        cycle.setUpdatedAt(tenantNow(cycle.getTenantId()));
        return cycleRepository.save(cycle);
    }

    @Transactional(readOnly = true)
    public Page<Feedback360Cycle> getAllCycles(UUID tenantId, Pageable pageable) {
        return cycleRepository.findAllByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public Optional<Feedback360Cycle> getCycleById(UUID tenantId, UUID id) {
        return cycleRepository.findByIdAndTenantId(id, tenantId);
    }

    @Transactional(readOnly = true)
    public List<Feedback360Cycle> getActiveCycles(UUID tenantId) {
        return cycleRepository.findActiveCycles(tenantId);
    }

    @Transactional
    public void activateCycle(UUID tenantId, UUID cycleId) {
        cycleRepository.findByIdAndTenantId(cycleId, tenantId)
                .ifPresent(cycle -> {
                    cycle.setStatus(CycleStatus.IN_PROGRESS);
                    cycle.setUpdatedAt(tenantNow(tenantId));
                    cycleRepository.save(cycle);
                    log.info("Activated 360 feedback cycle: {}", cycleId);
                });
    }

    @Transactional
    public void closeCycle(UUID tenantId, UUID cycleId) {
        cycleRepository.findByIdAndTenantId(cycleId, tenantId)
                .ifPresent(cycle -> {
                    cycle.setStatus(CycleStatus.CLOSED);
                    cycle.setUpdatedAt(tenantNow(tenantId));
                    cycleRepository.save(cycle);
                    log.info("Closed 360 feedback cycle: {}", cycleId);
                });
    }

    @Transactional
    public void deleteCycle(UUID tenantId, UUID id) {
        cycleRepository.findByIdAndTenantId(id, tenantId)
                .ifPresent(cycle -> {
                    // Delete all related data
                    summaryRepository.deleteAllByCycleId(id);
                    responseRepository.deleteAllByCycleId(id);
                    requestRepository.deleteAllByCycleId(id);
                    cycleRepository.delete(cycle);
                    log.info("Deleted 360 feedback cycle: {}", id);
                });
    }

    // ================== Requests ==================

    @Transactional
    public Feedback360Request createRequest(Feedback360Request request) {
        if (request.getId() == null) {
            request.setId(UUID.randomUUID());
        }
        if (request.getStatus() == null) {
            request.setStatus(RequestStatus.PENDING);
        }
        if (request.getCreatedAt() == null) {
            request.setCreatedAt(tenantNow(request.getTenantId()));
        }

        log.info("Creating 360 feedback request for subject: {} reviewer: {}",
                request.getSubjectEmployeeId(), request.getReviewerId());
        return requestRepository.save(request);
    }

    /**
     * Authorised nomination: the nominator is the authenticated actor (never client-supplied) and must be
     * the subject, the subject's manager, or hold FEEDBACK_360:MANAGE. Subject/reviewer/cycle are tenant-validated,
     * the cycle must accept nominations, duplicates are rejected and approval is never self-granted.
     */
    @Transactional
    public Feedback360Request nominateReviewer(UUID tenantId, UUID cycleId, UUID subjectId, UUID reviewerId,
                                               ReviewerType reviewerType, UUID actorId) {
        Feedback360Cycle cycle = cycleRepository.findByIdAndTenantId(cycleId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Feedback cycle not found: " + cycleId));
        Employee subject = employeeRepository.findByIdAndTenantId(subjectId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Subject employee not found"));
        employeeRepository.findByIdAndTenantId(reviewerId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Reviewer not found"));

        boolean hrAuthority = SecurityContext.hasPermission(Permission.FEEDBACK_360_MANAGE);
        boolean permitted = hrAuthority || (actorId != null
                && (actorId.equals(subjectId) || actorId.equals(subject.getManagerId())));
        if (!permitted) {
            log.warn("SECURITY: employee {} denied 360 nomination for subject {}", actorId, subjectId);
            throw new AccessDeniedException("Access denied");
        }

        CycleStatus status = cycle.getStatus();
        boolean open = status == CycleStatus.NOMINATION_OPEN || status == CycleStatus.IN_PROGRESS;
        if (status == CycleStatus.CLOSED || status == CycleStatus.REVIEW_COMPLETE || (!open && !hrAuthority)) {
            throw new IllegalStateException("Cycle is not accepting nominations. Current status: " + status);
        }
        if ((reviewerType == ReviewerType.SELF) != subjectId.equals(reviewerId)) {
            throw new IllegalArgumentException("Reviewer must be the subject for SELF reviews and only for SELF reviews");
        }
        boolean duplicate = requestRepository.findRequestsForSubject(tenantId, subjectId, cycleId).stream()
                .anyMatch(r -> reviewerId.equals(r.getReviewerId()));
        if (duplicate) {
            throw new IllegalStateException("Reviewer already nominated for this subject in this cycle");
        }

        Feedback360Request request = Feedback360Request.builder()
                .cycleId(cycleId)
                .subjectEmployeeId(subjectId)
                .reviewerId(reviewerId)
                .reviewerType(reviewerType)
                .nominatedBy(actorId)
                .nominationApproved(false)
                .build();
        request.setTenantId(tenantId);
        return createRequest(request);
    }

    /**
     * Authorised response submission: only the request's assigned reviewer may respond, only while the cycle is
     * in progress, never after a final submission. Subject/cycle/reviewer-type come from the stored request,
     * and a saved draft is updated in place instead of creating a second row.
     */
    @Transactional
    public Feedback360Response submitReviewerResponse(UUID tenantId, UUID actorId, Feedback360Response incoming) {
        Feedback360Request request = requestRepository.findByIdAndTenantId(incoming.getRequestId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Feedback request not found: " + incoming.getRequestId()));
        if (actorId == null || !actorId.equals(request.getReviewerId())) {
            log.warn("SECURITY: employee {} denied 360 response on request {}", actorId, request.getId());
            throw new AccessDeniedException("Access denied");
        }
        if (request.getStatus() == RequestStatus.SUBMITTED || request.getStatus() == RequestStatus.DECLINED) {
            throw new IllegalStateException("Feedback request is already " + request.getStatus());
        }
        Feedback360Cycle cycle = cycleRepository.findByIdAndTenantId(request.getCycleId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Feedback cycle not found: " + request.getCycleId()));
        if (cycle.getStatus() != CycleStatus.IN_PROGRESS) {
            throw new IllegalStateException("Cycle is not collecting responses. Current status: " + cycle.getStatus());
        }

        incoming.setCycleId(request.getCycleId());
        incoming.setSubjectEmployeeId(request.getSubjectEmployeeId());
        incoming.setReviewerId(request.getReviewerId());
        incoming.setReviewerType(request.getReviewerType());
        incoming.setTenantId(tenantId);

        Feedback360Response target = incoming;
        Optional<Feedback360Response> existing = responseRepository.findByRequestIdAndTenantId(request.getId(), tenantId);
        if (existing.isPresent()) {
            Feedback360Response draft = existing.get();
            if (!Boolean.TRUE.equals(draft.getIsDraft())) {
                throw new IllegalStateException("A response was already submitted for this request");
            }
            copyAnswers(incoming, draft);
            target = draft;
        }
        return createOrUpdateResponse(target);
    }

    private void copyAnswers(Feedback360Response from, Feedback360Response to) {
        to.setIsDraft(from.getIsDraft());
        to.setSubmittedAt(from.getSubmittedAt());
        to.setOverallRating(from.getOverallRating());
        to.setCommunicationRating(from.getCommunicationRating());
        to.setTeamworkRating(from.getTeamworkRating());
        to.setLeadershipRating(from.getLeadershipRating());
        to.setProblemSolvingRating(from.getProblemSolvingRating());
        to.setTechnicalSkillsRating(from.getTechnicalSkillsRating());
        to.setAdaptabilityRating(from.getAdaptabilityRating());
        to.setWorkQualityRating(from.getWorkQualityRating());
        to.setTimeManagementRating(from.getTimeManagementRating());
        to.setStrengths(from.getStrengths());
        to.setAreasForImprovement(from.getAreasForImprovement());
        to.setAdditionalComments(from.getAdditionalComments());
        to.setSpecificExamples(from.getSpecificExamples());
        to.setDevelopmentSuggestions(from.getDevelopmentSuggestions());
        to.setCustomResponses(from.getCustomResponses());
    }

    @Transactional
    public Feedback360Request updateRequest(Feedback360Request request) {
        request.setUpdatedAt(tenantNow(request.getTenantId()));
        return requestRepository.save(request);
    }

    @Transactional(readOnly = true)
    public Page<Feedback360Request> getRequestsByCycle(UUID tenantId, UUID cycleId, Pageable pageable) {
        return requestRepository.findAllByTenantIdAndCycleId(tenantId, cycleId, pageable);
    }

    @Transactional(readOnly = true)
    public Optional<Feedback360Request> getRequestById(UUID tenantId, UUID id) {
        return requestRepository.findByIdAndTenantId(id, tenantId);
    }

    @Transactional(readOnly = true)
    public List<Feedback360Request> getPendingReviewsForReviewer(UUID tenantId, UUID reviewerId) {
        return requestRepository.findPendingReviewsForReviewer(tenantId, reviewerId);
    }

    @Transactional(readOnly = true)
    public List<Feedback360Request> getRequestsForSubject(UUID tenantId, UUID subjectId, UUID cycleId) {
        return requestRepository.findRequestsForSubject(tenantId, subjectId, cycleId);
    }

    @Transactional
    public void approveNomination(UUID tenantId, UUID requestId, UUID approverId) {
        requestRepository.findByIdAndTenantId(requestId, tenantId)
                .ifPresent(request -> {
                    LocalDateTime now = tenantNow(tenantId);
                    request.setNominationApproved(true);
                    request.setApprovedBy(approverId);
                    request.setApprovedAt(now);
                    request.setUpdatedAt(now);
                    requestRepository.save(request);
                });
    }

    // ================== Responses ==================

    @Transactional
    public Feedback360Response createOrUpdateResponse(Feedback360Response response) {
        LocalDateTime now = tenantNow(response.getTenantId());
        if (response.getId() == null) {
            response.setId(UUID.randomUUID());
        }
        if (response.getCreatedAt() == null) {
            response.setCreatedAt(now);
        }
        response.setUpdatedAt(now);

        Feedback360Response saved = responseRepository.save(response);

        // Update request status if response is submitted
        if (!response.getIsDraft()) {
            requestRepository.findByIdAndTenantId(response.getRequestId(), response.getTenantId())
                    .ifPresent(request -> {
                        request.setStatus(RequestStatus.SUBMITTED);
                        request.setUpdatedAt(now);
                        requestRepository.save(request);
                    });
        }

        return saved;
    }

    @Transactional
    public Feedback360Response submitResponse(UUID tenantId, UUID responseId) {
        return responseRepository.findByIdAndTenantId(responseId, tenantId)
                .map(response -> {
                    LocalDateTime now = tenantNow(tenantId);
                    response.setIsDraft(false);
                    response.setSubmittedAt(now);
                    response.setUpdatedAt(now);
                    Feedback360Response saved = responseRepository.save(response);

                    // Update request status
                    requestRepository.findByIdAndTenantId(response.getRequestId(), tenantId)
                            .ifPresent(request -> {
                                request.setStatus(RequestStatus.SUBMITTED);
                                request.setUpdatedAt(now);
                                requestRepository.save(request);
                            });

                    return saved;
                })
                .orElseThrow(() -> new IllegalArgumentException("Response not found: " + responseId));
    }

    @Transactional(readOnly = true)
    public Optional<Feedback360Response> getResponseById(UUID tenantId, UUID id) {
        return responseRepository.findByIdAndTenantId(id, tenantId);
    }

    @Transactional(readOnly = true)
    public Optional<Feedback360Response> getResponseByRequest(UUID tenantId, UUID requestId) {
        return responseRepository.findByRequestIdAndTenantId(requestId, tenantId);
    }

    @Transactional(readOnly = true)
    public List<Feedback360Response> getSubmittedResponsesForSubject(UUID tenantId, UUID subjectId, UUID cycleId) {
        return responseRepository.findSubmittedResponsesForSubject(tenantId, subjectId, cycleId);
    }

    // ================== Summaries ==================

    @Transactional
    public Feedback360Summary generateSummary(UUID tenantId, UUID cycleId, UUID subjectEmployeeId) {
        // Check if summary already exists
        Optional<Feedback360Summary> existing = summaryRepository
                .findByCycleIdAndSubjectEmployeeIdAndTenantId(cycleId, subjectEmployeeId, tenantId);

        LocalDateTime now = tenantNow(tenantId);
        Feedback360Summary summary = existing.orElseGet(() -> {
            Feedback360Summary newSummary = new Feedback360Summary();
            newSummary.setId(UUID.randomUUID());
            newSummary.setTenantId(tenantId);
            newSummary.setCycleId(cycleId);
            newSummary.setSubjectEmployeeId(subjectEmployeeId);
            newSummary.setCreatedAt(now);
            return newSummary;
        });

        // Get all submitted responses for this subject
        List<Feedback360Response> responses = responseRepository
                .findSubmittedResponsesForSubject(tenantId, subjectEmployeeId, cycleId);

        // Calculate statistics
        int totalReviewers = responses.size();
        int selfReviewCompleted = 0;
        int managerReviewCompleted = 0;
        int peerReviewsCompleted = 0;
        int upwardReviewsCompleted = 0;

        BigDecimal selfOverallRating = null;
        BigDecimal managerOverallRating = null;
        List<BigDecimal> peerRatings = new ArrayList<>();
        List<BigDecimal> upwardRatings = new ArrayList<>();

        // Aggregate ratings by competency
        List<BigDecimal> communicationRatings = new ArrayList<>();
        List<BigDecimal> teamworkRatings = new ArrayList<>();
        List<BigDecimal> leadershipRatings = new ArrayList<>();
        List<BigDecimal> problemSolvingRatings = new ArrayList<>();
        List<BigDecimal> technicalSkillsRatings = new ArrayList<>();
        List<BigDecimal> adaptabilityRatings = new ArrayList<>();
        List<BigDecimal> workQualityRatings = new ArrayList<>();
        List<BigDecimal> timeManagementRatings = new ArrayList<>();

        StringBuilder strengthsBuilder = new StringBuilder();
        StringBuilder improvementsBuilder = new StringBuilder();

        for (Feedback360Response response : responses) {
            // Categorize by reviewer type
            if (response.getReviewerType() == ReviewerType.SELF) {
                selfReviewCompleted = 1;
                selfOverallRating = response.getOverallRating();
            } else if (response.getReviewerType() == ReviewerType.MANAGER) {
                managerReviewCompleted = 1;
                managerOverallRating = response.getOverallRating();
            } else if (response.getReviewerType() == ReviewerType.PEER) {
                peerReviewsCompleted++;
                if (response.getOverallRating() != null) {
                    peerRatings.add(response.getOverallRating());
                }
            } else if (response.getReviewerType() == ReviewerType.DIRECT_REPORT) {
                upwardReviewsCompleted++;
                if (response.getOverallRating() != null) {
                    upwardRatings.add(response.getOverallRating());
                }
            }

            // Collect competency ratings
            addIfNotNull(communicationRatings, response.getCommunicationRating());
            addIfNotNull(teamworkRatings, response.getTeamworkRating());
            addIfNotNull(leadershipRatings, response.getLeadershipRating());
            addIfNotNull(problemSolvingRatings, response.getProblemSolvingRating());
            addIfNotNull(technicalSkillsRatings, response.getTechnicalSkillsRating());
            addIfNotNull(adaptabilityRatings, response.getAdaptabilityRating());
            addIfNotNull(workQualityRatings, response.getWorkQualityRating());
            addIfNotNull(timeManagementRatings, response.getTimeManagementRating());

            // Collect qualitative feedback
            if (response.getStrengths() != null && !response.getStrengths().isEmpty()) {
                strengthsBuilder.append("- ").append(response.getStrengths()).append("\n");
            }
            if (response.getAreasForImprovement() != null && !response.getAreasForImprovement().isEmpty()) {
                improvementsBuilder.append("- ").append(response.getAreasForImprovement()).append("\n");
            }
        }

        // Set counts
        summary.setTotalReviewers(totalReviewers);
        summary.setResponsesReceived(responses.size());
        summary.setSelfReviewCompleted(selfReviewCompleted > 0);
        summary.setManagerReviewCompleted(managerReviewCompleted > 0);
        summary.setPeerReviewsCompleted(peerReviewsCompleted);
        summary.setUpwardReviewsCompleted(upwardReviewsCompleted);

        // Set ratings
        summary.setSelfOverallRating(selfOverallRating);
        summary.setManagerOverallRating(managerOverallRating);
        summary.setPeerAverageRating(calculateAverage(peerRatings));
        summary.setUpwardAverageRating(calculateAverage(upwardRatings));

        // Calculate final rating (weighted average)
        List<BigDecimal> allRatings = new ArrayList<>();
        if (managerOverallRating != null)
            allRatings.add(managerOverallRating);
        allRatings.addAll(peerRatings);
        allRatings.addAll(upwardRatings);
        summary.setFinalRating(calculateAverage(allRatings));

        // Set competency averages
        summary.setAvgCommunication(calculateAverage(communicationRatings));
        summary.setAvgTeamwork(calculateAverage(teamworkRatings));
        summary.setAvgLeadership(calculateAverage(leadershipRatings));
        summary.setAvgProblemSolving(calculateAverage(problemSolvingRatings));
        summary.setAvgTechnicalSkills(calculateAverage(technicalSkillsRatings));
        summary.setAvgAdaptability(calculateAverage(adaptabilityRatings));
        summary.setAvgWorkQuality(calculateAverage(workQualityRatings));
        summary.setAvgTimeManagement(calculateAverage(timeManagementRatings));

        // Set consolidated feedback
        summary.setConsolidatedStrengths(strengthsBuilder.toString());
        summary.setConsolidatedImprovements(improvementsBuilder.toString());

        summary.setGeneratedAt(now);
        summary.setUpdatedAt(now);

        log.info("Generated 360 feedback summary for subject: {} in cycle: {}", subjectEmployeeId, cycleId);
        return summaryRepository.save(summary);
    }

    private void addIfNotNull(List<BigDecimal> list, BigDecimal value) {
        if (value != null) {
            list.add(value);
        }
    }

    private BigDecimal calculateAverage(List<BigDecimal> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        BigDecimal sum = values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
    }

    @Transactional(readOnly = true)
    public Optional<Feedback360Summary> getSummaryById(UUID tenantId, UUID id) {
        return summaryRepository.findByIdAndTenantId(id, tenantId);
    }

    @Transactional(readOnly = true)
    public Optional<Feedback360Summary> getSummaryForSubject(UUID tenantId, UUID cycleId, UUID subjectEmployeeId) {
        return summaryRepository.findByCycleIdAndSubjectEmployeeIdAndTenantId(cycleId, subjectEmployeeId, tenantId);
    }

    @Transactional(readOnly = true)
    public List<Feedback360Summary> getSummariesForCycle(UUID tenantId, UUID cycleId) {
        return summaryRepository.findAllByCycleId(tenantId, cycleId);
    }

    @Transactional(readOnly = true)
    public List<Feedback360Summary> getEmployeeSummaries(UUID tenantId, UUID employeeId) {
        return summaryRepository.findAllForEmployee(tenantId, employeeId);
    }

    @Transactional
    public void shareWithEmployee(UUID tenantId, UUID summaryId) {
        summaryRepository.findByIdAndTenantId(summaryId, tenantId)
                .ifPresent(summary -> {
                    LocalDateTime now = tenantNow(tenantId);
                    summary.setSharedWithEmployee(true);
                    summary.setSharedAt(now);
                    summary.setUpdatedAt(now);
                    summaryRepository.save(summary);
                });
    }

    // ================== Dashboard ==================

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardStats(UUID tenantId, UUID employeeId) {
        Map<String, Object> stats = new HashMap<>();

        // Pending reviews for this employee
        List<Feedback360Request> pendingReviews = requestRepository
                .findPendingReviewsForReviewer(tenantId, employeeId);
        stats.put("pendingReviewsCount", pendingReviews.size());
        stats.put("pendingReviews", pendingReviews);

        // Active cycles
        List<Feedback360Cycle> activeCycles = cycleRepository.findActiveCycles(tenantId);
        stats.put("activeCyclesCount", activeCycles.size());

        // Employee's summaries
        List<Feedback360Summary> mySummaries = summaryRepository.findAllForEmployee(tenantId, employeeId);
        stats.put("receivedFeedbackCount", mySummaries.size());

        return stats;
    }
}
