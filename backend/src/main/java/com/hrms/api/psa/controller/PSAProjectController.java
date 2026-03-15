package com.hrms.api.psa.controller;

import com.hrms.application.psa.service.PSAService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.psa.PSAProject;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.hrms.common.security.Permission.*;

/**
 * REST controller for PSA Project management.
 *
 * <p><strong>SECURITY:</strong> All operations enforce tenant isolation through the PSAService layer.
 * Projects are always scoped to the current tenant from TenantContext.</p>
 */
@RestController
@RequestMapping("/api/v1/psa/projects")
@RequiredArgsConstructor
public class PSAProjectController {
    private final PSAService psaService;

    @PostMapping
    @RequiresPermission(PROJECT_CREATE)
    public ResponseEntity<PSAProject> createProject(@Valid @RequestBody PSAProject project) {
        return ResponseEntity.ok(psaService.createProject(project));
    }

    @GetMapping
    @RequiresPermission(PROJECT_VIEW)
    public ResponseEntity<List<PSAProject>> getAllProjects() {
        return ResponseEntity.ok(psaService.getAllProjects());
    }

    @GetMapping("/{id}")
    @RequiresPermission(PROJECT_VIEW)
    public ResponseEntity<PSAProject> getProject(@PathVariable UUID id) {
        return psaService.getProject(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/status/{status}")
    @RequiresPermission(PROJECT_VIEW)
    public ResponseEntity<List<PSAProject>> getProjectsByStatus(@PathVariable PSAProject.ProjectStatus status) {
        return ResponseEntity.ok(psaService.getProjectsByStatus(status));
    }

    @PutMapping("/{id}")
    @RequiresPermission(PROJECT_CREATE)
    public ResponseEntity<PSAProject> updateProject(@PathVariable UUID id, @Valid @RequestBody PSAProject project) {
        return psaService.updateProject(id, project)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PROJECT_CREATE)
    public ResponseEntity<Void> deleteProject(@PathVariable UUID id) {
        if (psaService.deleteProject(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/{id}/allocate")
    @RequiresPermission(PROJECT_CREATE)
    public ResponseEntity<PSAProject> allocateResources(@PathVariable UUID id, @Valid @RequestBody Map<String, Object> allocation) {
        return psaService.allocateResources(id, allocation)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
