package com.hrms.api.recruitment.controller;

import com.hrms.application.recruitment.service.JobBoardIntegrationService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.recruitment.JobBoardPosting;
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
public class JobBoardController {

    private final JobBoardIntegrationService jobBoardService;

    /** Post a job opening to one or more boards. */
    @PostMapping("/post")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<List<JobBoardPosting>> postJob(@Valid @RequestBody PostJobRequest dto) {
        log.info("Posting job {} to boards: {}", dto.getJobOpeningId(), dto.getBoards());
        return ResponseEntity.ok(jobBoardService.postJob(dto.getJobOpeningId(), dto.getBoards()));
    }

    /** Pause a posting on its board. */
    @PostMapping("/{postingId}/pause")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<JobBoardPosting> pausePosting(@PathVariable UUID postingId) {
        return ResponseEntity.ok(jobBoardService.pausePosting(postingId));
    }

    /** Get all postings for a specific job opening. */
    @GetMapping("/job/{jobOpeningId}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<List<JobBoardPosting>> getPostingsForJob(@PathVariable UUID jobOpeningId) {
        return ResponseEntity.ok(jobBoardService.getPostingsForJob(jobOpeningId));
    }

    /** Get all postings (paginated). */
    @GetMapping
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<Page<JobBoardPosting>> getAllPostings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(jobBoardService.getAllPostings(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))));
    }

    /** Get postings filtered by status. */
    @GetMapping("/status/{status}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<Page<JobBoardPosting>> getByStatus(
            @PathVariable JobBoardPosting.PostingStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
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
