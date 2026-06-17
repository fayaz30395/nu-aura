package com.nulogic.application.performance.service;

import com.nulogic.application.performance.dto.GoalRequest;
import com.nulogic.application.performance.dto.GoalResponse;
import com.nulogic.common.security.TenantContext;

import com.nulogic.domain.performance.Goal;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.performance.repository.GoalRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class GoalService {

    private static final String GOAL_NOT_FOUND = "Goal not found";

    private final GoalRepository goalRepository;
    private final EmployeeRepository employeeRepository;

    public GoalService(GoalRepository goalRepository,
                       EmployeeRepository employeeRepository) {
        this.goalRepository = goalRepository;
        this.employeeRepository = employeeRepository;
    }

    @Transactional
    public GoalResponse createGoal(GoalRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Goal goal = Goal.builder()
                .employeeId(request.getEmployeeId())
                .title(request.getTitle())
                .description(request.getDescription())
                .goalType(request.getGoalType())
                .category(request.getCategory())
                .targetValue(request.getTargetValue())
                .currentValue(request.getCurrentValue() != null ? request.getCurrentValue() : request.getTargetValue())
                .measurementUnit(request.getMeasurementUnit())
                .startDate(request.getStartDate())
                .dueDate(request.getDueDate())
                .status(request.getStatus() != null ? request.getStatus() : Goal.GoalStatus.DRAFT)
                .progressPercentage(request.getProgressPercentage() != null ? request.getProgressPercentage() : 0)
                .parentGoalId(request.getParentGoalId())
                .weight(request.getWeight() != null ? request.getWeight() : 100)
                .build();

        goal.setTenantId(tenantId);
        goal = goalRepository.save(goal);

        return mapToResponse(goal);
    }

    @Transactional
    public GoalResponse updateGoal(UUID goalId, GoalRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Goal goal = goalRepository.findByIdAndTenantId(goalId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException(GOAL_NOT_FOUND));

        if (request.getTitle() != null)
            goal.setTitle(request.getTitle());
        if (request.getDescription() != null)
            goal.setDescription(request.getDescription());
        if (request.getGoalType() != null)
            goal.setGoalType(request.getGoalType());
        if (request.getCategory() != null)
            goal.setCategory(request.getCategory());
        if (request.getTargetValue() != null)
            goal.setTargetValue(request.getTargetValue());
        if (request.getCurrentValue() != null)
            goal.setCurrentValue(request.getCurrentValue());
        if (request.getMeasurementUnit() != null)
            goal.setMeasurementUnit(request.getMeasurementUnit());
        if (request.getStartDate() != null)
            goal.setStartDate(request.getStartDate());
        if (request.getDueDate() != null)
            goal.setDueDate(request.getDueDate());
        if (request.getStatus() != null)
            goal.setStatus(request.getStatus());
        if (request.getProgressPercentage() != null)
            goal.setProgressPercentage(request.getProgressPercentage());
        if (request.getParentGoalId() != null)
            goal.setParentGoalId(request.getParentGoalId());
        if (request.getWeight() != null)
            goal.setWeight(request.getWeight());

        goal = goalRepository.save(goal);

        return mapToResponse(goal);
    }

    @Transactional(readOnly = true)
    public GoalResponse getGoalById(UUID goalId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Goal goal = goalRepository.findByIdAndTenantId(goalId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException(GOAL_NOT_FOUND));

        return mapToResponse(goal);
    }

    @Transactional(readOnly = true)
    public Page<GoalResponse> getAllGoals(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Page<Goal> goals = goalRepository.findAllByTenantId(tenantId, pageable);
        return mapPage(goals);
    }

    @Transactional(readOnly = true)
    public List<GoalResponse> getEmployeeGoals(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<Goal> goals = goalRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId);
        return mapList(goals);
    }

    @Transactional
    public GoalResponse updateProgress(UUID goalId, Integer progressPercentage) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Goal goal = goalRepository.findByIdAndTenantId(goalId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException(GOAL_NOT_FOUND));

        goal.setProgressPercentage(progressPercentage);

        if (progressPercentage >= 100) {
            goal.setStatus(Goal.GoalStatus.COMPLETED);
        }

        goal = goalRepository.save(goal);

        return mapToResponse(goal);
    }

    @Transactional
    public void deleteGoal(UUID goalId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Goal goal = goalRepository.findByIdAndTenantId(goalId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException(GOAL_NOT_FOUND));
        goalRepository.delete(goal);
    }

    @Transactional
    public GoalResponse approveGoal(UUID goalId, UUID approverId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Goal goal = goalRepository.findByIdAndTenantId(goalId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException(GOAL_NOT_FOUND));

        goal.setApprovedBy(approverId);
        goal.setStatus(Goal.GoalStatus.ACTIVE);

        goal = goalRepository.save(goal);

        return mapToResponse(goal);
    }

    @Transactional(readOnly = true)
    public List<GoalResponse> getTeamGoals(UUID managerId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<Goal> goals = goalRepository.findTeamGoals(tenantId, managerId);
        return mapList(goals);
    }

    @Transactional(readOnly = true)
    public Page<GoalResponse> getEmployeeGoalsPaged(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return mapPage(goalRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId, pageable));
    }

    @Transactional(readOnly = true)
    public Page<GoalResponse> getTeamGoalsPaged(UUID managerId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return mapPage(goalRepository.findTeamGoals(tenantId, managerId, pageable));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getGoalAnalytics() {
        UUID tenantId = TenantContext.getCurrentTenant();

        Map<String, Object> analytics = new HashMap<>();
        analytics.put("completedGoals", goalRepository.countCompletedGoals(tenantId));
        analytics.put("averageProgress", goalRepository.getAverageProgress(tenantId));

        long activeGoals = goalRepository.findByStatus(tenantId, Goal.GoalStatus.ACTIVE).size();
        analytics.put("activeGoals", activeGoals);

        return analytics;
    }

    // --- Batch mapping (N+1 elimination) -------------------------------------

    private List<GoalResponse> mapList(List<Goal> goals) {
        Map<UUID, String> employeeNames = buildEmployeeNameCache(goals);
        Map<UUID, String> parentGoalTitles = buildParentGoalTitleCache(goals);
        List<GoalResponse> responses = new java.util.ArrayList<>(goals.size());
        for (Goal goal : goals) {
            responses.add(mapToResponse(goal, employeeNames, parentGoalTitles));
        }
        return responses;
    }

    private Page<GoalResponse> mapPage(Page<Goal> goals) {
        List<Goal> content = goals.getContent();
        Map<UUID, String> employeeNames = buildEmployeeNameCache(content);
        Map<UUID, String> parentGoalTitles = buildParentGoalTitleCache(content);
        return goals.map(goal -> mapToResponse(goal, employeeNames, parentGoalTitles));
    }

    /**
     * Bulk-loads employee full names for all employee/createdBy/approvedBy ids
     * referenced by the given goals. Values may be null, so a manual put loop is
     * used instead of Collectors.toMap.
     */
    private Map<UUID, String> buildEmployeeNameCache(List<Goal> goals) {
        Set<UUID> employeeIds = new HashSet<>();
        for (Goal goal : goals) {
            if (goal.getEmployeeId() != null) {
                employeeIds.add(goal.getEmployeeId());
            }
            if (goal.getCreatedBy() != null) {
                employeeIds.add(goal.getCreatedBy());
            }
            if (goal.getApprovedBy() != null) {
                employeeIds.add(goal.getApprovedBy());
            }
        }

        Map<UUID, String> names = new HashMap<>();
        if (!employeeIds.isEmpty()) {
            employeeRepository.findAllById(employeeIds)
                    .forEach(employee -> names.put(employee.getId(), employee.getFullName()));
        }
        return names;
    }

    /**
     * Bulk-loads parent goal titles for all parentGoalId references. Values may
     * be null, so a manual put loop is used instead of Collectors.toMap.
     */
    private Map<UUID, String> buildParentGoalTitleCache(List<Goal> goals) {
        Set<UUID> parentGoalIds = new HashSet<>();
        for (Goal goal : goals) {
            if (goal.getParentGoalId() != null) {
                parentGoalIds.add(goal.getParentGoalId());
            }
        }

        Map<UUID, String> titles = new HashMap<>();
        if (!parentGoalIds.isEmpty()) {
            goalRepository.findAllById(parentGoalIds)
                    .forEach(parentGoal -> titles.put(parentGoal.getId(), parentGoal.getTitle()));
        }
        return titles;
    }

    /**
     * Single-item path. Delegates to the cache-backed overload via single-entry
     * caches so the builder/enrichment logic lives in one place (DRY).
     */
    private GoalResponse mapToResponse(Goal goal) {
        return mapToResponse(goal,
                buildEmployeeNameCache(List.of(goal)),
                buildParentGoalTitleCache(List.of(goal)));
    }

    private GoalResponse mapToResponse(Goal goal,
                                       Map<UUID, String> employeeNames,
                                       Map<UUID, String> parentGoalTitles) {
        GoalResponse response = GoalResponse.builder()
                .id(goal.getId())
                .employeeId(goal.getEmployeeId())
                .title(goal.getTitle())
                .description(goal.getDescription())
                .goalType(goal.getGoalType())
                .category(goal.getCategory())
                .targetValue(goal.getTargetValue())
                .currentValue(goal.getCurrentValue())
                .measurementUnit(goal.getMeasurementUnit())
                .startDate(goal.getStartDate())
                .dueDate(goal.getDueDate())
                .status(goal.getStatus())
                .progressPercentage(goal.getProgressPercentage())
                .parentGoalId(goal.getParentGoalId())
                .weight(goal.getWeight())
                .createdBy(goal.getCreatedBy())
                .approvedBy(goal.getApprovedBy())
                .createdAt(goal.getCreatedAt())
                .updatedAt(goal.getUpdatedAt())
                .build();

        // Enrich with employee name
        if (goal.getEmployeeId() != null && employeeNames.containsKey(goal.getEmployeeId())) {
            response.setEmployeeName(employeeNames.get(goal.getEmployeeId()));
        }

        // Enrich with parent goal title
        if (goal.getParentGoalId() != null && parentGoalTitles.containsKey(goal.getParentGoalId())) {
            response.setParentGoalTitle(parentGoalTitles.get(goal.getParentGoalId()));
        }

        // Enrich with created by name
        if (goal.getCreatedBy() != null && employeeNames.containsKey(goal.getCreatedBy())) {
            response.setCreatedByName(employeeNames.get(goal.getCreatedBy()));
        }

        // Enrich with approved by name
        if (goal.getApprovedBy() != null && employeeNames.containsKey(goal.getApprovedBy())) {
            response.setApprovedByName(employeeNames.get(goal.getApprovedBy()));
        }

        return response;
    }
}
