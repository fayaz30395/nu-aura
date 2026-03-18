package com.hrms.application.webhook.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.common.metrics.MetricsService;
import com.hrms.common.resilience.CircuitBreaker;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.webhook.*;
import com.hrms.domain.webhook.WebhookDelivery.DeliveryStatus;
import com.hrms.infrastructure.webhook.repository.WebhookDeliveryRepository;
import com.hrms.infrastructure.webhook.repository.WebhookRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * Service for reliable webhook delivery with retries and circuit breaker.
 *
 * <p><strong>Features:</strong></p>
 * <ul>
 *   <li>Asynchronous delivery for non-blocking event processing</li>
 *   <li>Exponential backoff retry strategy (1m, 5m, 15m, 1h)</li>
 *   <li>HMAC-SHA256 signature for payload verification</li>
 *   <li>Circuit breaker to prevent overwhelming failing endpoints</li>
 *   <li>Idempotency via event ID tracking</li>
 *   <li>Metrics for monitoring delivery success/failure rates</li>
 * </ul>
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class WebhookDeliveryService {

    private final WebhookRepository webhookRepository;
    private final WebhookDeliveryRepository deliveryRepository;
    private final WebhookService webhookService;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;
    private final MetricsService metricsService;
    private final RestTemplate restTemplate;

    // Circuit breakers per webhook URL to prevent cascading failures
    private final Map<UUID, CircuitBreaker> circuitBreakers = new HashMap<>();

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String SIGNATURE_HEADER = "X-Webhook-Signature";
    private static final String EVENT_ID_HEADER = "X-Webhook-Event-Id";
    private static final String EVENT_TYPE_HEADER = "X-Webhook-Event-Type";
    private static final String TIMESTAMP_HEADER = "X-Webhook-Timestamp";

    /**
     * Dispatch an event to all subscribed webhooks for the current tenant.
     *
     * @param eventType Type of event
     * @param payload   Event payload object
     */
    @Async
    @Transactional
    public void dispatchEvent(WebhookEventType eventType, Object payload) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            log.warn("Cannot dispatch webhook event without tenant context");
            return;
        }

        dispatchEvent(tenantId, eventType, payload);
    }

    /**
     * Dispatch an event to all subscribed webhooks for a specific tenant.
     * Uses cached webhook list for improved performance.
     */
    @Transactional
    public void dispatchEvent(UUID tenantId, WebhookEventType eventType, Object payload) {
        // Use cached webhook service for better performance
        List<Webhook> webhooks = webhookService.findActiveWebhooks(tenantId);

        String eventId = UUID.randomUUID().toString();
        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(buildEventPayload(eventType, eventId, payload));
        } catch (Exception e) {
            log.error("Failed to serialize webhook payload for event {}: {}", eventType, e.getMessage());
            return;
        }

        for (Webhook webhook : webhooks) {
            if (webhook.subscribesTo(eventType)) {
                // Check idempotency
                if (deliveryRepository.existsByWebhookIdAndEventId(webhook.getId(), eventId)) {
                    log.debug("Skipping duplicate event {} for webhook {}", eventId, webhook.getId());
                    continue;
                }

                WebhookDelivery delivery = WebhookDelivery.builder()
                        .webhookId(webhook.getId())
                        .eventType(eventType)
                        .eventId(eventId)
                        .payload(payloadJson)
                        .status(DeliveryStatus.PENDING)
                        .build();
                delivery.setTenantId(tenantId);

                delivery = deliveryRepository.save(delivery);

                // Attempt immediate delivery
                deliverWebhook(webhook, delivery);
            }
        }
    }

    /**
     * Attempt to deliver a webhook.
     */
    private void deliverWebhook(Webhook webhook, WebhookDelivery delivery) {
        CircuitBreaker circuitBreaker = getOrCreateCircuitBreaker(webhook.getId());

        // Check circuit breaker
        if (!circuitBreaker.allowRequest()) {
            log.debug("Circuit breaker open for webhook {}, scheduling retry", webhook.getId());
            delivery.setStatus(DeliveryStatus.RETRYING);
            delivery.setNextRetryAt(LocalDateTime.now().plusMinutes(5));
            deliveryRepository.save(delivery);
            return;
        }

        delivery.setStatus(DeliveryStatus.DELIVERING);
        deliveryRepository.save(delivery);

        long startTime = System.currentTimeMillis();
        int statusCode = 0;
        String responseBody = null;
        String errorMessage = null;

        try {
            HttpHeaders headers = buildHeaders(webhook, delivery);
            HttpEntity<String> request = new HttpEntity<>(delivery.getPayload(), headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    webhook.getUrl(),
                    HttpMethod.POST,
                    request,
                    String.class
            );

            statusCode = response.getStatusCode().value();
            responseBody = response.getBody();

            if (response.getStatusCode().is2xxSuccessful()) {
                circuitBreaker.recordSuccess();
                webhook.recordSuccess();
                webhookRepository.save(webhook);
                recordSuccessMetric(webhook);
            } else {
                RuntimeException httpError = new RuntimeException("HTTP " + statusCode);
                circuitBreaker.recordFailure(httpError);
                webhook.recordFailure("HTTP " + statusCode);
                webhookRepository.save(webhook);
                recordFailureMetric(webhook, statusCode);
            }

        } catch (Exception e) {
            errorMessage = e.getMessage();
            circuitBreaker.recordFailure(e);
            webhook.recordFailure(errorMessage);
            webhookRepository.save(webhook);
            recordFailureMetric(webhook, 0);
            log.error("Webhook delivery failed for {} to {}: {}", delivery.getEventId(), webhook.getUrl(), errorMessage);
        }

        long durationMs = System.currentTimeMillis() - startTime;
        delivery.recordAttempt(statusCode, responseBody, durationMs, errorMessage);
        deliveryRepository.save(delivery);

        recordDurationMetric(webhook, durationMs);

        // Record to centralized metrics
        UUID tenantId = delivery.getTenantId();
        if (tenantId != null) {
            boolean success = errorMessage == null && statusCode >= 200 && statusCode < 300;
            metricsService.recordWebhookDelivery(
                    tenantId,
                    delivery.getEventType().name(),
                    success,
                    Duration.ofMillis(durationMs));
        }
    }

    /**
     * Build HTTP headers for webhook request.
     */
    private HttpHeaders buildHeaders(Webhook webhook, WebhookDelivery delivery) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(EVENT_ID_HEADER, delivery.getEventId());
        headers.set(EVENT_TYPE_HEADER, delivery.getEventType().name());
        headers.set(TIMESTAMP_HEADER, String.valueOf(System.currentTimeMillis()));

        // Add HMAC signature if secret is configured
        if (webhook.getSecret() != null && !webhook.getSecret().isBlank()) {
            String signature = computeSignature(delivery.getPayload(), webhook.getSecret());
            headers.set(SIGNATURE_HEADER, "sha256=" + signature);
        }

        // Add custom headers if configured
        if (webhook.getCustomHeaders() != null) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, String> customHeaders = objectMapper.readValue(
                        webhook.getCustomHeaders(), Map.class);
                customHeaders.forEach(headers::set);
            } catch (Exception e) {
                log.warn("Failed to parse custom headers for webhook {}: {}", webhook.getId(), e.getMessage());
            }
        }

        return headers;
    }

    /**
     * Compute HMAC-SHA256 signature for payload verification.
     */
    private String computeSignature(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                    secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
            mac.init(secretKeySpec);
            byte[] hmacBytes = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hmacBytes);
        } catch (Exception e) {
            log.error("Failed to compute HMAC signature: {}", e.getMessage());
            return "";
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    /**
     * Build the event payload wrapper.
     */
    private Map<String, Object> buildEventPayload(WebhookEventType eventType, String eventId, Object data) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", eventId);
        payload.put("type", eventType.name());
        payload.put("timestamp", LocalDateTime.now().toString());
        payload.put("data", data);
        return payload;
    }

    /**
     * Process pending retries.
     * Runs every minute.
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void processRetries() {
        List<WebhookDelivery> readyForRetry = deliveryRepository.findReadyForRetry(LocalDateTime.now());

        for (WebhookDelivery delivery : readyForRetry) {
            webhookRepository.findById(delivery.getWebhookId()).ifPresent(webhook -> {
                if (webhook.getStatus() == WebhookStatus.ACTIVE) {
                    log.info("Retrying webhook delivery {} (attempt {})", delivery.getId(), delivery.getAttempts() + 1);

                    // Record retry metrics
                    UUID tenantId = delivery.getTenantId();
                    if (tenantId != null) {
                        metricsService.recordWebhookRetry(
                                tenantId,
                                delivery.getEventType().name(),
                                delivery.getAttempts() + 1);
                    }

                    deliverWebhook(webhook, delivery);
                }
            });
        }
    }

    /**
     * Get or create a circuit breaker for a webhook.
     */
    private CircuitBreaker getOrCreateCircuitBreaker(UUID webhookId) {
        return circuitBreakers.computeIfAbsent(webhookId, id ->
                new CircuitBreaker("webhook-" + id, 5, 2, java.time.Duration.ofSeconds(30)));
    }

    // ========== Metrics ==========

    private void recordSuccessMetric(Webhook webhook) {
        Counter.builder("webhook.delivery")
                .tag("status", "success")
                .tag("webhook_id", webhook.getId().toString())
                .register(meterRegistry)
                .increment();
    }

    private void recordFailureMetric(Webhook webhook, int statusCode) {
        Counter.builder("webhook.delivery")
                .tag("status", "failure")
                .tag("webhook_id", webhook.getId().toString())
                .tag("http_status", String.valueOf(statusCode))
                .register(meterRegistry)
                .increment();
    }

    private void recordDurationMetric(Webhook webhook, long durationMs) {
        Timer.builder("webhook.delivery.duration")
                .tag("webhook_id", webhook.getId().toString())
                .register(meterRegistry)
                .record(durationMs, TimeUnit.MILLISECONDS);
    }
}
