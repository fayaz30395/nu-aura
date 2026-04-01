package com.hrms.api.wall.dto;

import com.hrms.domain.wall.model.PostReaction;
import jakarta.validation.constraints.NotNull;

public class ReactionRequest {

    @NotNull(message = "Reaction type is required")
    private PostReaction.ReactionType reactionType;

    // Getters and Setters
    public PostReaction.ReactionType getReactionType() {
        return reactionType;
    }

    public void setReactionType(PostReaction.ReactionType reactionType) {
        this.reactionType = reactionType;
    }
}
