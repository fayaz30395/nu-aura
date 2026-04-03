package com.hrms.domain.survey;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Survey response submission with sentiment analysis results.
 */
@Entity
@Table(name = "survey_responses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SurveyResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "survey_id", nullable = false)
    private Survey survey;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    // For non-anonymous surveys
    private UUID employeeId;

    // Anonymous identifier (hashed)
    private String anonymousId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResponseStatus status;

    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
    private int completionTimeMinutes;

    // Calculated scores
    private Double engagementScore;
    private Double sentimentScore;
    private Double npsScore;

    @Enumerated(EnumType.STRING)
    private SentimentLevel overallSentiment;

    @OneToMany(mappedBy = "response", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SurveyAnswer> answers = new ArrayList<>();

    // Demographic data (optional, for analytics)
    private String department;
    private String location;
    private String grade;
    private Integer tenureMonths;

    // IP and device for fraud detection
    private String ipAddress;
    private String userAgent;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = ResponseStatus.IN_PROGRESS;
    }

    public void addAnswer(SurveyAnswer answer) {
        answers.add(answer);
        answer.setResponse(this);
    }

    public enum ResponseStatus {
        IN_PROGRESS,
        COMPLETED,
        PARTIAL,
        DISQUALIFIED
    }

    public enum SentimentLevel {
        VERY_NEGATIVE,
        NEGATIVE,
        NEUTRAL,
        POSITIVE,
        VERY_POSITIVE
    }
}
