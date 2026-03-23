package com.hrms.application.performance.service;

import com.hrms.application.performance.dto.ActivateCycleRequest;
import com.hrms.application.performance.dto.CalibrationRatingRequest;
import com.hrms.application.performance.dto.CalibrationResponse;
import com.hrms.application.performance.dto.ManagerReviewRequest;
import com.hrms.application.performance.dto.ReviewCycleRequest;
import com.hrms.application.performance.dto.ReviewCycleResponse;
import com.hrms.application.performance.dto.SelfAssessmentRequest;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.performance.PerformanceReview;
import com.hrms.domain.performance.ReviewCycle;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.performance.repository.PerformanceReviewRepository;
import com.hrms.infrastructure.performance.repository.ReviewCycleRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ReviewCycleService {

    @Autowired
    private ReviewCycleRepository reviewCycleRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private PerformanceReviewRepository performanceReviewRepository;

    @Transactional
    public ReviewCycleResponse createCycle(ReviewCycleRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ReviewCycle cycle = ReviewCycle.builder()
                .cycleName(request.getCycleName())
                .cycleType(request.getCycleType())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .selfReviewDeadline(request.getSelfReviewDeadline())
                .managerReviewDeadline(request.getManagerReviewDeadline())
                .status(request.getStatus() != null ? request.getStatus() : ReviewCycle.CycleStatus.PLANNING)
                .description(request.getDescription())
                .build();

        cycle.setTenantId(tenantId);
        cycle = reviewCycleRepository.save(cycle);

        return mapToResponse(cycle);
    }

    @Transactional
    public ReviewCycleResponse updateCycle(UUID cycleId, ReviewCycleRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ReviewCycle cycle = reviewCycleRepository.findByIdAndTenantId(cycleId, tenantId)
                .orElseThrow(() -> new RuntimeException("Review cycle not found"));

        if (request.getCycleName() != null) cycle.setCycleName(request.getCycleName());
        if (request.getCycleType() != null) cycle.setCycleType(request.getCycleType());
        if (request.getStartDate() != null) cycle.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) cycle.setEndDate(request.getEndDate());
        if (request.getSelfReviewDeadline() != null) cycle.setSelfReviewDeadline(request.getSelfReviewDeadline());
        if (request.getManagerReviewDeadline() != null) cycle.setManagerReviewDeadline(request.getManagerReviewDeadline());
        if (request.getStatus() != null) cycle.setStatus(request.getStatus());
        if (request.getDescription() != null) cycle.setDescription(request.getDescription());

        cycle = reviewCycleRepository.save(cycle);

        return mapToResponse(cycle);
    }

    @Transactional(readOnly = true)
    public ReviewCycleResponse getCycleById(UUID cycleId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ReviewCycle cycle = reviewCycleRepository.findByIdAndTenantId(cycleId, tenantId)
                .orElseThrow(() -> new RuntimeException("Review cycle not found"));

        return mapToResponse(cycle);
    }

    @Transactional(readOnly = true)
    public Page<ReviewCycleResponse> getAllCycles(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Page<ReviewCycle> cycles = reviewCycleRepository.findAllByTenantId(tenantId, pageable);
        return cycles.map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<ReviewCycleResponse> getActiveCycles() {
        UUID tenantId = TenantContext.getCurrentTenant();

        LocalDate today = LocalDate.now();
        List<ReviewCycle> cycles = reviewCycleRepository.findActiveCycles(tenantId, today);
        return cycles.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ReviewCycleResponse completeCycle(UUID cycleId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ReviewCycle cycle = reviewCycleRepository.findByIdAndTenantId(cycleId, tenantId)
                .orElseThrow(() -> new RuntimeException("Review cycle not found"));

        cycle.setStatus(ReviewCycle.CycleStatus.COMPLETED);

        cycle = reviewCycleRepository.save(cycle);

        return mapToResponse(cycle);
    }

    /**
     * Activate a review cycle and create self/manager reviews for employees in scope.
     * This is the key method for HR to launch performance reviews for their organization.
     */
    @Transactional
    public ReviewCycleResponse activateCycle(UUID cycleId, ActivateCycleRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ReviewCycle cycle = reviewCycleRepository.findByIdAndTenantId(cycleId, tenantId)
                .orElseThrow(() -> new RuntimeException("Review cycle not found"));

        if (cycle.getStatus() != ReviewCycle.CycleStatus.PLANNING) {
            throw new IllegalStateException("Only cycles in PLANNING status can be activated. Current status: " + cycle.getStatus());
        }

        // Get employees in scope
        List<Employee> employeesInScope = getEmployeesInScope(tenantId, request);
        log.info("Activating cycle {} for {} employees", cycleId, employeesInScope.size());

        // Create reviews for each employee
        List<PerformanceReview> createdReviews = new ArrayList<>();

        for (Employee employee : employeesInScope) {
            // Create self-review if requested
            if (Boolean.TRUE.equals(request.getCreateSelfReviews())) {
                PerformanceReview selfReview = createReviewForEmployee(
                        employee, cycle, PerformanceReview.ReviewType.SELF, employee.getId(), tenantId);
                createdReviews.add(selfReview);
            }

            // Create manager-review if requested and employee has a manager
            if (Boolean.TRUE.equals(request.getCreateManagerReviews()) && employee.getManagerId() != null) {
                PerformanceReview managerReview = createReviewForEmployee(
                        employee, cycle, PerformanceReview.ReviewType.MANAGER, employee.getManagerId(), tenantId);
                createdReviews.add(managerReview);
            }
        }

        // Save all reviews
        performanceReviewRepository.saveAll(createdReviews);
        log.info("Created {} reviews for cycle {}", createdReviews.size(), cycleId);

        // Update cycle status to ACTIVE
        cycle.setStatus(ReviewCycle.CycleStatus.ACTIVE);
        cycle = reviewCycleRepository.save(cycle);

        ReviewCycleResponse response = mapToResponse(cycle);
        response.setEmployeesInScope(employeesInScope.size());
        response.setReviewsCreated(createdReviews.size());

        return response;
    }

    /**
     * Get employees based on the activation scope.
     */
    private List<Employee> getEmployeesInScope(UUID tenantId, ActivateCycleRequest request) {
        List<Employee> employees;

        if (request.getScopeType() == null || request.getScopeType() == ActivateCycleRequest.ScopeType.ALL) {
            // Get all active employees in tenant
            employees = employeeRepository.findByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE);
        } else if (request.getScopeType() == ActivateCycleRequest.ScopeType.DEPARTMENT
                   && request.getDepartmentIds() != null && !request.getDepartmentIds().isEmpty()) {
            // Get employees by department
            employees = employeeRepository.findByTenantIdAndDepartmentIdIn(tenantId, request.getDepartmentIds());
        } else if (request.getScopeType() == ActivateCycleRequest.ScopeType.LOCATION
                   && request.getLocationIds() != null && !request.getLocationIds().isEmpty()) {
            // Get employees by location
            employees = employeeRepository.findByTenantIdAndOfficeLocationIdIn(tenantId, request.getLocationIds());
        } else {
            employees = employeeRepository.findByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE);
        }

        // Filter to only active employees
        return employees.stream()
                .filter(e -> e.getStatus() == Employee.EmployeeStatus.ACTIVE)
                .collect(Collectors.toList());
    }

    /**
     * Create a performance review for an employee.
     */
    private PerformanceReview createReviewForEmployee(Employee employee, ReviewCycle cycle,
                                                       PerformanceReview.ReviewType reviewType,
                                                       UUID reviewerId, UUID tenantId) {
        PerformanceReview review = PerformanceReview.builder()
                .employeeId(employee.getId())
                .reviewerId(reviewerId)
                .reviewCycleId(cycle.getId())
                .reviewType(reviewType)
                .reviewPeriodStart(cycle.getStartDate())
                .reviewPeriodEnd(cycle.getEndDate())
                .status(PerformanceReview.ReviewStatus.DRAFT)
                .build();
        review.setTenantId(tenantId);
        return review;
    }

    /**
     * Advance the cycle to its next stage.
     * PLANNING/DRAFT → SELF_ASSESSMENT → MANAGER_REVIEW → CALIBRATION → RATINGS_PUBLISHED → COMPLETED
     */
    @Transactional
    public ReviewCycleResponse advanceStage(UUID cycleId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ReviewCycle cycle = reviewCycleRepository.findByIdAndTenantId(cycleId, tenantId)
                .orElseThrow(() -> new RuntimeException("Review cycle not found"));

        ReviewCycle.CycleStatus next = switch (cycle.getStatus()) {
            case PLANNING, DRAFT -> ReviewCycle.CycleStatus.SELF_ASSESSMENT;
            case ACTIVE, SELF_ASSESSMENT -> ReviewCycle.CycleStatus.MANAGER_REVIEW;
            case MANAGER_REVIEW -> ReviewCycle.CycleStatus.CALIBRATION;
            case CALIBRATION -> ReviewCycle.CycleStatus.RATINGS_PUBLISHED;
            case RATINGS_PUBLISHED -> ReviewCycle.CycleStatus.COMPLETED;
            default -> throw new IllegalStateException("Cannot advance from status: " + cycle.getStatus());
        };

        log.info("Advancing cycle {} from {} to {}", cycleId, cycle.getStatus(), next);
        cycle.setStatus(next);
        cycle = reviewCycleRepository.save(cycle);
        return mapToResponse(cycle);
    }

    /**
     * Submit employee self-assessment for a review.
     */
    @Transactional
    public void submitSelfAssessment(UUID reviewId, SelfAssessmentRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PerformanceReview review = performanceReviewRepository.findByIdAndTenantId(reviewId, tenantId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        if (request.getCompetencyRatings() != null && !request.getCompetencyRatings().isEmpty()) {
            int avg = (int) Math.round(request.getCompetencyRatings().stream()
                    .mapToInt(SelfAssessmentRequest.CompetencyRatingItem::getRating)
                    .average()
                    .orElse(0));
            review.setSelfRating(avg);
        }

        review.setOverallComments(request.getOverallComments());
        review.setGoalAchievementPercent(request.getGoalAchievementPercent());
        review.setStatus(PerformanceReview.ReviewStatus.SUBMITTED);
        review.setSubmittedAt(LocalDateTime.now());

        performanceReviewRepository.save(review);
    }

    /**
     * Submit manager review ratings for a review.
     */
    @Transactional
    public void submitManagerReview(UUID reviewId, ManagerReviewRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PerformanceReview review = performanceReviewRepository.findByIdAndTenantId(reviewId, tenantId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        review.setManagerRating(request.getOverallRating());
        review.setIncrementRecommendation(request.getIncrementRecommendation());
        review.setPromotionRecommended(request.getPromotionRecommended());
        review.setManagerComments(request.getComments());
        review.setStatus(PerformanceReview.ReviewStatus.IN_REVIEW);

        performanceReviewRepository.save(review);
    }

    /**
     * HR sets the final calibrated rating for a review.
     */
    @Transactional
    public void updateCalibrationRating(UUID reviewId, Integer finalRating) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PerformanceReview review = performanceReviewRepository.findByIdAndTenantId(reviewId, tenantId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        if (finalRating < 1 || finalRating > 5) {
            throw new IllegalArgumentException("Final rating must be between 1 and 5");
        }

        review.setFinalRating(finalRating);
        performanceReviewRepository.save(review);
    }

    /**
     * Get calibration data for a cycle — all reviews with self/manager/final ratings.
     */
    @Transactional(readOnly = true)
    public CalibrationResponse getCalibration(UUID cycleId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ReviewCycle cycle = reviewCycleRepository.findByIdAndTenantId(cycleId, tenantId)
                .orElseThrow(() -> new RuntimeException("Review cycle not found"));

        List<PerformanceReview> reviews = performanceReviewRepository
                .findByTenantIdAndReviewCycleId(tenantId, cycleId)
                .stream()
                .filter(r -> r.getReviewType() == PerformanceReview.ReviewType.SELF
                          || r.getReviewType() == PerformanceReview.ReviewType.MANAGER)
                .collect(Collectors.toList());

        boolean editable = cycle.getStatus() == ReviewCycle.CycleStatus.CALIBRATION;

        Map<Integer, Long> distribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            final int rating = i;
            distribution.put(rating, reviews.stream()
                    .filter(r -> r.getFinalRating() != null && r.getFinalRating() == rating)
                    .count());
        }

        List<CalibrationResponse.CalibrationEmployee> employees = reviews.stream()
                .collect(Collectors.toMap(
                        PerformanceReview::getEmployeeId,
                        r -> r,
                        (existing, replacement) -> existing // keep first (prefer SELF type)
                ))
                .values()
                .stream()
                .map(r -> {
                    String empName = employeeRepository.findById(r.getEmployeeId())
                            .map(Employee::getFullName)
                            .orElse("Unknown");
                    return CalibrationResponse.CalibrationEmployee.builder()
                            .employeeId(r.getEmployeeId())
                            .reviewId(r.getId())
                            .employeeName(empName)
                            .selfRating(r.getSelfRating())
                            .managerRating(r.getManagerRating())
                            .finalRating(r.getFinalRating())
                            .editable(editable)
                            .build();
                })
                .collect(Collectors.toList());

        return CalibrationResponse.builder()
                .cycleId(cycleId)
                .cycleName(cycle.getCycleName())
                .totalEmployees(employees.size())
                .distribution(distribution)
                .employees(employees)
                .build();
    }

    @Transactional
    public void deleteCycle(UUID cycleId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ReviewCycle cycle = reviewCycleRepository.findByIdAndTenantId(cycleId, tenantId)
                .orElseThrow(() -> new RuntimeException("Review cycle not found"));

        if (cycle.getStatus() != ReviewCycle.CycleStatus.PLANNING
                && cycle.getStatus() != ReviewCycle.CycleStatus.DRAFT) {
            throw new IllegalStateException(
                    "Only cycles in PLANNING or DRAFT status can be deleted. Current status: " + cycle.getStatus());
        }

        // Delete any reviews associated with this cycle
        List<PerformanceReview> reviews = performanceReviewRepository
                .findByTenantIdAndReviewCycleId(tenantId, cycleId);
        if (!reviews.isEmpty()) {
            performanceReviewRepository.deleteAll(reviews);
        }

        reviewCycleRepository.delete(cycle);
        log.info("Deleted review cycle {} for tenant {}", cycleId, tenantId);
    }

    private ReviewCycleResponse mapToResponse(ReviewCycle cycle) {
        return ReviewCycleResponse.builder()
                .id(cycle.getId())
                .cycleName(cycle.getCycleName())
                .cycleType(cycle.getCycleType())
                .startDate(cycle.getStartDate())
                .endDate(cycle.getEndDate())
                .selfReviewDeadline(cycle.getSelfReviewDeadline())
                .managerReviewDeadline(cycle.getManagerReviewDeadline())
                .status(cycle.getStatus())
                .description(cycle.getDescription())
                .createdAt(cycle.getCreatedAt())
                .updatedAt(cycle.getUpdatedAt())
                .build();
    }
}
