package com.hrms.api.workflow.controller;

import com.hrms.api.workflow.dto.WorkflowExecutionResponse;
import com.hrms.application.workflow.service.WorkflowService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Approval inbox endpoints at /api/v1/approvals.
 * Provides the approval task view used by managers; delegates to WorkflowService.
 */
@RestController
@RequestMapping("/api/v1/approvals")
@RequiredArgsConstructor
@Tag(name = "Approvals", description = "Manager approval inbox and task management")
public class ApprovalsController {

    private final WorkflowService workflowService;

    /**
     * Returns pending approval tasks for the currently authenticated user.
     * Supports {@code ?assignedTo=me} as a semantic alias (value is ignored — always returns current user's tasks).
     */
    @GetMapping("/tasks")
    @RequiresPermission(Permission.WORKFLOW_VIEW)
    @Operation(summary = "Get my approval tasks", description = "Returns pending approval tasks assigned to the current user. Use ?assignedTo=me.")
    public ResponseEntity<List<WorkflowExecutionResponse>> getMyApprovalTasks(
            @RequestParam(required = false) String assignedTo) {
        return ResponseEntity.ok(workflowService.getMyPendingApprovals());
    }

    /**
     * Paginated approval inbox with optional filters.
     */
    @GetMapping("/inbox")
    @RequiresPermission(Permission.WORKFLOW_VIEW)
    @Operation(summary = "Approval inbox", description = "Paginated list of pending approvals for the current user with optional filters")
    public ResponseEntity<Page<WorkflowExecutionResponse>> getApprovalInbox(
            @RequestParam(defaultValue = "PENDING") String status,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String search,
            Pageable pageable) {
        return ResponseEntity.ok(workflowService.getApprovalInbox(
                status, module,
                fromDate != null ? fromDate.atStartOfDay() : null,
                toDate != null ? toDate.atTime(23, 59, 59) : null,
                search, pageable));
    }
}
