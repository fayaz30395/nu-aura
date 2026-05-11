package com.hrms.api.performance;

import com.hrms.application.performance.dto.GoalRequest;
import com.hrms.application.performance.dto.GoalResponse;
import com.hrms.application.performance.service.GoalService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Performance Goals", description = "Employee performance goal management APIs")
public class GoalController {

    /** Allow-list of sortable fields for {@code Goal} entity — prevents sort injection. */
    private static final java.util.Set<String> ALLOWED_SORT_FIELDS = java.util.Set.of(
            "createdAt", "updatedAt", "title", "goalType", "category", "status",
            "startDate", "dueDate", "progressPercentage"
    );

    private final GoalService goalService;

    @PostMapping
    @RequiresPermission(Permission.GOAL_CREATE)
    @Operation(summary = "Create goal", description = "Creates a new performance goal for an employee")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Goal created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires GOAL:CREATE permission")
    })
    public ResponseEntity<GoalResponse> createGoal(@Valid @RequestBody GoalRequest request) {
        GoalResponse response = goalService.createGoal(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @RequiresPermission(Permission.GOAL_VIEW)
    @Operation(summary = "List all goals", description = "Returns a paginated list of goals across the tenant")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Goals retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires GOAL:VIEW permission")
    })
    public ResponseEntity<Page<GoalResponse>> getAllGoals(
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort by field") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction (ASC/DESC)") @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        String safeSortBy = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "createdAt";
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, safeSortBy));
        Page<GoalResponse> goals = goalService.getAllGoals(pageable);
        return ResponseEntity.ok(goals);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.GOAL_VIEW)
    @Operation(summary = "Get goal by ID", description = "Returns a single goal by its UUID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Goal found"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires GOAL:VIEW permission"),
            @ApiResponse(responseCode = "404", description = "Goal not found")
    })
    public ResponseEntity<GoalResponse> getGoalById(
            @Parameter(description = "Goal UUID") @PathVariable UUID id) {
        GoalResponse response = goalService.getGoalById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(Permission.GOAL_VIEW)
    @Operation(summary = "List employee goals", description = "Returns all goals belonging to the specified employee")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Goals retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires GOAL:VIEW permission")
    })
    public ResponseEntity<List<GoalResponse>> getEmployeeGoals(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId) {
        List<GoalResponse> goals = goalService.getEmployeeGoals(employeeId);
        return ResponseEntity.ok(goals);
    }

    /**
     * Paginated variant — prefer this for employees with large goal histories.
     */
    @GetMapping("/employee/{employeeId}/paged")
    @RequiresPermission(Permission.GOAL_VIEW)
    @Operation(summary = "List employee goals (paginated)", description = "Returns a paginated list of goals for the specified employee")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Goals retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires GOAL:VIEW permission")
    })
    public ResponseEntity<Page<GoalResponse>> getEmployeeGoalsPaged(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId,
            Pageable pageable) {
        Page<GoalResponse> goals = goalService.getEmployeeGoalsPaged(employeeId, pageable);
        return ResponseEntity.ok(goals);
    }

    @GetMapping("/team/{managerId}")
    @RequiresPermission(Permission.GOAL_VIEW)
    @Operation(summary = "List team goals", description = "Returns all goals owned by the manager's reportees")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Team goals retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires GOAL:VIEW permission")
    })
    public ResponseEntity<List<GoalResponse>> getTeamGoals(
            @Parameter(description = "Manager UUID") @PathVariable UUID managerId) {
        List<GoalResponse> goals = goalService.getTeamGoals(managerId);
        return ResponseEntity.ok(goals);
    }

    /**
     * Paginated variant — prefer this for managers with large teams.
     */
    @GetMapping("/team/{managerId}/paged")
    @RequiresPermission(Permission.GOAL_VIEW)
    @Operation(summary = "List team goals (paginated)", description = "Returns a paginated list of goals owned by the manager's reportees")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Team goals retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires GOAL:VIEW permission")
    })
    public ResponseEntity<Page<GoalResponse>> getTeamGoalsPaged(
            @Parameter(description = "Manager UUID") @PathVariable UUID managerId,
            Pageable pageable) {
        Page<GoalResponse> goals = goalService.getTeamGoalsPaged(managerId, pageable);
        return ResponseEntity.ok(goals);
    }

    @GetMapping("/analytics")
    @RequiresPermission(Permission.GOAL_VIEW)
    @Operation(summary = "Get goal analytics", description = "Returns aggregated metrics: completion rate, status counts, average progress")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Analytics retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires GOAL:VIEW permission")
    })
    public ResponseEntity<Map<String, Object>> getGoalAnalytics() {
        Map<String, Object> analytics = goalService.getGoalAnalytics();
        return ResponseEntity.ok(analytics);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.GOAL_UPDATE)
    @Operation(summary = "Update goal", description = "Updates an existing goal's details")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Goal updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires GOAL:UPDATE permission"),
            @ApiResponse(responseCode = "404", description = "Goal not found")
    })
    public ResponseEntity<GoalResponse> updateGoal(
            @Parameter(description = "Goal UUID") @PathVariable UUID id,
            @Valid @RequestBody GoalRequest request
    ) {
        GoalResponse response = goalService.updateGoal(id, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/progress")
    @RequiresPermission(Permission.GOAL_UPDATE)
    @Operation(summary = "Update goal progress", description = "Updates the progress percentage of a goal (0-100)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Progress updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid progress value"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires GOAL:UPDATE permission"),
            @ApiResponse(responseCode = "404", description = "Goal not found")
    })
    public ResponseEntity<GoalResponse> updateProgress(
            @Parameter(description = "Goal UUID") @PathVariable UUID id,
            @Parameter(description = "Progress percentage (0-100)") @RequestParam Integer progressPercentage
    ) {
        GoalResponse response = goalService.updateProgress(id, progressPercentage);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.GOAL_DELETE)
    @Operation(summary = "Delete goal", description = "Soft-deletes a goal record")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Goal deleted successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires GOAL:DELETE permission"),
            @ApiResponse(responseCode = "404", description = "Goal not found")
    })
    public ResponseEntity<Void> deleteGoal(
            @Parameter(description = "Goal UUID") @PathVariable UUID id) {
        goalService.deleteGoal(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/approve")
    @RequiresPermission(Permission.GOAL_APPROVE)
    @Operation(summary = "Approve goal", description = "Approves a goal, recording the approver's identity")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Goal approved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires GOAL:APPROVE permission"),
            @ApiResponse(responseCode = "404", description = "Goal not found")
    })
    public ResponseEntity<GoalResponse> approveGoal(
            @Parameter(description = "Goal UUID") @PathVariable UUID id) {
        UUID approverId = SecurityContext.getCurrentEmployeeId() != null
                ? SecurityContext.getCurrentEmployeeId() : SecurityContext.getCurrentUserId();
        GoalResponse response = goalService.approveGoal(id, approverId);
        return ResponseEntity.ok(response);
    }
}
