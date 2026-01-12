package com.hrms.domain.recruitment;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "interviews")
@Data
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

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

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
