package com.hrms.application.compensation.listener;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.compensation.CompensationRevisionConfig;
import com.hrms.domain.compensation.CompensationReviewCycle;
import com.hrms.domain.compensation.SalaryRevision;
import com.hrms.domain.event.performance.PerformanceReviewCompletedEvent;
import com.hrms.infrastructure.compensation.repository.CompensationRevisionConfigRepository;
import com.hrms.infrastructure.compensation.repository.CompensationReviewCycleRepository;
import com.hrms.infrastructure.compensation.repository.SalaryRevisionRepository;
import com.hrms.infrastructure.payroll.repository.SalaryStructureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Listens for {@link PerformanceReviewCompletedEvent} and automatically generates
 * a DRAFT {@link SalaryRevision} if an active compensation cycle requires performance ratings.
 *
 * <p>The listener runs in a new transaction (AFTER_COMMIT of the review completion)
 * so that it does not interfere with the review completion transaction itself.</p>
 *
 * <h2>Flow:</h2>
 * <ol>
 *   <li>Performance review is completed and event is published (AFTER_COMMIT)</li>
 *   <li>This listener checks for active compensation cycles that require performance rating</li>
 *   <li>If found, looks up a rating-to-increment mapping from {@code compensation_revision_configs}</li>
 *   <li>Falls back to a hardcoded default mapping if no tenant-specific config exists</li>
 *   <li>Creates a DRAFT salary revision for the employee linked to the compensation cycle</li>
 * </ol>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PerformanceCompensationListener {

    private static final List<SalaryRevision.RevisionStatus> PENDING_STATUSES = Arrays.asList(
            SalaryRevision.RevisionStatus.DRAFT,
            SalaryRevision.RevisionStatus.PENDING_REVIEW,
            SalaryRevision.RevisionStatus.REVIEWED,
            SalaryRevision.RevisionStatus.PENDING_APPROVAL);
    /**
     * Default rating-to-increment mapping used when no tenant-specific
     * {@link CompensationRevisionConfig} records exist.
     *
     * <p>Rating labels are derived from the integer part of the overall rating
     * (e.g., 4.5 maps to "4", 3.2 maps to "3").</p>
     */
    private static final Map<String, BigDecimal> DEFAULT_INCREMENT_MAP = Map.of(
            "5", new BigDecimal("15.00"),   // Exceptional
            "4", new BigDecimal("10.00"),   // Exceeds expectations
            "3", new BigDecimal("7.00"),    // Meets expectations
            "2", new BigDecimal("3.00"),    // Below expectations
            "1", new BigDecimal("0.00")     // Unsatisfactory
    );
    private static final BigDecimal FALLBACK_INCREMENT = new BigDecimal("5.00");
    private final CompensationReviewCycleRepository cycleRepository;
    private final SalaryRevisionRepository revisionRepository;
    private final SalaryStructureRepository salaryStructureRepository;
    private final CompensationRevisionConfigRepository configRepository;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onPerformanceReviewCompleted(PerformanceReviewCompletedEvent event) {
        UUID tenantId = event.getTenantId();
        UUID employeeId = event.getEmployeeId();
        UUID reviewId = event.getReviewId();
        BigDecimal overallRating = event.getOverallRating();

        try {
            TenantContext.setCurrentTenant(tenantId);

            log.info("Processing performance review completion for employee {} (reviewId={}, rating={})",
                    employeeId, reviewId, overallRating);

            if (overallRating == null) {
                log.warn("Performance review {} has no overall rating, skipping salary revision generation",
                        reviewId);
                return;
            }

            // Find active compensation cycles that require performance rating
            List<CompensationReviewCycle> activeCycles = cycleRepository.findActiveCycles(tenantId);
            List<CompensationReviewCycle> eligibleCycles = activeCycles.stream()
                    .filter(c -> Boolean.TRUE.equals(c.getRequirePerformanceRating()))
                    .toList();

            if (eligibleCycles.isEmpty()) {
                log.debug("No active compensation cycles requiring performance rating for tenant {}",
                        tenantId);
                return;
            }

            for (CompensationReviewCycle cycle : eligibleCycles) {
                createDraftRevisionForCycle(cycle, tenantId, employeeId, reviewId, overallRating);
            }

        } catch (Exception e) {
            // Best-effort: log and continue. The review is already completed;
            // salary revision can be created manually if this fails.
            log.error("Failed to generate draft salary revision for employee {} after review {}: {}",
                    employeeId, reviewId, e.getMessage(), e);
        } finally {
            TenantContext.clear();
        }
    }

    private void createDraftRevisionForCycle(CompensationReviewCycle cycle,
                                             UUID tenantId,
                                             UUID employeeId,
                                             UUID reviewId,
                                             BigDecimal overallRating) {
        // Check minimum performance rating threshold
        if (cycle.getMinPerformanceRating() != null
                && overallRating.doubleValue() < cycle.getMinPerformanceRating()) {
            log.info("Employee {} rating {} is below minimum {} for cycle {}, skipping",
                    employeeId, overallRating, cycle.getMinPerformanceRating(), cycle.getId());
            return;
        }

        // Check if employee already has a pending revision for this cycle
        if (revisionRepository.existsByEmployeeIdAndTenantIdAndStatusIn(
                employeeId, tenantId, PENDING_STATUSES)) {
            log.info("Employee {} already has a pending salary revision, skipping for cycle {}",
                    employeeId, cycle.getId());
            return;
        }

        // Determine increment percentage from config or defaults
        BigDecimal incrementPct = resolveIncrementPercentage(tenantId, overallRating);

        // Get current salary
        BigDecimal currentSalary = salaryStructureRepository
                .findActiveByEmployeeIdAndDate(tenantId, employeeId, LocalDate.now())
                .map(ss -> ss.getGrossSalary())
                .orElse(BigDecimal.ZERO);

        if (currentSalary.compareTo(BigDecimal.ZERO) == 0) {
            log.warn("Employee {} has no active salary structure, creating revision with zero base",
                    employeeId);
        }

        // Calculate new salary
        BigDecimal incrementAmount = currentSalary.multiply(incrementPct)
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal newSalary = currentSalary.add(incrementAmount);

        // Clamp increment to cycle min/max if defined
        if (cycle.getMinIncrementPercentage() != null
                && incrementPct.compareTo(cycle.getMinIncrementPercentage()) < 0) {
            incrementPct = cycle.getMinIncrementPercentage();
            incrementAmount = currentSalary.multiply(incrementPct)
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            newSalary = currentSalary.add(incrementAmount);
        }
        if (cycle.getMaxIncrementPercentage() != null
                && incrementPct.compareTo(cycle.getMaxIncrementPercentage()) > 0) {
            incrementPct = cycle.getMaxIncrementPercentage();
            incrementAmount = currentSalary.multiply(incrementPct)
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            newSalary = currentSalary.add(incrementAmount);
        }

        SalaryRevision revision = SalaryRevision.builder()
                .employeeId(employeeId)
                .reviewCycleId(cycle.getId())
                .revisionType(SalaryRevision.RevisionType.ANNUAL_INCREMENT)
                .previousSalary(currentSalary)
                .newSalary(newSalary)
                .incrementAmount(incrementAmount)
                .incrementPercentage(incrementPct)
                .effectiveDate(cycle.getEffectiveDate())
                .performanceRating(overallRating.doubleValue())
                .justification("Auto-generated from performance review (rating: " + overallRating + ")")
                .currency(cycle.getCurrency())
                .build();

        revision.setTenantId(tenantId);
        revision = revisionRepository.save(revision);

        log.info("Created DRAFT salary revision {} for employee {} in cycle {} " +
                        "(rating={}, increment={}%, newSalary={})",
                revision.getId(), employeeId, cycle.getId(),
                overallRating, incrementPct, newSalary);
    }

    /**
     * Resolves the recommended increment percentage for a given rating.
     *
     * <p>First checks tenant-specific {@link CompensationRevisionConfig} records.
     * Falls back to the hardcoded {@link #DEFAULT_INCREMENT_MAP} if no config exists.</p>
     */
    private BigDecimal resolveIncrementPercentage(UUID tenantId, BigDecimal overallRating) {
        String ratingLabel = String.valueOf(overallRating.intValue());

        // Try tenant-specific config first
        return configRepository.findByTenantIdAndRatingLabel(tenantId, ratingLabel)
                .map(CompensationRevisionConfig::getDefaultIncrementPct)
                .orElseGet(() -> DEFAULT_INCREMENT_MAP.getOrDefault(ratingLabel, FALLBACK_INCREMENT));
    }
}
