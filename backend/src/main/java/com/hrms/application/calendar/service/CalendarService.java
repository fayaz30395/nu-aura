package com.hrms.application.calendar.service;

import com.hrms.api.calendar.dto.CalendarEventDto;
import com.hrms.api.calendar.dto.CreateCalendarEventRequest;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.calendar.CalendarEvent;
import com.hrms.domain.calendar.CalendarEvent.*;
import com.hrms.infrastructure.calendar.repository.CalendarEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CalendarService {

    private final CalendarEventRepository calendarEventRepository;

    @Value("${calendar.sync.mock-mode:true}")
    private boolean mockMode;

    @Transactional
    public CalendarEventDto createEvent(CreateCalendarEventRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        validateEventTimes(request.getStartTime(), request.getEndTime());

        CalendarEvent event = CalendarEvent.builder()
                .tenantId(tenantId)
                .employeeId(employeeId)
                .title(request.getTitle())
                .description(request.getDescription())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .allDay(request.getAllDay() != null ? request.getAllDay() : false)
                .location(request.getLocation())
                .meetingLink(request.getMeetingLink())
                .eventType(request.getEventType() != null ? request.getEventType() : EventType.MEETING)
                .status(EventStatus.SCHEDULED)
                .isRecurring(request.getIsRecurring() != null ? request.getIsRecurring() : false)
                .recurrencePattern(request.getRecurrencePattern())
                .recurrenceEndDate(request.getRecurrenceEndDate())
                .syncProvider(request.getSyncProvider() != null ? request.getSyncProvider() : SyncProvider.NONE)
                .syncStatus(SyncStatus.NOT_SYNCED)
                .reminderMinutes(request.getReminderMinutes())
                .reminderSent(false)
                .attendeeIds(formatAttendeeIds(request.getAttendeeIds()))
                .organizerId(employeeId)
                .visibility(request.getVisibility() != null ? request.getVisibility() : EventVisibility.PUBLIC)
                .color(request.getColor())
                .notes(request.getNotes())
                .createdBy(employeeId)
                .build();

        CalendarEvent saved = calendarEventRepository.save(event);
        log.info("Calendar event created: {} by employee {}", saved.getId(), employeeId);

        // Trigger sync if provider is set
        if (saved.getSyncProvider() != SyncProvider.NONE) {
            syncEventToProvider(saved);
        }

        return CalendarEventDto.fromEntity(saved);
    }

    @Transactional
    public CalendarEventDto updateEvent(UUID eventId, CreateCalendarEventRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        CalendarEvent event = calendarEventRepository.findByIdAndTenantId(eventId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Calendar event not found"));

        validateEventTimes(request.getStartTime(), request.getEndTime());

        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setStartTime(request.getStartTime());
        event.setEndTime(request.getEndTime());
        event.setAllDay(request.getAllDay());
        event.setLocation(request.getLocation());
        event.setMeetingLink(request.getMeetingLink());
        event.setEventType(request.getEventType());
        event.setIsRecurring(request.getIsRecurring());
        event.setRecurrencePattern(request.getRecurrencePattern());
        event.setRecurrenceEndDate(request.getRecurrenceEndDate());
        event.setReminderMinutes(request.getReminderMinutes());
        event.setAttendeeIds(formatAttendeeIds(request.getAttendeeIds()));
        event.setVisibility(request.getVisibility());
        event.setColor(request.getColor());
        event.setNotes(request.getNotes());

        // Mark for re-sync if synced with external provider
        if (event.getSyncProvider() != SyncProvider.NONE && event.getSyncStatus() == SyncStatus.SYNCED) {
            event.setSyncStatus(SyncStatus.PENDING);
        }

        CalendarEvent saved = calendarEventRepository.save(event);
        log.info("Calendar event updated: {}", saved.getId());

        // Trigger sync if needed
        if (saved.getSyncStatus() == SyncStatus.PENDING) {
            syncEventToProvider(saved);
        }

        return CalendarEventDto.fromEntity(saved);
    }

    @Transactional
    public CalendarEventDto updateEventStatus(UUID eventId, EventStatus newStatus) {
        UUID tenantId = TenantContext.getCurrentTenant();

        CalendarEvent event = calendarEventRepository.findByIdAndTenantId(eventId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Calendar event not found"));

        event.setStatus(newStatus);

        CalendarEvent saved = calendarEventRepository.save(event);
        log.info("Calendar event status updated to {} for event {}", newStatus, eventId);
        return CalendarEventDto.fromEntity(saved);
    }

    @Transactional
    public void deleteEvent(UUID eventId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        CalendarEvent event = calendarEventRepository.findByIdAndTenantId(eventId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Calendar event not found"));

        // If synced, mark as cancelled rather than delete to sync the cancellation
        if (event.getSyncProvider() != SyncProvider.NONE && event.getExternalEventId() != null) {
            event.setStatus(EventStatus.CANCELLED);
            event.setSyncStatus(SyncStatus.PENDING);
            calendarEventRepository.save(event);
            syncEventToProvider(event);
            log.info("Calendar event cancelled and synced: {}", eventId);
        } else {
            calendarEventRepository.delete(event);
            log.info("Calendar event deleted: {}", eventId);
        }
    }

    @Transactional(readOnly = true)
    public CalendarEventDto getById(UUID eventId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        CalendarEvent event = calendarEventRepository.findByIdAndTenantId(eventId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Calendar event not found"));
        return CalendarEventDto.fromEntity(event);
    }

    @Transactional(readOnly = true)
    public Page<CalendarEventDto> getMyEvents(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        return calendarEventRepository.findByEmployeeIdAndTenantId(employeeId, tenantId, pageable)
                .map(CalendarEventDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<CalendarEventDto> getMyEventsForRange(LocalDateTime startTime, LocalDateTime endTime) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        return calendarEventRepository.findByEmployeeAndDateRange(tenantId, employeeId, startTime, endTime)
                .stream().map(CalendarEventDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CalendarEventDto> getEventsForRange(LocalDateTime startTime, LocalDateTime endTime) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return calendarEventRepository.findByTenantAndDateRange(tenantId, startTime, endTime)
                .stream().map(CalendarEventDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<CalendarEventDto> getAllEvents(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return calendarEventRepository.findByTenantId(tenantId, pageable)
                .map(CalendarEventDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<CalendarEventDto> getEventsByType(EventType eventType) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return calendarEventRepository.findByTenantIdAndEventType(tenantId, eventType)
                .stream().map(CalendarEventDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<CalendarEventDto> getEventsOrganizedByMe(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        return calendarEventRepository.findByOrganizerIdAndTenantId(employeeId, tenantId, pageable)
                .map(CalendarEventDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<CalendarEventDto> getEventsAsAttendee() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        return calendarEventRepository.findByAttendee(tenantId, employeeId.toString())
                .stream().map(CalendarEventDto::fromEntity).collect(Collectors.toList());
    }

    // External calendar sync methods

    public Map<String, Object> syncToGoogle(UUID eventId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        CalendarEvent event = calendarEventRepository.findByIdAndTenantId(eventId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Calendar event not found"));

        return performSync(event, SyncProvider.GOOGLE);
    }

    public Map<String, Object> syncToOutlook(UUID eventId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        CalendarEvent event = calendarEventRepository.findByIdAndTenantId(eventId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Calendar event not found"));

        return performSync(event, SyncProvider.OUTLOOK);
    }

    public Map<String, Object> syncAllPending() {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<CalendarEvent> pendingEvents = calendarEventRepository.findPendingSyncEvents(tenantId);

        int synced = 0;
        int failed = 0;

        for (CalendarEvent event : pendingEvents) {
            try {
                performSync(event, event.getSyncProvider());
                synced++;
            } catch (Exception e) { // Intentional broad catch — service error boundary
                log.error("Failed to sync event {}: {}", event.getId(), e.getMessage());
                failed++;
            }
        }

        return Map.of(
                "totalPending", pendingEvents.size(),
                "synced", synced,
                "failed", failed
        );
    }

    @Transactional
    public Map<String, Object> importFromGoogle(String externalEventId) {
        if (!mockMode) {
            log.warn("Google Calendar import integration is not configured; using mock import response");
        }
        return createMockImportResponse(SyncProvider.GOOGLE, externalEventId);
    }

    @Transactional
    public Map<String, Object> importFromOutlook(String externalEventId) {
        if (!mockMode) {
            log.warn("Outlook Calendar import integration is not configured; using mock import response");
        }
        return createMockImportResponse(SyncProvider.OUTLOOK, externalEventId);
    }

    // Dashboard/Analytics methods

    @Transactional(readOnly = true)
    public Map<String, Object> getEventsSummary(LocalDateTime startTime, LocalDateTime endTime) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<Object[]> countsByType = calendarEventRepository.countEventsByType(tenantId, startTime, endTime);
        Map<String, Long> typeBreakdown = new HashMap<>();
        long totalEvents = 0;

        for (Object[] row : countsByType) {
            String type = ((EventType) row[0]).name();
            Long count = (Long) row[1];
            typeBreakdown.put(type, count);
            totalEvents += count;
        }

        return Map.of(
                "startTime", startTime,
                "endTime", endTime,
                "totalEvents", totalEvents,
                "eventsByType", typeBreakdown
        );
    }

    // Private helper methods

    private void validateEventTimes(LocalDateTime startTime, LocalDateTime endTime) {
        if (endTime.isBefore(startTime)) {
            throw new IllegalArgumentException("End time cannot be before start time");
        }
    }

    private String formatAttendeeIds(List<UUID> attendeeIds) {
        if (attendeeIds == null || attendeeIds.isEmpty()) {
            return null;
        }
        return "[" + attendeeIds.stream()
                .map(UUID::toString)
                .collect(Collectors.joining(",")) + "]";
    }

    private void syncEventToProvider(CalendarEvent event) {
        try {
            performSync(event, event.getSyncProvider());
        } catch (Exception e) { // Intentional broad catch — service error boundary
            log.error("Background sync failed for event {}: {}", event.getId(), e.getMessage());
            event.setSyncStatus(SyncStatus.SYNC_ERROR);
            calendarEventRepository.save(event);
        }
    }

    private Map<String, Object> performSync(CalendarEvent event, SyncProvider provider) {
        if (!mockMode) {
            log.warn("Calendar sync provider {} integration is not configured; using mock sync response", provider);
        }
        return performMockSync(event, provider);
    }

    private Map<String, Object> performMockSync(CalendarEvent event, SyncProvider provider) {
        log.info("[MOCK] Syncing event {} to {}", event.getId(), provider);

        // Simulate external event ID generation
        String externalId = "mock-" + provider.name().toLowerCase() + "-" + UUID.randomUUID().toString().substring(0, 8);

        event.setSyncProvider(provider);
        event.setExternalEventId(externalId);
        event.setLastSyncedAt(LocalDateTime.now());
        event.setSyncStatus(SyncStatus.SYNCED);

        calendarEventRepository.save(event);

        log.info("[MOCK] Event {} synced successfully to {} with external ID {}", event.getId(), provider, externalId);

        return Map.of(
                "success", true,
                "mockMode", true,
                "provider", provider.name(),
                "eventId", event.getId(),
                "externalEventId", externalId,
                "syncedAt", event.getLastSyncedAt(),
                "message", "Mock sync completed successfully"
        );
    }

    private Map<String, Object> createMockImportResponse(SyncProvider provider, String externalEventId) {
        log.info("[MOCK] Importing event {} from {}", externalEventId, provider);

        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        // Create a mock imported event
        CalendarEvent event = CalendarEvent.builder()
                .tenantId(tenantId)
                .employeeId(employeeId)
                .title("Imported Event from " + provider.name())
                .description("This event was imported from " + provider.name() + " Calendar")
                .startTime(LocalDateTime.now().plusDays(1))
                .endTime(LocalDateTime.now().plusDays(1).plusHours(1))
                .allDay(false)
                .eventType(EventType.MEETING)
                .status(EventStatus.SCHEDULED)
                .syncProvider(provider)
                .externalEventId(externalEventId)
                .lastSyncedAt(LocalDateTime.now())
                .syncStatus(SyncStatus.SYNCED)
                .organizerId(employeeId)
                .visibility(EventVisibility.PUBLIC)
                .createdBy(employeeId)
                .build();

        CalendarEvent saved = calendarEventRepository.save(event);

        return Map.of(
                "success", true,
                "mockMode", true,
                "provider", provider.name(),
                "importedEvent", CalendarEventDto.fromEntity(saved),
                "message", "Mock import completed successfully"
        );
    }
}
