package com.hrms.api.knowledge.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReplyToInlineCommentRequest {

    @NotBlank(message = "Reply content is required")
    private String content;
}
