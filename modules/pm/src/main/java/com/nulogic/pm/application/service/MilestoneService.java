package com.nulogic.pm.application.service;

import com.nulogic.pm.api.dto.MilestoneDTO;
import com.nulogic.common.security.TenantContext;
import com.nulogic.pm.domain.project.ProjectMilestone;
import com.nulogic.pm.domain.project.ProjectMilestone.MilestoneStatus;
import com.nulogic.pm.domain.project.ProjectTask.TaskStatus;
import com.nulogic.pm.infrastructure.repository.ProjectMilestoneRepository;
import com.nulogic.pm.infrastructure.repository.ProjectTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service("pmMilestoneService")
@RequiredArgsConstructor
@Transactional
public class MilestoneService {

    private final ProjectMilestoneRepository milestoneRepository;
    private final ProjectTaskRepository taskRepository;

    public MilestoneDTO.Response create(MilestoneDTO.CreateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Integer maxSortOrder = milestoneRepository.findMaxSortOrder(tenantId, request.getProjectId());
        int sortOrder = (maxSortOrder != null ? maxSortOrder : 0) + 1;

        ProjectMilestone milestone = ProjectMilestone.builder()
                .projectId(request.getProjectId())
                .name(request.getName())
                .description(request.getDescription())
                .startDate(request.getStartDate())
                .dueDate(request.getDueDate())
                .ownerId(request.getOwnerId())
                .ownerName(request.getOwnerName())
                .color(request.getColor())
                .sortOrder(sortOrder)
                .build();

        milestone.setTenantId(tenantId);
        milestone = milestoneRepository.save(milestone);

        return enrichResponse(MilestoneDTO.Response.fromEntity(milestone));
    }

    public MilestoneDTO.Response update(UUID id, MilestoneDTO.UpdateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectMilestone milestone = milestoneRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found: " + id));

        if (request.getName() != null) milestone.setName(request.getName());
        if (request.getDescription() != null) milestone.setDescription(request.getDescription());
        if (request.getStatus() != null) milestone.setStatus(request.getStatus());
        if (request.getStartDate() != null) milestone.setStartDate(request.getStartDate());
        if (request.getDueDate() != null) milestone.setDueDate(request.getDueDate());
        if (request.getOwnerId() != null) milestone.setOwnerId(request.getOwnerId());
        if (request.getOwnerName() != null) milestone.setOwnerName(request.getOwnerName());
        if (request.getProgressPercentage() != null) milestone.updateProgress(request.getProgressPercentage());
        if (request.getSortOrder() != null) milestone.setSortOrder(request.getSortOrder());
        if (request.getColor() != null) milestone.setColor(request.getColor());

        milestone = milestoneRepository.save(milestone);
        return enrichResponse(MilestoneDTO.Response.fromEntity(milestone));
    }

    @Transactional(readOnly = true)
    public MilestoneDTO.Response getById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectMilestone milestone = milestoneRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found: " + id));

        return enrichResponse(MilestoneDTO.Response.fromEntity(milestone));
    }

    @Transactional(readOnly = true)
    public List<MilestoneDTO.Response> listByProject(UUID projectId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return milestoneRepository.findByTenantIdAndProjectIdOrderBySortOrderAsc(tenantId, projectId).stream()
                .map(milestone -> enrichResponse(MilestoneDTO.Response.fromEntity(milestone)))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<MilestoneDTO.ListResponse> listByProjectPaged(UUID projectId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Page<ProjectMilestone> milestones = milestoneRepository.findByTenantIdAndProjectId(tenantId, projectId, pageable);

        return milestones.map(MilestoneDTO.ListResponse::fromEntity);
    }

    public void delete(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectMilestone milestone = milestoneRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found: " + id));

        milestoneRepository.delete(milestone);
    }

    public MilestoneDTO.Response start(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectMilestone milestone = milestoneRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found: " + id));

        milestone.start();
        milestone = milestoneRepository.save(milestone);

        return enrichResponse(MilestoneDTO.Response.fromEntity(milestone));
    }

    public MilestoneDTO.Response complete(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectMilestone milestone = milestoneRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found: " + id));

        milestone.complete();
        milestone = milestoneRepository.save(milestone);

        return enrichResponse(MilestoneDTO.Response.fromEntity(milestone));
    }

    public void updateProgressFromTasks(UUID milestoneId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectMilestone milestone = milestoneRepository.findByTenantIdAndId(tenantId, milestoneId)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found: " + milestoneId));

        var tasks = taskRepository.findByTenantIdAndMilestoneId(tenantId, milestoneId);
        if (!tasks.isEmpty()) {
            long completedTasks = tasks.stream()
                    .filter(t -> t.getStatus() == TaskStatus.DONE)
                    .count();
            int progress = (int) ((completedTasks * 100) / tasks.size());
            milestone.updateProgress(progress);
            milestoneRepository.save(milestone);
        }
    }

    private MilestoneDTO.Response enrichResponse(MilestoneDTO.Response response) {
        UUID tenantId = TenantContext.getCurrentTenant();

        var tasks = taskRepository.findByTenantIdAndMilestoneId(tenantId, response.getId());
        response.setTotalTasks((long) tasks.size());
        response.setCompletedTasks(tasks.stream()
                .filter(t -> t.getStatus() == TaskStatus.DONE)
                .count());

        return response;
    }
}
