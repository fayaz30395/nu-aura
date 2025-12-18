package com.hrms.api.social.dto;
import lombok.*;
import java.util.UUID;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PostCommentRequest {
    private UUID postId;
    private String content;
}
