package com.hrms.api.mobile.controller;

import com.hrms.api.mobile.dto.MobileLeaveDto;
import com.hrms.application.mobile.service.MobileLeaveService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/mobile/leave")
@RequiredArgsConstructor
@Tag(name = "Mobile Leave Management", description = "Mobile-optimized leave management endpoints")
public class MobileLeaveController {

    private final MobileLeaveService mobileLeaveService;

    @PostMapping("/quick-apply")
    @RequiresPermission(Permission.LEAVE_REQUEST)
    @Operation(summary = "Quick apply for leave", description = "Minimal leave request with just type, dates, and reason")
    public ResponseEntity<MobileLeaveDto.RecentLeaveRequest> quickApplyLeave(
            @Valid @RequestBody MobileLeaveDto.QuickLeaveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(mobileLeaveService.quickApplyLeave(request));
    }

    @GetMapping("/balance")
    @RequiresPermission(Permission.LEAVE_BALANCE_VIEW)
    @Operation(summary = "Get leave balance", description = "Get leave balance summary for all leave types")
    public ResponseEntity<MobileLeaveDto.LeaveBalanceResponse> getLeaveBalance() {
        return ResponseEntity.ok(mobileLeaveService.getLeaveBalance());
    }

    @GetMapping("/recent")
    @RequiresPermission({
            Permission.LEAVE_VIEW_ALL,
            Permission.LEAVE_VIEW_TEAM,
            Permission.LEAVE_VIEW_SELF
    })
    @Operation(summary = "Get recent leave requests", description = "Get last 10 leave requests with status")
    public ResponseEntity<List<MobileLeaveDto.RecentLeaveRequest>> getRecentLeaveRequests() {
        return ResponseEntity.ok(mobileLeaveService.getRecentLeaveRequests());
    }

    @DeleteMapping("/{id}/cancel")
    @RequiresPermission(Permission.LEAVE_CANCEL)
    @Operation(summary = "Cancel leave request", description = "Cancel a pending leave request")
    public ResponseEntity<Void> cancelLeaveRequest(
            @PathVariable UUID id,
            @Valid @RequestBody MobileLeaveDto.CancelLeaveRequest request) {
        mobileLeaveService.cancelLeaveRequest(id, request);
        return ResponseEntity.ok().build();
    }
}
