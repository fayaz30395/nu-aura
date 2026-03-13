package com.hrms.domain.recruitment;

import jakarta.persistence.*;
import lombok.Data;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "interviews")
@Data
@EntityListeners(AuditingEntityListener.class)
public class Interview {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "candidate_id", nullable = false)
    private UUID candidateId;

    @Column(name = "job_opening_id", nullable = false)
    private UUID jobOpeningId;

    @Column(name = "interview_round", length = 50)
    @Enumerated(EnumType.STRING)
    private InterviewRound interviewRound;

    @Column(name = "interview_type", length = 30)
    @Enumerated(EnumType.STRING)
    private InterviewType interviewType;

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "interviewer_id")
    private UUID interviewerId;

    @Column(name = "location", length = 500)
    private String location;

    @Column(name = "meeting_link", length = 500)
    private String meetingLink;

    @Column(name = "status", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private InterviewStatus status;

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "rating")
    private Integer rating;

    @Column(name = "result", length = 30)
    @Enumerated(EnumType.STRING)
    private InterviewResult result;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "google_meet_link", length = 500)
    private String googleMeetLink;

    @Column(name = "google_calendar_event_id", length = 255)
    private String googleCalendarEventId;

    // ── Audit fields (mapped to existing DB columns from V0__init.sql) ──

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    @LastModifiedBy
    @Column(name = "updated_by")
    private UUID lastModifiedBy;

    @Version
    private Long version;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    public enum InterviewRound {
        SCREENING, TECHNICAL_1, TECHNICAL_2, HR, MANAGERIAL, FINAL
    }

    public enum InterviewType {
        PHONE, VIDEO, IN_PERSON
    }

    public enum InterviewStatus {
        SCHEDULED, RESCHEDULED, COMPLETED, CANCELLED, NO_SHOW
    }

    public enum InterviewResult {
        SELECTED, REJECTED, ON_HOLD, PENDING
    }
}
