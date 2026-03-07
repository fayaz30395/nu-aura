package com.hrms.api.publicapi.controller;

import com.hrms.application.recruitment.service.RecruitmentManagementService;
import com.hrms.domain.recruitment.JobOpening;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Public Career Page API - No authentication required.
 * Exposes open job listings and accepts candidate applications.
 */
@RestController
@RequestMapping("/api/public/careers")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Public Career API", description = "Public endpoints for job listings and applications")
public class PublicCareerController {

    private final RecruitmentManagementService recruitmentService;

    /**
     * List all open jobs (public, no auth).
     * Supports filtering by department, location, type, and keyword.
     */
    @GetMapping("/jobs")
    @Operation(summary = "List open jobs", description = "Returns paginated list of active job openings")
    public ResponseEntity<Map<String, Object>> listOpenJobs(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String experience,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size) {

        log.info("Public career page request: q={}, dept={}, loc={}, type={}", q, department, location, type);

        Pageable pageable = PageRequest.of(page, size);
        Page<JobOpening> jobs = recruitmentService.findPublicOpenJobs(q, department, location, type, experience, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("content", jobs.getContent());
        response.put("totalElements", jobs.getTotalElements());
        response.put("totalPages", jobs.getTotalPages());
        response.put("currentPage", jobs.getNumber());
        response.put("pageSize", jobs.getSize());

        return ResponseEntity.ok(response);
    }

    /**
     * Get single job detail (public, no auth).
     */
    @GetMapping("/jobs/{jobId}")
    @Operation(summary = "Get job detail")
    public ResponseEntity<JobOpening> getJobDetail(@PathVariable UUID jobId) {
        return recruitmentService.findPublicJobById(jobId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Submit a job application (public, no auth).
     */
    @PostMapping(value = "/apply", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Submit job application")
    public ResponseEntity<Map<String, Object>> applyForJob(
            @RequestParam UUID jobId,
            @RequestParam @NotBlank @Size(max = 100) String firstName,
            @RequestParam @NotBlank @Size(max = 100) String lastName,
            @RequestParam @NotBlank @Email String email,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String linkedInUrl,
            @RequestParam(required = false) @Size(max = 2000) String coverLetter,
            @RequestParam(required = false) String expectedSalary,
            @RequestParam(required = false) MultipartFile resume) {

        log.info("Public application received for job {} from {}", jobId, email);

        try {
            String applicationRef = recruitmentService.submitPublicApplication(
                    jobId, firstName, lastName, email, phone, linkedInUrl, coverLetter, expectedSalary, resume);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("applicationReference", applicationRef);
            response.put("message", "Your application has been received. We will contact you shortly.");
            response.put("submittedAt", LocalDate.now().toString());

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Get available filter options (departments, locations, job types).
     */
    @GetMapping("/filters")
    @Operation(summary = "Get filter options for job search")
    public ResponseEntity<Map<String, Object>> getFilterOptions() {
        Map<String, Object> filters = recruitmentService.getPublicJobFilters();
        return ResponseEntity.ok(filters);
    }
}
