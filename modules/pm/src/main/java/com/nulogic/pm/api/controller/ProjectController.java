package com.nulogic.pm.api.controller;

import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.pm.api.dto.ProjectDTO;
import com.nulogic.pm.application.service.ProjectService;
import com.nulogic.pm.domain.project.Project.ProjectStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController("pmProjectController")
@RequestMapping("/api/v1/pm/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    @RequiresPermission(Permission.PROJECT_CREATE)
    public ResponseEntity<ProjectDTO.Response> create(@Valid @RequestBody ProjectDTO.CreateRequest request) {
        ProjectDTO.Response response = projectService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.PROJECT_MANAGE)
    public ResponseEntity<ProjectDTO.Response> update(@PathVariable UUID id,
                                                       @Valid @RequestBody ProjectDTO.UpdateRequest request) {
        ProjectDTO.Response response = projectService.update(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.PROJECT_VIEW)
    public ResponseEntity<ProjectDTO.Response> getById(@PathVariable UUID id) {
        ProjectDTO.Response response = projectService.getById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/code/{projectCode}")
    @RequiresPermission(Permission.PROJECT_VIEW)
    public ResponseEntity<ProjectDTO.Response> getByCode(@PathVariable String projectCode) {
        ProjectDTO.Response response = projectService.getByCode(projectCode);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @RequiresPermission(Permission.PROJECT_VIEW)
    public ResponseEntity<Page<ProjectDTO.ListResponse>> list(
            @RequestParam(required = false) ProjectStatus status,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<ProjectDTO.ListResponse> response = projectService.list(status, search, pageable);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.PROJECT_MANAGE)
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        projectService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/archive")
    @RequiresPermission(Permission.PROJECT_MANAGE)
    public ResponseEntity<ProjectDTO.Response> archive(@PathVariable UUID id) {
        ProjectDTO.Response response = projectService.archive(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/start")
    @RequiresPermission(Permission.PROJECT_MANAGE)
    public ResponseEntity<ProjectDTO.Response> start(@PathVariable UUID id) {
        ProjectDTO.Response response = projectService.start(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/complete")
    @RequiresPermission(Permission.PROJECT_MANAGE)
    public ResponseEntity<ProjectDTO.Response> complete(@PathVariable UUID id) {
        ProjectDTO.Response response = projectService.complete(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/statistics")
    @RequiresPermission(Permission.PROJECT_VIEW)
    public ResponseEntity<ProjectDTO.Statistics> getStatistics() {
        ProjectDTO.Statistics statistics = projectService.getStatistics();
        return ResponseEntity.ok(statistics);
    }
}
