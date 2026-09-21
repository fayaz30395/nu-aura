package com.nulogic.api.meeting.controller;

import com.nulogic.api.engagement.dto.OneOnOneMeetingRequest;
import com.nulogic.application.meeting.service.MeetingService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.domain.engagement.OneOnOneMeeting;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.nulogic.common.security.Permission.EMPLOYEE_VIEW_SELF;

@RestController
@RequestMapping("/api/v1/one-on-one")
@RequiredArgsConstructor
public class MeetingController {
    private final MeetingService meetingService;

    @PostMapping
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<OneOnOneMeeting> scheduleMeeting(@Valid @RequestBody OneOnOneMeetingRequest request) {
        UUID managerId = SecurityContext.getCurrentEmployeeId();
        return ResponseEntity.ok(meetingService.scheduleMeeting(request, managerId));
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<List<OneOnOneMeeting>> getByEmployee(@PathVariable UUID employeeId) {
        enforceMeetingViewScope(employeeId);
        return ResponseEntity.ok(meetingService.getMeetingsByEmployee(employeeId));
    }

    // IDOR fix (US-2FZSWH5ZHSQD): EMPLOYEE_VIEW_SELF alone let any employee read another's
    // private 1:1 notes by guessing an employeeId. Same ownership-check shape as
    // FeedbackController.enforceFeedbackViewScope.
    private void enforceMeetingViewScope(UUID targetEmployeeId) {
        if (SecurityContext.isSuperAdmin() || SecurityContext.isTenantAdmin()) return;
        if (SecurityContext.isHRManager()) return;
        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)) return;

        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
        if (currentEmployeeId != null && currentEmployeeId.equals(targetEmployeeId)) return;

        // The employee's manager also has legitimate access to their own 1:1 meetings.
        if (currentEmployeeId != null && SecurityContext.getAllReporteeIds().contains(targetEmployeeId)) return;

        throw new AccessDeniedException("You are not authorized to view this employee's meetings");
    }
}
