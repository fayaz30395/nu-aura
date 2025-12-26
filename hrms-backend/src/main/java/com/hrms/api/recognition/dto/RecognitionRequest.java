package com.hrms.api.recognition.dto;

import com.hrms.domain.recognition.Recognition.RecognitionCategory;
import com.hrms.domain.recognition.Recognition.RecognitionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecognitionRequest {

    @NotNull(message = "Receiver ID is required")
    private UUID receiverId;

    @NotNull(message = "Recognition type is required")
    private RecognitionType type;

    private RecognitionCategory category;

    @NotBlank(message = "Title is required")
    private String title;

    private String message;

    private Integer points;

    @Builder.Default
    private Boolean isPublic = true;

    @Builder.Default
    private Boolean isAnonymous = false;

    private UUID badgeId;
}
