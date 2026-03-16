package com.hrms.api.publicapi.controller;

import com.hrms.application.publicapi.service.PublicCareerService;
import com.hrms.common.security.TenantContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

/**
 * Public career portal endpoints (no authentication required).
 *
 * <p>The tenant is identified via the {@code X-Tenant-ID} header, which is populated
 * into {@link TenantContext} by {@code TenantFilter} before this controller executes.
 * Callers must always include a valid {@code X-Tenant-ID} header.
 */
@RestController
@RequestMapping("/api/public/careers")
@Tag(name = "Public Career Portal", description = "Public job board and application APIs — no authentication required")
@RequiredArgsConstructor
@Slf4j
public class PublicCareerController {

    private final PublicCareerService publicCareerService;

    /**
     * List publicly visible (OPEN) job postings for the tenant.
     *
     * <p>Supports full-text search and filtering by department, location,
     * and employment type. Results are paginated (max 50 per page).
     */
    @GetMapping("/jobs")
    @Operation(summary = "List public job openings with optional search and filters")
    public ResponseEntity<Map<String, Object>> listPublicJobs(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String employmentType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size) {

        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Public career listing: tenantId={}, q={}, dept={}, loc={}, type={}",
                tenantId, q, department, location, employmentType);

        Map<String, Object> response = publicCareerService.findPublicOpenJobs(
                tenantId, q, department, location, employmentType, page, size);
        return ResponseEntity.ok(response);
    }

    /**
     * Get the full detail of a single OPEN job posting.
     *
     * @param jobId UUID of the job opening.
     * @return 200 with job detail, or 404 if not found or not OPEN.
     */
    @GetMapping("/jobs/{jobId}")
    @Operation(summary = "Get full detail of a single job opening")
    public ResponseEntity<Map<String, Object>> getJobDetail(@PathVariable UUID jobId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Public job detail request: tenantId={}, jobId={}", tenantId, jobId);

        return publicCareerService.findPublicJobById(jobId, tenantId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Submit a job application through the public career portal.
     *
     * <p>Accepts multipart form data so a resume file can be included.
     * Returns 200 if successfully submitted (or if already applied),
     * with {@code success=true/false} and a human-readable {@code message}.
     *
     * @param resume Optional resume file (PDF, DOCX; max 20 MB enforced by MinIO service).
     */
    @PostMapping(value = "/apply", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Submit a job application")
    public ResponseEntity<Map<String, Object>> applyForJob(
            @RequestParam UUID jobId,
            @RequestParam @NotBlank @Size(max = 100) String firstName,
            @RequestParam @NotBlank @Size(max = 100) String lastName,
            @RequestParam @NotBlank @Email String email,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) @Size(max = 2000) String coverLetter,
            @RequestParam(required = false) String expectedSalary,
            @RequestParam(required = false) MultipartFile resume) {

        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Public application received: tenantId={}, jobId={}, email={}", tenantId, jobId, email);

        try {
            Map<String, Object> response = publicCareerService.submitPublicApplication(
                    tenantId, jobId, firstName, lastName, email, phone,
                    coverLetter, expectedSalary, resume);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("Public application rejected: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Get available filter options for the public job search UI.
     *
     * <p>Returns distinct locations, employment types, and department IDs
     * from currently OPEN job postings, sorted alphabetically.
     */
    @GetMapping("/filters")
    @Operation(summary = "Get filter options for job search (locations, types, departments)")
    public ResponseEntity<Map<String, Object>> getFilterOptions() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Public filter options request: tenantId={}", tenantId);

        Map<String, Object> filters = publicCareerService.getPublicJobFilters(tenantId);
        return ResponseEntity.ok(filters);
    }
}
