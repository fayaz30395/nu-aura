package com.nulogic.domain.survey;

import com.nulogic.common.util.TenantTimestamp;
import com.nulogic.common.util.TimeAuditingEntityListener;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Individual answer to a survey question with sentiment analysis.
 *
 * <p>{@code answeredAt} is stamped by {@link TimeAuditingEntityListener} via
 * {@link TenantTimestamp}, resolving the tenant's IANA zone through
 * {@code TenantTimeService}. Closes audit row 25 in
 * {@code backend/docs/audit/prepersist-now-audit.md}.</p>
 */
@Entity
@Table(name = "survey_answers")
@EntityListeners(TimeAuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SurveyAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "response_id", nullable = false)
    private SurveyResponse response;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private SurveyQuestion question;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    // Answer content based on question type
    @Column(columnDefinition = "TEXT")
    private String textAnswer;
    private Integer selectedOption; // Index for single choice
    private String selectedOptions; // JSON array of indices for multiple choice
    private Double numericAnswer;
    private Integer ratingAnswer;
    private String ranking; // JSON array for ranking questions

    // NPS specific
    private Integer npsScore;

    // Sentiment analysis results (for text answers)
    private Double sentimentScore; // -1 to 1
    @Enumerated(EnumType.STRING)
    private SurveyResponse.SentimentLevel sentimentLevel;
    private String keyPhrases; // JSON array
    private String topics; // JSON array of detected topics

    // Scoring
    private Double weightedScore;

    // Time spent on this question
    private Integer secondsSpent;

    @TenantTimestamp
    private LocalDateTime answeredAt;
}
