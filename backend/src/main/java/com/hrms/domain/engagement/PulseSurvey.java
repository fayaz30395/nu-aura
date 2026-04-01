package com.hrms.domain.engagement;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "pulse_surveys", indexes = {
        @Index(name = "idx_pulse_survey_tenant", columnList = "tenant_id"),
        @Index(name = "idx_pulse_survey_status", columnList = "tenant_id, status"),
        @Index(name = "idx_pulse_survey_dates", columnList = "tenant_id, start_date, end_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PulseSurvey extends TenantAware {

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private SurveyStatus status = SurveyStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "survey_type", nullable = false, length = 30)
    @Builder.Default
    private SurveyType surveyType = SurveyType.ENGAGEMENT;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(name = "is_anonymous")
    @Builder.Default
    private Boolean isAnonymous = true;

    @Column(name = "is_mandatory")
    @Builder.Default
    private Boolean isMandatory = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "frequency", length = 20)
    private SurveyFrequency frequency;

    @Column(name = "next_occurrence_date")
    private LocalDate nextOccurrenceDate;

    @Column(name = "target_departments", columnDefinition = "TEXT")
    private String targetDepartments; // Comma-separated department IDs, null = all

    @Column(name = "target_locations", columnDefinition = "TEXT")
    private String targetLocations; // Comma-separated location names, null = all

    @Column(name = "reminder_enabled")
    @Builder.Default
    private Boolean reminderEnabled = true;

    @Column(name = "reminder_days_before")
    @Builder.Default
    private Integer reminderDaysBefore = 2;

    @Column(name = "total_questions")
    @Builder.Default
    private Integer totalQuestions = 0;

    @Column(name = "total_responses")
    @Builder.Default
    private Integer totalResponses = 0;

    @Column(name = "total_invited")
    @Builder.Default
    private Integer totalInvited = 0;

    @Column(name = "average_score", precision = 5)
    private Double averageScore;

    @Column(name = "is_template")
    @Builder.Default
    private Boolean isTemplate = false;

    @Column(name = "template_name", length = 200)
    private String templateName;

    @Column(name = "template_category", length = 50)
    private String templateCategory;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "published_by")
    private UUID publishedBy;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "closed_by")
    private UUID closedBy;

    public enum SurveyStatus {
        DRAFT, SCHEDULED, ACTIVE, COMPLETED, CANCELLED
    }

    public enum SurveyType {
        ENGAGEMENT,      // Employee engagement
        SATISFACTION,    // Job satisfaction
        ONBOARDING,      // New hire feedback
        EXIT,            // Exit survey
        WELLNESS,        // Health & wellness
        CULTURE,         // Company culture
        MANAGER_FEEDBACK,// Manager effectiveness
        CUSTOM           // Custom survey
    }

    public enum SurveyFrequency {
        ONE_TIME, WEEKLY, BI_WEEKLY, MONTHLY, QUARTERLY, HALF_YEARLY, YEARLY
    }

    public boolean isActive() {
        return status == SurveyStatus.ACTIVE &&
                LocalDate.now().compareTo(startDate) >= 0 &&
                LocalDate.now().compareTo(endDate) <= 0;
    }

    public double getResponseRate() {
        if (totalInvited == null || totalInvited == 0) return 0.0;
        return (double) totalResponses / totalInvited * 100;
    }
}
