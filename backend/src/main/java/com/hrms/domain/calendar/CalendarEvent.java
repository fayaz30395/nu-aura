package com.hrms.domain.calendar;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "calendar_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(name = "all_day")
    private Boolean allDay;

    @Column
    private String location;

    @Column(name = "meeting_link")
    private String meetingLink;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private EventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventStatus status;

    @Column(name = "is_recurring")
    private Boolean isRecurring;

    @Enumerated(EnumType.STRING)
    @Column(name = "recurrence_pattern")
    private RecurrencePattern recurrencePattern;

    @Column(name = "recurrence_end_date")
    private LocalDateTime recurrenceEndDate;

    @Column(name = "parent_event_id")
    private UUID parentEventId;

    // External calendar sync fields
    @Enumerated(EnumType.STRING)
    @Column(name = "sync_provider")
    private SyncProvider syncProvider;

    @Column(name = "external_event_id")
    private String externalEventId;

    @Column(name = "last_synced_at")
    private LocalDateTime lastSyncedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "sync_status")
    private SyncStatus syncStatus;

    // Reminder settings
    @Column(name = "reminder_minutes")
    private Integer reminderMinutes;

    @Column(name = "reminder_sent")
    private Boolean reminderSent;

    // Attendees stored as JSON array of employee IDs
    @Column(columnDefinition = "TEXT")
    private String attendeeIds;

    @Column(name = "organizer_id")
    private UUID organizerId;

    @Enumerated(EnumType.STRING)
    private EventVisibility visibility;

    @Column
    private String color;

    @Column
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private UUID createdBy;

    public enum EventType {
        MEETING,
        APPOINTMENT,
        TASK,
        REMINDER,
        OUT_OF_OFFICE,
        HOLIDAY,
        TRAINING,
        INTERVIEW,
        REVIEW,
        OTHER
    }

    public enum EventStatus {
        SCHEDULED,
        CONFIRMED,
        TENTATIVE,
        CANCELLED,
        COMPLETED
    }

    public enum RecurrencePattern {
        DAILY,
        WEEKLY,
        BIWEEKLY,
        MONTHLY,
        YEARLY
    }

    public enum SyncProvider {
        GOOGLE,
        OUTLOOK,
        APPLE,
        NONE
    }

    public enum SyncStatus {
        NOT_SYNCED,
        SYNCED,
        PENDING,
        SYNC_ERROR
    }

    public enum EventVisibility {
        PUBLIC,
        PRIVATE,
        CONFIDENTIAL
    }
}
