package com.nulogic.api.performance;

import com.nulogic.application.performance.dto.FeedbackRequest;
import com.nulogic.application.performance.dto.FeedbackResponse;
import com.nulogic.application.performance.service.FeedbackService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import org.springframework.security.access.AccessDeniedException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/feedback")
public class FeedbackController {

    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @PostMapping
    @RequiresPermission(Permission.FEEDBACK_CREATE)
    public ResponseEntity<FeedbackResponse> giveFeedback(@Valid @RequestBody FeedbackRequest request) {
        FeedbackResponse response = feedbackService.giveFeedback(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<FeedbackResponse> getFeedbackById(@PathVariable UUID id) {
        FeedbackResponse response = feedbackService.getFeedbackById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/received/{employeeId}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<List<FeedbackResponse>> getReceivedFeedback(@PathVariable UUID employeeId) {
        enforceFeedbackViewScope(employeeId);
        List<FeedbackResponse> feedback = feedbackService.getReceivedFeedback(employeeId);
        return ResponseEntity.ok(feedback);
    }

    @GetMapping("/given/{employeeId}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<List<FeedbackResponse>> getGivenFeedback(@PathVariable UUID employeeId) {
        enforceFeedbackViewScope(employeeId);
        List<FeedbackResponse> feedback = feedbackService.getGivenFeedback(employeeId);
        return ResponseEntity.ok(feedback);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.FEEDBACK_UPDATE)
    public ResponseEntity<FeedbackResponse> updateFeedback(
            @PathVariable UUID id,
            @Valid @RequestBody FeedbackRequest request
    ) {
        FeedbackResponse response = feedbackService.updateFeedback(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.FEEDBACK_DELETE)
    public ResponseEntity<Void> deleteFeedback(@PathVariable UUID id) {
        feedbackService.deleteFeedback(id);
        return ResponseEntity.noContent().build();
    }
    /**
     * IDOR FIX: Enforces data-scope on /received/{employeeId} and /given/{employeeId}.
     * Scope hierarchy: isHRManager (implicit VIEW_ALL) > EMPLOYEE_VIEW_ALL > VIEW_TEAM > VIEW_SELF.
     * There is no FEEDBACK:VIEW_ALL in the Permission catalog; EMPLOYEE_VIEW_ALL is treated
     * as the view-all equivalent per the task instructions.
     * SuperAdmin and TenantAdmin bypass all scope checks.
     */
    private void enforceFeedbackViewScope(UUID targetEmployeeId) {
        if (SecurityContext.isSuperAdmin() || SecurityContext.isTenantAdmin()) {
            return;
        }

        // HR managers have tenant-wide visibility over feedback data
        if (SecurityContext.isHRManager()) {
            return;
        }

        // EMPLOYEE_VIEW_ALL: cross-department view — treat as FEEDBACK VIEW_ALL
        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)) {
            return;
        }

        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();

        // VIEW_SELF: caller may only view their own feedback
        if (currentEmployeeId != null && currentEmployeeId.equals(targetEmployeeId)) {
            return;
        }

        // VIEW_TEAM: managers may view feedback for their direct and indirect reportees
        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)) {
            Set<UUID> reporteeIds = SecurityContext.getAllReporteeIds();
            if (reporteeIds.contains(targetEmployeeId)) {
                return;
            }
        }

        throw new AccessDeniedException(
                "You are not authorized to view feedback for this employee");
    }


}
