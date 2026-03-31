package com.nulogic.pm.api.controller;

import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.pm.api.dto.TaskDTO;
import com.nulogic.pm.application.service.TaskService;
import com.nulogic.pm.domain.project.ProjectTask.TaskStatus;
import com.nulogic.pm.domain.project.ProjectTask.TaskPriority;
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

@RestController("pmTaskController")
@RequestMapping("/api/v1/pm/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @PostMapping
    @RequiresPermission(Permission.TASK_CREATE)
    public ResponseEntity<TaskDTO.Response> create(@Valid @RequestBody TaskDTO.CreateRequest request) {
        TaskDTO.Response response = taskService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.TASK_UPDATE)
    public ResponseEntity<TaskDTO.Response> update(@PathVariable UUID id,
                                                    @Valid @RequestBody TaskDTO.UpdateRequest request) {
        TaskDTO.Response response = taskService.update(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.TASK_VIEW)
    public ResponseEntity<TaskDTO.Response> getById(@PathVariable UUID id) {
        TaskDTO.Response response = taskService.getById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/code/{taskCode}")
    @RequiresPermission(Permission.TASK_VIEW)
    public ResponseEntity<TaskDTO.Response> getByCode(@PathVariable String taskCode) {
        TaskDTO.Response response = taskService.getByCode(taskCode);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/project/{projectId}")
    @RequiresPermission(Permission.TASK_VIEW)
    public ResponseEntity<Page<TaskDTO.ListResponse>> listByProject(
            @PathVariable UUID projectId,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) TaskPriority priority,
            @RequestParam(required = false) UUID assigneeId,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<TaskDTO.ListResponse> response = taskService.listByProject(
                projectId, status, priority, assigneeId, search, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/assignee/{assigneeId}")
    @RequiresPermission(Permission.TASK_VIEW)
    public ResponseEntity<Page<TaskDTO.ListResponse>> listByAssignee(
            @PathVariable UUID assigneeId,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<TaskDTO.ListResponse> response = taskService.listByAssignee(assigneeId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/subtasks")
    @RequiresPermission(Permission.TASK_VIEW)
    public ResponseEntity<List<TaskDTO.Response>> listSubtasks(@PathVariable UUID id) {
        List<TaskDTO.Response> response = taskService.listSubtasks(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/milestone/{milestoneId}")
    @RequiresPermission(Permission.TASK_VIEW)
    public ResponseEntity<List<TaskDTO.ListResponse>> listByMilestone(@PathVariable UUID milestoneId) {
        List<TaskDTO.ListResponse> response = taskService.listByMilestone(milestoneId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.TASK_DELETE)
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        taskService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @RequiresPermission(Permission.TASK_UPDATE)
    public ResponseEntity<TaskDTO.Response> updateStatus(@PathVariable UUID id,
                                                          @Valid @RequestBody TaskDTO.StatusUpdateRequest request) {
        TaskDTO.Response response = taskService.updateStatus(id, request.getStatus());
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/assign")
    @RequiresPermission(Permission.TASK_ASSIGN)
    public ResponseEntity<TaskDTO.Response> assign(@PathVariable UUID id,
                                                    @Valid @RequestBody TaskDTO.AssignRequest request) {
        TaskDTO.Response response = taskService.assign(id, request.getAssigneeId(), request.getAssigneeName());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/log-time")
    @RequiresPermission(Permission.TIMESHEET_SUBMIT)
    public ResponseEntity<TaskDTO.Response> logTime(@PathVariable UUID id,
                                                     @Valid @RequestBody TaskDTO.LogTimeRequest request) {
        TaskDTO.Response response = taskService.logTime(id, request.getHours());
        return ResponseEntity.ok(response);
    }
}
