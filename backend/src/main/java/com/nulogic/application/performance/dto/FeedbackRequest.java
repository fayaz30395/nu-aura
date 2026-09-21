package com.nulogic.application.performance.dto;

import com.nulogic.domain.performance.Feedback;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
    @NotNull(message = "recipientId is required")
    private UUID recipientId;
    @NotNull(message = "giverId is required")
    private UUID giverId;
    @NotNull(message = "feedbackType is required")
    private Feedback.FeedbackType feedbackType;
    private String category;
    @NotBlank(message = "feedbackText is required")
    private String feedbackText;
    private Boolean isAnonymous;
    private Boolean isPublic;
    private UUID relatedReviewId;
}
