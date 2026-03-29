package com.hrms.application.performance.service;

import com.hrms.application.performance.dto.CompetencyRequest;
import com.hrms.application.performance.dto.CompetencyResponse;
import com.hrms.application.performance.dto.ReviewRequest;
import com.hrms.application.performance.dto.ReviewResponse;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.performance.PerformanceReview;
import com.hrms.domain.performance.ReviewCompetency;

import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.performance.repository.PerformanceReviewRepository;
import com.hrms.infrastructure.performance.repository.ReviewCompetencyRepository;
import com.hrms.infrastructure.performance.repository.ReviewCycleRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class PerformanceReviewService {

    private final PerformanceReviewRepository reviewRepository;
    private final ReviewCompetencyRepository competencyRepository;
    private final EmployeeRepository employeeRepository;
    private final ReviewCycleRepository reviewCycleRepository;

    public PerformanceReviewService(PerformanceReviewRepository reviewRepository,
                                    ReviewCompetencyRepository competencyRepository,
                                    EmployeeRepository employeeRepository,
                                    ReviewCycleRepository reviewCycleRepository) {
        this.reviewRepository = reviewRepository;
        this.competencyRepository = competencyRepository;
        this.employeeRepository = employeeRepository;
        this.reviewCycleRepository = reviewCycleRepository;
    }

    @Transactional
    public ReviewResponse createReview(ReviewRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

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

        return mapToResponse(review);
    }

    @Transactional
    public ReviewResponse updateReview(UUID reviewId, ReviewRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PerformanceReview review = reviewRepository.findByIdAndTenantId(reviewId, tenantId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        if (request.getEmployeeId() != null)
            review.setEmployeeId(request.getEmployeeId());
        if (request.getReviewerId() != null)
            review.setReviewerId(request.getReviewerId());
        if (request.getReviewCycleId() != null)
            review.setReviewCycleId(request.getReviewCycleId());
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
                .orElseThrow(() -> new RuntimeException("Review not found"));

        return mapToResponse(review);
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getAllReviews(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Page<PerformanceReview> reviews = reviewRepository.findAllByTenantId(tenantId, pageable);
        return reviews.map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getEmployeeReviews(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<PerformanceReview> reviews = reviewRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId);
        return reviews.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getEmployeeReviewsPaged(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return reviewRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getPendingReviews(UUID reviewerId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<PerformanceReview> reviews = reviewRepository.findPendingReviews(tenantId, reviewerId);
        return reviews.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getPendingReviewsPaged(UUID reviewerId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return reviewRepository.findPendingReviews(tenantId, reviewerId, pageable)
                .map(this::mapToResponse);
    }

    @Transactional
    public ReviewResponse submitReview(UUID reviewId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PerformanceReview review = reviewRepository.findByIdAndTenantId(reviewId, tenantId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        review.setStatus(PerformanceReview.ReviewStatus.SUBMITTED);
        review.setSubmittedAt(LocalDateTime.now());

        review = reviewRepository.save(review);

        return mapToResponse(review);
    }

    @Transactional
    public ReviewResponse completeReview(UUID reviewId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PerformanceReview review = reviewRepository.findByIdAndTenantId(reviewId, tenantId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        review.setStatus(PerformanceReview.ReviewStatus.COMPLETED);
        review.setCompletedAt(LocalDateTime.now());

        review = reviewRepository.save(review);

        return mapToResponse(review);
    }

    @Transactional
    public CompetencyResponse addCompetency(CompetencyRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Verify review exists
        reviewRepository.findByIdAndTenantId(request.getReviewId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

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
                .orElseThrow(() -> new RuntimeException("Review not found"));

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
                .orElseThrow(() -> new RuntimeException("Competency not found"));

        competencyRepository.delete(competency);
        log.info("Deleted competency {} for tenant {}", competencyId, tenantId);
    }

    private ReviewResponse mapToResponse(PerformanceReview review) {
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

        // Enrich with employee name
        if (review.getEmployeeId() != null) {
            employeeRepository.findById(review.getEmployeeId())
                    .ifPresent(employee -> response.setEmployeeName(employee.getFullName()));
        }

        // Enrich with reviewer name
        if (review.getReviewerId() != null) {
            employeeRepository.findById(review.getReviewerId())
                    .ifPresent(reviewer -> response.setReviewerName(reviewer.getFullName()));
        }

        // Enrich with review cycle name
        if (review.getReviewCycleId() != null) {
            reviewCycleRepository.findById(review.getReviewCycleId())
                    .ifPresent(cycle -> response.setReviewCycleName(cycle.getCycleName()));
        }

        return response;
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
