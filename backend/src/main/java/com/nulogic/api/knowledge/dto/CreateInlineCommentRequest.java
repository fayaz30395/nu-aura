package com.nulogic.api.knowledge.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInlineCommentRequest {

    private String anchorSelector;

    private String anchorText;

    private Integer anchorOffset;

    @NotBlank(message = "Comment content is required")
    private String content;
}
