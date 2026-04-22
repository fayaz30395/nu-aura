package com.hrms.domain.performance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "feedback")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Feedback extends TenantAware {

    @Column(name = "recipient_id", nullable = false)
    private UUID recipientId;

    @Column(name = "giver_id", nullable = false)
    private UUID giverId;

    @Enumerated(EnumType.STRING)
    @Column(name = "feedback_type", length = 50)
    private FeedbackType feedbackType;

    @Column(length = 100)
    private String category;

    @Column(name = "feedback_text", nullable = false, columnDefinition = "TEXT")
    private String feedbackText;

    @Column(name = "is_anonymous")
    @Builder.Default
    private Boolean isAnonymous = false;

    @Column(name = "is_public")
    @Builder.Default
    private Boolean isPublic = false;

    @Column(name = "related_review_id")
    private UUID relatedReviewId;

    public enum FeedbackType {
        PRAISE,         // Positive feedback/recognition
        CONSTRUCTIVE,   // Constructive criticism for improvement
        GENERAL,        // General feedback
        REQUEST         // Request for feedback
    }
}
