package com.nulogic.api.recruitment.controller;

import com.nulogic.application.recruitment.service.JobBoardIntegrationService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.domain.recruitment.JobBoardPosting;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/recruitment/job-boards")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Job Boards", description = "External job board posting and management APIs")
public class JobBoardController {

    private final JobBoardIntegrationService jobBoardService;

    /**
     * Post a job opening to one or more boards.
     */
    @PostMapping("/post")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    @Operation(summary = "Post job to boards", description = "Publishes a job opening to one or more external job boards")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Job posted successfully to the requested boards"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires RECRUITMENT:MANAGE permission"),
            @ApiResponse(responseCode = "404", description = "Job opening not found")
    })
    public ResponseEntity<List<JobBoardPosting>> postJob(@Valid @RequestBody PostJobRequest dto) {
        log.info("Posting job {} to boards: {}", dto.getJobOpeningId(), dto.getBoards());
        return ResponseEntity.ok(jobBoardService.postJob(dto.getJobOpeningId(), dto.getBoards()));
    }

    /**
     * Pause a posting on its board.
     */
    @PostMapping("/{postingId}/pause")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    @Operation(summary = "Pause posting", description = "Pauses an active posting on its external job board")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Posting paused successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires RECRUITMENT:MANAGE permission"),
            @ApiResponse(responseCode = "404", description = "Posting not found")
    })
    public ResponseEntity<JobBoardPosting> pausePosting(
            @Parameter(description = "Posting UUID") @PathVariable UUID postingId) {
        return ResponseEntity.ok(jobBoardService.pausePosting(postingId));
    }

    /**
     * Get all postings for a specific job opening.
     */
    @GetMapping("/job/{jobOpeningId}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    @Operation(summary = "List postings for job", description = "Returns all board postings for the specified job opening")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Postings retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires RECRUITMENT:VIEW permission")
    })
    public ResponseEntity<List<JobBoardPosting>> getPostingsForJob(
            @Parameter(description = "Job opening UUID") @PathVariable UUID jobOpeningId) {
        return ResponseEntity.ok(jobBoardService.getPostingsForJob(jobOpeningId));
    }

    /**
     * Get all postings (paginated).
     */
    @GetMapping
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    @Operation(summary = "List all postings", description = "Returns a paginated list of all job-board postings, newest first")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Postings retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires RECRUITMENT:VIEW permission")
    })
    public ResponseEntity<Page<JobBoardPosting>> getAllPostings(
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(jobBoardService.getAllPostings(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))));
    }

    /**
     * Get postings filtered by status.
     */
    @GetMapping("/status/{status}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    @Operation(summary = "List postings by status", description = "Returns a paginated list of postings filtered by status")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Postings retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires RECRUITMENT:VIEW permission")
    })
    public ResponseEntity<Page<JobBoardPosting>> getByStatus(
            @Parameter(description = "Posting status filter") @PathVariable JobBoardPosting.PostingStatus status,
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(jobBoardService.getPostingsByStatus(status,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))));
    }

    // ========== DTOs ==========

    @Data
    public static class PostJobRequest {
        @NotNull
        private UUID jobOpeningId;
        @NotEmpty
        private List<JobBoardPosting.JobBoard> boards;
    }
}
