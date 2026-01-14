package com.hrms.api.wall.dto;

import com.hrms.domain.wall.model.WallPost;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public class CreatePostRequest {

    @NotNull(message = "Post type is required")
    private WallPost.PostType type;

    @NotBlank(message = "Content is required")
    @Size(max = 5000, message = "Content must be less than 5000 characters")
    private String content;

    private UUID praiseRecipientId;

    private String imageUrl;

    private WallPost.PostVisibility visibility = WallPost.PostVisibility.ORGANIZATION;

    // For polls
    @Size(min = 2, max = 10, message = "Poll must have between 2 and 10 options")
    private List<String> pollOptions;

    // Getters and Setters
    public WallPost.PostType getType() {
        return type;
    }

    public void setType(WallPost.PostType type) {
        this.type = type;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public UUID getPraiseRecipientId() {
        return praiseRecipientId;
    }

    public void setPraiseRecipientId(UUID praiseRecipientId) {
        this.praiseRecipientId = praiseRecipientId;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public WallPost.PostVisibility getVisibility() {
        return visibility;
    }

    public void setVisibility(WallPost.PostVisibility visibility) {
        this.visibility = visibility;
    }

    public List<String> getPollOptions() {
        return pollOptions;
    }

    public void setPollOptions(List<String> pollOptions) {
        this.pollOptions = pollOptions;
    }
}
