package com.hrms.api.knowledge.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeCommentDto {

    private UUID id;
    private UUID tenantId;

    private UUID contentId;
    private String contentType;  // WIKI_PAGE, BLOG_POST

    private UUID parentCommentId;
    private String content;

    private Integer likeCount;
    private Boolean isApproved;
    private LocalDateTime approvedAt;
    private UUID approvedBy;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID lastModifiedBy;

    private String createdByName;
    private String approvedByName;
}
