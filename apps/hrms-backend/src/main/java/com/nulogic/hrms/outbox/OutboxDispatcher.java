package com.nulogic.hrms.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.hrms.integration.CalendarService;
import com.nulogic.hrms.integration.GmailService;
import com.nulogic.hrms.outbox.payload.CalendarEventPayload;
import com.nulogic.hrms.outbox.payload.EmailNotificationPayload;
import org.springframework.stereotype.Component;

@Component
public class OutboxDispatcher {
    private final ObjectMapper objectMapper;
    private final GmailService gmailService;
    private final CalendarService calendarService;

    public OutboxDispatcher(ObjectMapper objectMapper,
                            GmailService gmailService,
                            CalendarService calendarService) {
        this.objectMapper = objectMapper;
        this.gmailService = gmailService;
        this.calendarService = calendarService;
    }

    public void dispatch(OutboxEvent event) {
        try {
            switch (event.getEventType()) {
                case EMAIL_NOTIFICATION -> {
                    EmailNotificationPayload payload = objectMapper.readValue(event.getPayload(), EmailNotificationPayload.class);
                    gmailService.sendEmail(payload.getTo(), payload.getSubject(), payload.getBody());
                }
                case CALENDAR_EVENT -> {
                    CalendarEventPayload payload = objectMapper.readValue(event.getPayload(), CalendarEventPayload.class);
                    calendarService.createLeaveEvent(payload);
                }
                default -> throw new IllegalArgumentException("Unknown outbox event type");
            }
        } catch (Exception ex) {
            throw new IllegalStateException("Outbox dispatch failed", ex);
        }
    }
}
