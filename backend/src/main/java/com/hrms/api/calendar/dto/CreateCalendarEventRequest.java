package com.hrms.api.calendar.dto;

import com.hrms.domain.calendar.CalendarEvent.EventType;
import com.hrms.domain.calendar.CalendarEvent.EventVisibility;
import com.hrms.domain.calendar.CalendarEvent.RecurrencePattern;
import com.hrms.domain.calendar.CalendarEvent.SyncProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCalendarEventRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotNull(message = "Start time is required")
    private LocalDateTime startTime;

    @NotNull(message = "End time is required")
    private LocalDateTime endTime;

    private Boolean allDay;

    private String location;

    private String meetingLink;

    private EventType eventType;

    private Boolean isRecurring;

    private RecurrencePattern recurrencePattern;

    private LocalDateTime recurrenceEndDate;

    private SyncProvider syncProvider;

    private Integer reminderMinutes;

    private List<UUID> attendeeIds;

    private EventVisibility visibility;

    private String color;

    private String notes;
}
