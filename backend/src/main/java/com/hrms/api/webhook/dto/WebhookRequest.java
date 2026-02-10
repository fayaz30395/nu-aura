package com.hrms.api.webhook.dto;

import com.hrms.common.validation.WebhookUrlValidator;
import com.hrms.domain.webhook.WebhookEventType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

/**
 * Request DTO for creating or updating a webhook.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookRequest {

    @NotBlank(message = "Webhook name is required")
    @Size(max = 100, message = "Webhook name must be at most 100 characters")
    private String name;

    @Size(max = 500, message = "Description must be at most 500 characters")
    private String description;

    @NotBlank(message = "Webhook URL is required")
    @Size(max = 2048, message = "Webhook URL must be at most 2048 characters")
    @WebhookUrlValidator
    private String url;

    @NotBlank(message = "Webhook secret is required")
    @Size(min = 16, max = 256, message = "Webhook secret must be between 16 and 256 characters")
    private String secret;

    @NotEmpty(message = "At least one event type must be specified")
    private Set<WebhookEventType> events;

    @Size(max = 4096, message = "Custom headers must be at most 4096 characters")
    private String customHeaders;
}
