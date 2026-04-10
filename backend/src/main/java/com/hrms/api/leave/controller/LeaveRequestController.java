package com.hrms.api.leave.controller;

import com.hrms.api.leave.dto.LeaveRequestRequest;
import com.hrms.api.leave.dto.LeaveRequestResponse;
import com.hrms.application.employee.service.EmployeeService;
import com.hrms.application.leave.service.LeaveRequestService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * REST controller for leave request management.
 * Handles CRUD operations, approvals, and leave request workflows.
 */
@RestController
@RequestMapping("/api/v1/leave-requests")
@RequiredArgsConstructor
@Validated
@Slf4j
@Tag(name = "Leave Requests", description = "Leave request management endpoints for applying, approving, and tracking leave")
public class LeaveRequestController {

    private final LeaveRequestService leaveRequestService;
    private final EmployeeService employeeService;
    private final EmployeeRepository employeeRepository;
    private final com.hrms.common.security.DataScopeService dataScopeService;

    @PostMapping
    @RequiresPermission(Permission.LEAVE_REQUEST)
    @Operation(summary = "Create leave request", description = "Submit a new leave request for approval")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Leave request created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data or insufficient leave balance"),
            @ApiResponse(responseCode = "409", description = "Overlapping leave request exists")
    })
    public ResponseEntity<LeaveRequestResponse> createLeaveRequest(@Valid @RequestBody LeaveRequestRequest request) {
        LeaveRequest leaveRequest = new LeaveRequest();
        BeanUtils.copyProperties(request, leaveRequest);

        // BUG-QA2-001 FIX: totalDays is now optional in the request DTO.
        // If the frontend omits it, compute it from startDate / endDate.
        if (leaveRequest.getTotalDays() == null && request.getStartDate() != null && request.getEndDate() != null) {
            long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(
                    request.getStartDate(), request.getEndDate()) + 1;
            leaveRequest.setTotalDays(new java.math.BigDecimal(daysBetween));
        }

        if (request.getHalfDayPeriod() != null) {
            // BUG-QA2-007 FIX: Normalize frontend aliases MORNING/AFTERNOON to
            // Java enum values FIRST_HALF/SECOND_HALF before calling valueOf().
            String normalizedPeriod = switch (request.getHalfDayPeriod().toUpperCase()) {
                case "MORNING" -> "FIRST_HALF";
                case "AFTERNOON" -> "SECOND_HALF";
                default -> request.getHalfDayPeriod().toUpperCase();
            };
            leaveRequest.setHalfDayPeriod(LeaveRequest.HalfDayPeriod.valueOf(normalizedPeriod));
        }
        LeaveRequest created = leaveRequestService.createLeaveRequest(leaveRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(created));
    }

    @GetMapping("/{id}")
    @RequiresPermission({
            Permission.LEAVE_VIEW_ALL,
            Permission.LEAVE_VIEW_TEAM,
            Permission.LEAVE_VIEW_SELF
    })
    @Operation(summary = "Get leave request by ID", description = "Retrieve a specific leave request by its UUID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Leave request found"),
            @ApiResponse(responseCode = "403", description = "Access denied - insufficient scope"),
            @ApiResponse(responseCode = "404", description = "Leave request not found")
    })
    public ResponseEntity<LeaveRequestResponse> getLeaveRequest(
            @Parameter(description = "Leave request UUID") @PathVariable UUID id) {
        LeaveRequest leaveRequest = leaveRequestService.getLeaveRequestById(id);

        // Enforce scope: validate the user can access this leave request
        String permission = determineViewPermission();
        validateLeaveRequestAccess(leaveRequest, permission);

        return ResponseEntity.ok(toResponse(leaveRequest));
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission({
            Permission.LEAVE_VIEW_ALL,
            Permission.LEAVE_VIEW_TEAM,
            Permission.LEAVE_VIEW_SELF
    })
    @Operation(summary = "Get employee leave requests", description = "Retrieve paginated leave requests for a specific employee")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Leave requests retrieved successfully"),
            @ApiResponse(responseCode = "403", description = "Access denied - insufficient scope for this employee")
    })
    public ResponseEntity<Page<LeaveRequestResponse>> getEmployeeLeaveRequests(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId,
            Pageable pageable) {
        // Enforce scope: validate the user can access this employee's leave requests
        String permission = determineViewPermission();
        validateEmployeeAccess(employeeId, permission);

        Page<LeaveRequest> requests = leaveRequestService.getLeaveRequestsByEmployee(employeeId, pageable);
        return ResponseEntity.ok(toBatchResponse(requests));
    }

    @GetMapping("/status/{status}")
    @RequiresPermission({
            Permission.LEAVE_VIEW_ALL,
            Permission.LEAVE_VIEW_TEAM
    })
    @Operation(summary = "Get leave requests by status", description = "Filter leave requests by status (PENDING, APPROVED, REJECTED, CANCELLED)")
    @ApiResponse(responseCode = "200", description = "Leave requests retrieved successfully")
    public ResponseEntity<Page<LeaveRequestResponse>> getLeaveRequestsByStatus(
            @Parameter(description = "Leave request status") @PathVariable String status,
            Pageable pageable) {
        try {
            LeaveRequest.LeaveRequestStatus leaveStatus = LeaveRequest.LeaveRequestStatus.valueOf(status);

            String permission = com.hrms.common.security.SecurityContext.hasPermission(Permission.LEAVE_VIEW_ALL)
                    ? Permission.LEAVE_VIEW_ALL
                    : Permission.LEAVE_VIEW_TEAM;

            org.springframework.data.jpa.domain.Specification<LeaveRequest> scopeSpec = dataScopeService
                    .getScopeSpecification(permission);

            // Combine status and scope
            org.springframework.data.jpa.domain.Specification<LeaveRequest> combinedSpec = (root, query, cb) -> cb
                    .and(cb.equal(root.get("status"), leaveStatus), scopeSpec.toPredicate(root, query, cb));

            Page<LeaveRequest> requests = leaveRequestService.getAllLeaveRequests(combinedSpec, pageable);
            return ResponseEntity.ok(toBatchResponse(requests));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid leave request status '{}': {}", status, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Failed to fetch leave requests by status '{}': {}", status, e.getMessage());
            return ResponseEntity.ok(Page.empty(pageable).map(r -> new LeaveRequestResponse()));
        }
    }

    @GetMapping
    @RequiresPermission({
            Permission.LEAVE_VIEW_ALL,
            Permission.LEAVE_VIEW_TEAM,
            Permission.LEAVE_VIEW_SELF
    })
    @Operation(summary = "Get all leave requests", description = "List leave requests with optional status filter via ?status= query param")
    @ApiResponse(responseCode = "200", description = "Leave requests retrieved successfully")
    public ResponseEntity<Page<LeaveRequestResponse>> getLeaveRequests(
            @Parameter(description = "Filter by status (PENDING, APPROVED, REJECTED, CANCELLED)")
            @org.springframework.web.bind.annotation.RequestParam(required = false) String status,
            Pageable pageable) {
        // BUG-033 FIX: Determine view permission including LEAVE_VIEW_SELF.
        // Users with only LEAVE_VIEW_SELF see their own leave requests only.
        String permission;
        if (com.hrms.common.security.SecurityContext.hasPermission(Permission.LEAVE_VIEW_ALL)) {
            permission = Permission.LEAVE_VIEW_ALL;
        } else if (com.hrms.common.security.SecurityContext.hasPermission(Permission.LEAVE_VIEW_TEAM)) {
            permission = Permission.LEAVE_VIEW_TEAM;
        } else {
            permission = Permission.LEAVE_VIEW_SELF;
        }

        org.springframework.data.jpa.domain.Specification<LeaveRequest> spec;
        if (Permission.LEAVE_VIEW_SELF.equals(permission)) {
            // SELF scope: filter to current employee's own leave requests
            UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
            spec = (root, query, cb) -> cb.equal(root.get("employeeId"), currentEmployeeId);
        } else {
            spec = dataScopeService.getScopeSpecification(permission);
        }

        if (status != null && !status.isBlank()) {
            LeaveRequest.LeaveRequestStatus leaveStatus = LeaveRequest.LeaveRequestStatus.valueOf(status.toUpperCase());
            final org.springframework.data.jpa.domain.Specification<LeaveRequest> scopeSpec = spec;
            spec = (root, query, cb) -> cb.and(
                    cb.equal(root.get("status"), leaveStatus),
                    scopeSpec.toPredicate(root, query, cb));
        }

        Page<LeaveRequest> requests = leaveRequestService.getAllLeaveRequests(spec, pageable);
        return ResponseEntity.ok(toBatchResponse(requests));
    }

    @PostMapping("/{id}/approve")
    @RequiresPermission(Permission.LEAVE_APPROVE)
    @Operation(summary = "Approve leave request", description = "Approve a pending leave request (must be the employee's manager)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Leave request approved successfully"),
            @ApiResponse(responseCode = "403", description = "Not authorized to approve this request"),
            @ApiResponse(responseCode = "404", description = "Leave request not found"),
            @ApiResponse(responseCode = "409", description = "Request is not in PENDING status")
    })
    public ResponseEntity<LeaveRequestResponse> approveLeaveRequest(
            @Parameter(description = "Leave request UUID") @PathVariable UUID id) {
        // L1 Approval: Use current user as approver - service validates manager relationship
        UUID approverId = SecurityContext.getCurrentEmployeeId();
        LeaveRequest approved = leaveRequestService.approveLeaveRequest(id, approverId);
        return ResponseEntity.ok(toResponse(approved));
    }

    @PostMapping("/{id}/reject")
    @RequiresPermission(Permission.LEAVE_REJECT)
    @Operation(summary = "Reject leave request", description = "Reject a pending leave request with reason (must be the employee's manager)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Leave request rejected successfully"),
            @ApiResponse(responseCode = "403", description = "Not authorized to reject this request"),
            @ApiResponse(responseCode = "404", description = "Leave request not found"),
            @ApiResponse(responseCode = "409", description = "Request is not in PENDING status")
    })
    public ResponseEntity<LeaveRequestResponse> rejectLeaveRequest(
            @Parameter(description = "Leave request UUID") @PathVariable UUID id,
            @Parameter(description = "Rejection reason") @NotBlank @Size(max = 1000) @RequestParam String reason) {
        // L1 Approval: Use current user as approver - service validates manager relationship
        UUID approverId = SecurityContext.getCurrentEmployeeId();
        LeaveRequest rejected = leaveRequestService.rejectLeaveRequest(id, approverId, reason);
        return ResponseEntity.ok(toResponse(rejected));
    }

    @PostMapping("/{id}/cancel")
    @RequiresPermission(Permission.LEAVE_CANCEL)
    @Operation(summary = "Cancel leave request", description = "Cancel a pending or approved leave request")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Leave request cancelled successfully"),
            @ApiResponse(responseCode = "403", description = "Not authorized to cancel this request"),
            @ApiResponse(responseCode = "404", description = "Leave request not found"),
            @ApiResponse(responseCode = "409", description = "Request cannot be cancelled in current status")
    })
    public ResponseEntity<LeaveRequestResponse> cancelLeaveRequest(
            @Parameter(description = "Leave request UUID") @PathVariable UUID id,
            @Parameter(description = "Cancellation reason") @NotBlank @Size(max = 1000) @RequestParam String reason) {
        LeaveRequest cancelled = leaveRequestService.cancelLeaveRequest(id, reason);
        return ResponseEntity.ok(toResponse(cancelled));
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.LEAVE_REQUEST)
    @Operation(summary = "Update leave request", description = "Update a pending leave request (only owner can update)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Leave request updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "403", description = "Not authorized to update this request"),
            @ApiResponse(responseCode = "404", description = "Leave request not found"),
            @ApiResponse(responseCode = "409", description = "Request cannot be updated in current status")
    })
    public ResponseEntity<LeaveRequestResponse> updateLeaveRequest(
            @Parameter(description = "Leave request UUID") @PathVariable UUID id,
            @Valid @RequestBody LeaveRequestRequest request) {
        LeaveRequest leaveRequestData = new LeaveRequest();
        BeanUtils.copyProperties(request, leaveRequestData);
        if (request.getHalfDayPeriod() != null) {
            // BUG-QA2-007 FIX: Normalize frontend aliases MORNING/AFTERNOON to
            // Java enum values FIRST_HALF/SECOND_HALF before calling valueOf().
            String normalizedPeriod = switch (request.getHalfDayPeriod().toUpperCase()) {
                case "MORNING" -> "FIRST_HALF";
                case "AFTERNOON" -> "SECOND_HALF";
                default -> request.getHalfDayPeriod().toUpperCase();
            };
            leaveRequestData.setHalfDayPeriod(LeaveRequest.HalfDayPeriod.valueOf(normalizedPeriod));
        }
        LeaveRequest updated = leaveRequestService.updateLeaveRequest(id, leaveRequestData);
        return ResponseEntity.ok(toResponse(updated));
    }

    /**
     * Batch-converts a page of LeaveRequest entities to response DTOs.
     *
     * <p>BUG-R05 FIX: Replaces per-request N+1 enrichment with 2 batch queries:
     * 1 query for manager IDs, 1 query for all employee names. Reduces total queries
     * from ~60 (3 per request x 20 per page) to exactly 2, fixing timeout on Neon DB.</p>
     */
    private Page<LeaveRequestResponse> toBatchResponse(Page<LeaveRequest> requests) {
        if (requests.isEmpty()) {
            return requests.map(this::toBasicResponse);
        }

        try {
            // Collect all employee IDs we need to look up
            Set<UUID> employeeIds = new HashSet<>();
            for (LeaveRequest req : requests) {
                if (req.getEmployeeId() != null) employeeIds.add(req.getEmployeeId());
                if (req.getApprovedBy() != null) employeeIds.add(req.getApprovedBy());
            }

            // Batch query 1: get managerId for all employees in this page
            Map<UUID, UUID> managerMap = new HashMap<>();
            if (!employeeIds.isEmpty()) {
                for (Object[] row : employeeRepository.findManagerIdsByIds(employeeIds)) {
                    UUID empId = (UUID) row[0];
                    UUID mgrId = (UUID) row[1];
                    if (mgrId != null) {
                        managerMap.put(empId, mgrId);
                        employeeIds.add(mgrId); // also need manager names
                    }
                }
            }

            // Batch query 2: get full names for all IDs (employees + managers + approvers)
            Map<UUID, String> nameMap = new HashMap<>();
            if (!employeeIds.isEmpty()) {
                for (Object[] row : employeeRepository.findFullNamesByIds(employeeIds)) {
                    nameMap.put((UUID) row[0], (String) row[1]);
                }
            }

            // Map each request using the pre-loaded data
            return requests.map(req -> {
                LeaveRequestResponse resp = toBasicResponse(req);

                if (req.getEmployeeId() != null) {
                    UUID managerId = managerMap.get(req.getEmployeeId());
                    if (managerId != null) {
                        resp.setApproverId(managerId);
                        resp.setPendingApproverName(nameMap.get(managerId));
                    }
                }

                if (req.getApprovedBy() != null) {
                    resp.setApproverName(nameMap.get(req.getApprovedBy()));
                }

                return resp;
            });
        } catch (Exception e) {
            log.warn("Batch enrichment failed, falling back to basic response: {}", e.getMessage());
            return requests.map(this::toBasicResponse);
        }
    }

    /**
     * Basic response mapping without any enrichment (no DB lookups).
     */
    private LeaveRequestResponse toBasicResponse(LeaveRequest request) {
        LeaveRequestResponse response = new LeaveRequestResponse();
        BeanUtils.copyProperties(request, response);
        response.setStatus(request.getStatus() != null ? request.getStatus().name() : "UNKNOWN");
        if (request.getHalfDayPeriod() != null) {
            response.setHalfDayPeriod(request.getHalfDayPeriod().name());
        }
        return response;
    }

    /**
     * Converts a LeaveRequest entity to its response DTO.
     *
     * <p>BUG-004 FIX: Uses lightweight JPQL projection queries (findFullNameById,
     * findManagerIdById) instead of loading full Employee entities. This avoids:
     * <ul>
     *   <li>N+1 query amplification (up to 3 Employee loads per leave request)</li>
     *   <li>EncryptedStringConverter triggering on encrypted fields (taxId, bankAccount)</li>
     *   <li>Connection pool exhaustion under load, which caused the original 503</li>
     * </ul>
     * <p>Note: This method is still used for single-entity responses (approve/reject/cancel).
     * For list endpoints, use {@link #toBatchResponse(Page)} instead.</p>
     */
    private LeaveRequestResponse toResponse(LeaveRequest request) {
        LeaveRequestResponse response = new LeaveRequestResponse();
        BeanUtils.copyProperties(request, response);
        response.setStatus(request.getStatus() != null ? request.getStatus().name() : "UNKNOWN");
        if (request.getHalfDayPeriod() != null) {
            response.setHalfDayPeriod(request.getHalfDayPeriod().name());
        }

        // Use projection queries to avoid loading full Employee entities with encrypted fields
        if (request.getEmployeeId() != null) {
            try {
                // Get managerId via lightweight projection (avoids EncryptedStringConverter)
                Optional<UUID> managerIdOpt = employeeRepository.findManagerIdById(request.getEmployeeId());
                if (managerIdOpt.isPresent() && managerIdOpt.get() != null) {
                    response.setApproverId(managerIdOpt.get());
                    // Get manager name via projection (single-column JPQL, no entity load)
                    employeeRepository.findFullNameById(managerIdOpt.get())
                            .ifPresent(response::setPendingApproverName);
                }
            } catch (Exception e) { // Intentional broad catch — controller error boundary
                log.debug("Non-critical enrichment failed for leave request {}: {}", request.getId(), e.getMessage());
            }
        }

        // If already approved/rejected, get the approver's name via projection
        if (request.getApprovedBy() != null) {
            try {
                employeeRepository.findFullNameById(request.getApprovedBy())
                        .ifPresent(response::setApproverName);
            } catch (Exception e) { // Intentional broad catch — controller error boundary
                log.debug("Non-critical approver name enrichment failed for leave request {}: {}", request.getId(), e.getMessage());
            }
        }

        return response;
    }

    // ==================== Scope Validation Helpers ====================

    /**
     * Determines which view permission the user has (in priority order).
     * Returns the actual permission that has a scope assigned, not just any permission that passes
     * hasPermission() check. This ensures getPermissionScope() can find the scope for validation.
     * <p>
     * Note: Checks for explicit LEAVE_VIEW_* permissions first, then falls back to LEAVE:MANAGE.
     * Permission hierarchy (MODULE:MANAGE implying MODULE:VIEW_*) is handled by @RequiresPermission
     * for access control, and this method ensures scope enforcement works for users with only MANAGE.
     */
    private String determineViewPermission() {
        // Check specific view permissions in priority order (highest to lowest privilege)
        if (SecurityContext.getPermissionScope(Permission.LEAVE_VIEW_ALL) != null) {
            return Permission.LEAVE_VIEW_ALL;
        }
        if (SecurityContext.getPermissionScope(Permission.LEAVE_VIEW_TEAM) != null) {
            return Permission.LEAVE_VIEW_TEAM;
        }
        if (SecurityContext.getPermissionScope(Permission.LEAVE_VIEW_SELF) != null) {
            return Permission.LEAVE_VIEW_SELF;
        }

        // Fallback to LEAVE:MANAGE - users with MANAGE permission can view with that permission's scope
        com.hrms.domain.user.RoleScope manageScope = SecurityContext.getPermissionScope(Permission.LEAVE_MANAGE);
        if (manageScope != null) {
            return Permission.LEAVE_MANAGE;
        }

        // Final fallback: user passed @RequiresPermission check but has no scoped permission
        // This can happen with system admin. Return SELF as safest default for scope lookup.
        return Permission.LEAVE_VIEW_SELF;
    }

    /**
     * Validates that the current user can access a specific leave request based on their scope.
     * Throws AccessDeniedException if access is not allowed.
     */
    private void validateLeaveRequestAccess(LeaveRequest leaveRequest, String permission) {
        validateEmployeeAccess(leaveRequest.getEmployeeId(), permission);
    }

    /**
     * Validates that the current user can access data for a specific employee based on their scope.
     * Throws AccessDeniedException if access is not allowed.
     */
    private void validateEmployeeAccess(UUID targetEmployeeId, String permission) {
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();

        // Super admin (includes system admin and SUPER_ADMIN role) bypasses all checks
        if (SecurityContext.isSuperAdmin()) {
            return;
        }

        com.hrms.domain.user.RoleScope scope = SecurityContext.getPermissionScope(permission);
        if (scope == null) {
            throw new org.springframework.security.access.AccessDeniedException("No access to leave requests");
        }

        switch (scope) {
            case ALL:
                // ALL scope: can access any employee's data
                return;

            case LOCATION:
                // LOCATION scope: target employee must be in same location
                if (isEmployeeInUserLocations(targetEmployeeId)) {
                    return;
                }
                break;

            case DEPARTMENT:
                // DEPARTMENT scope: target employee must be in same department
                if (isEmployeeInUserDepartment(targetEmployeeId)) {
                    return;
                }
                break;

            case TEAM:
                // TEAM scope: target must be self or a reportee
                if (targetEmployeeId.equals(currentEmployeeId) || isReportee(targetEmployeeId)) {
                    return;
                }
                break;

            case SELF:
                // SELF scope: can only access own data
                if (targetEmployeeId.equals(currentEmployeeId)) {
                    return;
                }
                break;

            case CUSTOM:
                // CUSTOM scope: check if target is in custom targets
                if (targetEmployeeId.equals(currentEmployeeId) || isInCustomTargets(targetEmployeeId, permission)) {
                    return;
                }
                break;
        }

        throw new org.springframework.security.access.AccessDeniedException(
                "You do not have permission to access this employee's leave requests");
    }

    private boolean isReportee(UUID employeeId) {
        Set<UUID> reporteeIds = SecurityContext.getAllReporteeIds();
        return reporteeIds != null && reporteeIds.contains(employeeId);
    }

    private boolean isEmployeeInUserLocations(UUID employeeId) {
        Set<UUID> locationIds = SecurityContext.getCurrentLocationIds();
        if (locationIds == null || locationIds.isEmpty()) {
            return false;
        }
        UUID tenantId = TenantContext.getCurrentTenant();
        return employeeService.findByIdAndTenant(employeeId, tenantId)
                .map(emp -> emp.getOfficeLocationId() != null && locationIds.contains(emp.getOfficeLocationId()))
                .orElse(false);
    }

    private boolean isEmployeeInUserDepartment(UUID employeeId) {
        UUID departmentId = SecurityContext.getCurrentDepartmentId();
        if (departmentId == null) {
            return false;
        }
        UUID tenantId = TenantContext.getCurrentTenant();
        return employeeService.findByIdAndTenant(employeeId, tenantId)
                .map(emp -> departmentId.equals(emp.getDepartmentId()))
                .orElse(false);
    }

    private boolean isInCustomTargets(UUID employeeId, String permission) {
        // Check if employee is directly in custom employee targets
        Set<UUID> customEmployeeIds = SecurityContext.getCustomEmployeeIds(permission);
        if (customEmployeeIds != null && customEmployeeIds.contains(employeeId)) {
            return true;
        }

        // Check if employee's department is in custom department targets
        Set<UUID> customDepartmentIds = SecurityContext.getCustomDepartmentIds(permission);
        if (customDepartmentIds != null && !customDepartmentIds.isEmpty()) {
            UUID tenantId = TenantContext.getCurrentTenant();
            Optional<Employee> empOpt = employeeService.findByIdAndTenant(employeeId, tenantId);
            if (empOpt.isPresent() && empOpt.get().getDepartmentId() != null
                    && customDepartmentIds.contains(empOpt.get().getDepartmentId())) {
                return true;
            }
        }

        // Check if employee's location is in custom location targets
        Set<UUID> customLocationIds = SecurityContext.getCustomLocationIds(permission);
        if (customLocationIds != null && !customLocationIds.isEmpty()) {
            UUID tenantId = TenantContext.getCurrentTenant();
            Optional<Employee> empOpt = employeeService.findByIdAndTenant(employeeId, tenantId);
            if (empOpt.isPresent() && empOpt.get().getOfficeLocationId() != null
                    && customLocationIds.contains(empOpt.get().getOfficeLocationId())) {
                return true;
            }
        }

        return false;
    }
}
