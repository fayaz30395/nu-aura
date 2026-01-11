package com.nulogic.hrms.project;

import com.nulogic.hrms.common.SecurityUtils;
import com.nulogic.hrms.project.dto.ProjectCloseRequest;
import com.nulogic.hrms.project.dto.ProjectCreateRequest;
import com.nulogic.hrms.project.dto.ProjectResponse;
import com.nulogic.hrms.project.dto.ProjectUpdateRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.core.io.ByteArrayResource;
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
@RequestMapping("/api/v1/projects")
public class ProjectController {
    private final ProjectService projectService;
    private final ProjectExportService projectExportService;

    public ProjectController(ProjectService projectService, ProjectExportService projectExportService) {
        this.projectService = projectService;
        this.projectExportService = projectExportService;
    }

    @GetMapping
    public ResponseEntity<Page<ProjectResponse>> list(
            @RequestParam(value = "status", required = false) ProjectStatus status,
            @RequestParam(value = "type", required = false) ProjectType type,
            @RequestParam(value = "ownerId", required = false) UUID ownerId,
            @RequestParam(value = "search", required = false) String search,
            @PageableDefault(size = 20) Pageable pageable) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(projectService.list(userId, status, type, ownerId, search, pageable));
    }

    @GetMapping("/export")
    public ResponseEntity<ByteArrayResource> export(
            @RequestParam(value = "status", required = false) ProjectStatus status,
            @RequestParam(value = "type", required = false) ProjectType type,
            @RequestParam(value = "ownerId", required = false) UUID ownerId,
            @RequestParam(value = "search", required = false) String search) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        byte[] csv = projectExportService.exportProjects(userId, status, type, ownerId, search);
        ByteArrayResource resource = new ByteArrayResource(csv);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=projects.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(resource);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> get(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(projectService.get(userId, id));
    }

    @PostMapping
    public ResponseEntity<ProjectResponse> create(@Valid @RequestBody ProjectCreateRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(projectService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectResponse> update(@PathVariable UUID id,
                                                  @Valid @RequestBody ProjectUpdateRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(projectService.update(userId, id, request));
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<ProjectResponse> activate(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(projectService.activate(userId, id));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<ProjectResponse> close(@PathVariable UUID id,
                                                 @RequestBody(required = false) ProjectCloseRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(projectService.close(userId, id, request));
    }
}
