package com.hrms.domain.ai;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sentiment_analysis")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SentimentAnalysis {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "source_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private SourceType sourceType;

    @Column(name = "source_id", nullable = false)
    private UUID sourceId; // Survey response, feedback, exit interview, etc.

    @Column(name = "text_content", columnDefinition = "TEXT")
    private String textContent;

    @Column(name = "sentiment", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private Sentiment sentiment;

    @Column(name = "sentiment_score")
    private Double sentimentScore; // -1 to 1 (negative to positive)

    @Column(name = "confidence_score")
    private Double confidenceScore; // 0-100

    @Column(name = "emotions", columnDefinition = "TEXT")
    private String emotions; // JSON with emotion breakdown

    @Column(name = "key_phrases", columnDefinition = "TEXT")
    private String keyPhrases; // JSON array

    @Column(name = "topics", columnDefinition = "TEXT")
    private String topics; // JSON array

    @Column(name = "ai_model_version", length = 50)
    private String aiModelVersion;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum SourceType {
        SURVEY_RESPONSE,
        EXIT_INTERVIEW,
        FEEDBACK,
        REVIEW_COMMENT,
        SOCIAL_POST,
        HELPDESK_TICKET
    }

    public enum Sentiment {
        POSITIVE,
        NEUTRAL,
        NEGATIVE,
        MIXED
    }
}
