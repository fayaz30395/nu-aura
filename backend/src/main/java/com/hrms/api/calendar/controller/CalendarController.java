package com.hrms.api.calendar.controller;

import com.hrms.api.calendar.dto.CalendarEventDto;
import com.hrms.api.calendar.dto.CreateCalendarEventRequest;
import com.hrms.application.calendar.service.CalendarService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.calendar.CalendarEvent.EventStatus;
import com.hrms.domain.calendar.CalendarEvent.EventType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/calendar")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Calendar", description = "Calendar event management and external calendar sync")
public class CalendarController {

    private final CalendarService calendarService;

    // CRUD Operations

    @PostMapping("/events")
    @RequiresPermission(Permission.CALENDAR_CREATE)
    @Operation(summary = "Create event", description = "Create a new calendar event")
    public ResponseEntity<CalendarEventDto> createEvent(
            @Valid @RequestBody CreateCalendarEventRequest request
    ) {
        return ResponseEntity.ok(calendarService.createEvent(request));
    }

    @PutMapping("/events/{id}")
    @RequiresPermission(Permission.CALENDAR_UPDATE)
    @Operation(summary = "Update event", description = "Update an existing calendar event")
    public ResponseEntity<CalendarEventDto> updateEvent(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCalendarEventRequest request
    ) {
        return ResponseEntity.ok(calendarService.updateEvent(id, request));
    }

    @GetMapping("/events/{id}")
    @RequiresPermission(Permission.CALENDAR_VIEW)
    @Operation(summary = "Get event", description = "Get calendar event by ID")
    public ResponseEntity<CalendarEventDto> getEvent(@PathVariable UUID id) {
        return ResponseEntity.ok(calendarService.getById(id));
    }

