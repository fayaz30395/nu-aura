package com.hrms.api.engagement.dto;

import com.hrms.domain.engagement.OneOnOneMeeting.MeetingType;
import com.hrms.domain.engagement.OneOnOneMeeting.RecurrencePattern;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OneOnOneMeetingRequest {

    @NotNull(message = "Employee ID is required")
    private UUID employeeId;

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    private String description;

    @NotNull(message = "Meeting date is required")
    private LocalDate meetingDate;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    private LocalTime endTime;
    private Integer durationMinutes;
    private MeetingType meetingType;
    private String location;
    private String meetingLink;

    // Recurrence
    private Boolean isRecurring;
    private RecurrencePattern recurrencePattern;
    private LocalDate recurrenceEndDate;

    // Reminder
    private Integer reminderMinutesBefore;

    // Agenda items
    private List<AgendaItemRequest> agendaItems;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AgendaItemRequest {
        @NotBlank(message = "Title is required")
        private String title;
        private String description;
        private Integer itemOrder;
        private String priority;
        private String category;
        private Integer durationMinutes;
    }
}
