package com.hrms.api.engagement.dto;

import com.hrms.domain.engagement.MeetingActionItem;
import com.hrms.domain.engagement.MeetingAgendaItem;
import com.hrms.domain.engagement.OneOnOneMeeting;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OneOnOneMeetingResponse {
    private UUID id;
    private UUID managerId;
    private String managerName;
    private UUID employeeId;
    private String employeeName;
    private String title;
    private String description;
    private LocalDate meetingDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer durationMinutes;
    private OneOnOneMeeting.MeetingStatus status;
    private OneOnOneMeeting.MeetingType meetingType;
    private String location;
    private String meetingLink;
    private Boolean isRecurring;
    private OneOnOneMeeting.RecurrencePattern recurrencePattern;
    private String sharedNotes;
    private String meetingSummary;
    private Integer employeeRating;
    private String employeeFeedback;
    private LocalDateTime createdAt;
    private List<AgendaItemResponse> agendaItems;
    private List<ActionItemResponse> actionItems;

    public static OneOnOneMeetingResponse fromEntity(OneOnOneMeeting meeting) {
        return OneOnOneMeetingResponse.builder()
                .id(meeting.getId())
                .managerId(meeting.getManagerId())
                .employeeId(meeting.getEmployeeId())
                .title(meeting.getTitle())
                .description(meeting.getDescription())
                .meetingDate(meeting.getMeetingDate())
                .startTime(meeting.getStartTime())
                .endTime(meeting.getEndTime())
                .durationMinutes(meeting.getDurationMinutes())
                .status(meeting.getStatus())
                .meetingType(meeting.getMeetingType())
                .location(meeting.getLocation())
                .meetingLink(meeting.getMeetingLink())
                .isRecurring(meeting.getIsRecurring())
                .recurrencePattern(meeting.getRecurrencePattern())
                .sharedNotes(meeting.getSharedNotes())
                .meetingSummary(meeting.getMeetingSummary())
                .employeeRating(meeting.getEmployeeRating())
                .employeeFeedback(meeting.getEmployeeFeedback())
                .createdAt(meeting.getCreatedAt())
                .build();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AgendaItemResponse {
        private UUID id;
        private String title;
        private String description;
        private Integer itemOrder;
        private MeetingAgendaItem.AddedBy addedBy;
        private Boolean isDiscussed;
        private String discussionNotes;
        private MeetingAgendaItem.Priority priority;
        private MeetingAgendaItem.AgendaCategory category;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ActionItemResponse {
        private UUID id;
        private String title;
        private String description;
        private UUID assigneeId;
        private String assigneeName;
        private MeetingActionItem.AssigneeRole assigneeRole;
        private LocalDate dueDate;
        private MeetingActionItem.ActionStatus status;
        private MeetingActionItem.Priority priority;
        private Boolean isOverdue;
    }
}
