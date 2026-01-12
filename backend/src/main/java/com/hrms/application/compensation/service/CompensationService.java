package com.hrms.application.compensation.service;

import com.hrms.api.compensation.dto.*;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.compensation.CompensationReviewCycle;
import com.hrms.domain.compensation.CompensationReviewCycle.CycleStatus;
import com.hrms.domain.compensation.CompensationReviewCycle.CycleType;
import com.hrms.domain.compensation.SalaryRevision;
import com.hrms.domain.compensation.SalaryRevision.RevisionStatus;
import com.hrms.domain.compensation.SalaryRevision.RevisionType;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.compensation.repository.CompensationReviewCycleRepository;
import com.hrms.infrastructure.compensation.repository.SalaryRevisionRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.payroll.repository.SalaryStructureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CompensationService {

    private final SalaryRevisionRepository revisionRepository;
    private final CompensationReviewCycleRepository cycleRepository;
    private final EmployeeRepository employeeRepository;
    private final SalaryStructureRepository salaryStructureRepository;

    private static final List<RevisionStatus> PENDING_STATUSES = Arrays.asList(
            RevisionStatus.DRAFT, RevisionStatus.PENDING_REVIEW,
            RevisionStatus.REVIEWED, RevisionStatus.PENDING_APPROVAL);

    // ==================== Review Cycle Management ====================

    @Transactional
    public CompensationCycleResponse createCycle(CompensationCycleRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        CompensationReviewCycle cycle = CompensationReviewCycle.builder()
                .name(request.getName())
                .description(request.getDescription())
                .cycleType(request.getCycleType())
                .fiscalYear(request.getFiscalYear())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .effectiveDate(request.getEffectiveDate())
                .budgetAmount(request.getBudgetAmount())
                .minIncrementPercentage(request.getMinIncrementPercentage())
                .maxIncrementPercentage(request.getMaxIncrementPercentage())
                .averageIncrementTarget(request.getAverageIncrementTarget())
                .includeAllEmployees(request.getIncludeAllEmployees() != null ? request.getIncludeAllEmployees() : true)
                .minTenureMonths(request.getMinTenureMonths())
                .excludeProbationers(request.getExcludeProbationers() != null ? request.getExcludeProbationers() : true)
                .excludeNoticePeriod(request.getExcludeNoticePeriod() != null ? request.getExcludeNoticePeriod() : true)
                .allowPromotions(request.getAllowPromotions() != null ? request.getAllowPromotions() : true)
                .requirePerformanceRating(request.getRequirePerformanceRating() != null ? request.getRequirePerformanceRating() : true)
                .minPerformanceRating(request.getMinPerformanceRating())
                .currency(request.getCurrency() != null ? request.getCurrency() : "USD")
                .createdBy(userId)
                .build();

        cycle.setTenantId(tenantId);
        cycle = cycleRepository.save(cycle);

        log.info("Created compensation review cycle: {} for fiscal year {}", cycle.getName(), cycle.getFiscalYear());

        return CompensationCycleResponse.fromEntity(cycle);
    }

    @Transactional(readOnly = true)
    public CompensationCycleResponse getCycleById(UUID cycleId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        CompensationReviewCycle cycle = cycleRepository.findByIdAndTenantId(cycleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Review cycle not found"));
        return enrichCycleResponse(cycle);
    }

    @Transactional(readOnly = true)
    public Page<CompensationCycleResponse> getAllCycles(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return cycleRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable)
                .map(this::enrichCycleResponse);
    }

    @Transactional(readOnly = true)
    public List<CompensationCycleResponse> getActiveCycles() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return cycleRepository.findActiveCycles(tenantId).stream()
                .map(this::enrichCycleResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CompensationCycleResponse updateCycleStatus(UUID cycleId, CycleStatus newStatus) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        CompensationReviewCycle cycle = cycleRepository.findByIdAndTenantId(cycleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Review cycle not found"));

        switch (newStatus) {
            case IN_PROGRESS -> cycle.activate();
            case REVIEW -> cycle.moveToReview();
            case APPROVAL -> cycle.moveToApproval();
            case APPROVED -> cycle.approve(userId);
            case COMPLETED -> cycle.complete();
            case CANCELLED -> cycle.cancel();
            default -> throw new BusinessException("Invalid status transition");
        }

        cycle = cycleRepository.save(cycle);
        log.info("Updated cycle {} status to {}", cycleId, newStatus);

        return enrichCycleResponse(cycle);
    }

    // ==================== Salary Revision Management ====================

    @Transactional
    public SalaryRevisionResponse createRevision(SalaryRevisionRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        // Check if employee exists
        var employee = employeeRepository.findByIdAndTenantId(request.getEmployeeId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        // Check for pending revisions
        if (revisionRepository.existsByEmployeeIdAndTenantIdAndStatusIn(
                request.getEmployeeId(), tenantId, PENDING_STATUSES)) {
            throw new BusinessException("Employee already has a pending salary revision");
        }

        // Get current salary from salary structure
        BigDecimal currentSalary = salaryStructureRepository
                .findActiveByEmployeeIdAndDate(tenantId, request.getEmployeeId(), LocalDate.now())
                .map(ss -> ss.getGrossSalary())
                .orElse(BigDecimal.ZERO);

        SalaryRevision revision = SalaryRevision.builder()
                .employeeId(request.getEmployeeId())
                .reviewCycleId(request.getReviewCycleId())
                .revisionType(request.getRevisionType())
                .previousSalary(currentSalary)
                .newSalary(request.getNewSalary())
                .previousDesignation(employee.getDesignation())
                .newDesignation(request.getNewDesignation() != null ? request.getNewDesignation() : employee.getDesignation())
                .effectiveDate(request.getEffectiveDate())
                .justification(request.getJustification())
                .performanceRating(request.getPerformanceRating())
                .proposedBy(userId)
                .build();

        revision.setTenantId(tenantId);
        revision.calculateIncrement();
        revision = revisionRepository.save(revision);

        log.info("Created salary revision for employee: {} with {}% increment",
                request.getEmployeeId(), revision.getIncrementPercentage());

        return enrichRevisionResponse(revision);
    }

    @Transactional(readOnly = true)
    public SalaryRevisionResponse getRevisionById(UUID revisionId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        SalaryRevision revision = revisionRepository.findByIdAndTenantId(revisionId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Salary revision not found"));
        return enrichRevisionResponse(revision);
    }

    @Transactional(readOnly = true)
    public Page<SalaryRevisionResponse> getAllRevisions(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return revisionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable)
                .map(this::enrichRevisionResponse);
    }

    @Transactional(readOnly = true)
    public Page<SalaryRevisionResponse> getRevisionsByCycle(UUID cycleId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return revisionRepository.findByReviewCycleIdAndTenantIdOrderByCreatedAtDesc(cycleId, tenantId, pageable)
                .map(this::enrichRevisionResponse);
    }

    @Transactional(readOnly = true)
    public List<SalaryRevisionResponse> getEmployeeRevisionHistory(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return revisionRepository.findByEmployeeIdAndTenantIdOrderByEffectiveDateDesc(employeeId, tenantId)
                .stream()
                .map(this::enrichRevisionResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<SalaryRevisionResponse> getPendingApprovals(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return revisionRepository.findPendingApprovals(tenantId, pageable)
                .map(this::enrichRevisionResponse);
    }

    // ==================== Revision Workflow ====================

    @Transactional
    public SalaryRevisionResponse submitRevision(UUID revisionId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        SalaryRevision revision = revisionRepository.findByIdAndTenantId(revisionId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Salary revision not found"));

        if (revision.getStatus() != RevisionStatus.DRAFT) {
            throw new BusinessException("Can only submit draft revisions");
        }

        revision.submit();
        revision.setProposedBy(userId);
        revision = revisionRepository.save(revision);

        log.info("Submitted salary revision {} for review", revisionId);

        return enrichRevisionResponse(revision);
    }

    @Transactional
    public SalaryRevisionResponse reviewRevision(UUID revisionId, String comments) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        SalaryRevision revision = revisionRepository.findByIdAndTenantId(revisionId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Salary revision not found"));

        if (revision.getStatus() != RevisionStatus.PENDING_REVIEW) {
            throw new BusinessException("Can only review pending revisions");
        }

        revision.review(userId, comments);
        revision.setStatus(RevisionStatus.PENDING_APPROVAL);
        revision = revisionRepository.save(revision);

        log.info("Reviewed salary revision {} by {}", revisionId, userId);

        return enrichRevisionResponse(revision);
    }

    @Transactional
    public SalaryRevisionResponse approveRevision(UUID revisionId, String comments) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        SalaryRevision revision = revisionRepository.findByIdAndTenantId(revisionId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Salary revision not found"));

        if (revision.getStatus() != RevisionStatus.PENDING_APPROVAL &&
                revision.getStatus() != RevisionStatus.REVIEWED) {
            throw new BusinessException("Can only approve reviewed or pending approval revisions");
        }

        revision.approve(userId, comments);
        revision = revisionRepository.save(revision);

        // Update cycle budget utilization if linked to a cycle
        if (revision.getReviewCycleId() != null) {
            updateCycleBudgetUtilization(revision.getReviewCycleId(), tenantId);
        }

        log.info("Approved salary revision {} for employee {}", revisionId, revision.getEmployeeId());

        return enrichRevisionResponse(revision);
    }

    @Transactional
    public SalaryRevisionResponse rejectRevision(UUID revisionId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        SalaryRevision revision = revisionRepository.findByIdAndTenantId(revisionId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Salary revision not found"));

        if (revision.getStatus() == RevisionStatus.APPLIED ||
                revision.getStatus() == RevisionStatus.CANCELLED) {
            throw new BusinessException("Cannot reject applied or cancelled revisions");
        }

        revision.reject(userId, reason);
        revision = revisionRepository.save(revision);

        log.info("Rejected salary revision {} - Reason: {}", revisionId, reason);

        return enrichRevisionResponse(revision);
    }

    @Transactional
    public SalaryRevisionResponse applyRevision(UUID revisionId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        SalaryRevision revision = revisionRepository.findByIdAndTenantId(revisionId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Salary revision not found"));

        if (revision.getStatus() != RevisionStatus.APPROVED) {
            throw new BusinessException("Can only apply approved revisions");
        }

        if (revision.getEffectiveDate().isAfter(LocalDate.now())) {
            throw new BusinessException("Cannot apply revision before effective date");
        }

        revision.apply();

        // Update employee designation and level if changed (promotion)
        if (revision.isPromotion()) {
            final String newDesignation = revision.getNewDesignation();
            final String newLevel = revision.getNewLevel();
            final UUID employeeId = revision.getEmployeeId();
            final UUID revId = revisionId;

            employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .ifPresent(employee -> {
                    if (newDesignation != null) {
                        employee.setDesignation(newDesignation);
                    }
                    if (newLevel != null) {
                        try {
                            employee.setLevel(Employee.EmployeeLevel.valueOf(newLevel));
                        } catch (IllegalArgumentException e) {
                            log.warn("Could not parse employee level: {}", newLevel);
                        }
                    }
                    employeeRepository.save(employee);
                    log.info("Updated employee {} designation/level from revision {}",
                        employeeId, revId);
                });
        }

        // Mark for payroll processing - payroll system should pick this up
        revision.setPayrollProcessed(false); // Will be set true by payroll batch job
        revision = revisionRepository.save(revision);

        log.info("Applied salary revision {} for employee {}. New salary: {} {}",
            revisionId, revision.getEmployeeId(), revision.getNewSalary(), revision.getCurrency());

        return enrichRevisionResponse(revision);
    }

    // ==================== Statistics ====================

    @Transactional(readOnly = true)
    public CompensationStatisticsResponse getCycleStatistics(UUID cycleId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        cycleRepository.findByIdAndTenantId(cycleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Review cycle not found"));

        List<SalaryRevision> revisions = revisionRepository.findByReviewCycleIdAndTenantId(cycleId, tenantId);

        long totalRevisions = revisions.size();
        long pendingApprovals = revisions.stream()
                .filter(r -> PENDING_STATUSES.contains(r.getStatus())).count();
        long approved = revisions.stream()
                .filter(r -> r.getStatus() == RevisionStatus.APPROVED).count();
        long applied = revisions.stream()
                .filter(r -> r.getStatus() == RevisionStatus.APPLIED).count();
        long promotions = revisions.stream()
                .filter(SalaryRevision::isPromotion).count();

        BigDecimal totalIncrement = revisionRepository.getTotalIncrementByCycle(tenantId, cycleId);
        Double avgIncrement = revisionRepository.getAverageIncrementPercentageByCycle(tenantId, cycleId);

        // By status
        Map<String, Long> byStatus = revisions.stream()
                .collect(Collectors.groupingBy(
                        r -> r.getStatus().name(),
                        Collectors.counting()));

        // By type
        Map<String, Long> byType = revisions.stream()
                .collect(Collectors.groupingBy(
                        r -> r.getRevisionType().name(),
                        Collectors.counting()));

        return CompensationStatisticsResponse.builder()
                .totalRevisions(totalRevisions)
                .pendingApprovals(pendingApprovals)
                .approvedRevisions(approved)
                .appliedRevisions(applied)
                .totalIncrementAmount(totalIncrement)
                .averageIncrementPercentage(avgIncrement)
                .promotionsCount(promotions)
                .revisionsByStatus(byStatus)
                .revisionsByType(byType)
                .build();
    }

    // ==================== Helper Methods ====================

    private void updateCycleBudgetUtilization(UUID cycleId, UUID tenantId) {
        CompensationReviewCycle cycle = cycleRepository.findByIdAndTenantId(cycleId, tenantId).orElse(null);
        if (cycle != null) {
            BigDecimal utilized = revisionRepository.getTotalIncrementByCycle(tenantId, cycleId);
            cycle.setUtilizedAmount(utilized != null ? utilized : BigDecimal.ZERO);

            long approved = revisionRepository.countByCycleAndStatus(tenantId, cycleId, RevisionStatus.APPROVED);
            long applied = revisionRepository.countByCycleAndStatus(tenantId, cycleId, RevisionStatus.APPLIED);
            cycle.setRevisionsApproved((int) approved);
            cycle.setRevisionsApplied((int) applied);

            cycleRepository.save(cycle);
        }
    }

    private CompensationCycleResponse enrichCycleResponse(CompensationReviewCycle cycle) {
        CompensationCycleResponse response = CompensationCycleResponse.fromEntity(cycle);
        UUID tenantId = TenantContext.getCurrentTenant();

        // Add actual average increment
        Double avgIncrement = revisionRepository.getAverageIncrementPercentageByCycle(tenantId, cycle.getId());
        response.setActualAverageIncrement(avgIncrement);

        // Add promotions count
        long promotions = revisionRepository.countPromotionsByCycle(tenantId, cycle.getId());
        response.setPromotionsCount((int) promotions);

        return response;
    }

    private SalaryRevisionResponse enrichRevisionResponse(SalaryRevision revision) {
        SalaryRevisionResponse response = SalaryRevisionResponse.fromEntity(revision);
        UUID tenantId = TenantContext.getCurrentTenant();

        // Enrich with employee info
        employeeRepository.findByIdAndTenantId(revision.getEmployeeId(), tenantId)
                .ifPresent(emp -> {
                    response.setEmployeeName(emp.getFirstName() + " " + emp.getLastName());
                    response.setEmployeeCode(emp.getEmployeeCode());
                });

        // Enrich with cycle name
        if (revision.getReviewCycleId() != null) {
            cycleRepository.findByIdAndTenantId(revision.getReviewCycleId(), tenantId)
                    .ifPresent(cycle -> response.setReviewCycleName(cycle.getName()));
        }

        // Enrich with proposer, reviewer, approver names
        if (revision.getProposedBy() != null) {
            employeeRepository.findByIdAndTenantId(revision.getProposedBy(), tenantId)
                    .ifPresent(emp -> response.setProposedByName(emp.getFirstName() + " " + emp.getLastName()));
        }
        if (revision.getReviewedBy() != null) {
            employeeRepository.findByIdAndTenantId(revision.getReviewedBy(), tenantId)
                    .ifPresent(emp -> response.setReviewedByName(emp.getFirstName() + " " + emp.getLastName()));
        }
        if (revision.getApprovedBy() != null) {
            employeeRepository.findByIdAndTenantId(revision.getApprovedBy(), tenantId)
                    .ifPresent(emp -> response.setApprovedByName(emp.getFirstName() + " " + emp.getLastName()));
        }

        return response;
    }
}
