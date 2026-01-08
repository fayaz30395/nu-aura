package com.nulogic.hrms.integration;

import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.nulogic.hrms.config.HrmsProperties;
import com.nulogic.hrms.outbox.payload.CalendarEventPayload;
import com.nulogic.hrms.org.OrgService;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class CalendarService {
    private final GoogleWorkspaceClientFactory clientFactory;
    private final CalendarEventRefRepository calendarEventRefRepository;
    private final OrgService orgService;
    private final HrmsProperties properties;

    public CalendarService(GoogleWorkspaceClientFactory clientFactory,
                           CalendarEventRefRepository calendarEventRefRepository,
                           OrgService orgService,
                           HrmsProperties properties) {
        this.clientFactory = clientFactory;
        this.calendarEventRefRepository = calendarEventRefRepository;
        this.orgService = orgService;
        this.properties = properties;
    }

    public void createLeaveEvent(CalendarEventPayload payload) {
        UUID leaveRequestId = UUID.fromString(payload.getLeaveRequestId());
        if (calendarEventRefRepository.findByLeaveRequestId(leaveRequestId).isPresent()) {
            return;
        }

        Calendar calendar = clientFactory.calendarClient(payload.getEmployeeEmail());
        Event event = new Event();
        event.setSummary(payload.getSummary());
        event.setVisibility("private");
        setEventTime(event, payload);

        try {
            Event created = calendar.events().insert("primary", event).execute();
            CalendarEventRef ref = new CalendarEventRef();
            ref.setOrg(orgService.getOrCreateOrg());
            ref.setLeaveRequestId(leaveRequestId);
            ref.setEventId(created.getId());
            calendarEventRefRepository.save(ref);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to create calendar event", ex);
        }
    }

    private void setEventTime(Event event, CalendarEventPayload payload) {
        ZoneId zoneId = ZoneId.of(properties.getAttendance().getTimezone());
        if (!payload.isHalfDay()) {
            EventDateTime start = new EventDateTime();
            start.setDate(new DateTime(payload.getStartDate().toString()));
            EventDateTime end = new EventDateTime();
            end.setDate(new DateTime(payload.getEndDate().plusDays(1).toString()));
            event.setStart(start);
            event.setEnd(end);
            return;
        }

        LocalDate date = payload.getStartDate();
        ZonedDateTime startTime;
        ZonedDateTime endTime;
        if ("AM".equalsIgnoreCase(payload.getHalfDaySession())) {
            startTime = date.atTime(9, 0).atZone(zoneId);
            endTime = date.atTime(13, 0).atZone(zoneId);
        } else {
            startTime = date.atTime(14, 0).atZone(zoneId);
            endTime = date.atTime(18, 0).atZone(zoneId);
        }
        EventDateTime start = new EventDateTime();
        start.setDateTime(new DateTime(startTime.toInstant().toEpochMilli()));
        start.setTimeZone(zoneId.getId());
        EventDateTime end = new EventDateTime();
        end.setDateTime(new DateTime(endTime.toInstant().toEpochMilli()));
        end.setTimeZone(zoneId.getId());
        event.setStart(start);
        event.setEnd(end);
    }
}
