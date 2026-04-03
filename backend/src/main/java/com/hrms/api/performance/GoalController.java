package com.hrms.api.performance;

import com.hrms.application.performance.dto.GoalRequest;
import com.hrms.application.performance.dto.GoalResponse;
import com.hrms.application.performance.service.GoalService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/goals")
@RequiredArgsConstructor
public class GoalController {

    private final GoalService goalService;

    @PostMapping
    @RequiresPermission(Permission.GOAL_CREATE)
    public ResponseEntity<GoalResponse> createGoal(@Valid @RequestBody GoalRequest request) {
        GoalResponse response = goalService.createGoal(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @RequiresPermission(Permission.GOAL_VIEW)
    public ResponseEntity<Page<GoalResponse>> getAllGoals(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<GoalResponse> goals = goalService.getAllGoals(pageable);
        return ResponseEntity.ok(goals);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.GOAL_VIEW)
    public ResponseEntity<GoalResponse> getGoalById(@PathVariable UUID id) {
        GoalResponse response = goalService.getGoalById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(Permission.GOAL_VIEW)
    public ResponseEntity<List<GoalResponse>> getEmployeeGoals(@PathVariable UUID employeeId) {
        List<GoalResponse> goals = goalService.getEmployeeGoals(employeeId);
        return ResponseEntity.ok(goals);
    }

    /**
     * Paginated variant — prefer this for employees with large goal histories.
     */
    @GetMapping("/employee/{employeeId}/paged")
    @RequiresPermission(Permission.GOAL_VIEW)
    public ResponseEntity<Page<GoalResponse>> getEmployeeGoalsPaged(
            @PathVariable UUID employeeId,
            Pageable pageable) {
        Page<GoalResponse> goals = goalService.getEmployeeGoalsPaged(employeeId, pageable);
        return ResponseEntity.ok(goals);
    }

    @GetMapping("/team/{managerId}")
    @RequiresPermission(Permission.GOAL_VIEW)
    public ResponseEntity<List<GoalResponse>> getTeamGoals(@PathVariable UUID managerId) {
        List<GoalResponse> goals = goalService.getTeamGoals(managerId);
        return ResponseEntity.ok(goals);
    }

    /**
     * Paginated variant — prefer this for managers with large teams.
     */
    @GetMapping("/team/{managerId}/paged")
    @RequiresPermission(Permission.GOAL_VIEW)
    public ResponseEntity<Page<GoalResponse>> getTeamGoalsPaged(
            @PathVariable UUID managerId,
            Pageable pageable) {
        Page<GoalResponse> goals = goalService.getTeamGoalsPaged(managerId, pageable);
        return ResponseEntity.ok(goals);
    }

    @GetMapping("/analytics")
    @RequiresPermission(Permission.GOAL_VIEW)
    public ResponseEntity<Map<String, Object>> getGoalAnalytics() {
        Map<String, Object> analytics = goalService.getGoalAnalytics();
        return ResponseEntity.ok(analytics);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.GOAL_UPDATE)
    public ResponseEntity<GoalResponse> updateGoal(
            @PathVariable UUID id,
            @Valid @RequestBody GoalRequest request
    ) {
        GoalResponse response = goalService.updateGoal(id, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/progress")
    @RequiresPermission(Permission.GOAL_UPDATE)
    public ResponseEntity<GoalResponse> updateProgress(
            @PathVariable UUID id,
            @RequestParam Integer progressPercentage
    ) {
        GoalResponse response = goalService.updateProgress(id, progressPercentage);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.GOAL_DELETE)
    public ResponseEntity<Void> deleteGoal(@PathVariable UUID id) {
        goalService.deleteGoal(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/approve")
    @RequiresPermission(Permission.GOAL_APPROVE)
    public ResponseEntity<GoalResponse> approveGoal(@PathVariable UUID id) {
        UUID approverId = SecurityContext.getCurrentEmployeeId() != null
                ? SecurityContext.getCurrentEmployeeId() : SecurityContext.getCurrentUserId();
        GoalResponse response = goalService.approveGoal(id, approverId);
        return ResponseEntity.ok(response);
    }
}
