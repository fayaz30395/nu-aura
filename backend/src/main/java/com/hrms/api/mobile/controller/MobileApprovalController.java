package com.hrms.api.mobile.controller;

import com.hrms.api.mobile.dto.MobileApprovalDto;
import com.hrms.application.mobile.service.MobileApprovalService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/mobile/approvals")
@RequiredArgsConstructor
@Tag(name = "Mobile Approvals", description = "Mobile-optimized approval management endpoints")
public class MobileApprovalController {

    private final MobileApprovalService mobileApprovalService;

    @GetMapping("/pending")
    @RequiresPermission({
            Permission.LEAVE_APPROVE,
            Permission.EXPENSE_APPROVE,
            Permission.EMPLOYMENT_CHANGE_APPROVE
    })
    @Operation(summary = "Get pending approvals", description = "Get all pending approvals with count breakdown by type")
    public ResponseEntity<MobileApprovalDto.PendingApprovalsResponse> getPendingApprovals() {
        return ResponseEntity.ok(mobileApprovalService.getPendingApprovals());
    }

    @PostMapping("/{id}/approve")
    @RequiresPermission({
            Permission.LEAVE_APPROVE,
            Permission.EXPENSE_APPROVE,
            Permission.EMPLOYMENT_CHANGE_APPROVE
    })
    @Operation(summary = "Approve a request", description = "Quick approve with optional notes")
    public ResponseEntity<MobileApprovalDto.ApprovalActionResponse> approveRequest(
            @PathVariable java.util.UUID id,
            @Valid @RequestBody MobileApprovalDto.ApprovalActionRequest request) {
        request.setApprovalId(id);
        request.setAction("APPROVE");
        return ResponseEntity.ok(mobileApprovalService.actionApproval(request));
    }

    @PostMapping("/{id}/reject")
    @RequiresPermission({
            Permission.LEAVE_REJECT,
            Permission.EXPENSE_APPROVE,
            Permission.EMPLOYMENT_CHANGE_APPROVE
    })
    @Operation(summary = "Reject a request", description = "Quick reject with mandatory reason")
    public ResponseEntity<MobileApprovalDto.ApprovalActionResponse> rejectRequest(
            @PathVariable java.util.UUID id,
            @Valid @RequestBody MobileApprovalDto.ApprovalActionRequest request) {
        request.setApprovalId(id);
        request.setAction("REJECT");
        return ResponseEntity.ok(mobileApprovalService.actionApproval(request));
    }

    @PostMapping("/bulk-action")
    @RequiresPermission({
            Permission.LEAVE_APPROVE,
            Permission.EXPENSE_APPROVE,
            Permission.EMPLOYMENT_CHANGE_APPROVE
    })
    @Operation(summary = "Bulk approve or reject", description = "Approve or reject multiple approvals at once")
    public ResponseEntity<MobileApprovalDto.ApprovalActionResponse> bulkActionApprovals(
            @Valid @RequestBody MobileApprovalDto.BulkApprovalRequest request) {
        return ResponseEntity.ok(mobileApprovalService.bulkActionApprovals(request));
    }
}
