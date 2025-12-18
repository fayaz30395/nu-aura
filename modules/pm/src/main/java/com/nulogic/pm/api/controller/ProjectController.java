package com.nulogic.pm.api.controller;

import com.nulogic.pm.api.dto.ProjectDTO;
import com.nulogic.pm.application.service.ProjectService;
import com.nulogic.pm.domain.project.Project.ProjectStatus;
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
    public ResponseEntity<ProjectDTO.Response> create(@RequestBody ProjectDTO.CreateRequest request) {
        ProjectDTO.Response response = projectService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectDTO.Response> update(@PathVariable UUID id,
                                                       @RequestBody ProjectDTO.UpdateRequest request) {
        ProjectDTO.Response response = projectService.update(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectDTO.Response> getById(@PathVariable UUID id) {
        ProjectDTO.Response response = projectService.getById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/code/{projectCode}")
    public ResponseEntity<ProjectDTO.Response> getByCode(@PathVariable String projectCode) {
        ProjectDTO.Response response = projectService.getByCode(projectCode);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<Page<ProjectDTO.ListResponse>> list(
            @RequestParam(required = false) ProjectStatus status,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<ProjectDTO.ListResponse> response = projectService.list(status, search, pageable);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        projectService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<ProjectDTO.Response> archive(@PathVariable UUID id) {
        ProjectDTO.Response response = projectService.archive(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<ProjectDTO.Response> start(@PathVariable UUID id) {
        ProjectDTO.Response response = projectService.start(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<ProjectDTO.Response> complete(@PathVariable UUID id) {
        ProjectDTO.Response response = projectService.complete(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/statistics")
    public ResponseEntity<ProjectDTO.Statistics> getStatistics() {
        ProjectDTO.Statistics statistics = projectService.getStatistics();
        return ResponseEntity.ok(statistics);
    }
}
