package com.nulogic.pm.api.controller;

import com.nulogic.pm.api.dto.MilestoneDTO;
import com.nulogic.pm.application.service.MilestoneService;
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
    public ResponseEntity<MilestoneDTO.Response> create(@RequestBody MilestoneDTO.CreateRequest request) {
        MilestoneDTO.Response response = milestoneService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MilestoneDTO.Response> update(@PathVariable UUID id,
                                                         @RequestBody MilestoneDTO.UpdateRequest request) {
        MilestoneDTO.Response response = milestoneService.update(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MilestoneDTO.Response> getById(@PathVariable UUID id) {
        MilestoneDTO.Response response = milestoneService.getById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<MilestoneDTO.Response>> listByProject(@PathVariable UUID projectId) {
        List<MilestoneDTO.Response> response = milestoneService.listByProject(projectId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/project/{projectId}/paged")
    public ResponseEntity<Page<MilestoneDTO.ListResponse>> listByProjectPaged(
            @PathVariable UUID projectId,
            @PageableDefault(size = 20, sort = "sortOrder", direction = Sort.Direction.ASC) Pageable pageable) {
        Page<MilestoneDTO.ListResponse> response = milestoneService.listByProjectPaged(projectId, pageable);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        milestoneService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<MilestoneDTO.Response> start(@PathVariable UUID id) {
        MilestoneDTO.Response response = milestoneService.start(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<MilestoneDTO.Response> complete(@PathVariable UUID id) {
        MilestoneDTO.Response response = milestoneService.complete(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/update-progress")
    public ResponseEntity<Void> updateProgressFromTasks(@PathVariable UUID id) {
        milestoneService.updateProgressFromTasks(id);
        return ResponseEntity.ok().build();
    }
}
