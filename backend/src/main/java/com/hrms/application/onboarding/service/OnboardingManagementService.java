package com.hrms.application.onboarding.service;

import com.hrms.api.onboarding.dto.*;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.onboarding.*;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.onboarding.repository.*;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class OnboardingManagementService {

    private final OnboardingProcessRepository onboardingRepository;
    private final EmployeeRepository employeeRepository;
    private final OnboardingChecklistTemplateRepository templateRepository;
    private final OnboardingTemplateTaskRepository templateTaskRepository;
    private final OnboardingTaskRepository taskRepository;

    public OnboardingProcessResponse createProcess(OnboardingProcessRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating onboarding process for employee {} in tenant {}", request.getEmployeeId(), tenantId);

        // Verify employee exists
        employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        // Verify buddy exists if provided
        if (request.getAssignedBuddyId() != null) {
            employeeRepository.findById(request.getAssignedBuddyId())
                    .orElseThrow(() -> new IllegalArgumentException("Buddy employee not found"));
        }

        OnboardingProcess process = new OnboardingProcess();
        process.setTenantId(tenantId);
        process.setEmployeeId(request.getEmployeeId());
        process.setProcessType(request.getProcessType());
        process.setStartDate(request.getStartDate() != null ? request.getStartDate() : LocalDate.now());
        process.setExpectedCompletionDate(request.getExpectedCompletionDate());
        process.setStatus(OnboardingProcess.ProcessStatus.NOT_STARTED);
        process.setAssignedBuddyId(request.getAssignedBuddyId());
        process.setCompletionPercentage(0);
        process.setNotes(request.getNotes());

        OnboardingProcess savedProcess = onboardingRepository.save(process);

        // If template ID is provided, generate tasks
        if (request.getTemplateId() != null) {
            generateTasksFromTemplate(savedProcess, request.getTemplateId());
        }

        return mapToResponse(savedProcess);
    }

    private void generateTasksFromTemplate(OnboardingProcess process, UUID templateId) {
        UUID tenantId = process.getTenantId();
        List<OnboardingTemplateTask> templateTasks = templateTaskRepository
                .findByTemplateIdAndTenantIdOrderByOrderSequenceAsc(templateId, tenantId);

        log.info("Generating {} tasks from template {} for process {}", templateTasks.size(), templateId,
                process.getId());

        for (OnboardingTemplateTask tt : templateTasks) {
            OnboardingTask task = OnboardingTask.builder()
                    .processId(process.getId())
                    .employeeId(process.getEmployeeId())
                    .taskName(tt.getTaskName())
                    .description(tt.getDescription())
                    .category(tt.getCategory())
                    .isMandatory(tt.getIsMandatory())
                    .orderSequence(tt.getOrderSequence())
                    .priority(tt.getPriority())
                    .status(OnboardingTask.TaskStatus.PENDING)
                    .dueDate(process.getStartDate()
                            .plusDays(tt.getEstimatedDaysFromStart() != null ? tt.getEstimatedDaysFromStart() : 7))
                    .build();
            task.setTenantId(tenantId);
            taskRepository.save(task);
        }
    }

    // --- Template Management ---

    public OnboardingChecklistTemplateResponse createTemplate(OnboardingChecklistTemplateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OnboardingChecklistTemplate template = OnboardingChecklistTemplate.builder()
                .name(request.getName())
                .description(request.getDescription())
                .applicableFor(request.getApplicableFor())
                .departmentId(request.getDepartmentId())
                .jobLevel(request.getJobLevel())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .isDefault(request.getIsDefault() != null ? request.getIsDefault() : false)
                .estimatedDays(request.getEstimatedDays())
                .build();
        template.setTenantId(tenantId);
        return mapToTemplateResponse(templateRepository.save(template));
    }

    public List<OnboardingChecklistTemplateResponse> getAllTemplates() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return templateRepository.findByTenantId(tenantId).stream()
                .map(this::mapToTemplateResponse)
                .collect(Collectors.toList());
    }

    public OnboardingChecklistTemplateResponse getTemplateById(UUID templateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OnboardingChecklistTemplate template = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Template not found"));
        return mapToTemplateResponse(template);
    }

    public OnboardingChecklistTemplateResponse updateTemplate(UUID templateId,
            OnboardingChecklistTemplateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OnboardingChecklistTemplate template = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Template not found"));

        template.setName(request.getName());
        template.setDescription(request.getDescription());
        template.setApplicableFor(request.getApplicableFor());
        template.setDepartmentId(request.getDepartmentId());
        template.setJobLevel(request.getJobLevel());
        if (request.getIsActive() != null)
            template.setIsActive(request.getIsActive());
        if (request.getIsDefault() != null)
            template.setIsDefault(request.getIsDefault());
        template.setEstimatedDays(request.getEstimatedDays());

        return mapToTemplateResponse(templateRepository.save(template));
    }

    public void deleteTemplate(UUID templateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OnboardingChecklistTemplate template = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Template not found"));

        // Delete associated tasks first
        List<OnboardingTemplateTask> tasks = templateTaskRepository
                .findByTemplateIdAndTenantIdOrderByOrderSequenceAsc(templateId, tenantId);
        templateTaskRepository.deleteAll(tasks);

        templateRepository.delete(template);
    }

    public OnboardingTemplateTaskResponse addTemplateTask(UUID templateId, OnboardingTemplateTaskRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OnboardingTemplateTask task = OnboardingTemplateTask.builder()
                .templateId(templateId)
                .taskName(request.getTaskName())
                .description(request.getDescription())
                .category(request.getCategory())
                .isMandatory(request.getIsMandatory() != null ? request.getIsMandatory() : true)
                .orderSequence(request.getOrderSequence())
                .priority(request.getPriority() != null ? request.getPriority() : OnboardingTask.TaskPriority.MEDIUM)
                .estimatedDaysFromStart(request.getEstimatedDaysFromStart())
                .build();
        task.setTenantId(tenantId);
        return mapToTemplateTaskResponse(templateTaskRepository.save(task));
    }

    public List<OnboardingTemplateTaskResponse> getTemplateTasks(UUID templateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return templateTaskRepository.findByTemplateIdAndTenantIdOrderByOrderSequenceAsc(templateId, tenantId).stream()
                .map(this::mapToTemplateTaskResponse)
                .collect(Collectors.toList());
    }

    public OnboardingTemplateTaskResponse updateTemplateTask(UUID templateId, UUID taskId,
            OnboardingTemplateTaskRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OnboardingTemplateTask task = templateTaskRepository.findById(taskId)
                .filter(t -> t.getTemplateId().equals(templateId) && t.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Template task not found"));

        task.setTaskName(request.getTaskName());
        task.setDescription(request.getDescription());
        task.setCategory(request.getCategory());
        if (request.getIsMandatory() != null)
            task.setIsMandatory(request.getIsMandatory());
        task.setOrderSequence(request.getOrderSequence());
        if (request.getPriority() != null)
            task.setPriority(request.getPriority());
        task.setEstimatedDaysFromStart(request.getEstimatedDaysFromStart());

        return mapToTemplateTaskResponse(templateTaskRepository.save(task));
    }

    public void deleteTemplateTask(UUID templateId, UUID taskId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OnboardingTemplateTask task = templateTaskRepository.findById(taskId)
                .filter(t -> t.getTemplateId().equals(templateId) && t.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Template task not found"));
        templateTaskRepository.delete(task);
    }

    // --- Task Management ---

    public List<OnboardingTaskResponse> getProcessTasks(UUID processId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return taskRepository.findByProcessIdAndTenantId(processId, tenantId).stream()
                .map(this::mapToTaskResponse)
                .collect(Collectors.toList());
    }

    public OnboardingTaskResponse updateTaskStatus(UUID taskId, OnboardingTask.TaskStatus status, String remarks) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OnboardingTask task = taskRepository.findByIdAndTenantId(taskId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        task.setStatus(status);
        task.setRemarks(remarks);
        if (status == OnboardingTask.TaskStatus.COMPLETED) {
            task.setCompletedDate(LocalDate.now());
        }

        return mapToTaskResponse(taskRepository.save(task));
    }

    public OnboardingProcessResponse updateProcess(UUID processId, OnboardingProcessRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating onboarding process {} for tenant {}", processId, tenantId);

        OnboardingProcess process = onboardingRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Onboarding process not found"));

        process.setStartDate(request.getStartDate());
        process.setExpectedCompletionDate(request.getExpectedCompletionDate());
        process.setAssignedBuddyId(request.getAssignedBuddyId());
        process.setNotes(request.getNotes());

        OnboardingProcess updatedProcess = onboardingRepository.save(process);
        return mapToResponse(updatedProcess);
    }

    public OnboardingProcessResponse updateStatus(UUID processId, OnboardingProcess.ProcessStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating onboarding process {} status to {} for tenant {}", processId, status, tenantId);

        OnboardingProcess process = onboardingRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Onboarding process not found"));

        process.setStatus(status);
        if (status == OnboardingProcess.ProcessStatus.COMPLETED) {
            process.setActualCompletionDate(LocalDate.now());
            process.setCompletionPercentage(100);
        }

        OnboardingProcess updatedProcess = onboardingRepository.save(process);
        return mapToResponse(updatedProcess);
    }

    public OnboardingProcessResponse updateProgress(UUID processId, Integer completionPercentage) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating onboarding process {} progress to {}% for tenant {}", processId, completionPercentage,
                tenantId);

        OnboardingProcess process = onboardingRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Onboarding process not found"));

        process.setCompletionPercentage(completionPercentage);
        if (completionPercentage > 0 && process.getStatus() == OnboardingProcess.ProcessStatus.NOT_STARTED) {
            process.setStatus(OnboardingProcess.ProcessStatus.IN_PROGRESS);
        }
        if (completionPercentage >= 100) {
            process.setStatus(OnboardingProcess.ProcessStatus.COMPLETED);
            process.setActualCompletionDate(LocalDate.now());
        }

        OnboardingProcess updatedProcess = onboardingRepository.save(process);
        return mapToResponse(updatedProcess);
    }

    @Transactional(readOnly = true)
    public OnboardingProcessResponse getProcessById(UUID processId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OnboardingProcess process = onboardingRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Onboarding process not found"));
        return mapToResponse(process);
    }

    @Transactional(readOnly = true)
    public OnboardingProcessResponse getProcessByEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OnboardingProcess process = onboardingRepository.findByTenantIdAndEmployeeId(tenantId, employeeId)
                .orElseThrow(() -> new IllegalArgumentException("No onboarding process found for employee"));
        return mapToResponse(process);
    }

    @Transactional(readOnly = true)
    public Page<OnboardingProcessResponse> getAllProcesses(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return onboardingRepository.findAll(
                (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId),
                pageable).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<OnboardingProcessResponse> getProcessesByStatus(OnboardingProcess.ProcessStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return onboardingRepository.findByTenantIdAndStatus(tenantId, status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<OnboardingProcessResponse> getProcessesByBuddy(UUID buddyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return onboardingRepository.findByTenantIdAndAssignedBuddyId(tenantId, buddyId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void deleteProcess(UUID processId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OnboardingProcess process = onboardingRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Onboarding process not found"));
        onboardingRepository.delete(process);
    }

    private OnboardingProcessResponse mapToResponse(OnboardingProcess process) {
        String employeeName = employeeRepository.findById(process.getEmployeeId())
                .map(Employee::getFullName)
                .orElse(null);

        String buddyName = null;
        if (process.getAssignedBuddyId() != null) {
            buddyName = employeeRepository.findById(process.getAssignedBuddyId())
                    .map(Employee::getFullName)
                    .orElse(null);
        }

        return OnboardingProcessResponse.builder()
                .id(process.getId())
                .tenantId(process.getTenantId())
                .employeeId(process.getEmployeeId())
                .employeeName(employeeName)
                .processType(process.getProcessType())
                .startDate(process.getStartDate())
                .expectedCompletionDate(process.getExpectedCompletionDate())
                .actualCompletionDate(process.getActualCompletionDate())
                .status(process.getStatus())
                .assignedBuddyId(process.getAssignedBuddyId())
                .assignedBuddyName(buddyName)
                .completionPercentage(process.getCompletionPercentage())
                .notes(process.getNotes())
                .createdAt(process.getCreatedAt())
                .updatedAt(process.getUpdatedAt())
                .build();
    }

    private OnboardingChecklistTemplateResponse mapToTemplateResponse(OnboardingChecklistTemplate template) {
        return OnboardingChecklistTemplateResponse.builder()
                .id(template.getId())
                .name(template.getName())
                .description(template.getDescription())
                .applicableFor(template.getApplicableFor())
                .departmentId(template.getDepartmentId())
                .jobLevel(template.getJobLevel())
                .isActive(template.getIsActive())
                .isDefault(template.getIsDefault())
                .estimatedDays(template.getEstimatedDays())
                .build();
    }

    private OnboardingTemplateTaskResponse mapToTemplateTaskResponse(OnboardingTemplateTask task) {
        return OnboardingTemplateTaskResponse.builder()
                .id(task.getId())
                .templateId(task.getTemplateId())
                .taskName(task.getTaskName())
                .description(task.getDescription())
                .category(task.getCategory())
                .isMandatory(task.getIsMandatory())
                .orderSequence(task.getOrderSequence())
                .priority(task.getPriority())
                .estimatedDaysFromStart(task.getEstimatedDaysFromStart())
                .build();
    }

    private OnboardingTaskResponse mapToTaskResponse(OnboardingTask task) {
        return OnboardingTaskResponse.builder()
                .id(task.getId())
                .processId(task.getProcessId())
                .employeeId(task.getEmployeeId())
                .taskName(task.getTaskName())
                .description(task.getDescription())
                .category(task.getCategory())
                .assignedTo(task.getAssignedTo())
                .dueDate(task.getDueDate())
                .completedDate(task.getCompletedDate())
                .status(task.getStatus())
                .priority(task.getPriority())
                .isMandatory(task.getIsMandatory())
                .orderSequence(task.getOrderSequence())
                .remarks(task.getRemarks())
                .build();
    }
}
