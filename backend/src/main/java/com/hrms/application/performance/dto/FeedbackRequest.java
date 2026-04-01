package com.hrms.application.performance.dto;

import com.hrms.domain.performance.Feedback;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackRequest {
    private UUID recipientId;
    private UUID giverId;
    private Feedback.FeedbackType feedbackType;
    private String category;
    private String feedbackText;
    private Boolean isAnonymous;
    private Boolean isPublic;
    private UUID relatedReviewId;
}
