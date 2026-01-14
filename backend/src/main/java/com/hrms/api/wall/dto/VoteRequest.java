package com.hrms.api.wall.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class VoteRequest {

    @NotNull(message = "Poll option ID is required")
    private UUID optionId;

    // Getters and Setters
    public UUID getOptionId() {
        return optionId;
    }

    public void setOptionId(UUID optionId) {
        this.optionId = optionId;
    }
}
