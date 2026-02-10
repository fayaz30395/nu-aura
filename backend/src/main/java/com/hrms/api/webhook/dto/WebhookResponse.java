package com.hrms.api.webhook.dto;

import com.hrms.domain.webhook.Webhook;
import com.hrms.domain.webhook.WebhookEventType;
import com.hrms.domain.webhook.WebhookStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

/**
 * Response DTO for webhook details.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookResponse {

    private UUID id;
    private String name;
    private String description;
    private String url;
    private Set<WebhookEventType> events;
    private WebhookStatus status;
    private int consecutiveFailures;
    private LocalDateTime lastSuccessAt;
    private LocalDateTime lastFailureAt;
    private String lastErrorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Convert domain entity to response DTO.
     * Note: Secret is intentionally excluded for security.
     */
    public static WebhookResponse fromEntity(Webhook webhook) {
        return WebhookResponse.builder()
                .id(webhook.getId())
                .name(webhook.getName())
                .description(webhook.getDescription())
                .url(webhook.getUrl())
                .events(webhook.getEvents())
                .status(webhook.getStatus())
                .consecutiveFailures(webhook.getConsecutiveFailures())
                .lastSuccessAt(webhook.getLastSuccessAt())
                .lastFailureAt(webhook.getLastFailureAt())
                .lastErrorMessage(webhook.getLastErrorMessage())
                .createdAt(webhook.getCreatedAt())
                .updatedAt(webhook.getUpdatedAt())
                .build();
    }
}
