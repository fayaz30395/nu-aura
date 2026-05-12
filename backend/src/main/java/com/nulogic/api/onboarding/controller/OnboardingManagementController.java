package com.nulogic.api.onboarding.controller;

import com.nulogic.api.onboarding.dto.*;
import com.nulogic.application.onboarding.service.OnboardingManagementService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.domain.onboarding.OnboardingProcess;
import com.nulogic.domain.onboarding.OnboardingTask;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/onboarding")
@RequiredArgsConstructor
@Validated
@Tag(name = "Onboarding", description = "Employee onboarding processes, checklist templates, and task tracking")
public class OnboardingManagementController {

    private final OnboardingManagementService onboardingService;

    @PostMapping("/processes")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    @Operation(summary = "Create onboarding process",
            description = "Start a new onboarding process for an employee, optionally from a checklist template")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Process created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires RECRUITMENT:MANAGE permission")
    })
    public ResponseEntity<OnboardingProcessResponse> createProcess(
            @Valid @RequestBody OnboardingProcessRequest request) {
        OnboardingProcessResponse response = onboardingService.createProcess(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/processes/{processId}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    @Operation(summary = "Update onboarding process",
            description = "Mutate process metadata (buddy, target dates, etc.)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Process updated successfully"),
            @ApiResponse(responseCode = "404", description = "Process not found")
    })
    public ResponseEntity<OnboardingProcessResponse> updateProcess(
            @Parameter(description = "Process UUID") @PathVariable UUID processId,
            @Valid @RequestBody OnboardingProcessRequest request) {
        OnboardingProcessResponse response = onboardingService.updateProcess(processId, request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/processes/{processId}/status")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    @Operation(summary = "Update process status",
            description = "Transition a process to a new status (IN_PROGRESS, COMPLETED, CANCELLED)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status updated successfully"),
            @ApiResponse(responseCode = "404", description = "Process not found")
    })
    public ResponseEntity<OnboardingProcessResponse> updateStatus(
            @Parameter(description = "Process UUID") @PathVariable UUID processId,
            @Parameter(description = "Target status", example = "IN_PROGRESS") @RequestParam OnboardingProcess.ProcessStatus status) {
        OnboardingProcessResponse response = onboardingService.updateStatus(processId, status);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/processes/{processId}/progress")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    @Operation(summary = "Update process progress percentage",
            description = "Set the completion percentage on an in-progress onboarding process")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Progress updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid percentage (must be 0-100)"),
            @ApiResponse(responseCode = "404", description = "Process not found")
    })
    public ResponseEntity<OnboardingProcessResponse> updateProgress(
            @Parameter(description = "Process UUID") @PathVariable UUID processId,
            @Parameter(description = "Completion percentage (0-100)", example = "75") @RequestParam Integer completionPercentage) {
        OnboardingProcessResponse response = onboardingService.updateProgress(processId, completionPercentage);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/processes/{processId}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    @Operation(summary = "Get process by ID", description = "Returns a single onboarding process by its UUID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Process found"),
            @ApiResponse(responseCode = "404", description = "Process not found")
    })
    public ResponseEntity<OnboardingProcessResponse> getProcessById(
            @Parameter(description = "Process UUID") @PathVariable UUID processId) {
        OnboardingProcessResponse response = onboardingService.getProcessById(processId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/processes/employee/{employeeId}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    @Operation(summary = "Get process by employee",
            description = "Returns the onboarding process for the specified employee")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Process found"),
            @ApiResponse(responseCode = "404", description = "Employee has no onboarding process")
    })
    public ResponseEntity<OnboardingProcessResponse> getProcessByEmployee(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId) {
        OnboardingProcessResponse response = onboardingService.getProcessByEmployee(employeeId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/processes")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    @Operation(summary = "List all onboarding processes",
            description = "Returns a paginated list of all onboarding processes in the tenant")
    @ApiResponse(responseCode = "200", description = "Processes retrieved successfully")
    public ResponseEntity<Page<OnboardingProcessResponse>> getAllProcesses(Pageable pageable) {
        Page<OnboardingProcessResponse> response = onboardingService.getAllProcesses(pageable);
        return ResponseEntity.ok(response);
    }

    // --- Template Endpoints ---

    @PostMapping("/templates")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    @Operation(summary = "Create checklist template",
            description = "Define a reusable onboarding checklist template")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Template created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data")
    })
    public ResponseEntity<OnboardingChecklistTemplateResponse> createTemplate(
            @Valid @RequestBody OnboardingChecklistTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(onboardingService.createTemplate(request));
    }

    @GetMapping("/templates")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    @Operation(summary = "List all checklist templates", description = "Returns all available onboarding templates")
    @ApiResponse(responseCode = "200", description = "Templates retrieved successfully")
    public ResponseEntity<List<OnboardingChecklistTemplateResponse>> getAllTemplates() {
        return ResponseEntity.ok(onboardingService.getAllTemplates());
    }

    @GetMapping("/templates/{templateId}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    @Operation(summary = "Get checklist template by ID", description = "Returns a single template by its UUID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Template found"),
            @ApiResponse(responseCode = "404", description = "Template not found")
    })
    public ResponseEntity<OnboardingChecklistTemplateResponse> getTemplateById(
            @Parameter(description = "Template UUID") @PathVariable UUID templateId) {
        return ResponseEntity.ok(onboardingService.getTemplateById(templateId));
    }

    @PutMapping("/templates/{templateId}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    @Operation(summary = "Update checklist template", description = "Mutate an existing template's metadata or tasks")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Template updated successfully"),
            @ApiResponse(responseCode = "404", description = "Template not found")
    })
    public ResponseEntity<OnboardingChecklistTemplateResponse> updateTemplate(
            @Parameter(description = "Template UUID") @PathVariable UUID templateId,
            @Valid @RequestBody OnboardingChecklistTemplateRequest request) {
        return ResponseEntity.ok(onboardingService.updateTemplate(templateId, request));
    }

    @DeleteMapping("/templates/{templateId}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    @Operation(summary = "Delete checklist template", description = "Soft-delete a checklist template (admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Template deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Template not found")
    })
    public ResponseEntity<Void> deleteTemplate(
            @Parameter(description = "Template UUID") @PathVariable UUID templateId) {
        onboardingService.deleteTemplate(templateId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/templates/{templateId}/tasks")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    @Operation(summary = "Add task to checklist template",
            description = "Append a new task entry to an existing onboarding template")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Task added successfully"),
            @ApiResponse(responseCode = "404", description = "Template not found")
    })
    public ResponseEntity<OnboardingTemplateTaskResponse> addTemplateTask(
            @Parameter(description = "Template UUID") @PathVariable UUID templateId,
            @Valid @RequestBody OnboardingTemplateTaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(onboardingService.addTemplateTask(templateId, request));
    }

    @GetMapping("/templates/{templateId}/tasks")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    @Operation(summary = "List tasks for template",
            description = "Returns all task definitions attached to the specified template")
    @ApiResponse(responseCode = "200", description = "Tasks retrieved successfully")
    public ResponseEntity<List<OnboardingTemplateTaskResponse>> getTemplateTasks(
            @Parameter(description = "Template UUID") @PathVariable UUID templateId) {
        return ResponseEntity.ok(onboardingService.getTemplateTasks(templateId));
    }

    @PutMapping("/templates/{templateId}/tasks/{taskId}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    @Operation(summary = "Update template task", description = "Mutate a single task entry in a template")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Task updated successfully"),
            @ApiResponse(responseCode = "404", description = "Template or task not found")
    })
    public ResponseEntity<OnboardingTemplateTaskResponse> updateTemplateTask(
            @Parameter(description = "Template UUID") @PathVariable UUID templateId,
            @Parameter(description = "Task UUID") @PathVariable UUID taskId,
            @Valid @RequestBody OnboardingTemplateTaskRequest request) {
        return ResponseEntity.ok(onboardingService.updateTemplateTask(templateId, taskId, request));
    }

    @DeleteMapping("/templates/{templateId}/tasks/{taskId}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    @Operation(summary = "Delete template task", description = "Remove a task entry from a template")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Task deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Template or task not found")
    })
    public ResponseEntity<Void> deleteTemplateTask(
            @Parameter(description = "Template UUID") @PathVariable UUID templateId,
            @Parameter(description = "Task UUID") @PathVariable UUID taskId) {
        onboardingService.deleteTemplateTask(templateId, taskId);
        return ResponseEntity.noContent().build();
    }

    // --- Task Endpoints ---

    @GetMapping("/processes/{processId}/tasks")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    @Operation(summary = "List tasks for process",
            description = "Returns the active task list for a running onboarding process")
    @ApiResponse(responseCode = "200", description = "Tasks retrieved successfully")
    public ResponseEntity<List<OnboardingTaskResponse>> getProcessTasks(
            @Parameter(description = "Process UUID") @PathVariable UUID processId) {
        return ResponseEntity.ok(onboardingService.getProcessTasks(processId));
    }

    @PatchMapping("/tasks/{taskId}/status")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    @Operation(summary = "Update task status",
            description = "Transition a task to a new status with optional remarks (PENDING, IN_PROGRESS, COMPLETED, SKIPPED)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Task status updated successfully"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    public ResponseEntity<OnboardingTaskResponse> updateTaskStatus(
            @Parameter(description = "Task UUID") @PathVariable UUID taskId,
            @Parameter(description = "Target status", example = "COMPLETED") @RequestParam OnboardingTask.TaskStatus status,
            @Parameter(description = "Optional remarks (max 1000 chars)") @Size(max = 1000) @RequestParam(required = false) String remarks) {
        return ResponseEntity.ok(onboardingService.updateTaskStatus(taskId, status, remarks));
    }

    @GetMapping("/processes/status/{status}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    @Operation(summary = "List processes by status",
            description = "Filter onboarding processes by status (IN_PROGRESS, COMPLETED, CANCELLED)")
    @ApiResponse(responseCode = "200", description = "Processes retrieved successfully")
    public ResponseEntity<List<OnboardingProcessResponse>> getProcessesByStatus(
            @Parameter(description = "Process status") @PathVariable OnboardingProcess.ProcessStatus status) {
        List<OnboardingProcessResponse> response = onboardingService.getProcessesByStatus(status);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/processes/buddy/{buddyId}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    @Operation(summary = "List processes by buddy",
            description = "Returns onboarding processes where the specified employee is assigned as buddy")
    @ApiResponse(responseCode = "200", description = "Processes retrieved successfully")
    public ResponseEntity<List<OnboardingProcessResponse>> getProcessesByBuddy(
            @Parameter(description = "Buddy employee UUID") @PathVariable UUID buddyId) {
        List<OnboardingProcessResponse> response = onboardingService.getProcessesByBuddy(buddyId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/processes/{processId}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    @Operation(summary = "Delete process", description = "Soft-delete an onboarding process (admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Process deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Process not found")
    })
    public ResponseEntity<Void> deleteProcess(
            @Parameter(description = "Process UUID") @PathVariable UUID processId) {
        onboardingService.deleteProcess(processId);
        return ResponseEntity.noContent().build();
    }
}
