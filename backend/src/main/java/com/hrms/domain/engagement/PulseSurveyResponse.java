package com.hrms.domain.engagement;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "pulse_survey_responses", indexes = {
        @Index(name = "idx_psr_survey", columnList = "survey_id"),
        @Index(name = "idx_psr_employee", columnList = "employee_id"),
        @Index(name = "idx_psr_survey_employee", columnList = "survey_id, employee_id")
},
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_psr_survey_employee", columnNames = {"survey_id", "employee_id"})
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PulseSurveyResponse extends TenantAware {

    @Column(name = "survey_id", nullable = false)
    private UUID surveyId;

    @Column(name = "employee_id")
    private UUID employeeId; // Null if anonymous

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ResponseStatus status = ResponseStatus.IN_PROGRESS;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "time_spent_seconds")
    private Integer timeSpentSeconds;

    @Column(name = "overall_score")
    private Double overallScore;

    @Column(name = "device_type", length = 30)
    private String deviceType; // DESKTOP, MOBILE, TABLET

    @Column(name = "browser", length = 100)
    private String browser;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    public enum ResponseStatus {
        INVITED,      // Invitation sent
        IN_PROGRESS,  // Started but not submitted
        SUBMITTED,    // Completed
        SKIPPED       // Opted out
    }
}
