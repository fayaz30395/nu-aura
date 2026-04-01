package com.hrms.api.webhook.dto;

import com.hrms.domain.webhook.WebhookDelivery;
import com.hrms.domain.webhook.WebhookDelivery.DeliveryStatus;
import com.hrms.domain.webhook.WebhookEventType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response DTO for webhook delivery details.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookDeliveryResponse {

    private UUID id;
    private UUID webhookId;
    private String eventId;
    private WebhookEventType eventType;
    private DeliveryStatus status;
    private int attempts;
    private Integer httpStatusCode;
    private Long durationMs;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime nextRetryAt;

    /**
     * Convert domain entity to response DTO.
     * Note: Payload is excluded for brevity in list views.
     */
    public static WebhookDeliveryResponse fromEntity(WebhookDelivery delivery) {
        return WebhookDeliveryResponse.builder()
                .id(delivery.getId())
                .webhookId(delivery.getWebhookId())
                .eventId(delivery.getEventId())
                .eventType(delivery.getEventType())
                .status(delivery.getStatus())
                .attempts(delivery.getAttempts())
                .httpStatusCode(delivery.getResponseStatus())
                .durationMs(delivery.getDurationMs())
                .errorMessage(delivery.getErrorMessage())
                .createdAt(delivery.getCreatedAt())
                .deliveredAt(delivery.getDeliveredAt())
                .nextRetryAt(delivery.getNextRetryAt())
                .build();
    }
}
