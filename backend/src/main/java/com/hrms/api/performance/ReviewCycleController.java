package com.hrms.api.performance;

import com.hrms.application.performance.dto.ActivateCycleRequest;
import com.hrms.application.performance.dto.CalibrationResponse;
import com.hrms.application.performance.dto.ManagerReviewRequest;
import com.hrms.application.performance.dto.ReviewCycleRequest;
import com.hrms.application.performance.dto.ReviewCycleResponse;
import com.hrms.application.performance.dto.SelfAssessmentRequest;
import com.hrms.application.performance.service.ReviewCycleService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/review-cycles")
@Slf4j
public class ReviewCycleController {

    @Autowired
    private ReviewCycleService reviewCycleService;

    @PostMapping
    @RequiresPermission(Permission.REVIEW_CREATE)
    public ResponseEntity<ReviewCycleResponse> createCycle(@Valid @RequestBody ReviewCycleRequest request) {
        ReviewCycleResponse response = reviewCycleService.createCycle(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<Page<ReviewCycleResponse>> getAllCycles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<ReviewCycleResponse> cycles = reviewCycleService.getAllCycles(pageable);
        return ResponseEntity.ok(cycles);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<ReviewCycleResponse> getCycleById(@PathVariable UUID id) {
        ReviewCycleResponse response = reviewCycleService.getCycleById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/active")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<List<ReviewCycleResponse>> getActiveCycles() {
        List<ReviewCycleResponse> cycles = reviewCycleService.getActiveCycles();
        return ResponseEntity.ok(cycles);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.REVIEW_CREATE)
    public ResponseEntity<ReviewCycleResponse> updateCycle(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewCycleRequest request
    ) {
        ReviewCycleResponse response = reviewCycleService.updateCycle(id, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/complete")
    @RequiresPermission(Permission.REVIEW_CREATE)
    public ResponseEntity<ReviewCycleResponse> completeCycle(@PathVariable UUID id) {
        ReviewCycleResponse response = reviewCycleService.completeCycle(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/activate")
    @RequiresPermission(Permission.REVIEW_APPROVE)
    public ResponseEntity<ReviewCycleResponse> activateCycle(
            @PathVariable UUID id,
            @Valid @RequestBody ActivateCycleRequest request
    ) {
        log.info("Activating review cycle {} with scope {}", id, request.getScopeType());
        ReviewCycleResponse response = reviewCycleService.activateCycle(id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Advance a cycle to its next stage (PLANNING → SELF_ASSESSMENT → MANAGER_REVIEW → CALIBRATION → RATINGS_PUBLISHED → COMPLETED).
     */
    @PostMapping("/{id}/advance")
    @RequiresPermission(Permission.REVIEW_APPROVE)
    public ResponseEntity<ReviewCycleResponse> advanceStage(@PathVariable UUID id) {
        log.info("Advancing stage for review cycle {}", id);
        return ResponseEntity.ok(reviewCycleService.advanceStage(id));
    }

    /**
     * Get calibration data for a cycle (all self/manager/final ratings, distribution).
     */
    @GetMapping("/{id}/calibration")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<CalibrationResponse> getCalibration(@PathVariable UUID id) {
        return ResponseEntity.ok(reviewCycleService.getCalibration(id));
    }

    /**
     * Employee submits their self-assessment for a specific review.
     */
    @PutMapping("/reviews/{reviewId}/self-assessment")
    @RequiresPermission(Permission.REVIEW_SUBMIT)
    public ResponseEntity<Void> submitSelfAssessment(
            @PathVariable UUID reviewId,
            @Valid @RequestBody SelfAssessmentRequest request
    ) {
        reviewCycleService.submitSelfAssessment(reviewId, request);
        return ResponseEntity.ok().build();
    }

    /**
     * Manager submits their rating for a review.
     */
    @PutMapping("/reviews/{reviewId}/manager-review")
    @RequiresPermission(Permission.REVIEW_SUBMIT)
    public ResponseEntity<Void> submitManagerReview(
            @PathVariable UUID reviewId,
            @Valid @RequestBody ManagerReviewRequest request
    ) {
        reviewCycleService.submitManagerReview(reviewId, request);
        return ResponseEntity.ok().build();
    }

    /**
     * HR sets final calibrated rating for a review during CALIBRATION stage.
     */
    @PutMapping("/reviews/{reviewId}/calibration-rating")
    @RequiresPermission(Permission.REVIEW_APPROVE)
    public ResponseEntity<Void> updateCalibrationRating(
            @PathVariable UUID reviewId,
            @RequestParam Integer finalRating
    ) {
        reviewCycleService.updateCalibrationRating(reviewId, finalRating);
        return ResponseEntity.ok().build();
    }
}
