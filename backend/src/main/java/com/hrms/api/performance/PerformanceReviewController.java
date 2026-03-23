package com.hrms.api.performance;

import com.hrms.application.performance.dto.CompetencyRequest;
import com.hrms.application.performance.dto.CompetencyResponse;
import com.hrms.application.performance.dto.ReviewRequest;
import com.hrms.application.performance.dto.ReviewResponse;
import com.hrms.application.performance.service.PerformanceReviewService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
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
@RequestMapping("/api/v1/reviews")
public class PerformanceReviewController {

    @Autowired
    private PerformanceReviewService reviewService;

    @PostMapping
    @RequiresPermission(Permission.REVIEW_CREATE)
    public ResponseEntity<ReviewResponse> createReview(@Valid @RequestBody ReviewRequest request) {
        ReviewResponse response = reviewService.createReview(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<Page<ReviewResponse>> getAllReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<ReviewResponse> reviews = reviewService.getAllReviews(pageable);
        return ResponseEntity.ok(reviews);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<ReviewResponse> getReviewById(@PathVariable UUID id) {
        ReviewResponse response = reviewService.getReviewById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<List<ReviewResponse>> getEmployeeReviews(@PathVariable UUID employeeId) {
        List<ReviewResponse> reviews = reviewService.getEmployeeReviews(employeeId);
        return ResponseEntity.ok(reviews);
    }

    /** Paginated variant — prefer this for large employee review histories. */
    @GetMapping("/employee/{employeeId}/paged")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<Page<ReviewResponse>> getEmployeeReviewsPaged(
            @PathVariable UUID employeeId,
            Pageable pageable) {
        Page<ReviewResponse> reviews = reviewService.getEmployeeReviewsPaged(employeeId, pageable);
        return ResponseEntity.ok(reviews);
    }

    @GetMapping("/pending/{reviewerId}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<List<ReviewResponse>> getPendingReviews(@PathVariable UUID reviewerId) {
        List<ReviewResponse> reviews = reviewService.getPendingReviews(reviewerId);
        return ResponseEntity.ok(reviews);
    }

    /** Paginated variant — prefer this when a reviewer has a large queue. */
    @GetMapping("/pending/{reviewerId}/paged")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<Page<ReviewResponse>> getPendingReviewsPaged(
            @PathVariable UUID reviewerId,
            Pageable pageable) {
        Page<ReviewResponse> reviews = reviewService.getPendingReviewsPaged(reviewerId, pageable);
        return ResponseEntity.ok(reviews);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.REVIEW_CREATE)
    public ResponseEntity<ReviewResponse> updateReview(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewRequest request
    ) {
        ReviewResponse response = reviewService.updateReview(id, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/submit")
    @RequiresPermission(Permission.REVIEW_SUBMIT)
    public ResponseEntity<ReviewResponse> submitReview(@PathVariable UUID id) {
        ReviewResponse response = reviewService.submitReview(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/complete")
    @RequiresPermission(Permission.REVIEW_APPROVE)
    public ResponseEntity<ReviewResponse> completeReview(@PathVariable UUID id) {
        ReviewResponse response = reviewService.completeReview(id);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.REVIEW_CREATE)
    public ResponseEntity<Void> deleteReview(@PathVariable UUID id) {
        reviewService.deleteReview(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/competencies/{id}")
    @RequiresPermission(Permission.REVIEW_CREATE)
    public ResponseEntity<Void> deleteCompetency(@PathVariable UUID id) {
        reviewService.deleteCompetency(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/competencies")
    @RequiresPermission(Permission.REVIEW_CREATE)
    public ResponseEntity<CompetencyResponse> addCompetency(@Valid @RequestBody CompetencyRequest request) {
        CompetencyResponse response = reviewService.addCompetency(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{reviewId}/competencies")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<List<CompetencyResponse>> getCompetencies(@PathVariable UUID reviewId) {
        List<CompetencyResponse> competencies = reviewService.getCompetencies(reviewId);
        return ResponseEntity.ok(competencies);
    }
}
