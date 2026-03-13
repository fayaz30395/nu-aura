package com.hrms.api.knowledge.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBlogPostRequest {

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
}
