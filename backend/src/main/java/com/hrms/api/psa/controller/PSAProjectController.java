package com.hrms.api.psa.controller;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.psa.PSAProject;
import com.hrms.infrastructure.psa.repository.PSAProjectRepository;
import lombok.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

import static com.hrms.common.security.Permission.*;

@RestController
@RequestMapping("/api/v1/psa/projects")
@RequiredArgsConstructor
public class PSAProjectController {
    private final PSAProjectRepository projectRepository;

    @PostMapping
    @RequiresPermission(PROJECT_CREATE)
    public ResponseEntity<PSAProject> createProject(@RequestBody PSAProject project) {
        project.setId(UUID.randomUUID());
        project.setTenantId(TenantContext.getCurrentTenant());
        return ResponseEntity.ok(projectRepository.save(project));
    }

    @GetMapping
    @RequiresPermission(PROJECT_VIEW)
    public ResponseEntity<List<PSAProject>> getAllProjects() {
        return ResponseEntity.ok(projectRepository.findAll());
    }

    @GetMapping("/{id}")
    @RequiresPermission(PROJECT_VIEW)
    public ResponseEntity<PSAProject> getProject(@PathVariable UUID id) {
        return projectRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/status/{status}")
    @RequiresPermission(PROJECT_VIEW)
    public ResponseEntity<List<PSAProject>> getProjectsByStatus(@PathVariable PSAProject.ProjectStatus status) {
        return ResponseEntity.ok(projectRepository.findByTenantIdAndStatus(TenantContext.getCurrentTenant(), status));
    }

    @PutMapping("/{id}")
    @RequiresPermission(PROJECT_CREATE)
    public ResponseEntity<PSAProject> updateProject(@PathVariable UUID id, @RequestBody PSAProject project) {
        return projectRepository.findById(id)
            .map(existing -> {
                project.setId(id);
                project.setTenantId(existing.getTenantId());
                return ResponseEntity.ok(projectRepository.save(project));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PROJECT_CREATE)
    public ResponseEntity<Void> deleteProject(@PathVariable UUID id) {
        projectRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/allocate")
    @RequiresPermission(PROJECT_CREATE)
    public ResponseEntity<PSAProject> allocateResources(@PathVariable UUID id, @RequestBody Map<String, Object> allocation) {
        return projectRepository.findById(id)
            .map(project -> {
                // Resource allocation logic would go here
                return ResponseEntity.ok(projectRepository.save(project));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
