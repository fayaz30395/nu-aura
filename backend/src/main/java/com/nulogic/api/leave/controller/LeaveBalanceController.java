package com.nulogic.api.leave.controller;

import com.nulogic.api.leave.dto.LeaveBalanceResponse;
import com.nulogic.api.leave.dto.LeaveEncashmentRequest;
import com.nulogic.api.leave.dto.LeaveEncashmentResponse;
import com.nulogic.application.leave.service.LeaveBalanceService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.domain.leave.LeaveBalance;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/leave-balances")
@RequiredArgsConstructor
@Tag(name = "Leave Balances", description = "Employee leave balances, encashment, and annual carry-forward operations")
public class LeaveBalanceController {

    private final LeaveBalanceService leaveBalanceService;

    /**
     * RBAC-2 IDOR FIX: Enforces data-scope on /employee/{employeeId} endpoints.
     * Mirrors EmployeeController.enforceEmployeeViewScope.
     * Scope hierarchy: LEAVE_VIEW_ALL > LEAVE_VIEW_TEAM (direct/indirect reportees)
     * > LEAVE_VIEW_SELF (own record only).
     * SuperAdmin is already bypassed at the @RequiresPermission aspect level.
     */
    private void enforceLeaveBalanceViewScope(UUID targetEmployeeId) {
        // SuperAdmin and TenantAdmin bypass all scope checks
        if (SecurityContext.isSuperAdmin() || SecurityContext.isTenantAdmin()) {
            return;
        }

        // VIEW_ALL: can see any employee's balances within the tenant
        if (SecurityContext.hasPermission(Permission.LEAVE_VIEW_ALL)) {
            return;
        }

        // VIEW_SELF: can only see own balances
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
        if (currentEmployeeId != null && currentEmployeeId.equals(targetEmployeeId)) {
            return;
        }

        // VIEW_TEAM: can see direct/indirect reportees' balances
        if (SecurityContext.hasPermission(Permission.LEAVE_VIEW_TEAM)
                && SecurityContext.getAllReporteeIds().contains(targetEmployeeId)) {
            return;
        }

        throw new AccessDeniedException(
                "You are not authorized to view leave balances for this employee");
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission({Permission.LEAVE_VIEW_ALL, Permission.LEAVE_VIEW_TEAM, Permission.LEAVE_VIEW_SELF})
    @Operation(summary = "Get leave balances for employee",
            description = "Returns all current leave balances for the employee, enriched with leave type names (batched lookup)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Balances retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — insufficient scope for this employee"),
            @ApiResponse(responseCode = "404", description = "Employee not found")
    })
    public ResponseEntity<List<LeaveBalanceResponse>> getEmployeeBalances(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId) {
        enforceLeaveBalanceViewScope(employeeId);
        // PERF (wave-3 H4): delegate to the batched service method which
        // collapses the per-row LeaveType lookup into a single IN(...) query.
        return ResponseEntity.ok(leaveBalanceService.getEmployeeBalancesEnriched(employeeId));
    }

    @GetMapping("/employee/{employeeId}/year/{year}")
    @RequiresPermission({Permission.LEAVE_VIEW_ALL, Permission.LEAVE_VIEW_TEAM, Permission.LEAVE_VIEW_SELF})
    @Operation(summary = "Get leave balances for employee by year",
            description = "Returns leave balances for the employee scoped to the specified calendar year")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Balances retrieved successfully"),
            @ApiResponse(responseCode = "403", description = "Forbidden — insufficient scope for this employee"),
            @ApiResponse(responseCode = "404", description = "Employee not found")
    })
    public ResponseEntity<List<LeaveBalanceResponse>> getEmployeeBalancesForYear(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId,
            @Parameter(description = "Calendar year", example = "2026") @PathVariable Integer year) {
        enforceLeaveBalanceViewScope(employeeId);
        return ResponseEntity.ok(leaveBalanceService.getEmployeeBalancesForYearEnriched(employeeId, year));
    }

    @PostMapping("/encash")
    @RequiresPermission({Permission.LEAVE_BALANCE_ENCASH, Permission.LEAVE_BALANCE_MANAGE})
    @Operation(summary = "Encash leave balance",
            description = "Convert unused leave days to monetary equivalent (deducts from the targeted balance)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Encashment processed successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request — insufficient days or rule violation"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires LEAVE:BALANCE_ENCASH or LEAVE:BALANCE_MANAGE permission"),
            @ApiResponse(responseCode = "404", description = "Leave balance not found")
    })
    public ResponseEntity<LeaveEncashmentResponse> encashLeave(@Valid @RequestBody LeaveEncashmentRequest request) {
        log.info("Leave encashment request: balanceId={}, days={}", request.getLeaveBalanceId(), request.getDaysToEncash());

        LeaveBalance updatedBalance = leaveBalanceService.encashLeave(
                request.getLeaveBalanceId(),
                request.getDaysToEncash());

        LeaveEncashmentResponse response = LeaveEncashmentResponse.builder()
                .id(updatedBalance.getId())
                .leaveBalanceId(updatedBalance.getId())
                .daysEncashed(request.getDaysToEncash())
                .status("SUCCESS")
                .message("Successfully encashed " + request.getDaysToEncash() + " days")
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/admin/carry-forward")
    @RequiresPermission(Permission.LEAVE_BALANCE_MANAGE)
    @Operation(summary = "Carry forward leave balances (admin)",
            description = "Bulk-rolls remaining balances from the specified year to the next year per leave-type policy")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Carry-forward completed; returns count of balances rolled"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires LEAVE:BALANCE_MANAGE permission")
    })
    public ResponseEntity<java.util.Map<String, Object>> carryForwardBalances(
            @Parameter(description = "Source year to carry forward from", example = "2025") @RequestParam int fromYear) {
        log.info("Admin carry-forward request for year {}", fromYear);
        int count = leaveBalanceService.carryForwardBalances(fromYear);
        return ResponseEntity.ok(java.util.Map.of(
                "message", "Carry-forward complete",
                "fromYear", fromYear,
                "toYear", fromYear + 1,
                "balancesCarried", count));
    }
}