    @DeleteMapping("/events/{id}")
    @RequiresPermission(Permission.CALENDAR_DELETE)
    @Operation(summary = "Delete event", description = "Delete or cancel a calendar event")
    public ResponseEntity<Void> deleteEvent(@PathVariable UUID id) {
        calendarService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/events/{id}/status")
    @RequiresPermission(Permission.CALENDAR_UPDATE)
    @Operation(summary = "Update event status", description = "Update the status of a calendar event")
    public ResponseEntity<CalendarEventDto> updateEventStatus(
            @PathVariable UUID id,
            @RequestParam EventStatus status
    ) {
        return ResponseEntity.ok(calendarService.updateEventStatus(id, status));
    }

    // List Operations

    @GetMapping("/events/my")
    @RequiresPermission(Permission.CALENDAR_VIEW)
    @Operation(summary = "Get my events", description = "Get current user's calendar events")
    public ResponseEntity<Page<CalendarEventDto>> getMyEvents(Pageable pageable) {
        try {
            return ResponseEntity.ok(calendarService.getMyEvents(pageable));
        } catch (Exception e) {
            log.warn("Failed to load my calendar events: {}", e.getMessage());
            return ResponseEntity.ok(new PageImpl<>(Collections.emptyList(), pageable, 0));
        }
    }

    @GetMapping("/events/my/range")
    @RequiresPermission(Permission.CALENDAR_VIEW)
    @Operation(summary = "Get my events for range", description = "Get current user's events within a date range")
    public ResponseEntity<List<CalendarEventDto>> getMyEventsForRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime
    ) {
        try {
            return ResponseEntity.ok(calendarService.getMyEventsForRange(startTime, endTime));
        } catch (Exception e) {
            log.warn("Failed to load calendar events for range: {}", e.getMessage());
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @GetMapping("/events/range")
    @RequiresPermission(Permission.CALENDAR_MANAGE)
    @Operation(summary = "Get events for range", description = "Get all events within a date range (admin)")
    public ResponseEntity<List<CalendarEventDto>> getEventsForRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime
    ) {
        try {
            return ResponseEntity.ok(calendarService.getEventsForRange(startTime, endTime));
        } catch (Exception e) {
            log.warn("Failed to load calendar events for range: {}", e.getMessage());
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @GetMapping("/events")
    @RequiresPermission(Permission.CALENDAR_MANAGE)
    @Operation(summary = "Get all events", description = "Get all calendar events with pagination")
    public ResponseEntity<Page<CalendarEventDto>> getAllEvents(Pageable pageable) {
        try {
            return ResponseEntity.ok(calendarService.getAllEvents(pageable));
        } catch (Exception e) {
            log.warn("Failed to load all calendar events: {}", e.getMessage());
            return ResponseEntity.ok(new PageImpl<>(Collections.emptyList(), pageable, 0));
        }
    }

    @GetMapping("/events/type/{eventType}")
    @RequiresPermission(Permission.CALENDAR_VIEW)
    @Operation(summary = "Get events by type", description = "Get events filtered by type")
    public ResponseEntity<List<CalendarEventDto>> getEventsByType(@PathVariable EventType eventType) {
        return ResponseEntity.ok(calendarService.getEventsByType(eventType));
    }

    @GetMapping("/events/organized")
    @RequiresPermission(Permission.CALENDAR_VIEW)
    @Operation(summary = "Get events I organized", description = "Get events where current user is the organizer")
    public ResponseEntity<Page<CalendarEventDto>> getEventsOrganizedByMe(Pageable pageable) {
        return ResponseEntity.ok(calendarService.getEventsOrganizedByMe(pageable));
    }

    @GetMapping("/events/attending")
    @RequiresPermission(Permission.CALENDAR_VIEW)
    @Operation(summary = "Get events I'm attending", description = "Get events where current user is an attendee")
    public ResponseEntity<List<CalendarEventDto>> getEventsAsAttendee() {
        return ResponseEntity.ok(calendarService.getEventsAsAttendee());
    }

    // External Calendar Sync Operations

    @PostMapping("/events/{id}/sync/google")
    @RequiresPermission(Permission.CALENDAR_SYNC)
    @Operation(summary = "Sync to Google", description = "Sync event to Google Calendar")
    public ResponseEntity<Map<String, Object>> syncToGoogle(@PathVariable UUID id) {
        return ResponseEntity.ok(calendarService.syncToGoogle(id));
    }

    @PostMapping("/events/{id}/sync/outlook")
    @RequiresPermission(Permission.CALENDAR_SYNC)
    @Operation(summary = "Sync to Outlook", description = "Sync event to Outlook Calendar")
    public ResponseEntity<Map<String, Object>> syncToOutlook(@PathVariable UUID id) {
        return ResponseEntity.ok(calendarService.syncToOutlook(id));
    }

    @PostMapping("/sync/pending")
    @RequiresPermission(Permission.CALENDAR_SYNC)
    @Operation(summary = "Sync all pending", description = "Sync all pending events to their respective providers")
    public ResponseEntity<Map<String, Object>> syncAllPending() {
        return ResponseEntity.ok(calendarService.syncAllPending());
    }

    @PostMapping("/import/google")
    @RequiresPermission(Permission.CALENDAR_SYNC)
    @Operation(summary = "Import from Google", description = "Import an event from Google Calendar")
    public ResponseEntity<Map<String, Object>> importFromGoogle(
            @RequestParam String externalEventId
    ) {
        return ResponseEntity.ok(calendarService.importFromGoogle(externalEventId));
    }

    @PostMapping("/import/outlook")
    @RequiresPermission(Permission.CALENDAR_SYNC)
    @Operation(summary = "Import from Outlook", description = "Import an event from Outlook Calendar")
    public ResponseEntity<Map<String, Object>> importFromOutlook(
            @RequestParam String externalEventId
    ) {
        return ResponseEntity.ok(calendarService.importFromOutlook(externalEventId));
    }

    // Summary/Analytics

    @GetMapping("/summary")
    @RequiresPermission(Permission.CALENDAR_VIEW)
    @Operation(summary = "Get events summary", description = "Get summary of events for a date range")
    public ResponseEntity<Map<String, Object>> getEventsSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime
    ) {
        try {
            return ResponseEntity.ok(calendarService.getEventsSummary(startTime, endTime));
        } catch (Exception e) {
            log.warn("Failed to load calendar summary: {}", e.getMessage());
            return ResponseEntity.ok(Map.of(
                    "startTime", startTime,
                    "endTime", endTime,
                    "totalEvents", 0L,
                    "eventsByType", Collections.emptyMap()
            ));
        }
    }
}
