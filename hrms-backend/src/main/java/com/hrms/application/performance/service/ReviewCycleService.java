package com.hrms.application.performance.service;

import com.hrms.application.performance.dto.ReviewCycleRequest;
import com.hrms.application.performance.dto.ReviewCycleResponse;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.performance.ReviewCycle;
import com.hrms.infrastructure.performance.repository.ReviewCycleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ReviewCycleService {

    @Autowired
    private ReviewCycleRepository reviewCycleRepository;

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
