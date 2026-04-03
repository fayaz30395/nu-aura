package com.hrms.api.admin.controller;

import com.hrms.api.admin.dto.AdminStatsResponse;
import com.hrms.api.admin.dto.AdminUserResponse;
import com.hrms.api.admin.dto.UpdateUserRoleRequest;
import com.hrms.api.employee.dto.EmployeeResponse;
import com.hrms.application.admin.service.AdminService;
import com.hrms.application.auth.service.EmployeeLinkerService;
import com.hrms.common.security.RequiresPermission;
import org.springframework.boot.actuate.health.HealthComponent;
import org.springframework.boot.actuate.health.HealthEndpoint;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

import static com.hrms.common.security.Permission.SYSTEM_ADMIN;

/**
 * SuperAdmin platform administration controller
 * All endpoints require SYSTEM_ADMIN permission (SuperAdmin role)
 * SuperAdmin users can view and manage across all tenants
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Admin", description = "SuperAdmin platform administration endpoints")
public class AdminController {

    private final AdminService adminService;
    private final EmployeeLinkerService employeeLinkerService;
    private final HealthEndpoint healthEndpoint;

    /**
     * Bug #1 FIX: Expose system health to the admin dashboard.
     * Delegates to Spring Actuator's HealthEndpoint for real component status
     * (DB, Redis, Kafka, liveness, readiness). Returns 200 with the health payload;
     * the frontend maps component statuses to the System Health panel.
     */
    @GetMapping("/health")
    @Operation(summary = "Get system health", description = "Returns real-time health status of all platform components (DB, Redis, Kafka, liveness, readiness) via Spring Actuator")
    @RequiresPermission(SYSTEM_ADMIN)
    public ResponseEntity<HealthComponent> getSystemHealth() {
        log.info("SuperAdmin requesting system health");
        return ResponseEntity.ok(healthEndpoint.health());
    }

    /**
     * Get platform settings
     * SuperAdmin only - returns platform configuration
     */
    @GetMapping("/settings")
    @Operation(summary = "Get platform settings", description = "Returns global platform configuration settings (SuperAdmin only)")
    @RequiresPermission(SYSTEM_ADMIN)
    public ResponseEntity<Map<String, Object>> getSettings() {
        log.info("SuperAdmin requesting platform settings");
        Map<String, Object> settings = adminService.getPlatformSettings();
        return ResponseEntity.ok(settings);
    }

    /**
     * Get global platform statistics
     * SuperAdmin only - returns aggregated stats across all tenants
     */
    @GetMapping("/stats")
    @Operation(summary = "Get platform statistics", description = "Returns global platform statistics: total tenants, employees, pending approvals, and active users")
    @RequiresPermission(SYSTEM_ADMIN)
    public ResponseEntity<AdminStatsResponse> getStats() {
        log.info("SuperAdmin requesting global platform statistics");
        AdminStatsResponse stats = adminService.getGlobalStats();
        return ResponseEntity.ok(stats);
    }

    /**
     * Get paginated list of all users across all tenants
     * SuperAdmin only - can see all users with tenant information
     */
    @GetMapping("/users")
    @Operation(summary = "Get all users with pagination", description = "Returns a paginated list of all users across all tenants with their roles and tenant information")
    @RequiresPermission(SYSTEM_ADMIN)
    public ResponseEntity<Page<AdminUserResponse>> getUsers(
            @PageableDefault(size = 20, page = 0) Pageable pageable) {
        log.info("SuperAdmin requesting paginated user list, page: {}, size: {}", pageable.getPageNumber(), pageable.getPageSize());
        Page<AdminUserResponse> users = adminService.getAllUsers(pageable);
        return ResponseEntity.ok(users);
    }

    /**
     * Update a user's roles
     * SuperAdmin only - can assign/update roles for any user across any tenant
     */
    @PatchMapping("/users/{userId}/role")
    @RequiresPermission(SYSTEM_ADMIN)
    @Operation(summary = "Update user roles", description = "Update the roles assigned to a specific user. SuperAdmin can update any user's roles")
    public ResponseEntity<AdminUserResponse> updateUserRole(
            @Parameter(description = "User ID to update")
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserRoleRequest request) {
        log.info("SuperAdmin updating roles for user: {}", userId);
        AdminUserResponse updatedUser = adminService.updateUserRole(userId, request);
        return ResponseEntity.ok(updatedUser);
    }

    /**
     * Link or create an employee record for a user
     * SuperAdmin only - used to link users to employees or create new employee records
     */
    @PostMapping("/users/{userId}/link-employee")
    @RequiresPermission(SYSTEM_ADMIN)
    @Operation(summary = "Link or create employee for user", description = "Link an existing employee to a user or create a new minimal employee record. Useful for SuperAdmin and other users who don't have employee profiles.")
    public ResponseEntity<EmployeeResponse> linkOrCreateEmployee(
            @Parameter(description = "User ID to link employee for")
            @PathVariable UUID userId) {
        log.info("SuperAdmin linking/creating employee for user: {}", userId);
        EmployeeResponse employee = employeeLinkerService.linkOrCreateEmployeeForUser(userId);
        return ResponseEntity.ok(employee);
    }
}
