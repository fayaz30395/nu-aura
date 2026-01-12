package com.hrms.api.social.dto;
import com.hrms.domain.social.SocialPost;
import lombok.*;
import java.util.List;
import java.util.UUID;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SocialPostRequest {
    private SocialPost.PostType postType;
    private String content;
    private String mediaUrls;
    private SocialPost.Visibility visibility;
    private UUID departmentId;
    private List<UUID> mentionedEmployeeIds;
}
