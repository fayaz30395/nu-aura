package com.hrms.api.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateNotificationRequest {

    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotBlank(message = "Type is required")
    private String type;

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    @NotBlank(message = "Message is required")
    private String message;

    private UUID relatedEntityId;

    @Size(max = 100, message = "Related entity type must not exceed 100 characters")
    private String relatedEntityType;

    @Size(max = 500, message = "Action URL must not exceed 500 characters")
    private String actionUrl;

    private String priority;

    private String metadata;
}
