package com.hrms.application.performance.service;

import com.hrms.application.performance.dto.ActivateCycleRequest;
import com.hrms.application.performance.dto.ReviewCycleRequest;
import com.hrms.application.performance.dto.ReviewCycleResponse;
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
import java.util.ArrayList;
import java.util.List;
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
