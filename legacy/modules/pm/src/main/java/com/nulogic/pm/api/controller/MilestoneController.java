package com.nulogic.pm.api.controller;

import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.pm.api.dto.MilestoneDTO;
import com.nulogic.pm.application.service.MilestoneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController("pmMilestoneController")
@RequestMapping("/api/v1/pm/milestones")
@RequiredArgsConstructor
public class MilestoneController {

    private final MilestoneService milestoneService;

    @PostMapping
    @RequiresPermission(Permission.MILESTONE_CREATE)
    public ResponseEntity<MilestoneDTO.Response> create(@Valid @RequestBody MilestoneDTO.CreateRequest request) {
        MilestoneDTO.Response response = milestoneService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.MILESTONE_UPDATE)
    public ResponseEntity<MilestoneDTO.Response> update(@PathVariable UUID id,
                                                         @Valid @RequestBody MilestoneDTO.UpdateRequest request) {
        MilestoneDTO.Response response = milestoneService.update(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.MILESTONE_VIEW)
    public ResponseEntity<MilestoneDTO.Response> getById(@PathVariable UUID id) {
        MilestoneDTO.Response response = milestoneService.getById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/project/{projectId}")
    @RequiresPermission(Permission.MILESTONE_VIEW)
    public ResponseEntity<List<MilestoneDTO.Response>> listByProject(@PathVariable UUID projectId) {
        List<MilestoneDTO.Response> response = milestoneService.listByProject(projectId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/project/{projectId}/paged")
    @RequiresPermission(Permission.MILESTONE_VIEW)
    public ResponseEntity<Page<MilestoneDTO.ListResponse>> listByProjectPaged(
            @PathVariable UUID projectId,
            @PageableDefault(size = 20, sort = "sortOrder", direction = Sort.Direction.ASC) Pageable pageable) {
        Page<MilestoneDTO.ListResponse> response = milestoneService.listByProjectPaged(projectId, pageable);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.MILESTONE_DELETE)
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        milestoneService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/start")
    @RequiresPermission(Permission.MILESTONE_MANAGE)
    public ResponseEntity<MilestoneDTO.Response> start(@PathVariable UUID id) {
        MilestoneDTO.Response response = milestoneService.start(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/complete")
    @RequiresPermission(Permission.MILESTONE_MANAGE)
    public ResponseEntity<MilestoneDTO.Response> complete(@PathVariable UUID id) {
        MilestoneDTO.Response response = milestoneService.complete(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/update-progress")
    @RequiresPermission(Permission.MILESTONE_UPDATE)
    public ResponseEntity<Void> updateProgressFromTasks(@PathVariable UUID id) {
        milestoneService.updateProgressFromTasks(id);
        return ResponseEntity.ok().build();
    }
}
