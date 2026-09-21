package com.nulogic.application.meeting.service;

import com.nulogic.api.engagement.dto.OneOnOneMeetingRequest;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.engagement.OneOnOneMeeting;
import com.nulogic.infrastructure.engagement.repository.OneOnOneMeetingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Service for managing one-on-one meetings.
 * Handles scheduling, retrieval, and management of meetings between employees and managers.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MeetingService {

    private final OneOnOneMeetingRepository meetingRepository;

    /**
     * Schedule a new one-on-one meeting.
     *
     * <p>Mass-assignment fix: takes a whitelisted request DTO instead of binding the JSON
     * body directly to the JPA entity, so a caller can no longer set id/tenantId/status/
     * audit fields or another employee's private notes at creation time. managerId is
     * derived from the authenticated caller, not client-supplied.</p>
     *
     * @param request   the meeting details to schedule
     * @param managerId the scheduling manager (from SecurityContext, not client input)
     * @return the scheduled meeting with generated ID and tenant context
     */
    public OneOnOneMeeting scheduleMeeting(OneOnOneMeetingRequest request, UUID managerId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        OneOnOneMeeting meeting = OneOnOneMeeting.builder()
                .managerId(managerId)
                .employeeId(request.getEmployeeId())
                .title(request.getTitle())
                .description(request.getDescription())
                .meetingDate(request.getMeetingDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .meetingType(request.getMeetingType() != null ? request.getMeetingType() : OneOnOneMeeting.MeetingType.REGULAR)
                .location(request.getLocation())
                .meetingLink(request.getMeetingLink())
                .isRecurring(Boolean.TRUE.equals(request.getIsRecurring()))
                .recurrencePattern(request.getRecurrencePattern())
                .recurrenceEndDate(request.getRecurrenceEndDate())
                .status(OneOnOneMeeting.MeetingStatus.SCHEDULED)
                .build();
        if (request.getDurationMinutes() != null) meeting.setDurationMinutes(request.getDurationMinutes());
        if (request.getReminderMinutesBefore() != null) meeting.setReminderMinutesBefore(request.getReminderMinutesBefore());
        meeting.setTenantId(tenantId);

        OneOnOneMeeting savedMeeting = meetingRepository.save(meeting);
        log.info("Scheduled meeting {} for tenant {}", savedMeeting.getId(), tenantId);

        return savedMeeting;
    }

    /**
     * Get all meetings for a specific employee.
     *
     * @param employeeId the employee's UUID
     * @return list of meetings ordered by meeting date descending
     */
    @Transactional(readOnly = true)
    public List<OneOnOneMeeting> getMeetingsByEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return meetingRepository.findByTenantIdAndEmployeeIdOrderByMeetingDateDesc(tenantId, employeeId);
    }
}
