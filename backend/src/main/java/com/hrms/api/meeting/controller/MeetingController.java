package com.hrms.api.meeting.controller;

import com.hrms.application.meeting.service.MeetingService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.engagement.OneOnOneMeeting;
import jakarta.validation.Valid;
import lombok.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.hrms.common.security.Permission.*;

@RestController
@RequestMapping("/api/v1/one-on-one")
@RequiredArgsConstructor
public class MeetingController {
    private final MeetingService meetingService;

    @PostMapping
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<OneOnOneMeeting> scheduleMeeting(@Valid @RequestBody OneOnOneMeeting meeting) {
        return ResponseEntity.ok(meetingService.scheduleMeeting(meeting));
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<List<OneOnOneMeeting>> getByEmployee(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(meetingService.getMeetingsByEmployee(employeeId));
    }
}
