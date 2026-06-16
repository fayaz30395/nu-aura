package com.nulogic.application.performance.service;

import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.application.event.DomainEventPublisher;
import com.nulogic.application.performance.dto.CompetencyRequest;
import com.nulogic.application.performance.dto.CompetencyResponse;
import com.nulogic.application.performance.dto.ReviewRequest;
import com.nulogic.application.performance.dto.ReviewResponse;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.audit.AuditLog.AuditAction;
import com.nulogic.domain.event.performance.PerformanceReviewCompletedEvent;
import com.nulogic.domain.performance.PerformanceReview;
import com.nulogic.domain.performance.ReviewCompetency;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.performance.repository.PerformanceReviewRepository;
import com.nulogic.infrastructure.performance.repository.ReviewCompetencyRepository;
import com.nulogic.infrastructure.performance.repository.ReviewCycleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class PerformanceReviewService {

    private static final String REVIEW_NOT_FOUND = "Review not found";

    private final PerformanceReviewRepository reviewRepository;
    private final ReviewCompetencyRepository competencyRepository;
    private final EmployeeRepository employeeRepository;
    private final ReviewCycleRepository reviewCycleRepository;
    private final DomainEventPublisher domainEventPublisher;
    private final AuditLogService auditLogService;
    private final TenantTimeService tenantTimeService;

    @Transactional
    public ReviewResponse createReview(ReviewRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // IDOR fix: validate cross-entity IDs belong to the current tenant before writing.
        employeeRepository.findByIdAndTenantId(request.getEmployeeId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
        if (request.getReviewerId() != null) {
            employeeRepository.findByIdAndTenantId(request.getReviewerId(), tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Reviewer not found"));
        }
        if (request.getReviewCycleId() != null) {
            reviewCycleRepository.findByIdAndTenantId(request.getReviewCycleId(), tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Review cycle not found"));
        }

        PerformanceReview review = PerformanceReview.builder()
                .employeeId(request.getEmployeeId())
                .reviewerId(request.getReviewerId())
                .reviewCycleId(request.getReviewCycleId())
                .reviewType(request.getReviewType())
                .reviewPeriodStart(request.getReviewPeriodStart())
                .reviewPeriodEnd(request.getReviewPeriodEnd())
                .status(request.getStatus() != null ? request.getStatus() : PerformanceReview.ReviewStatus.DRAFT)
                .overallRating(request.getOverallRating())
                .strengths(request.getStrengths())
                .areasForImprovement(request.getAreasForImprovement())
                .achievements(request.getAchievements())
                .goalsForNextPeriod(request.getGoalsForNextPeriod())
                .managerComments(request.getManagerComments())
                .employeeComments(request.getEmployeeComments())
                .build();

        review.setTenantId(tenantId);
        review = reviewRepository.save(review);

        try {
            auditLogService.logAction("PERFORMANCE_REVIEW", review.getId(), AuditAction.CREATE, null, null, "Performance review created for employee " + request.getEmployeeId());
        } catch (Exception e) {
            log.warn("Audit log failed for review create: {}", e.getMessage());
        }

        return mapToResponse(review);
    }

    @Transactional
    public ReviewResponse updateReview(UUID reviewId, ReviewRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PerformanceReview review = reviewRepository.findByIdAndTenantId(reviewId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(REVIEW_NOT_FOUND));

        // IDOR fix: validate incoming foreign-key IDs belong to the current tenant.
        if (request.getEmployeeId() != null) {
            employeeRepository.findByIdAndTenantId(request.getEmployeeId(), tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
            review.setEmployeeId(request.getEmployeeId());
        }
        if (request.getReviewerId() != null) {
            employeeRepository.findByIdAndTenantId(request.getReviewerId(), tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Reviewer not found"));
            review.setReviewerId(request.getReviewerId());
        }
        if (request.getReviewCycleId() != null) {
            reviewCycleRepository.findByIdAndTenantId(request.getReviewCycleId(), tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Review cycle not found"));
            review.setReviewCycleId(request.getReviewCycleId());
        }
        if (request.getReviewType() != null)
            review.setReviewType(request.getReviewType());
        if (request.getReviewPeriodStart() != null)
            review.setReviewPeriodStart(request.getReviewPeriodStart());
        if (request.getReviewPeriodEnd() != null)
            review.setReviewPeriodEnd(request.getReviewPeriodEnd());
        if (request.getStatus() != null)
            review.setStatus(request.getStatus());
        if (request.getOverallRating() != null)
            review.setOverallRating(request.getOverallRating());
        if (request.getStrengths() != null)
            review.setStrengths(request.getStrengths());
        if (request.getAreasForImprovement() != null)
            review.setAreasForImprovement(request.getAreasForImprovement());
        if (request.getAchievements() != null)
            review.setAchievements(request.getAchievements());
        if (request.getGoalsForNextPeriod() != null)
            review.setGoalsForNextPeriod(request.getGoalsForNextPeriod());
        if (request.getManagerComments() != null)
            review.setManagerComments(request.getManagerComments());
        if (request.getEmployeeComments() != null)
            review.setEmployeeComments(request.getEmployeeComments());

        review = reviewRepository.save(review);

        return mapToResponse(review);
    }

    @Transactional(readOnly = true)
    public ReviewResponse getReviewById(UUID reviewId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PerformanceReview review = reviewRepository.findByIdAndTenantId(reviewId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(REVIEW_NOT_FOUND));
        assertCanViewReview(review);

        return mapToResponse(review);
    }

    /**
     * M-4: Same-tenant IDOR guard. The REVIEW:VIEW gate is held by every employee, and
     * tenant isolation does not enforce per-record ownership. A review (ratings, manager
     * comments, competency scores) may be read only by the review subject employee, the
     * assigned reviewer, or a caller holding the elevated REVIEW:APPROVE permission
     * (managers/HR who run the review cycle).
     */
    private void assertCanViewReview(PerformanceReview review) {
        if (SecurityContext.hasPermission(Permission.REVIEW_APPROVE)) {
            return;
        }
        UUID callerId = SecurityContext.getCurrentEmployeeId();
        if (callerId != null
                && (callerId.equals(review.getEmployeeId()) || callerId.equals(review.getReviewerId()))) {
            return;
        }
        log.warn("SECURITY: IDOR attempt — employee {} tried to access review {} (subject={}, reviewer={})",
                callerId, review.getId(), review.getEmployeeId(), review.getReviewerId());
        throw new AccessDeniedException("Access denied");
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getAllReviews(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Page<PerformanceReview> reviews = reviewRepository.findAllByTenantId(tenantId, pageable);
        return mapReviewPage(reviews);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getEmployeeReviews(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<PerformanceReview> reviews = reviewRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId);
        return mapReviewList(reviews);
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getEmployeeReviewsPaged(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return mapReviewPage(reviewRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId, pageable));
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getPendingReviews(UUID reviewerId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<PerformanceReview> reviews = reviewRepository.findPendingReviews(tenantId, reviewerId);
        return mapReviewList(reviews);
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getPendingReviewsPaged(UUID reviewerId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return mapReviewPage(reviewRepository.findPendingReviews(tenantId, reviewerId, pageable));
    }

    @Transactional
    public ReviewResponse submitReview(UUID reviewId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        PerformanceReview review = reviewRepository.findByIdAndTenantId(reviewId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(REVIEW_NOT_FOUND));

        review.setStatus(PerformanceReview.ReviewStatus.SUBMITTED);
        review.setSubmittedAt(tenantTimeService.now(tenantId));

        review = reviewRepository.save(review);

        try {
            auditLogService.logAction("PERFORMANCE_REVIEW", review.getId(), AuditAction.STATUS_CHANGE, null, null, "Performance review submitted");
        } catch (Exception e) {
            log.warn("Audit log failed for review submit: {}", e.getMessage());
        }

        return mapToResponse(review);
    }

    @Transactional
    public ReviewResponse completeReview(UUID reviewId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        PerformanceReview review = reviewRepository.findByIdAndTenantId(reviewId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(REVIEW_NOT_FOUND));

        review.setStatus(PerformanceReview.ReviewStatus.COMPLETED);
        review.setCompletedAt(tenantTimeService.now(tenantId));

        review = reviewRepository.save(review);

        // Resolve reviewer name for the event payload
        String reviewerName = null;
        if (review.getReviewerId() != null) {
            reviewerName = employeeRepository.findById(review.getReviewerId())
                    .map(emp -> emp.getFullName())
                    .orElse(null);
        }

        // Publish domain event — deferred to AFTER_COMMIT by DomainEventPublisher
        domainEventPublisher.publish(PerformanceReviewCompletedEvent.of(
                this,
                tenantId,
                review.getEmployeeId(),
                review.getId(),
                review.getReviewCycleId(),
                review.getOverallRating(),
                reviewerName,
                review.getCompletedAt()
        ));

        try {
            auditLogService.logAction("PERFORMANCE_REVIEW", review.getId(), AuditAction.STATUS_CHANGE, null, null, "Performance review completed with rating " + review.getOverallRating());
        } catch (Exception e) {
            log.warn("Audit log failed for review complete: {}", e.getMessage());
        }

        log.info("Performance review {} completed for employee {} with rating {}",
                reviewId, review.getEmployeeId(), review.getOverallRating());

        return mapToResponse(review);
    }

    @Transactional
    public CompetencyResponse addCompetency(CompetencyRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Verify review exists
        reviewRepository.findByIdAndTenantId(request.getReviewId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException(REVIEW_NOT_FOUND));

        ReviewCompetency competency = ReviewCompetency.builder()
                .reviewId(request.getReviewId())
                .competencyName(request.getCompetencyName())
                .category(request.getCategory())
                .rating(request.getRating())
                .comments(request.getComments())
                .build();

        competency.setTenantId(tenantId);
        competency = competencyRepository.save(competency);

        return mapCompetencyToResponse(competency);
    }

    @Transactional(readOnly = true)
    public List<CompetencyResponse> getCompetencies(UUID reviewId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<ReviewCompetency> competencies = competencyRepository.findAllByTenantIdAndReviewId(tenantId, reviewId);
        return competencies.stream()
                .map(this::mapCompetencyToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteReview(UUID reviewId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PerformanceReview review = reviewRepository.findByIdAndTenantId(reviewId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(REVIEW_NOT_FOUND));

        if (review.getStatus() != PerformanceReview.ReviewStatus.DRAFT) {
            throw new IllegalStateException(
                    "Only reviews in DRAFT status can be deleted. Current status: " + review.getStatus());
        }

        // Delete associated competencies first
        competencyRepository.deleteAllByReviewId(reviewId);
        reviewRepository.delete(review);
        log.info("Deleted review {} for tenant {}", reviewId, tenantId);
    }

    @Transactional
    public void deleteCompetency(UUID competencyId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ReviewCompetency competency = competencyRepository.findByIdAndTenantId(competencyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Competency not found"));

        competencyRepository.delete(competency);
        log.info("Deleted competency {} for tenant {}", competencyId, tenantId);
    }

    /**
     * P1: Batch-maps a page of reviews. Employee/reviewer names and review-cycle
     * names are resolved once via two bulk findAllById queries instead of three
     * findById calls per review row.
     */
    private Page<ReviewResponse> mapReviewPage(Page<PerformanceReview> reviews) {
        ReviewNameCaches caches = buildReviewCaches(reviews.getContent());
        return reviews.map(review -> mapToResponse(review, caches));
    }

    private List<ReviewResponse> mapReviewList(List<PerformanceReview> reviews) {
        ReviewNameCaches caches = buildReviewCaches(reviews);
        return reviews.stream()
                .map(review -> mapToResponse(review, caches))
                .collect(Collectors.toList());
    }

    /**
     * Collects employee (subject + reviewer) and review-cycle ids across the
     * batch and resolves their display names in two bulk queries.
     */
    private ReviewNameCaches buildReviewCaches(List<PerformanceReview> reviews) {
        Set<UUID> employeeIds = new HashSet<>();
        Set<UUID> cycleIds = new HashSet<>();
        for (PerformanceReview review : reviews) {
            if (review.getEmployeeId() != null) employeeIds.add(review.getEmployeeId());
            if (review.getReviewerId() != null) employeeIds.add(review.getReviewerId());
            if (review.getReviewCycleId() != null) cycleIds.add(review.getReviewCycleId());
        }

        Map<UUID, String> employeeNames = new HashMap<>();
        if (!employeeIds.isEmpty()) {
            employeeRepository.findAllById(employeeIds)
                    .forEach(e -> employeeNames.put(e.getId(), e.getFullName()));
        }
        Map<UUID, String> cycleNames = new HashMap<>();
        if (!cycleIds.isEmpty()) {
            reviewCycleRepository.findAllById(cycleIds)
                    .forEach(c -> cycleNames.put(c.getId(), c.getCycleName()));
        }
        return new ReviewNameCaches(employeeNames, cycleNames);
    }

    private ReviewResponse mapToResponse(PerformanceReview review) {
        return mapToResponse(review, buildReviewCaches(List.of(review)));
    }

    private ReviewResponse mapToResponse(PerformanceReview review, ReviewNameCaches caches) {
        ReviewResponse response = ReviewResponse.builder()
                .id(review.getId())
                .employeeId(review.getEmployeeId())
                .reviewerId(review.getReviewerId())
                .reviewCycleId(review.getReviewCycleId())
                .reviewType(review.getReviewType())
                .reviewPeriodStart(review.getReviewPeriodStart())
                .reviewPeriodEnd(review.getReviewPeriodEnd())
                .status(review.getStatus())
                .overallRating(review.getOverallRating())
                .strengths(review.getStrengths())
                .areasForImprovement(review.getAreasForImprovement())
                .achievements(review.getAchievements())
                .goalsForNextPeriod(review.getGoalsForNextPeriod())
                .managerComments(review.getManagerComments())
                .employeeComments(review.getEmployeeComments())
                .submittedAt(review.getSubmittedAt())
                .completedAt(review.getCompletedAt())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();

        if (review.getEmployeeId() != null) {
            response.setEmployeeName(caches.employeeNames().get(review.getEmployeeId()));
        }
        if (review.getReviewerId() != null) {
            response.setReviewerName(caches.employeeNames().get(review.getReviewerId()));
        }
        if (review.getReviewCycleId() != null) {
            response.setReviewCycleName(caches.cycleNames().get(review.getReviewCycleId()));
        }

        return response;
    }

    /** Pre-resolved display-name caches shared across a batch of review mappings. */
    private record ReviewNameCaches(Map<UUID, String> employeeNames, Map<UUID, String> cycleNames) {
    }

    private CompetencyResponse mapCompetencyToResponse(ReviewCompetency competency) {
        return CompetencyResponse.builder()
                .id(competency.getId())
                .reviewId(competency.getReviewId())
                .competencyName(competency.getCompetencyName())
                .category(competency.getCategory())
                .rating(competency.getRating())
                .comments(competency.getComments())
                .createdAt(competency.getCreatedAt())
                .updatedAt(competency.getUpdatedAt())
                .build();
    }
}
