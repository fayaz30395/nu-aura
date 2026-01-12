package com.hrms.api.leave.controller;

import com.hrms.api.leave.dto.LeaveBalanceResponse;
import com.hrms.application.leave.service.LeaveBalanceService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.leave.LeaveBalance;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/leave-balances")
@RequiredArgsConstructor
public class LeaveBalanceController {

    private final LeaveBalanceService leaveBalanceService;

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

    private LeaveBalanceResponse toResponse(LeaveBalance balance) {
        LeaveBalanceResponse response = new LeaveBalanceResponse();
        BeanUtils.copyProperties(balance, response);
        return response;
    }
}
