package com.hrms.domain.engagement;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "one_on_one_meetings", indexes = {
        @Index(name = "idx_meeting_tenant", columnList = "tenant_id"),
        @Index(name = "idx_meeting_manager", columnList = "manager_id"),
        @Index(name = "idx_meeting_employee", columnList = "employee_id"),
        @Index(name = "idx_meeting_date", columnList = "tenant_id, meeting_date"),
        @Index(name = "idx_meeting_status", columnList = "tenant_id, status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OneOnOneMeeting extends TenantAware {

    @Column(name = "manager_id", nullable = false)
    private UUID managerId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "meeting_date", nullable = false)
    private LocalDate meetingDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "duration_minutes")
    @Builder.Default
    private Integer durationMinutes = 30;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private MeetingStatus status = MeetingStatus.SCHEDULED;

    @Enumerated(EnumType.STRING)
    @Column(name = "meeting_type", length = 30)
    @Builder.Default
    private MeetingType meetingType = MeetingType.REGULAR;

    @Column(name = "location", length = 200)
    private String location; // Physical location or "Virtual"

    @Column(name = "meeting_link", length = 500)
    private String meetingLink; // Zoom/Teams/Meet link

    @Column(name = "is_recurring")
    @Builder.Default
    private Boolean isRecurring = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "recurrence_pattern", length = 20)
    private RecurrencePattern recurrencePattern;

    @Column(name = "recurrence_end_date")
    private LocalDate recurrenceEndDate;

    @Column(name = "parent_meeting_id")
    private UUID parentMeetingId; // For recurring meetings

    @Column(name = "manager_notes", columnDefinition = "TEXT")
    private String managerNotes; // Private notes for manager

    @Column(name = "shared_notes", columnDefinition = "TEXT")
    private String sharedNotes; // Notes visible to both

    @Column(name = "employee_notes", columnDefinition = "TEXT")
    private String employeeNotes; // Private notes for employee

    @Column(name = "meeting_summary", columnDefinition = "TEXT")
    private String meetingSummary; // Post-meeting summary

    @Column(name = "reminder_sent")
    @Builder.Default
    private Boolean reminderSent = false;

    @Column(name = "reminder_minutes_before")
    @Builder.Default
    private Integer reminderMinutesBefore = 15;

    @Column(name = "actual_start_time")
    private LocalDateTime actualStartTime;

    @Column(name = "actual_end_time")
    private LocalDateTime actualEndTime;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancelled_by")
    private UUID cancelledBy;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    @Column(name = "rescheduled_from")
    private UUID rescheduledFrom;

    @Column(name = "employee_rating")
    private Integer employeeRating; // 1-5 rating by employee

    @Column(name = "employee_feedback", columnDefinition = "TEXT")
    private String employeeFeedback;

    @JsonIgnore
    @Transient
    public boolean isUpcoming() {
        if (meetingDate == null || startTime == null) {
            return false;
        }
        LocalDateTime meetingDateTime = LocalDateTime.of(meetingDate, startTime);
        return meetingDateTime.isAfter(LocalDateTime.now()) && status == MeetingStatus.SCHEDULED;
    }

    @JsonIgnore
    @Transient
    public boolean isPast() {
        if (meetingDate == null || startTime == null) {
            return false;
        }
        LocalDateTime meetingDateTime = LocalDateTime.of(meetingDate, startTime);
        return meetingDateTime.isBefore(LocalDateTime.now());
    }

    public enum MeetingStatus {
        SCHEDULED,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED,
        RESCHEDULED,
        NO_SHOW
    }

    public enum MeetingType {
        REGULAR,        // Standard 1-on-1
        PERFORMANCE,    // Performance review
        GOAL_REVIEW,    // OKR/Goal check-in
        CAREER,         // Career development
        FEEDBACK,       // Specific feedback session
        ONBOARDING,     // New hire check-in
        PROBATION,      // Probation review
        EXIT            // Exit interview
    }

    public enum RecurrencePattern {
        WEEKLY,
        BI_WEEKLY,
        MONTHLY,
        QUARTERLY
    }
}
