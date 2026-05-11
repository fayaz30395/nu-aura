package com.hrms.application.webhook.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.metrics.MetricsService;
import com.hrms.common.resilience.CircuitBreaker;
import com.hrms.common.security.TenantContext;
import com.hrms.common.validation.SsrfProtectionUtils;
import com.hrms.domain.webhook.*;
import com.hrms.domain.webhook.WebhookDelivery.DeliveryStatus;
import com.hrms.infrastructure.webhook.repository.WebhookDeliveryRepository;
import com.hrms.infrastructure.webhook.repository.WebhookRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.HttpURLConnection;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
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

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String SIGNATURE_HEADER = "X-Webhook-Signature";
    private static final String EVENT_ID_HEADER = "X-Webhook-Event-Id";
    private static final String EVENT_TYPE_HEADER = "X-Webhook-Event-Type";
    private static final String TIMESTAMP_HEADER = "X-Webhook-Timestamp";

    // Headers redacted from response storage to prevent secret leakage when admins
    // view delivery history. Mirrors the request-side forbidden list in WebhookController.
    private static final Set<String> SENSITIVE_RESPONSE_HEADERS = Set.of(
            "authorization", "cookie", "set-cookie", "proxy-authorization"
    );

    private final WebhookRepository webhookRepository;
    private final WebhookDeliveryRepository deliveryRepository;
    private final WebhookService webhookService;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;
    private final MetricsService metricsService;
    // NOTE: injected RestTemplate is the shared singleton from AIConfig. We do NOT use it
    // for outbound webhook delivery — instead deliveryRestTemplate (built in @PostConstruct)
    // has redirect-following disabled to close an SSRF-via-redirect bypass.
    private final RestTemplate restTemplate;
    // Webhook-scoped RestTemplate with redirect-following disabled.
    private RestTemplate deliveryRestTemplate;
    // Circuit breakers per webhook URL to prevent cascading failures
    private final Map<UUID, CircuitBreaker> circuitBreakers = new HashMap<>();

    /**
     * Build a webhook-scoped RestTemplate with redirect-following disabled.
     *
     * <p>Standard RestTemplate follows 3xx by default — an attacker who controls a
     * webhook endpoint can return a redirect to an internal address (169.254.169.254,
     * etc.) and bypass the SSRF check performed against the original URL.</p>
     *
     * <p>Using {@link SimpleClientHttpRequestFactory} subclassed to set
     * {@code setInstanceFollowRedirects(false)} on the underlying
     * {@link HttpURLConnection} avoids depending on apache HttpComponents.</p>
     */
    @PostConstruct
    void initDeliveryRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory() {
            @Override
            protected void prepareConnection(HttpURLConnection connection, String httpMethod) throws java.io.IOException {
                super.prepareConnection(connection, httpMethod);
                // SECURITY: do NOT follow redirects — an attacker-controlled webhook
                // endpoint could redirect to an internal address.
                connection.setInstanceFollowRedirects(false);
            }
        };
        factory.setConnectTimeout(10_000); // 10s
        factory.setReadTimeout(30_000);    // 30s
        this.deliveryRestTemplate = new RestTemplate(factory);
    }

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
        } catch (JsonProcessingException e) {
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
            // SECURITY: re-validate the webhook URL at delivery time. The URL was validated
            // at create/update via WebhookUrlValidator, but DNS may have changed (rebinding)
            // and a redirect could point elsewhere — deliveryRestTemplate blocks redirects.
            if (!SsrfProtectionUtils.isUrlSafe(webhook.getUrl())) {
                throw new BusinessException("Webhook URL blocked by SSRF policy: " + webhook.getUrl());
            }

            HttpHeaders headers = buildHeaders(webhook, delivery);
            HttpEntity<String> request = new HttpEntity<>(delivery.getPayload(), headers);

            ResponseEntity<String> response = deliveryRestTemplate.exchange(
                    webhook.getUrl(),
                    HttpMethod.POST,
                    request,
                    String.class
            );

            statusCode = response.getStatusCode().value();
            responseBody = sanitizeResponseBody(response.getBody(), response.getHeaders());

            // SECURITY: a 3xx from the receiver is treated as a delivery failure rather than
            // being followed. This closes the redirect-SSRF bypass: even if an attacker registers
            // a public webhook URL and tries to redirect us to a private host, we never follow it.
            if (response.getStatusCode().is3xxRedirection()) {
                RuntimeException redirectError = new RuntimeException("HTTP " + statusCode + " redirect not followed");
                circuitBreaker.recordFailure(redirectError);
                webhook.recordFailure("HTTP " + statusCode + " (redirect rejected)");
                webhookRepository.save(webhook);
                recordFailureMetric(webhook, statusCode);
                errorMessage = "Redirects are not followed for webhook delivery";
            } else if (response.getStatusCode().is2xxSuccessful()) {
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

        } catch (BusinessException e) {
            // SSRF policy rejection: record as failure but do not invoke the network.
            errorMessage = e.getMessage();
            circuitBreaker.recordFailure(e);
            webhook.recordFailure(errorMessage);
            webhookRepository.save(webhook);
            recordFailureMetric(webhook, 0);
            log.warn("Webhook delivery refused by SSRF policy for {} to {}: {}",
                    delivery.getEventId(), webhook.getUrl(), errorMessage);
        } catch (RuntimeException e) {
            // Intentional broad catch — external HTTP delivery; any transport error must be recorded
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

        // Add custom headers if configured (with forbidden-header filtering as a second
        // line of defense; the controller already strips these at create/update time).
        if (webhook.getCustomHeaders() != null) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, String> customHeaders = objectMapper.readValue(
                        webhook.getCustomHeaders(), Map.class);
                customHeaders.forEach((k, v) -> {
                    if (k == null) return;
                    if (FORBIDDEN_CUSTOM_HEADERS.contains(k.toLowerCase())) {
                        log.warn("Dropping forbidden custom header '{}' on webhook {}", k, webhook.getId());
                        return;
                    }
                    headers.set(k, v);
                });
            } catch (JsonProcessingException e) {
                log.warn("Failed to parse custom headers for webhook {}: {}", webhook.getId(), e.getMessage());
            }
        }

        return headers;
    }

    // Headers a webhook owner must NEVER be able to control on outbound delivery —
    // mirrors the controller-side allowlist filter. Defense in depth.
    private static final Set<String> FORBIDDEN_CUSTOM_HEADERS = Set.of(
            "authorization", "cookie", "set-cookie", "host", "content-length",
            "x-forwarded-for", "x-real-ip", "x-forwarded-host", "proxy-authorization"
    );

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
        } catch (java.security.GeneralSecurityException e) {
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
     * Sanitize the response body before storing it on the delivery record.
     *
     * <p>Redaction targets:</p>
     * <ul>
     *   <li>Sensitive response headers serialized into the body (Authorization, Cookie, Set-Cookie,
     *       Proxy-Authorization) — admins viewing delivery history must never see leaked secrets.</li>
     *   <li>Body length capped by WebhookDelivery#truncate (2000 chars) downstream.</li>
     * </ul>
     *
     * <p>If sensitive headers are present in the response, they are logged for audit but
     * not persisted on the delivery record.</p>
     */
    private String sanitizeResponseBody(String body, HttpHeaders responseHeaders) {
        if (responseHeaders != null) {
            for (String name : SENSITIVE_RESPONSE_HEADERS) {
                if (responseHeaders.containsKey(name)
                        || responseHeaders.containsKey(name.substring(0, 1).toUpperCase() + name.substring(1))) {
                    // We do not echo header values into the body — but log presence for audit.
                    log.debug("Sensitive response header '{}' present from webhook target; suppressing from storage", name);
                }
            }
        }
        if (body == null) return null;
        // Best-effort body-level redaction in case the target echoes its own auth headers.
        String redacted = body;
        for (String name : SENSITIVE_RESPONSE_HEADERS) {
            // Strip "Authorization: ..." style lines from response body text.
            redacted = redacted.replaceAll("(?i)(" + java.util.regex.Pattern.quote(name) + ")\\s*[:=]\\s*[^\\r\\n]*",
                    "$1: [REDACTED]");
        }
        return redacted;
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
    @SchedulerLock(name = "webhookProcessRetries", lockAtLeastFor = "PT2M", lockAtMostFor = "PT15M")
    @Transactional
    public void processRetries() {
        List<WebhookDelivery> readyForRetry = deliveryRepository.findReadyForRetry(LocalDateTime.now());

        for (WebhookDelivery delivery : readyForRetry) {
            UUID tenantId = delivery.getTenantId();
            if (tenantId != null) {
                TenantContext.setCurrentTenant(tenantId);
            }
            try {
                webhookRepository.findById(delivery.getWebhookId()).ifPresent(webhook -> {
                    if (webhook.getStatus() == WebhookStatus.ACTIVE) {
                        log.info("Retrying webhook delivery {} (attempt {})", delivery.getId(), delivery.getAttempts() + 1);

                        // Record retry metrics
                        if (tenantId != null) {
                            metricsService.recordWebhookRetry(
                                    tenantId,
                                    delivery.getEventType().name(),
                                    delivery.getAttempts() + 1);
                        }

                        deliverWebhook(webhook, delivery);
                    }
                });
            } finally {
                TenantContext.clear();
            }
        }
    }

    /**
     * Get or create a circuit breaker for a webhook.
     */
    private CircuitBreaker getOrCreateCircuitBreaker(UUID webhookId) {
        return circuitBreakers.computeIfAbsent(webhookId, id ->
                new CircuitBreaker("webhook-" + id, 5, 2, Duration.ofSeconds(30)));
    }

    // ========== Metrics ==========

    // Q-P13: webhook_id was removed from Prometheus tags — per-webhook UUIDs create
    // unbounded cardinality (one time-series per registered webhook). The success/
    // failure rate per tenant is still answerable via centralized metricsService
    // (which tags by tenant_bucket + event_type), so we lose nothing observability-wise.

    private void recordSuccessMetric(Webhook webhook) {
        Counter.builder("webhook.delivery")
                .tag("status", "success")
                .register(meterRegistry)
                .increment();
    }

    private void recordFailureMetric(Webhook webhook, int statusCode) {
        Counter.builder("webhook.delivery")
                .tag("status", "failure")
                .tag("http_status", String.valueOf(statusCode))
                .register(meterRegistry)
                .increment();
    }

    private void recordDurationMetric(Webhook webhook, long durationMs) {
        Timer.builder("webhook.delivery.duration")
                .register(meterRegistry)
                .record(durationMs, TimeUnit.MILLISECONDS);
    }
}
