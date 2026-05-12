package com.hrms.api.performance;

import com.hrms.application.performance.dto.CompetencyRequest;
import com.hrms.application.performance.dto.CompetencyResponse;
import com.hrms.application.performance.dto.ReviewRequest;
import com.hrms.application.performance.dto.ReviewResponse;
import com.hrms.application.performance.service.PerformanceReviewService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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
@Tag(name = "Performance Reviews", description = "Performance review cycle management, competency assessment, and submission workflow")
public class PerformanceReviewController {

    /**
     * Allow-list of sortable fields for {@code PerformanceReview} entity — prevents sort injection.
     */
    private static final java.util.Set<String> ALLOWED_SORT_FIELDS = java.util.Set.of(
            "createdAt", "updatedAt", "status", "reviewType", "reviewPeriodStart", "reviewPeriodEnd",
            "overallRating", "finalRating"
    );

    private final PerformanceReviewService reviewService;

    public PerformanceReviewController(PerformanceReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping
    @RequiresPermission(Permission.REVIEW_CREATE)
    @Operation(summary = "Create performance review",
            description = "Creates a new performance review for an employee within a review cycle")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Review created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires REVIEW:CREATE permission")
    })
    public ResponseEntity<ReviewResponse> createReview(@Valid @RequestBody ReviewRequest request) {
        ReviewResponse response = reviewService.createReview(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @RequiresPermission(Permission.REVIEW_VIEW)
    @Operation(summary = "List all performance reviews",
            description = "Returns a paginated list of reviews; sortable by allow-listed fields (status, ratings, period dates)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Reviews retrieved successfully"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires REVIEW:VIEW permission")
    })
    public ResponseEntity<Page<ReviewResponse>> getAllReviews(
            @Parameter(description = "Page number (0-indexed)", example = "0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size", example = "20") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field (allow-listed)", example = "createdAt") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction (ASC/DESC)", example = "DESC") @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        String safeSortBy = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "createdAt";
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, safeSortBy));
        Page<ReviewResponse> reviews = reviewService.getAllReviews(pageable);
        return ResponseEntity.ok(reviews);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    @Operation(summary = "Get performance review by ID", description = "Returns a single review by its UUID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Review found"),
            @ApiResponse(responseCode = "404", description = "Review not found")
    })
    public ResponseEntity<ReviewResponse> getReviewById(
            @Parameter(description = "Review UUID", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6") @PathVariable UUID id) {
        ReviewResponse response = reviewService.getReviewById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    @Operation(summary = "List reviews for an employee", description = "Returns all reviews associated with the given employee (unpaginated)")
    @ApiResponse(responseCode = "200", description = "Reviews retrieved successfully")
    public ResponseEntity<List<ReviewResponse>> getEmployeeReviews(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId) {
        List<ReviewResponse> reviews = reviewService.getEmployeeReviews(employeeId);
        return ResponseEntity.ok(reviews);
    }

    /**
     * Paginated variant — prefer this for large employee review histories.
     */
    @GetMapping("/employee/{employeeId}/paged")
    @RequiresPermission(Permission.REVIEW_VIEW)
    @Operation(summary = "List reviews for an employee (paged)",
            description = "Paginated variant — prefer this for large employee review histories")
    @ApiResponse(responseCode = "200", description = "Reviews retrieved successfully")
    public ResponseEntity<Page<ReviewResponse>> getEmployeeReviewsPaged(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId,
            Pageable pageable) {
        Page<ReviewResponse> reviews = reviewService.getEmployeeReviewsPaged(employeeId, pageable);
        return ResponseEntity.ok(reviews);
    }

    @GetMapping("/pending/{reviewerId}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    @Operation(summary = "List reviews pending for a reviewer",
            description = "Returns reviews still awaiting submission from the specified reviewer")
    @ApiResponse(responseCode = "200", description = "Pending reviews retrieved successfully")
    public ResponseEntity<List<ReviewResponse>> getPendingReviews(
            @Parameter(description = "Reviewer UUID") @PathVariable UUID reviewerId) {
        List<ReviewResponse> reviews = reviewService.getPendingReviews(reviewerId);
        return ResponseEntity.ok(reviews);
    }

    /**
     * Paginated variant — prefer this when a reviewer has a large queue.
     */
    @GetMapping("/pending/{reviewerId}/paged")
    @RequiresPermission(Permission.REVIEW_VIEW)
    @Operation(summary = "List reviews pending for a reviewer (paged)",
            description = "Paginated variant — prefer this when a reviewer has a large queue")
    @ApiResponse(responseCode = "200", description = "Pending reviews retrieved successfully")
    public ResponseEntity<Page<ReviewResponse>> getPendingReviewsPaged(
            @Parameter(description = "Reviewer UUID") @PathVariable UUID reviewerId,
            Pageable pageable) {
        Page<ReviewResponse> reviews = reviewService.getPendingReviewsPaged(reviewerId, pageable);
        return ResponseEntity.ok(reviews);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.REVIEW_UPDATE)
    @Operation(summary = "Update performance review",
            description = "Mutates a review while it is still in an editable status (DRAFT/IN_PROGRESS)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Review updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "404", description = "Review not found"),
            @ApiResponse(responseCode = "409", description = "Review is no longer editable in current status")
    })
    public ResponseEntity<ReviewResponse> updateReview(
            @Parameter(description = "Review UUID") @PathVariable UUID id,
            @Valid @RequestBody ReviewRequest request
    ) {
        ReviewResponse response = reviewService.updateReview(id, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/submit")
    @RequiresPermission(Permission.REVIEW_SUBMIT)
    @Operation(summary = "Submit review for approval",
            description = "Transitions the review from IN_PROGRESS to SUBMITTED, locking edits")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Review submitted successfully"),
            @ApiResponse(responseCode = "404", description = "Review not found"),
            @ApiResponse(responseCode = "409", description = "Review is not in a submittable status")
    })
    public ResponseEntity<ReviewResponse> submitReview(
            @Parameter(description = "Review UUID") @PathVariable UUID id) {
        ReviewResponse response = reviewService.submitReview(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/complete")
    @RequiresPermission(Permission.REVIEW_APPROVE)
    @Operation(summary = "Complete (approve) review",
            description = "Final approval step — closes the review cycle for this employee")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Review completed successfully"),
            @ApiResponse(responseCode = "403", description = "Not authorized to approve"),
            @ApiResponse(responseCode = "404", description = "Review not found")
    })
    public ResponseEntity<ReviewResponse> completeReview(
            @Parameter(description = "Review UUID") @PathVariable UUID id) {
        ReviewResponse response = reviewService.completeReview(id);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.REVIEW_DELETE)
    @Operation(summary = "Delete review", description = "Soft-deletes a review record")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Review deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Review not found")
    })
    public ResponseEntity<Void> deleteReview(
            @Parameter(description = "Review UUID") @PathVariable UUID id) {
        reviewService.deleteReview(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/competencies/{id}")
    @RequiresPermission(Permission.REVIEW_DELETE)
    @Operation(summary = "Delete competency", description = "Removes a competency entry from a review")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Competency deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Competency not found")
    })
    public ResponseEntity<Void> deleteCompetency(
            @Parameter(description = "Competency UUID") @PathVariable UUID id) {
        reviewService.deleteCompetency(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/competencies")
    @RequiresPermission(Permission.REVIEW_CREATE)
    @Operation(summary = "Add competency to review",
            description = "Attaches a new competency assessment entry to a review")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Competency added successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "404", description = "Parent review not found")
    })
    public ResponseEntity<CompetencyResponse> addCompetency(@Valid @RequestBody CompetencyRequest request) {
        CompetencyResponse response = reviewService.addCompetency(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{reviewId}/competencies")
    @RequiresPermission(Permission.REVIEW_VIEW)
    @Operation(summary = "List competencies for a review",
            description = "Returns all competency assessments attached to the given review")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Competencies retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Review not found")
    })
    public ResponseEntity<List<CompetencyResponse>> getCompetencies(
            @Parameter(description = "Review UUID") @PathVariable UUID reviewId) {
        List<CompetencyResponse> competencies = reviewService.getCompetencies(reviewId);
        return ResponseEntity.ok(competencies);
    }
}
