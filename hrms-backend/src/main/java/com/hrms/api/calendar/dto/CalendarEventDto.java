package com.hrms.api.calendar.dto;

import com.hrms.domain.calendar.CalendarEvent;
import com.hrms.domain.calendar.CalendarEvent.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarEventDto {

    private UUID id;
    private UUID tenantId;
    private UUID employeeId;
    private String employeeName;
    private String title;
    private String description;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Boolean allDay;
    private String location;
    private String meetingLink;

    private EventType eventType;
    private EventStatus status;

    private Boolean isRecurring;
    private RecurrencePattern recurrencePattern;
    private LocalDateTime recurrenceEndDate;
    private UUID parentEventId;

    private SyncProvider syncProvider;
    private String externalEventId;
    private LocalDateTime lastSyncedAt;
    private SyncStatus syncStatus;

    private Integer reminderMinutes;
    private Boolean reminderSent;

    private List<UUID> attendeeIds;
    private List<String> attendeeNames;
    private UUID organizerId;
    private String organizerName;

    private EventVisibility visibility;
    private String color;
    private String notes;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;

    public static CalendarEventDto fromEntity(CalendarEvent entity) {
        if (entity == null) return null;

        CalendarEventDto dto = CalendarEventDto.builder()
                .id(entity.getId())
                .tenantId(entity.getTenantId())
                .employeeId(entity.getEmployeeId())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .allDay(entity.getAllDay())
                .location(entity.getLocation())
                .meetingLink(entity.getMeetingLink())
                .eventType(entity.getEventType())
                .status(entity.getStatus())
                .isRecurring(entity.getIsRecurring())
                .recurrencePattern(entity.getRecurrencePattern())
                .recurrenceEndDate(entity.getRecurrenceEndDate())
                .parentEventId(entity.getParentEventId())
                .syncProvider(entity.getSyncProvider())
                .externalEventId(entity.getExternalEventId())
                .lastSyncedAt(entity.getLastSyncedAt())
                .syncStatus(entity.getSyncStatus())
                .reminderMinutes(entity.getReminderMinutes())
                .reminderSent(entity.getReminderSent())
                .organizerId(entity.getOrganizerId())
                .visibility(entity.getVisibility())
                .color(entity.getColor())
                .notes(entity.getNotes())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .build();

        // Parse attendee IDs from JSON string
        if (entity.getAttendeeIds() != null && !entity.getAttendeeIds().isEmpty()) {
            dto.setAttendeeIds(parseAttendeeIds(entity.getAttendeeIds()));
        }

        return dto;
    }

    private static List<UUID> parseAttendeeIds(String attendeeIdsJson) {
        if (attendeeIdsJson == null || attendeeIdsJson.isEmpty()) {
            return List.of();
        }
        // Simple parsing: assumes format like "[uuid1,uuid2,uuid3]"
        String cleaned = attendeeIdsJson.replace("[", "").replace("]", "").replace("\"", "").trim();
        if (cleaned.isEmpty()) {
            return List.of();
        }
        return java.util.Arrays.stream(cleaned.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(UUID::fromString)
                .toList();
    }
}
