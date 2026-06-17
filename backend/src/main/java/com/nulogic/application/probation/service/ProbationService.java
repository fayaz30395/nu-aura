package com.nulogic.application.probation.service;

import com.nulogic.api.probation.dto.*;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import org.springframework.security.access.AccessDeniedException;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.probation.ProbationEvaluation;
import com.nulogic.domain.probation.ProbationPeriod;
import com.nulogic.domain.probation.ProbationPeriod.ProbationStatus;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.probation.repository.ProbationEvaluationRepository;
import com.nulogic.infrastructure.probation.repository.ProbationPeriodRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
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
    private final TenantTimeService tenantTimeService;

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
        UUID tenantId = TenantContext.requireCurrentTenant();
        return enrichPage(probationPeriodRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable));
    }

    @Transactional(readOnly = true)
    public Page<ProbationPeriodResponse> getProbationsByStatus(ProbationStatus status, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return enrichPage(probationPeriodRepository.findByTenantIdAndStatusOrderByEndDateAsc(tenantId, status, pageable));
    }

    @Transactional(readOnly = true)
    public Page<ProbationPeriodResponse> searchProbations(
            ProbationStatus status,
            UUID managerId,
            LocalDate startDate,
            LocalDate endDate,
            Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return enrichPage(
                probationPeriodRepository.searchProbations(tenantId, status, managerId, startDate, endDate, pageable));
    }

    @Transactional(readOnly = true)
    public Page<ProbationPeriodResponse> getMyTeamProbations(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID managerId = SecurityContext.getCurrentUserId();
        return enrichPage(
                probationPeriodRepository.findByTenantIdAndManagerIdOrderByCreatedAtDesc(tenantId, managerId, pageable));
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

        probation.confirm(confirmedBy, request.getFinalRating(), request.getNotes(),
                tenantTimeService.today(tenantId));
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

        probation.fail(decidedBy, request.getReason(), tenantTimeService.today(tenantId));
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

        probation.terminate(terminatedBy, request.getReason(), tenantTimeService.today(tenantId));
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
        UUID tenantId = TenantContext.requireCurrentTenant();
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
                .evaluationDate(request.getEvaluationDate() != null ? request.getEvaluationDate() : tenantTimeService.today(tenantId))
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

        probation.addEvaluation(evaluation, tenantTimeService.today(tenantId));
        probationPeriodRepository.save(probation);

        log.info("Added {} evaluation for probation {}",
                request.getEvaluationType(), request.getProbationPeriodId());

        return enrichEvaluationResponse(evaluation);
    }

    @Transactional(readOnly = true)
    public List<ProbationEvaluationResponse> getEvaluationsForProbation(UUID probationId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<ProbationEvaluation> evaluations = probationEvaluationRepository
                .findByProbationPeriodIdAndTenantIdOrderByEvaluationDateDesc(probationId, tenantId);
        Map<UUID, String> evaluatorNames = buildEvaluatorNameCache(evaluations);
        return evaluations.stream()
                .map(e -> enrichEvaluationResponse(e, evaluatorNames))
                .collect(Collectors.toList());
    }

    @Transactional
    public ProbationEvaluationResponse acknowledgeEvaluation(UUID evaluationId, String employeeComments) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProbationEvaluation evaluation = probationEvaluationRepository.findByIdAndTenantId(evaluationId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluation not found"));

        // RBAC-7 FIX: only the employee under evaluation (or admin/HR) may acknowledge.
        if (!SecurityContext.isSuperAdmin() && !SecurityContext.isTenantAdmin() && !SecurityContext.isHRManager()) {
            UUID ownerEmployeeId = evaluation.getProbationPeriod().getEmployeeId();
            UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
            if (!ownerEmployeeId.equals(currentEmployeeId)) {
                throw new AccessDeniedException("You are not authorized to acknowledge this evaluation");
            }
        }

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
        UUID tenantId = TenantContext.requireCurrentTenant();
        return enrichList(
                probationPeriodRepository.findOverdueProbations(tenantId, tenantTimeService.today(tenantId)));
    }

    @Transactional(readOnly = true)
    public List<ProbationPeriodResponse> getProbationsEndingSoon(int daysAhead) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        LocalDate today = tenantTimeService.today(tenantId);
        return enrichList(
                probationPeriodRepository.findProbationsEndingSoon(tenantId, today, today.plusDays(daysAhead)));
    }

    @Transactional(readOnly = true)
    public List<ProbationPeriodResponse> getProbationsWithEvaluationsDue() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return enrichList(
                probationPeriodRepository.findProbationsWithEvaluationsDue(tenantId, tenantTimeService.today(tenantId)));
    }

    @Transactional(readOnly = true)
    public ProbationStatisticsResponse getStatistics() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        LocalDate today = tenantTimeService.today(tenantId);
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

    // --- Batch enrichment (N+1 elimination) ----------------------------------

    /**
     * Page path: bulk-load employee/manager/HR references once, then map each
     * row against the shared caches instead of firing per-row findById lookups.
     */
    private Page<ProbationPeriodResponse> enrichPage(Page<ProbationPeriod> probations) {
        List<ProbationPeriod> content = probations.getContent();
        Map<UUID, Employee> employees = buildEmployeeCache(content);
        Map<UUID, String> personNames = buildPersonNameCache(content);
        return probations.map(p -> enrichResponse(p, employees, personNames));
    }

    /**
     * List path: bulk-load employee/manager/HR references once, then map each
     * row against the shared caches instead of firing per-row findById lookups.
     */
    private List<ProbationPeriodResponse> enrichList(List<ProbationPeriod> probations) {
        Map<UUID, Employee> employees = buildEmployeeCache(probations);
        Map<UUID, String> personNames = buildPersonNameCache(probations);
        List<ProbationPeriodResponse> responses = new ArrayList<>(probations.size());
        for (ProbationPeriod probation : probations) {
            responses.add(enrichResponse(probation, employees, personNames));
        }
        return responses;
    }

    /**
     * Bulk-loads the full {@link Employee} entity for every probation's
     * employeeId (needed for name, email and designation). Values may be null,
     * so a manual put loop is used instead of Collectors.toMap.
     */
    private Map<UUID, Employee> buildEmployeeCache(List<ProbationPeriod> probations) {
        Set<UUID> employeeIds = new HashSet<>();
        for (ProbationPeriod probation : probations) {
            if (probation.getEmployeeId() != null) {
                employeeIds.add(probation.getEmployeeId());
            }
        }

        Map<UUID, Employee> employees = new HashMap<>();
        if (!employeeIds.isEmpty()) {
            employeeRepository.findAllById(employeeIds)
                    .forEach(employee -> employees.put(employee.getId(), employee));
        }
        return employees;
    }

    /**
     * Bulk-loads display names for every manager/HR reference. The original
     * enrichment formatted these as {@code firstName + " " + lastName}, so that
     * exact format is preserved here. Values may be null, so a manual put loop
     * is used instead of Collectors.toMap.
     */
    private Map<UUID, String> buildPersonNameCache(List<ProbationPeriod> probations) {
        Set<UUID> personIds = new HashSet<>();
        for (ProbationPeriod probation : probations) {
            if (probation.getManagerId() != null) {
                personIds.add(probation.getManagerId());
            }
            if (probation.getHrId() != null) {
                personIds.add(probation.getHrId());
            }
        }

        Map<UUID, String> names = new HashMap<>();
        if (!personIds.isEmpty()) {
            employeeRepository.findAllById(personIds)
                    .forEach(p -> names.put(p.getId(), p.getFirstName() + " " + p.getLastName()));
        }
        return names;
    }

    /**
     * Single-item path. Delegates to the cache-backed overload via single-entry
     * caches so the enrichment logic lives in one place (DRY).
     */
    private ProbationPeriodResponse enrichResponse(ProbationPeriod entity) {
        List<ProbationPeriod> single = List.of(entity);
        return enrichResponse(entity, buildEmployeeCache(single), buildPersonNameCache(single));
    }

    private ProbationPeriodResponse enrichResponse(ProbationPeriod entity,
                                                   Map<UUID, Employee> employees,
                                                   Map<UUID, String> personNames) {
        ProbationPeriodResponse response = ProbationPeriodResponse.fromEntity(entity);
        UUID tenantId = TenantContext.getCurrentTenant();

        // Time-derived fields — computed here so they use the tenant-zoned
        // calendar rather than the JVM zone (was previously LocalDate.now() on
        // the entity).
        LocalDate today = tenantTimeService.today(tenantId);
        response.setDaysRemaining(computeDaysRemaining(entity, today));
        response.setOverdue(computeIsOverdue(entity, today));
        response.setEvaluationDue(computeIsEvaluationDue(entity, today));

        // Enrich with employee info
        Employee employee = entity.getEmployeeId() != null ? employees.get(entity.getEmployeeId()) : null;
        if (employee != null) {
            response.setEmployeeName(employee.getFirstName() + " " + employee.getLastName());
            response.setEmployeeEmail(employee.getPersonalEmail());
            response.setDesignation(employee.getDesignation());
        }

        // Enrich with manager info
        if (entity.getManagerId() != null) {
            String managerName = personNames.get(entity.getManagerId());
            if (managerName != null) {
                response.setManagerName(managerName);
            }
        }

        // Enrich with HR info
        if (entity.getHrId() != null) {
            String hrName = personNames.get(entity.getHrId());
            if (hrName != null) {
                response.setHrName(hrName);
            }
        }

        // Evaluation stats
        long evalCount = probationEvaluationRepository
                .countByProbationPeriodIdAndTenantId(entity.getId(), tenantId);
        response.setEvaluationCount((int) evalCount);

        probationEvaluationRepository.getAverageRatingForProbation(tenantId, entity.getId())
                .ifPresent(response::setAverageRating);

        return response;
    }

    /**
     * Tenant-zoned replacement for {@code ProbationPeriod.isOverdue()}.
     */
    private boolean computeIsOverdue(ProbationPeriod entity, LocalDate today) {
        return entity.getStatus() == ProbationStatus.ACTIVE
                && entity.getEndDate() != null
                && today.isAfter(entity.getEndDate());
    }

    /**
     * Tenant-zoned replacement for {@code ProbationPeriod.isEvaluationDue()}.
     */
    private boolean computeIsEvaluationDue(ProbationPeriod entity, LocalDate today) {
        if (entity.getNextEvaluationDate() == null) return false;
        return (entity.getStatus() == ProbationStatus.ACTIVE
                || entity.getStatus() == ProbationStatus.EXTENDED)
                && !today.isBefore(entity.getNextEvaluationDate());
    }

    /**
     * Tenant-zoned replacement for {@code ProbationPeriod.getDaysRemaining()}.
     */
    private long computeDaysRemaining(ProbationPeriod entity, LocalDate today) {
        if (entity.getEndDate() == null
                || (entity.getStatus() != ProbationStatus.ACTIVE
                        && entity.getStatus() != ProbationStatus.EXTENDED)) {
            return 0;
        }
        return java.time.temporal.ChronoUnit.DAYS.between(today, entity.getEndDate());
    }

    /**
     * Bulk-loads evaluator display names for every evaluation's evaluatorId.
     * The original enrichment formatted these as {@code firstName + " " +
     * lastName}, so that exact format is preserved here. Values may be null, so
     * a manual put loop is used instead of Collectors.toMap.
     */
    private Map<UUID, String> buildEvaluatorNameCache(List<ProbationEvaluation> evaluations) {
        Set<UUID> evaluatorIds = new HashSet<>();
        for (ProbationEvaluation evaluation : evaluations) {
            if (evaluation.getEvaluatorId() != null) {
                evaluatorIds.add(evaluation.getEvaluatorId());
            }
        }

        Map<UUID, String> names = new HashMap<>();
        if (!evaluatorIds.isEmpty()) {
            employeeRepository.findAllById(evaluatorIds)
                    .forEach(emp -> names.put(emp.getId(), emp.getFirstName() + " " + emp.getLastName()));
        }
        return names;
    }

    /**
     * Single-item path. Delegates to the cache-backed overload via a
     * single-entry cache so the enrichment logic lives in one place (DRY).
     */
    private ProbationEvaluationResponse enrichEvaluationResponse(ProbationEvaluation entity) {
        return enrichEvaluationResponse(entity, buildEvaluatorNameCache(List.of(entity)));
    }

    private ProbationEvaluationResponse enrichEvaluationResponse(ProbationEvaluation entity,
                                                                Map<UUID, String> evaluatorNames) {
        ProbationEvaluationResponse response = ProbationEvaluationResponse.fromEntity(entity);

        // Enrich with evaluator info
        if (entity.getEvaluatorId() != null) {
            String evaluatorName = evaluatorNames.get(entity.getEvaluatorId());
            if (evaluatorName != null) {
                response.setEvaluatorName(evaluatorName);
            }
        }

        return response;
    }
}
