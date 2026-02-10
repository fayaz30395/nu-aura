package com.hrms.common.health;

import com.hrms.domain.webhook.WebhookDelivery.DeliveryStatus;
import com.hrms.infrastructure.webhook.repository.WebhookDeliveryRepository;
import com.hrms.infrastructure.webhook.repository.WebhookRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Health indicator for webhook delivery system.
 * Monitors webhook delivery success rates and pending queue depth.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class WebhookHealthIndicator implements HealthIndicator {

    private final WebhookRepository webhookRepository;
    private final WebhookDeliveryRepository deliveryRepository;

    // Thresholds for health status
    private static final int PENDING_QUEUE_WARNING = 100;
    private static final int PENDING_QUEUE_CRITICAL = 500;
    private static final double SUCCESS_RATE_WARNING = 0.9;
    private static final double SUCCESS_RATE_CRITICAL = 0.7;

    @Override
    public Health health() {
        try {
            // Count active webhooks
            long activeWebhooks = webhookRepository.findAllByStatus(
                    com.hrms.domain.webhook.WebhookStatus.ACTIVE).size();

            // Count pending deliveries
            long pendingDeliveries = deliveryRepository.countByStatus(DeliveryStatus.PENDING);
            long retryingDeliveries = deliveryRepository.countByStatus(DeliveryStatus.RETRYING);

            // Calculate success rate from last hour
            LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
            long recentDelivered = deliveryRepository.countByStatusAndCreatedAtAfter(
                    DeliveryStatus.DELIVERED, oneHourAgo);
            long recentFailed = deliveryRepository.countByStatusAndCreatedAtAfter(
                    DeliveryStatus.FAILED, oneHourAgo);

            long totalRecent = recentDelivered + recentFailed;
            double successRate = totalRecent > 0
                    ? (double) recentDelivered / totalRecent
                    : 1.0;

            Health.Builder builder = Health.up()
                    .withDetail("activeWebhooks", activeWebhooks)
                    .withDetail("pendingDeliveries", pendingDeliveries)
                    .withDetail("retryingDeliveries", retryingDeliveries)
                    .withDetail("successRateLastHour", String.format("%.2f%%", successRate * 100));

            // Determine health status based on metrics
            long totalPending = pendingDeliveries + retryingDeliveries;

            if (totalPending >= PENDING_QUEUE_CRITICAL || successRate < SUCCESS_RATE_CRITICAL) {
                return Health.down()
                        .withDetail("activeWebhooks", activeWebhooks)
                        .withDetail("pendingDeliveries", pendingDeliveries)
                        .withDetail("retryingDeliveries", retryingDeliveries)
                        .withDetail("successRateLastHour", String.format("%.2f%%", successRate * 100))
                        .withDetail("reason", totalPending >= PENDING_QUEUE_CRITICAL
                                ? "Queue depth critical"
                                : "Success rate critical")
                        .build();
            }

            if (totalPending >= PENDING_QUEUE_WARNING || successRate < SUCCESS_RATE_WARNING) {
                builder.withDetail("warning", totalPending >= PENDING_QUEUE_WARNING
                        ? "High queue depth"
                        : "Low success rate");
            }

            return builder.build();

        } catch (Exception e) {
            log.error("Webhook health check failed", e);
            return Health.unknown()
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}
