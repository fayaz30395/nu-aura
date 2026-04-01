package com.hrms.application.performance.dto;

import com.hrms.domain.performance.Feedback;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackResponse {
    private UUID id;
    private UUID recipientId;
    private String recipientName;
    private UUID giverId;
    private String giverName;
    private Feedback.FeedbackType feedbackType;
    private String category;
    private String feedbackText;
    private Boolean isAnonymous;
    private Boolean isPublic;
    private UUID relatedReviewId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
