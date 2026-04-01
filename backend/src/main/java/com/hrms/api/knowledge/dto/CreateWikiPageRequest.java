package com.hrms.api.knowledge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateWikiPageRequest {

    private UUID spaceId;
    private UUID parentPageId;

    @NotBlank(message = "Title is required")
    @Size(max = 300, message = "Title must not exceed 300 characters")
    private String title;

    @Size(max = 300, message = "Slug must not exceed 300 characters")
    private String slug;

    @Size(max = 500, message = "Excerpt must not exceed 500 characters")
    private String excerpt;

    @Size(max = 100000, message = "Content must not exceed 100000 characters")
    private String content;

    @Size(max = 20, message = "Visibility must not exceed 20 characters")
    private String visibility;

    @Size(max = 20, message = "Status must not exceed 20 characters")
    private String status;
}
