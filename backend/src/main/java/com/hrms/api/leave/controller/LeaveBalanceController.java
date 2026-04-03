package com.hrms.api.leave.controller;

import com.hrms.api.leave.dto.LeaveBalanceResponse;
import com.hrms.api.leave.dto.LeaveEncashmentRequest;
import com.hrms.api.leave.dto.LeaveEncashmentResponse;
import com.hrms.application.leave.service.LeaveBalanceService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.leave.LeaveBalance;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/leave-balances")
@RequiredArgsConstructor
public class LeaveBalanceController {

    private final LeaveBalanceService leaveBalanceService;
    private final LeaveTypeRepository leaveTypeRepository;

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission({Permission.LEAVE_VIEW_ALL, Permission.LEAVE_VIEW_TEAM, Permission.LEAVE_VIEW_SELF})
    public ResponseEntity<List<LeaveBalanceResponse>> getEmployeeBalances(@PathVariable UUID employeeId) {
        List<LeaveBalance> balances = leaveBalanceService.getEmployeeBalances(employeeId);
        return ResponseEntity.ok(balances.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    @GetMapping("/employee/{employeeId}/year/{year}")
    @RequiresPermission({Permission.LEAVE_VIEW_ALL, Permission.LEAVE_VIEW_TEAM, Permission.LEAVE_VIEW_SELF})
    public ResponseEntity<List<LeaveBalanceResponse>> getEmployeeBalancesForYear(
            @PathVariable UUID employeeId,
            @PathVariable Integer year) {
        List<LeaveBalance> balances = leaveBalanceService.getEmployeeBalancesForYear(employeeId, year);
        return ResponseEntity.ok(balances.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    @PostMapping("/encash")
    @RequiresPermission({Permission.LEAVE_BALANCE_ENCASH, Permission.LEAVE_BALANCE_MANAGE})
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
    public ResponseEntity<java.util.Map<String, Object>> carryForwardBalances(
            @RequestParam int fromYear) {
        log.info("Admin carry-forward request for year {}", fromYear);
        int count = leaveBalanceService.carryForwardBalances(fromYear);
        return ResponseEntity.ok(java.util.Map.of(
                "message", "Carry-forward complete",
                "fromYear", fromYear,
                "toYear", fromYear + 1,
                "balancesCarried", count));
    }

    private LeaveBalanceResponse toResponse(LeaveBalance balance) {
        LeaveBalanceResponse response = new LeaveBalanceResponse();
        BeanUtils.copyProperties(balance, response);
        // Enrich with leave type name so the frontend can display it without a separate request
        if (balance.getLeaveTypeId() != null) {
            leaveTypeRepository.findById(balance.getLeaveTypeId())
                    .ifPresent(lt -> response.setLeaveTypeName(lt.getName()));
        }
        return response;
    }
}
