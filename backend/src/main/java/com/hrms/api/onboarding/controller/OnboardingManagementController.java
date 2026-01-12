package com.hrms.api.onboarding.controller;

import com.hrms.api.onboarding.dto.*;
import com.hrms.application.onboarding.service.OnboardingManagementService;
import com.hrms.domain.onboarding.OnboardingProcess;
import com.hrms.domain.onboarding.OnboardingTask;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/onboarding")
@RequiredArgsConstructor
public class OnboardingManagementController {

    private final OnboardingManagementService onboardingService;

    @PostMapping("/processes")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<OnboardingProcessResponse> createProcess(
            @Valid @RequestBody OnboardingProcessRequest request) {
        OnboardingProcessResponse response = onboardingService.createProcess(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/processes/{processId}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<OnboardingProcessResponse> updateProcess(
            @PathVariable UUID processId,
            @Valid @RequestBody OnboardingProcessRequest request) {
        OnboardingProcessResponse response = onboardingService.updateProcess(processId, request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/processes/{processId}/status")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<OnboardingProcessResponse> updateStatus(
            @PathVariable UUID processId,
            @RequestParam OnboardingProcess.ProcessStatus status) {
        OnboardingProcessResponse response = onboardingService.updateStatus(processId, status);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/processes/{processId}/progress")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<OnboardingProcessResponse> updateProgress(
            @PathVariable UUID processId,
            @RequestParam Integer completionPercentage) {
        OnboardingProcessResponse response = onboardingService.updateProgress(processId, completionPercentage);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/processes/{processId}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<OnboardingProcessResponse> getProcessById(@PathVariable UUID processId) {
        OnboardingProcessResponse response = onboardingService.getProcessById(processId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/processes/employee/{employeeId}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<OnboardingProcessResponse> getProcessByEmployee(@PathVariable UUID employeeId) {
        OnboardingProcessResponse response = onboardingService.getProcessByEmployee(employeeId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/processes")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<Page<OnboardingProcessResponse>> getAllProcesses(Pageable pageable) {
        Page<OnboardingProcessResponse> response = onboardingService.getAllProcesses(pageable);
        return ResponseEntity.ok(response);
    }

    // --- Template Endpoints ---

    @PostMapping("/templates")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<OnboardingChecklistTemplateResponse> createTemplate(
            @Valid @RequestBody OnboardingChecklistTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(onboardingService.createTemplate(request));
    }

    @GetMapping("/templates")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<List<OnboardingChecklistTemplateResponse>> getAllTemplates() {
        return ResponseEntity.ok(onboardingService.getAllTemplates());
    }

    @GetMapping("/templates/{templateId}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<OnboardingChecklistTemplateResponse> getTemplateById(@PathVariable UUID templateId) {
        return ResponseEntity.ok(onboardingService.getTemplateById(templateId));
    }

    @PutMapping("/templates/{templateId}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<OnboardingChecklistTemplateResponse> updateTemplate(
            @PathVariable UUID templateId,
            @Valid @RequestBody OnboardingChecklistTemplateRequest request) {
        return ResponseEntity.ok(onboardingService.updateTemplate(templateId, request));
    }

    @DeleteMapping("/templates/{templateId}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID templateId) {
        onboardingService.deleteTemplate(templateId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/templates/{templateId}/tasks")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<OnboardingTemplateTaskResponse> addTemplateTask(
            @PathVariable UUID templateId,
            @Valid @RequestBody OnboardingTemplateTaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(onboardingService.addTemplateTask(templateId, request));
    }

    @GetMapping("/templates/{templateId}/tasks")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<List<OnboardingTemplateTaskResponse>> getTemplateTasks(@PathVariable UUID templateId) {
        return ResponseEntity.ok(onboardingService.getTemplateTasks(templateId));
    }

    @PutMapping("/templates/{templateId}/tasks/{taskId}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<OnboardingTemplateTaskResponse> updateTemplateTask(
            @PathVariable UUID templateId,
            @PathVariable UUID taskId,
            @Valid @RequestBody OnboardingTemplateTaskRequest request) {
        return ResponseEntity.ok(onboardingService.updateTemplateTask(templateId, taskId, request));
    }

    @DeleteMapping("/templates/{templateId}/tasks/{taskId}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<Void> deleteTemplateTask(
            @PathVariable UUID templateId,
            @PathVariable UUID taskId) {
        onboardingService.deleteTemplateTask(templateId, taskId);
        return ResponseEntity.noContent().build();
    }

    // --- Task Endpoints ---

    @GetMapping("/processes/{processId}/tasks")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<List<OnboardingTaskResponse>> getProcessTasks(@PathVariable UUID processId) {
        return ResponseEntity.ok(onboardingService.getProcessTasks(processId));
    }

    @PatchMapping("/tasks/{taskId}/status")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<OnboardingTaskResponse> updateTaskStatus(
            @PathVariable UUID taskId,
            @RequestParam OnboardingTask.TaskStatus status,
            @RequestParam(required = false) String remarks) {
        return ResponseEntity.ok(onboardingService.updateTaskStatus(taskId, status, remarks));
    }

    @GetMapping("/processes/status/{status}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<List<OnboardingProcessResponse>> getProcessesByStatus(
            @PathVariable OnboardingProcess.ProcessStatus status) {
        List<OnboardingProcessResponse> response = onboardingService.getProcessesByStatus(status);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/processes/buddy/{buddyId}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<List<OnboardingProcessResponse>> getProcessesByBuddy(@PathVariable UUID buddyId) {
        List<OnboardingProcessResponse> response = onboardingService.getProcessesByBuddy(buddyId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/processes/{processId}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<Void> deleteProcess(@PathVariable UUID processId) {
        onboardingService.deleteProcess(processId);
        return ResponseEntity.noContent().build();
    }
}
