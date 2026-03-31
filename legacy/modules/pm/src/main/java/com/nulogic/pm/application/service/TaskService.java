package com.nulogic.pm.application.service;

import com.nulogic.pm.api.dto.TaskDTO;
import com.nulogic.common.security.TenantContext;
import com.nulogic.pm.domain.project.Project;
import com.nulogic.pm.domain.project.ProjectTask;
import com.nulogic.pm.domain.project.ProjectTask.*;
import com.nulogic.pm.infrastructure.repository.ProjectRepository;
import com.nulogic.pm.infrastructure.repository.ProjectTaskRepository;
import com.nulogic.pm.infrastructure.repository.ProjectCommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service("pmTaskService")
@RequiredArgsConstructor
@Transactional
public class TaskService {

    private final ProjectTaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final ProjectCommentRepository commentRepository;

    public TaskDTO.Response create(TaskDTO.CreateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Project project = projectRepository.findByTenantIdAndId(tenantId, request.getProjectId())
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + request.getProjectId()));

        String taskCode = generateTaskCode(tenantId, project.getProjectCode());

        ProjectTask task = ProjectTask.builder()
                .taskCode(taskCode)
                .projectId(request.getProjectId())
                .title(request.getTitle())
                .description(request.getDescription())
                .priority(request.getPriority() != null ? request.getPriority() : TaskPriority.MEDIUM)
                .type(request.getType() != null ? request.getType() : TaskType.TASK)
                .assigneeId(request.getAssigneeId())
                .assigneeName(request.getAssigneeName())
                .reporterId(request.getReporterId())
                .reporterName(request.getReporterName())
                .parentTaskId(request.getParentTaskId())
                .milestoneId(request.getMilestoneId())
                .startDate(request.getStartDate())
                .dueDate(request.getDueDate())
                .estimatedHours(request.getEstimatedHours())
                .storyPoints(request.getStoryPoints())
                .sprintName(request.getSprintName())
                .tags(request.getTags())
                .color(request.getColor())
                .build();

        task.setTenantId(tenantId);
        task = taskRepository.save(task);

        return enrichResponse(TaskDTO.Response.fromEntity(task));
    }

    public TaskDTO.Response update(UUID id, TaskDTO.UpdateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectTask task = taskRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + id));

        if (request.getTitle() != null) task.setTitle(request.getTitle());
        if (request.getDescription() != null) task.setDescription(request.getDescription());
        if (request.getStatus() != null) task.setStatus(request.getStatus());
        if (request.getPriority() != null) task.setPriority(request.getPriority());
        if (request.getType() != null) task.setType(request.getType());
        if (request.getAssigneeId() != null) task.setAssigneeId(request.getAssigneeId());
        if (request.getAssigneeName() != null) task.setAssigneeName(request.getAssigneeName());
        if (request.getMilestoneId() != null) task.setMilestoneId(request.getMilestoneId());
        if (request.getStartDate() != null) task.setStartDate(request.getStartDate());
        if (request.getDueDate() != null) task.setDueDate(request.getDueDate());
        if (request.getEstimatedHours() != null) task.setEstimatedHours(request.getEstimatedHours());
        if (request.getActualHours() != null) task.setActualHours(request.getActualHours());
        if (request.getProgressPercentage() != null) task.updateProgress(request.getProgressPercentage());
        if (request.getStoryPoints() != null) task.setStoryPoints(request.getStoryPoints());
        if (request.getSprintName() != null) task.setSprintName(request.getSprintName());
        if (request.getSortOrder() != null) task.setSortOrder(request.getSortOrder());
        if (request.getTags() != null) task.setTags(request.getTags());
        if (request.getColor() != null) task.setColor(request.getColor());

        task = taskRepository.save(task);
        return enrichResponse(TaskDTO.Response.fromEntity(task));
    }

    @Transactional(readOnly = true)
    public TaskDTO.Response getById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectTask task = taskRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + id));

        return enrichResponse(TaskDTO.Response.fromEntity(task));
    }

    @Transactional(readOnly = true)
    public TaskDTO.Response getByCode(String taskCode) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectTask task = taskRepository.findByTenantIdAndTaskCode(tenantId, taskCode)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + taskCode));

        return enrichResponse(TaskDTO.Response.fromEntity(task));
    }

    @Transactional(readOnly = true)
    public Page<TaskDTO.ListResponse> listByProject(UUID projectId, TaskStatus status, TaskPriority priority,
                                                     UUID assigneeId, String search, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Page<ProjectTask> tasks = taskRepository.findByProjectWithFilters(
                tenantId, projectId, status, priority, assigneeId, search, pageable);

        return tasks.map(TaskDTO.ListResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<TaskDTO.ListResponse> listByAssignee(UUID assigneeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Page<ProjectTask> tasks = taskRepository.findByTenantIdAndAssigneeId(tenantId, assigneeId, pageable);

        return tasks.map(TaskDTO.ListResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<TaskDTO.Response> listSubtasks(UUID parentTaskId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return taskRepository.findByTenantIdAndParentTaskId(tenantId, parentTaskId).stream()
                .map(task -> enrichResponse(TaskDTO.Response.fromEntity(task)))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TaskDTO.ListResponse> listByMilestone(UUID milestoneId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return taskRepository.findByTenantIdAndMilestoneId(tenantId, milestoneId).stream()
                .map(TaskDTO.ListResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public void delete(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectTask task = taskRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + id));

        taskRepository.delete(task);
    }

    public TaskDTO.Response updateStatus(UUID id, TaskStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectTask task = taskRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + id));

        task.setStatus(status);

        if (status == TaskStatus.DONE) {
            task.complete();
        } else if (status == TaskStatus.IN_PROGRESS && task.getStartDate() == null) {
            task.start();
        }

        task = taskRepository.save(task);
        return enrichResponse(TaskDTO.Response.fromEntity(task));
    }

    public TaskDTO.Response assign(UUID id, UUID assigneeId, String assigneeName) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectTask task = taskRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + id));

        task.setAssigneeId(assigneeId);
        task.setAssigneeName(assigneeName);

        task = taskRepository.save(task);
        return enrichResponse(TaskDTO.Response.fromEntity(task));
    }

    public TaskDTO.Response logTime(UUID id, int hours) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectTask task = taskRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + id));

        task.logTime(hours);

        task = taskRepository.save(task);
        return enrichResponse(TaskDTO.Response.fromEntity(task));
    }

    private String generateTaskCode(UUID tenantId, String projectCode) {
        Integer maxNumber = taskRepository.findMaxTaskNumber(tenantId, projectCode + "-");
        int nextNumber = (maxNumber != null ? maxNumber : 0) + 1;
        return projectCode + "-" + nextNumber;
    }

    private TaskDTO.Response enrichResponse(TaskDTO.Response response) {
        UUID tenantId = TenantContext.getCurrentTenant();

        response.setSubtaskCount((long) taskRepository.findByTenantIdAndParentTaskId(tenantId, response.getId()).size());
        response.setCommentCount(commentRepository.countByTask(tenantId, response.getId()));

        return response;
    }
}
