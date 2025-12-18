package com.nulogic.pm.application.service;

import com.nulogic.pm.api.dto.ProjectDTO;
import com.nulogic.common.security.TenantContext;
import com.nulogic.pm.domain.project.Project;
import com.nulogic.pm.domain.project.Project.ProjectStatus;
import com.nulogic.pm.domain.project.ProjectTask.TaskStatus;
import com.nulogic.pm.domain.project.ProjectMilestone.MilestoneStatus;
import com.nulogic.pm.infrastructure.repository.ProjectRepository;
import com.nulogic.pm.infrastructure.repository.ProjectTaskRepository;
import com.nulogic.pm.infrastructure.repository.ProjectMilestoneRepository;
import com.nulogic.pm.infrastructure.repository.ProjectMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service("pmProjectService")
@RequiredArgsConstructor
@Transactional
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectTaskRepository taskRepository;
    private final ProjectMilestoneRepository milestoneRepository;
    private final ProjectMemberRepository memberRepository;

    public ProjectDTO.Response create(ProjectDTO.CreateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        if (projectRepository.existsByTenantIdAndProjectCode(tenantId, request.getProjectCode())) {
            throw new IllegalArgumentException("Project code already exists: " + request.getProjectCode());
        }

        Project project = Project.builder()
                .projectCode(request.getProjectCode())
                .name(request.getName())
                .description(request.getDescription())
                .priority(request.getPriority() != null ? request.getPriority() : Project.Priority.MEDIUM)
                .ownerId(request.getOwnerId())
                .ownerName(request.getOwnerName())
                .startDate(request.getStartDate())
                .targetEndDate(request.getTargetEndDate())
                .clientName(request.getClientName())
                .budget(request.getBudget())
                .currency(request.getCurrency() != null ? request.getCurrency() : "USD")
                .color(request.getColor())
                .tags(request.getTags())
                .build();

        project.setTenantId(tenantId);
        project = projectRepository.save(project);

        return enrichResponse(ProjectDTO.Response.fromEntity(project));
    }

    public ProjectDTO.Response update(UUID id, ProjectDTO.UpdateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Project project = projectRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));

        if (request.getName() != null) project.setName(request.getName());
        if (request.getDescription() != null) project.setDescription(request.getDescription());
        if (request.getStatus() != null) project.setStatus(request.getStatus());
        if (request.getPriority() != null) project.setPriority(request.getPriority());
        if (request.getOwnerId() != null) project.setOwnerId(request.getOwnerId());
        if (request.getOwnerName() != null) project.setOwnerName(request.getOwnerName());
        if (request.getStartDate() != null) project.setStartDate(request.getStartDate());
        if (request.getTargetEndDate() != null) project.setTargetEndDate(request.getTargetEndDate());
        if (request.getClientName() != null) project.setClientName(request.getClientName());
        if (request.getBudget() != null) project.setBudget(request.getBudget());
        if (request.getCurrency() != null) project.setCurrency(request.getCurrency());
        if (request.getColor() != null) project.setColor(request.getColor());
        if (request.getTags() != null) project.setTags(request.getTags());
        if (request.getProgressPercentage() != null) project.updateProgress(request.getProgressPercentage());

        project = projectRepository.save(project);
        return enrichResponse(ProjectDTO.Response.fromEntity(project));
    }

    @Transactional(readOnly = true)
    public ProjectDTO.Response getById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Project project = projectRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));

        return enrichResponse(ProjectDTO.Response.fromEntity(project));
    }

    @Transactional(readOnly = true)
    public ProjectDTO.Response getByCode(String projectCode) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Project project = projectRepository.findByTenantIdAndProjectCode(tenantId, projectCode)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectCode));

        return enrichResponse(ProjectDTO.Response.fromEntity(project));
    }

    @Transactional(readOnly = true)
    public Page<ProjectDTO.ListResponse> list(ProjectStatus status, String search, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Page<Project> projects = projectRepository.findByTenantIdWithFilters(tenantId, status, search, pageable);

        return projects.map(project -> {
            ProjectDTO.ListResponse response = ProjectDTO.ListResponse.fromEntity(project);
            response.setTotalTasks(taskRepository.countByProject(tenantId, project.getId()));
            response.setCompletedTasks(taskRepository.countByProjectAndStatus(tenantId, project.getId(), TaskStatus.DONE));
            return response;
        });
    }

    public void delete(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Project project = projectRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));

        projectRepository.delete(project);
    }

    public ProjectDTO.Response archive(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Project project = projectRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));

        project.archive();
        project = projectRepository.save(project);

        return enrichResponse(ProjectDTO.Response.fromEntity(project));
    }

    public ProjectDTO.Response start(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Project project = projectRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));

        project.start();
        project = projectRepository.save(project);

        return enrichResponse(ProjectDTO.Response.fromEntity(project));
    }

    public ProjectDTO.Response complete(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Project project = projectRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));

        project.complete();
        project = projectRepository.save(project);

        return enrichResponse(ProjectDTO.Response.fromEntity(project));
    }

    @Transactional(readOnly = true)
    public ProjectDTO.Statistics getStatistics() {
        UUID tenantId = TenantContext.getCurrentTenant();

        return ProjectDTO.Statistics.builder()
                .totalProjects(projectRepository.countByTenantIdAndStatus(tenantId, null))
                .planningProjects(projectRepository.countByTenantIdAndStatus(tenantId, ProjectStatus.PLANNING))
                .inProgressProjects(projectRepository.countByTenantIdAndStatus(tenantId, ProjectStatus.IN_PROGRESS))
                .completedProjects(projectRepository.countByTenantIdAndStatus(tenantId, ProjectStatus.COMPLETED))
                .onHoldProjects(projectRepository.countByTenantIdAndStatus(tenantId, ProjectStatus.ON_HOLD))
                .overdueProjects(projectRepository.findOverdueProjects(tenantId).size())
                .build();
    }

    private ProjectDTO.Response enrichResponse(ProjectDTO.Response response) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID projectId = response.getId();

        response.setTotalTasks(taskRepository.countByProject(tenantId, projectId));
        response.setCompletedTasks(taskRepository.countByProjectAndStatus(tenantId, projectId, TaskStatus.DONE));
        response.setTotalMembers(memberRepository.countActiveMembers(tenantId, projectId));
        response.setTotalMilestones(milestoneRepository.countByProjectAndStatus(tenantId, projectId, null));
        response.setCompletedMilestones(milestoneRepository.countByProjectAndStatus(tenantId, projectId, MilestoneStatus.COMPLETED));

        return response;
    }
}
