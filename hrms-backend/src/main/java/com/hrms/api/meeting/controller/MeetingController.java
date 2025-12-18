package com.hrms.api.meeting.controller;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.engagement.OneOnOneMeeting;
import com.hrms.infrastructure.engagement.repository.OneOnOneMeetingRepository;
import lombok.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

import static com.hrms.common.security.Permission.*;

@RestController
@RequestMapping("/api/v1/one-on-one")
@RequiredArgsConstructor
public class MeetingController {
    private final OneOnOneMeetingRepository meetingRepository;

    @PostMapping
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<OneOnOneMeeting> scheduleMeeting(@RequestBody OneOnOneMeeting meeting) {
        meeting.setId(UUID.randomUUID());
        meeting.setTenantId(TenantContext.getCurrentTenant());
        meeting.setStatus(OneOnOneMeeting.MeetingStatus.SCHEDULED);
        return ResponseEntity.ok(meetingRepository.save(meeting));
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<List<OneOnOneMeeting>> getByEmployee(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(meetingRepository.findByTenantIdAndEmployeeIdOrderByMeetingDateDesc(TenantContext.getCurrentTenant(), employeeId));
    }
}
