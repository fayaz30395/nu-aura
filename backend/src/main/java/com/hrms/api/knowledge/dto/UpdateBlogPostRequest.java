package com.hrms.api.knowledge.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBlogPostRequest {

    private UUID categoryId;

    private String title;
    private String slug;
    private String excerpt;
    private String featuredImageUrl;
    private String content;

    private String visibility;
    private String status;

    private LocalDateTime scheduledFor;
    private Integer readTimeMinutes;

    private Boolean isFeatured;
    private LocalDateTime featuredUntil;
}
