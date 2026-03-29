package com.hrms.application.performance.service;

import com.hrms.application.performance.dto.GoalRequest;
import com.hrms.application.performance.dto.GoalResponse;
import com.hrms.common.security.TenantContext;

import com.hrms.domain.performance.Goal;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.performance.repository.GoalRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class GoalService {

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
                .orElseThrow(() -> new RuntimeException("Goal not found"));

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
                .orElseThrow(() -> new RuntimeException("Goal not found"));

        return mapToResponse(goal);
    }

    @Transactional(readOnly = true)
    public Page<GoalResponse> getAllGoals(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Page<Goal> goals = goalRepository.findAllByTenantId(tenantId, pageable);
        return goals.map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<GoalResponse> getEmployeeGoals(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<Goal> goals = goalRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId);
        return goals.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public GoalResponse updateProgress(UUID goalId, Integer progressPercentage) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Goal goal = goalRepository.findByIdAndTenantId(goalId, tenantId)
                .orElseThrow(() -> new RuntimeException("Goal not found"));

        goal.setProgressPercentage(progressPercentage);

        if (progressPercentage >= 100) {
            goal.setStatus(Goal.GoalStatus.COMPLETED);
        }

        goal = goalRepository.save(goal);

        return mapToResponse(goal);
    }

    @Transactional
    public GoalResponse approveGoal(UUID goalId, UUID approverId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Goal goal = goalRepository.findByIdAndTenantId(goalId, tenantId)
                .orElseThrow(() -> new RuntimeException("Goal not found"));

        goal.setApprovedBy(approverId);
        goal.setStatus(Goal.GoalStatus.ACTIVE);

        goal = goalRepository.save(goal);

        return mapToResponse(goal);
    }

    @Transactional(readOnly = true)
    public List<GoalResponse> getTeamGoals(UUID managerId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<Goal> goals = goalRepository.findTeamGoals(tenantId, managerId);
        return goals.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<GoalResponse> getEmployeeGoalsPaged(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return goalRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public Page<GoalResponse> getTeamGoalsPaged(UUID managerId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return goalRepository.findTeamGoals(tenantId, managerId, pageable)
                .map(this::mapToResponse);
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

    private GoalResponse mapToResponse(Goal goal) {
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
        if (goal.getEmployeeId() != null) {
            employeeRepository.findById(goal.getEmployeeId())
                    .ifPresent(employee -> response.setEmployeeName(employee.getFullName()));
        }

        // Enrich with parent goal title
        if (goal.getParentGoalId() != null) {
            goalRepository.findById(goal.getParentGoalId())
                    .ifPresent(parentGoal -> response.setParentGoalTitle(parentGoal.getTitle()));
        }

        // Enrich with created by name
        if (goal.getCreatedBy() != null) {
            employeeRepository.findById(goal.getCreatedBy())
                    .ifPresent(employee -> response.setCreatedByName(employee.getFullName()));
        }

        // Enrich with approved by name
        if (goal.getApprovedBy() != null) {
            employeeRepository.findById(goal.getApprovedBy())
                    .ifPresent(employee -> response.setApprovedByName(employee.getFullName()));
        }

        return response;
    }
}
