package com.hrms.api.social.dto;
import com.hrms.domain.social.SocialPost;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SocialPostResponse {
    private UUID id;
    private UUID authorId;
    private String authorName;
    private SocialPost.PostType postType;
    private String content;
    private String mediaUrls;
    private Integer likesCount;
    private Integer commentsCount;
    private LocalDateTime createdAt;
}
