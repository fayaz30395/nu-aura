package com.nulogic.hrms.project;

import com.nulogic.hrms.common.SecurityUtils;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.project.dto.ProjectAllocationCreateRequest;
import com.nulogic.hrms.project.dto.ProjectAllocationEndRequest;
import com.nulogic.hrms.project.dto.ProjectAllocationResponse;
import com.nulogic.hrms.project.dto.ProjectAllocationSummaryResponse;
import com.nulogic.hrms.project.dto.ProjectAllocationUpdateRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ProjectAllocationController {
    private final ProjectAllocationService projectAllocationService;
    private final ProjectExportService projectExportService;
    private final ProjectAllocationSummaryService projectAllocationSummaryService;

    public ProjectAllocationController(ProjectAllocationService projectAllocationService,
                                       ProjectExportService projectExportService,
                                       ProjectAllocationSummaryService projectAllocationSummaryService) {
        this.projectAllocationService = projectAllocationService;
        this.projectExportService = projectExportService;
        this.projectAllocationSummaryService = projectAllocationSummaryService;
    }

    @GetMapping("/allocations")
    public ResponseEntity<Page<ProjectAllocationResponse>> list(
            @RequestParam(value = "employeeId", required = false) UUID employeeId,
            @RequestParam(value = "projectId", required = false) UUID projectId,
            @PageableDefault(size = 20) Pageable pageable) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(projectAllocationService.list(userId, employeeId, projectId, pageable));
    }

    @GetMapping("/allocations/summary")
    public ResponseEntity<Page<ProjectAllocationSummaryResponse>> summary(
            @RequestParam(value = "startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "scope", required = false) PermissionScope scope,
            @RequestParam(value = "employeeId", required = false) UUID employeeId,
            @RequestParam(value = "employeeSearch", required = false) String employeeSearch,
            @PageableDefault(size = 20) Pageable pageable) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(projectAllocationSummaryService.summary(
                userId, scope, startDate, endDate, employeeId, employeeSearch, pageable));
    }

    @GetMapping("/allocations/export")
    public ResponseEntity<ByteArrayResource> export(
            @RequestParam(value = "employeeId", required = false) UUID employeeId,
            @RequestParam(value = "projectId", required = false) UUID projectId,
            @RequestParam(value = "summary", required = false, defaultValue = "false") boolean summary,
            @RequestParam(value = "startDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "scope", required = false) PermissionScope scope,
            @RequestParam(value = "employeeSearch", required = false) String employeeSearch) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        byte[] csv = summary
                ? projectAllocationSummaryService.exportSummary(userId, scope, startDate, endDate, employeeId, employeeSearch)
                : projectExportService.exportAllocations(userId, employeeId, projectId);
        ByteArrayResource resource = new ByteArrayResource(csv);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        summary ? "attachment; filename=allocation_summary.csv"
                                : "attachment; filename=project_allocations.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(resource);
    }

    @GetMapping("/projects/{projectId}/allocations")
    public ResponseEntity<Page<ProjectAllocationResponse>> listByProject(
            @PathVariable UUID projectId,
            @PageableDefault(size = 20) Pageable pageable) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(projectAllocationService.listByProject(userId, projectId, pageable));
    }

    @GetMapping("/projects/{projectId}/allocations/export")
    public ResponseEntity<ByteArrayResource> exportByProject(@PathVariable UUID projectId) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        byte[] csv = projectExportService.exportAllocations(userId, null, projectId);
        ByteArrayResource resource = new ByteArrayResource(csv);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=project_allocations.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(resource);
    }

    @PostMapping("/projects/{projectId}/allocations")
    public ResponseEntity<ProjectAllocationResponse> create(@PathVariable UUID projectId,
                                                            @Valid @RequestBody ProjectAllocationCreateRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(projectAllocationService.create(userId, projectId, request));
    }

    @PutMapping("/projects/{projectId}/allocations/{allocationId}")
    public ResponseEntity<ProjectAllocationResponse> update(@PathVariable UUID projectId,
                                                            @PathVariable UUID allocationId,
                                                            @Valid @RequestBody ProjectAllocationUpdateRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(projectAllocationService.update(userId, projectId, allocationId, request));
    }

    @PostMapping("/projects/{projectId}/allocations/{allocationId}/end")
    public ResponseEntity<ProjectAllocationResponse> end(@PathVariable UUID projectId,
                                                         @PathVariable UUID allocationId,
                                                         @RequestBody(required = false) ProjectAllocationEndRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(projectAllocationService.end(userId, projectId, allocationId, request));
    }
}
