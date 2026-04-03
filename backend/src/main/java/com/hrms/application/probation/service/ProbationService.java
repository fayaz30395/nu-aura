package com.hrms.application.probation.service;

import com.hrms.api.probation.dto.*;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.probation.ProbationEvaluation;
import com.hrms.domain.probation.ProbationPeriod;
import com.hrms.domain.probation.ProbationPeriod.ProbationStatus;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.probation.repository.ProbationEvaluationRepository;
import com.hrms.infrastructure.probation.repository.ProbationPeriodRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProbationService {

    private static final List<ProbationStatus> ACTIVE_STATUSES = Arrays.asList(
            ProbationStatus.ACTIVE, ProbationStatus.EXTENDED, ProbationStatus.ON_HOLD);
    private final ProbationPeriodRepository probationPeriodRepository;
    private final ProbationEvaluationRepository probationEvaluationRepository;
    private final EmployeeRepository employeeRepository;

    // ==================== Probation Period Management ====================

    @Transactional
    public ProbationPeriodResponse createProbationPeriod(ProbationPeriodRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Check if employee exists
        if (!employeeRepository.existsByIdAndTenantId(request.getEmployeeId(), tenantId)) {
            throw new ResourceNotFoundException("Employee not found with id: " + request.getEmployeeId());
        }

        // Check if employee already has an active probation
        if (probationPeriodRepository.existsByEmployeeIdAndTenantIdAndStatusIn(
                request.getEmployeeId(), tenantId, ACTIVE_STATUSES)) {
            throw new BusinessException("Employee already has an active probation period");
        }

        // BUG-QA2-004 FIX: durationMonths is optional in the request DTO; default to 3 months.
        int durationMonths = (request.getDurationMonths() != null) ? request.getDurationMonths() : 3;

        LocalDate endDate = request.getStartDate().plusMonths(durationMonths);

        ProbationPeriod probation = ProbationPeriod.builder()
                .employeeId(request.getEmployeeId())
                .startDate(request.getStartDate())
                .originalEndDate(endDate)
                .endDate(endDate)
                .durationMonths(durationMonths)
                .managerId(request.getManagerId())
                .evaluationFrequencyDays(request.getEvaluationFrequencyDays() != null ?
                        request.getEvaluationFrequencyDays() : 30)
                .notes(request.getNotes())
                .nextEvaluationDate(request.getStartDate().plusDays(
                        request.getEvaluationFrequencyDays() != null ? request.getEvaluationFrequencyDays() : 30))
                .build();

        probation.setTenantId(tenantId);
        probation = probationPeriodRepository.save(probation);

        log.info("Created probation period for employee: {} with end date: {}",
                request.getEmployeeId(), endDate);

        return enrichResponse(probation);
    }

    @Transactional(readOnly = true)
    public ProbationPeriodResponse getProbationById(UUID probationId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ProbationPeriod probation = probationPeriodRepository.findByIdAndTenantId(probationId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Probation period not found"));
        return enrichResponse(probation);
    }

    @Transactional(readOnly = true)
    public ProbationPeriodResponse getActiveProbationByEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ProbationPeriod probation = probationPeriodRepository
                .findByEmployeeIdAndTenantIdAndStatusIn(employeeId, tenantId, ACTIVE_STATUSES)
                .orElseThrow(() -> new ResourceNotFoundException("No active probation period found for employee"));
        return enrichResponse(probation);
    }

    @Transactional(readOnly = true)
    public Page<ProbationPeriodResponse> getAllProbations(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return probationPeriodRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable)
                .map(this::enrichResponse);
    }

    @Transactional(readOnly = true)
    public Page<ProbationPeriodResponse> getProbationsByStatus(ProbationStatus status, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return probationPeriodRepository.findByTenantIdAndStatusOrderByEndDateAsc(tenantId, status, pageable)
                .map(this::enrichResponse);
    }

    @Transactional(readOnly = true)
    public Page<ProbationPeriodResponse> searchProbations(
            ProbationStatus status,
            UUID managerId,
            LocalDate startDate,
            LocalDate endDate,
            Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return probationPeriodRepository.searchProbations(tenantId, status, managerId, startDate, endDate, pageable)
                .map(this::enrichResponse);
    }

    @Transactional(readOnly = true)
    public Page<ProbationPeriodResponse> getMyTeamProbations(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID managerId = SecurityContext.getCurrentUserId();
        return probationPeriodRepository.findByTenantIdAndManagerIdOrderByCreatedAtDesc(tenantId, managerId, pageable)
                .map(this::enrichResponse);
    }

    // ==================== Probation Actions ====================

    @Transactional
    public ProbationPeriodResponse extendProbation(UUID probationId, ProbationExtensionRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProbationPeriod probation = probationPeriodRepository.findByIdAndTenantId(probationId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Probation period not found"));

        if (probation.getStatus() != ProbationStatus.ACTIVE &&
                probation.getStatus() != ProbationStatus.EXTENDED) {
            throw new BusinessException("Can only extend active or already extended probation periods");
        }

        probation.extend(request.getExtensionDays(), request.getReason());
        probation = probationPeriodRepository.save(probation);

        log.info("Extended probation {} by {} days. New end date: {}",
                probationId, request.getExtensionDays(), probation.getEndDate());

        return enrichResponse(probation);
    }

    @Transactional
    public ProbationPeriodResponse confirmEmployee(UUID probationId, ProbationConfirmationRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID confirmedBy = SecurityContext.getCurrentUserId();

        ProbationPeriod probation = probationPeriodRepository.findByIdAndTenantId(probationId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Probation period not found"));

        if (probation.getStatus() != ProbationStatus.ACTIVE &&
                probation.getStatus() != ProbationStatus.EXTENDED) {
            throw new BusinessException("Can only confirm employees with active probation");
        }

        probation.confirm(confirmedBy, request.getFinalRating(), request.getNotes());
        probation = probationPeriodRepository.save(probation);

        log.info("Confirmed employee {} after probation period {}",
                probation.getEmployeeId(), probationId);

        // Note: Employee status update is tracked in ProbationPeriod entity
        // Confirmation letter can be generated via LetterService if needed

        return enrichResponse(probation);
    }

    @Transactional
    public ProbationPeriodResponse failProbation(UUID probationId, ProbationTerminationRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID decidedBy = SecurityContext.getCurrentUserId();

        ProbationPeriod probation = probationPeriodRepository.findByIdAndTenantId(probationId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Probation period not found"));

        if (probation.getStatus() != ProbationStatus.ACTIVE &&
                probation.getStatus() != ProbationStatus.EXTENDED) {
            throw new BusinessException("Can only fail employees with active probation");
        }

        probation.fail(decidedBy, request.getReason());
        probation = probationPeriodRepository.save(probation);

        log.info("Failed probation for employee {} - Reason: {}",
                probation.getEmployeeId(), request.getReason());

        // Note: Employee status is tracked via ProbationPeriod.status = FAILED
        // Exit process can be initiated via ExitManagementService if needed

        return enrichResponse(probation);
    }

    @Transactional
    public ProbationPeriodResponse terminateProbation(UUID probationId, ProbationTerminationRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID terminatedBy = SecurityContext.getCurrentUserId();

        ProbationPeriod probation = probationPeriodRepository.findByIdAndTenantId(probationId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Probation period not found"));

        if (probation.getStatus() == ProbationStatus.CONFIRMED ||
                probation.getStatus() == ProbationStatus.TERMINATED) {
            throw new BusinessException("Cannot terminate already completed probation");
        }

        probation.terminate(terminatedBy, request.getReason());
        probation = probationPeriodRepository.save(probation);

        log.info("Terminated probation for employee {} - Reason: {}",
                probation.getEmployeeId(), request.getReason());

        return enrichResponse(probation);
    }

    @Transactional
    public ProbationPeriodResponse putOnHold(UUID probationId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProbationPeriod probation = probationPeriodRepository.findByIdAndTenantId(probationId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Probation period not found"));

        if (probation.getStatus() != ProbationStatus.ACTIVE &&
                probation.getStatus() != ProbationStatus.EXTENDED) {
            throw new BusinessException("Can only put active probation on hold");
        }

        probation.setStatus(ProbationStatus.ON_HOLD);
        probation.setNotes((probation.getNotes() != null ? probation.getNotes() + "\n" : "") +
                "[On Hold] " + reason);
        probation = probationPeriodRepository.save(probation);

        log.info("Put probation {} on hold - Reason: {}", probationId, reason);

        return enrichResponse(probation);
    }

    @Transactional
    public ProbationPeriodResponse resumeProbation(UUID probationId, Integer extensionDays) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProbationPeriod probation = probationPeriodRepository.findByIdAndTenantId(probationId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Probation period not found"));

        if (probation.getStatus() != ProbationStatus.ON_HOLD) {
            throw new BusinessException("Can only resume probation that is on hold");
        }

        probation.setStatus(ProbationStatus.ACTIVE);
        if (extensionDays != null && extensionDays > 0) {
            probation.extend(extensionDays, "Resumed from hold");
        }
        probation = probationPeriodRepository.save(probation);

        log.info("Resumed probation {} from hold", probationId);

        return enrichResponse(probation);
    }

    // ==================== Evaluation Management ====================

    @Transactional
    public ProbationEvaluationResponse addEvaluation(ProbationEvaluationRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID evaluatorId = SecurityContext.getCurrentUserId();

        ProbationPeriod probation = probationPeriodRepository
                .findByIdAndTenantId(request.getProbationPeriodId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Probation period not found"));

        if (probation.getStatus() != ProbationStatus.ACTIVE &&
                probation.getStatus() != ProbationStatus.EXTENDED) {
            throw new BusinessException("Can only add evaluations to active probation periods");
        }

        ProbationEvaluation evaluation = ProbationEvaluation.builder()
                .probationPeriod(probation)
                .evaluationDate(request.getEvaluationDate() != null ? request.getEvaluationDate() : LocalDate.now())
                .evaluatorId(evaluatorId)
                .evaluationType(request.getEvaluationType())
                .performanceRating(request.getPerformanceRating())
                .attendanceRating(request.getAttendanceRating())
                .communicationRating(request.getCommunicationRating())
                .teamworkRating(request.getTeamworkRating())
                .technicalSkillsRating(request.getTechnicalSkillsRating())
                .strengths(request.getStrengths())
                .areasForImprovement(request.getAreasForImprovement())
                .goalsForNextPeriod(request.getGoalsForNextPeriod())
                .managerComments(request.getManagerComments())
                .recommendation(request.getRecommendation())
                .recommendationReason(request.getRecommendationReason())
                .isFinalEvaluation(request.getIsFinalEvaluation() != null ? request.getIsFinalEvaluation() : false)
                .build();

        evaluation.setTenantId(tenantId);
        evaluation.calculateOverallRating();

        probation.addEvaluation(evaluation);
        probationPeriodRepository.save(probation);

        log.info("Added {} evaluation for probation {}",
                request.getEvaluationType(), request.getProbationPeriodId());

        return enrichEvaluationResponse(evaluation);
    }

    @Transactional(readOnly = true)
    public List<ProbationEvaluationResponse> getEvaluationsForProbation(UUID probationId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return probationEvaluationRepository
                .findByProbationPeriodIdAndTenantIdOrderByEvaluationDateDesc(probationId, tenantId)
                .stream()
                .map(this::enrichEvaluationResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProbationEvaluationResponse acknowledgeEvaluation(UUID evaluationId, String employeeComments) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProbationEvaluation evaluation = probationEvaluationRepository.findByIdAndTenantId(evaluationId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluation not found"));

        if (evaluation.getEmployeeAcknowledged()) {
            throw new BusinessException("Evaluation has already been acknowledged");
        }

        evaluation.setEmployeeComments(employeeComments);
        evaluation.acknowledge();
        evaluation = probationEvaluationRepository.save(evaluation);

        log.info("Employee acknowledged evaluation {}", evaluationId);

        return enrichEvaluationResponse(evaluation);
    }

    // ==================== Alerts & Dashboard ====================

    @Transactional(readOnly = true)
    public List<ProbationPeriodResponse> getOverdueProbations() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return probationPeriodRepository.findOverdueProbations(tenantId, LocalDate.now())
                .stream()
                .map(this::enrichResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProbationPeriodResponse> getProbationsEndingSoon(int daysAhead) {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate today = LocalDate.now();
        return probationPeriodRepository.findProbationsEndingSoon(tenantId, today, today.plusDays(daysAhead))
                .stream()
                .map(this::enrichResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProbationPeriodResponse> getProbationsWithEvaluationsDue() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return probationPeriodRepository.findProbationsWithEvaluationsDue(tenantId, LocalDate.now())
                .stream()
                .map(this::enrichResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProbationStatisticsResponse getStatistics() {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());

        long activeProbations = probationPeriodRepository.countActiveProbations(tenantId);

        List<ProbationPeriod> overdue = probationPeriodRepository.findOverdueProbations(tenantId, today);
        List<ProbationPeriod> endingThisWeek = probationPeriodRepository
                .findProbationsEndingSoon(tenantId, today, today.plusDays(7));
        List<ProbationPeriod> endingThisMonth = probationPeriodRepository
                .findProbationsEndingSoon(tenantId, today, monthEnd);
        List<ProbationPeriod> evaluationsDue = probationPeriodRepository
                .findProbationsWithEvaluationsDue(tenantId, today);

        long confirmationsThisMonth = probationPeriodRepository
                .countConfirmationsInPeriod(tenantId, monthStart, monthEnd);
        long terminationsThisMonth = probationPeriodRepository
                .countTerminationsInPeriod(tenantId, monthStart, monthEnd);

        // Status breakdown
        Map<String, Long> byStatus = new LinkedHashMap<>();
        List<Object[]> statusCounts = probationPeriodRepository.countByStatus(tenantId);
        for (Object[] row : statusCounts) {
            ProbationStatus status = (ProbationStatus) row[0];
            Long count = (Long) row[1];
            byStatus.put(status.name(), count);
        }

        return ProbationStatisticsResponse.builder()
                .totalActiveProbations(activeProbations)
                .overdueCount(overdue.size())
                .endingThisWeek(endingThisWeek.size())
                .endingThisMonth(endingThisMonth.size())
                .evaluationsDue(evaluationsDue.size())
                .confirmationsThisMonth(confirmationsThisMonth)
                .terminationsThisMonth(terminationsThisMonth)
                .byStatus(byStatus)
                .build();
    }

    // ==================== Helper Methods ====================

    private ProbationPeriodResponse enrichResponse(ProbationPeriod entity) {
        ProbationPeriodResponse response = ProbationPeriodResponse.fromEntity(entity);
        UUID tenantId = TenantContext.getCurrentTenant();

        // Enrich with employee info
        employeeRepository.findByIdAndTenantId(entity.getEmployeeId(), tenantId)
                .ifPresent(emp -> {
                    response.setEmployeeName(emp.getFirstName() + " " + emp.getLastName());
                    response.setEmployeeEmail(emp.getPersonalEmail());
                    response.setDesignation(emp.getDesignation());
                });

        // Enrich with manager info
        if (entity.getManagerId() != null) {
            employeeRepository.findByIdAndTenantId(entity.getManagerId(), tenantId)
                    .ifPresent(mgr -> response.setManagerName(mgr.getFirstName() + " " + mgr.getLastName()));
        }

        // Enrich with HR info
        if (entity.getHrId() != null) {
            employeeRepository.findByIdAndTenantId(entity.getHrId(), tenantId)
                    .ifPresent(hr -> response.setHrName(hr.getFirstName() + " " + hr.getLastName()));
        }

        // Evaluation stats
        long evalCount = probationEvaluationRepository
                .countByProbationPeriodIdAndTenantId(entity.getId(), tenantId);
        response.setEvaluationCount((int) evalCount);

        probationEvaluationRepository.getAverageRatingForProbation(tenantId, entity.getId())
                .ifPresent(response::setAverageRating);

        return response;
    }

    private ProbationEvaluationResponse enrichEvaluationResponse(ProbationEvaluation entity) {
        ProbationEvaluationResponse response = ProbationEvaluationResponse.fromEntity(entity);
        UUID tenantId = TenantContext.getCurrentTenant();

        // Enrich with evaluator info
        employeeRepository.findByIdAndTenantId(entity.getEvaluatorId(), tenantId)
                .ifPresent(emp -> response.setEvaluatorName(emp.getFirstName() + " " + emp.getLastName()));

        return response;
    }
}
