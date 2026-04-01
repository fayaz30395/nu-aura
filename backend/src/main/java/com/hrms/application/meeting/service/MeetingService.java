package com.hrms.application.meeting.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.engagement.OneOnOneMeeting;
import com.hrms.infrastructure.engagement.repository.OneOnOneMeetingRepository;
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
     * @param meeting the meeting details to schedule
     * @return the scheduled meeting with generated ID and tenant context
     */
    public OneOnOneMeeting scheduleMeeting(OneOnOneMeeting meeting) {
        UUID tenantId = TenantContext.getCurrentTenant();

        meeting.setId(UUID.randomUUID());
        meeting.setTenantId(tenantId);
        meeting.setStatus(OneOnOneMeeting.MeetingStatus.SCHEDULED);

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
