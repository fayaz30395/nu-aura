package com.hrms.application.recruitment.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

/**
 * Service responsible for creating Google Calendar events with Google Meet
 * video conferencing links for interview scheduling.
 *
 * Uses the user's OAuth access token (obtained during SSO login with calendar scopes)
 * to create events on their behalf. No mock mode — always connects to real Google API.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleMeetService {

    private static final String APPLICATION_NAME = "NU-AURA HRMS";
    private static final GsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();

    /**
     * Create a Google Calendar event with auto-generated Google Meet link.
     *
     * @param accessToken     The user's Google OAuth access token (must have calendar.events scope)
     * @param title           Event title (e.g., "Technical Interview - John Doe")
     * @param description     Event description
     * @param scheduledAt     Interview start time
     * @param durationMinutes Interview duration in minutes
     * @param attendeeEmails  List of attendee email addresses (interviewer, candidate)
     * @param location        Optional physical location
     * @return GoogleMeetResult containing the meet link and calendar event ID
     */
    public GoogleMeetResult createMeetEvent(
            String accessToken,
            String title,
            String description,
            LocalDateTime scheduledAt,
            int durationMinutes,
            List<String> attendeeEmails,
            String location
    ) {
        try {
            Calendar calendarService = buildCalendarService(accessToken);

            Event event = new Event();
            event.setSummary(title);
            event.setDescription(description);
            event.setLocation(location);

            // Set start time
            EventDateTime start = new EventDateTime()
                    .setDateTime(new com.google.api.client.util.DateTime(
                            java.util.Date.from(scheduledAt.atZone(ZoneId.systemDefault()).toInstant())))
                    .setTimeZone(ZoneId.systemDefault().getId());
            event.setStart(start);

            // Set end time
            LocalDateTime endTime = scheduledAt.plusMinutes(durationMinutes);
            EventDateTime end = new EventDateTime()
                    .setDateTime(new com.google.api.client.util.DateTime(
                            java.util.Date.from(endTime.atZone(ZoneId.systemDefault()).toInstant())))
                    .setTimeZone(ZoneId.systemDefault().getId());
            event.setEnd(end);

            // Add attendees
            if (attendeeEmails != null && !attendeeEmails.isEmpty()) {
                List<EventAttendee> attendees = attendeeEmails.stream()
                        .map(email -> new EventAttendee().setEmail(email))
                        .toList();
                event.setAttendees(attendees);
            }

            // Request Google Meet conference
            ConferenceSolutionKey conferenceSolutionKey = new ConferenceSolutionKey()
                    .setType("hangoutsMeet");
            CreateConferenceRequest conferenceRequest = new CreateConferenceRequest()
                    .setRequestId(UUID.randomUUID().toString())
                    .setConferenceSolutionKey(conferenceSolutionKey);
            ConferenceData conferenceData = new ConferenceData()
                    .setCreateRequest(conferenceRequest);
            event.setConferenceData(conferenceData);

            // Send notifications to attendees
            Event createdEvent = calendarService.events()
                    .insert("primary", event)
                    .setConferenceDataVersion(1)
                    .setSendUpdates("all")
                    .execute();

            // Extract Meet link from conference data
            String meetLink = null;
            if (createdEvent.getConferenceData() != null
                    && createdEvent.getConferenceData().getEntryPoints() != null) {
                meetLink = createdEvent.getConferenceData().getEntryPoints().stream()
                        .filter(ep -> "video".equals(ep.getEntryPointType()))
                        .map(EntryPoint::getUri)
                        .findFirst()
                        .orElse(null);
            }

            // Fallback to hangoutLink
            if (meetLink == null) {
                meetLink = createdEvent.getHangoutLink();
            }

            log.info("Google Calendar event created: {} with Meet link: {}", createdEvent.getId(), meetLink);

            return new GoogleMeetResult(
                    meetLink,
                    createdEvent.getId(),
                    true,
                    null
            );

        } catch (Exception e) {
            log.error("Failed to create Google Meet event: {}", e.getMessage(), e);
            return new GoogleMeetResult(null, null, false, e.getMessage());
        }
    }

    /**
     * Delete a Google Calendar event (e.g., when an interview is cancelled).
     */
    public boolean deleteCalendarEvent(String accessToken, String calendarEventId) {
        try {
            Calendar calendarService = buildCalendarService(accessToken);
            calendarService.events()
                    .delete("primary", calendarEventId)
                    .setSendUpdates("all")
                    .execute();
            log.info("Google Calendar event deleted: {}", calendarEventId);
            return true;
        } catch (Exception e) {
            log.error("Failed to delete Google Calendar event {}: {}", calendarEventId, e.getMessage(), e);
            return false;
        }
    }

    @SuppressWarnings("deprecation")
    private Calendar buildCalendarService(String accessToken) throws Exception {
        GoogleCredential credential = new GoogleCredential().setAccessToken(accessToken);

        return new Calendar.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                JSON_FACTORY,
                credential
        )
                .setApplicationName(APPLICATION_NAME)
                .build();
    }

    /**
     * Result of a Google Meet creation attempt.
     */
    public record GoogleMeetResult(
            String meetLink,
            String calendarEventId,
            boolean success,
            String errorMessage
    ) {}
}
