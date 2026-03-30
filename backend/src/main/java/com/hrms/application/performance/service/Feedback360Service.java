package com.hrms.application.performance.service;

import com.hrms.domain.performance.*;
import com.hrms.domain.performance.Feedback360Cycle.CycleStatus;
import com.hrms.domain.performance.Feedback360Request.RequestStatus;
import com.hrms.domain.performance.Feedback360Request.ReviewerType;
import com.hrms.infrastructure.performance.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class Feedback360Service {

    private final Feedback360CycleRepository cycleRepository;
    private final Feedback360RequestRepository requestRepository;
    private final Feedback360ResponseRepository responseRepository;
    private final Feedback360SummaryRepository summaryRepository;

    // ================== Cycles ==================

    @Transactional
    public Feedback360Cycle createCycle(Feedback360Cycle cycle) {
        if (cycle.getId() == null) {
            cycle.setId(UUID.randomUUID());
        }
        if (cycle.getStatus() == null) {
            cycle.setStatus(CycleStatus.DRAFT);
        }
        if (cycle.getCreatedAt() == null) {
            cycle.setCreatedAt(LocalDateTime.now());
        }

        log.info("Creating 360 feedback cycle: {}", cycle.getName());
        return cycleRepository.save(cycle);
    }

    @Transactional
    public Feedback360Cycle updateCycle(Feedback360Cycle cycle) {
        cycle.setUpdatedAt(LocalDateTime.now());
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
                    cycle.setUpdatedAt(LocalDateTime.now());
                    cycleRepository.save(cycle);
                    log.info("Activated 360 feedback cycle: {}", cycleId);
                });
    }

    @Transactional
    public void closeCycle(UUID tenantId, UUID cycleId) {
        cycleRepository.findByIdAndTenantId(cycleId, tenantId)
                .ifPresent(cycle -> {
                    cycle.setStatus(CycleStatus.CLOSED);
                    cycle.setUpdatedAt(LocalDateTime.now());
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
            request.setCreatedAt(LocalDateTime.now());
        }

        log.info("Creating 360 feedback request for subject: {} reviewer: {}",
                request.getSubjectEmployeeId(), request.getReviewerId());
        return requestRepository.save(request);
    }

    @Transactional
    public Feedback360Request updateRequest(Feedback360Request request) {
        request.setUpdatedAt(LocalDateTime.now());
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
                    request.setNominationApproved(true);
                    request.setApprovedBy(approverId);
                    request.setApprovedAt(LocalDateTime.now());
                    request.setUpdatedAt(LocalDateTime.now());
                    requestRepository.save(request);
                });
    }

    // ================== Responses ==================

    @Transactional
    public Feedback360Response createOrUpdateResponse(Feedback360Response response) {
        if (response.getId() == null) {
            response.setId(UUID.randomUUID());
        }
        if (response.getCreatedAt() == null) {
            response.setCreatedAt(LocalDateTime.now());
        }
        response.setUpdatedAt(LocalDateTime.now());

        Feedback360Response saved = responseRepository.save(response);

        // Update request status if response is submitted
        if (!response.getIsDraft()) {
            requestRepository.findByIdAndTenantId(response.getRequestId(), response.getTenantId())
                    .ifPresent(request -> {
                        request.setStatus(RequestStatus.SUBMITTED);
                        request.setUpdatedAt(LocalDateTime.now());
                        requestRepository.save(request);
                    });
        }

        return saved;
    }

    @Transactional
    public Feedback360Response submitResponse(UUID tenantId, UUID responseId) {
        return responseRepository.findByIdAndTenantId(responseId, tenantId)
                .map(response -> {
                    response.setIsDraft(false);
                    response.setSubmittedAt(LocalDateTime.now());
                    response.setUpdatedAt(LocalDateTime.now());
                    Feedback360Response saved = responseRepository.save(response);

                    // Update request status
                    requestRepository.findByIdAndTenantId(response.getRequestId(), tenantId)
                            .ifPresent(request -> {
                                request.setStatus(RequestStatus.SUBMITTED);
                                request.setUpdatedAt(LocalDateTime.now());
                                requestRepository.save(request);
                            });

                    return saved;
                })
                .orElseThrow(() -> new RuntimeException("Response not found: " + responseId));
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

        Feedback360Summary summary = existing.orElseGet(() -> {
            Feedback360Summary newSummary = new Feedback360Summary();
            newSummary.setId(UUID.randomUUID());
            newSummary.setTenantId(tenantId);
            newSummary.setCycleId(cycleId);
            newSummary.setSubjectEmployeeId(subjectEmployeeId);
            newSummary.setCreatedAt(LocalDateTime.now());
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
        if (managerOverallRating != null) allRatings.add(managerOverallRating);
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

        summary.setGeneratedAt(LocalDateTime.now());
        summary.setUpdatedAt(LocalDateTime.now());

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
                    summary.setSharedWithEmployee(true);
                    summary.setSharedAt(LocalDateTime.now());
                    summary.setUpdatedAt(LocalDateTime.now());
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
